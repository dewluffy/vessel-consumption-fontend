import { create } from "zustand";
import { dashboardApi } from "../api/dashboard.api";

const ACT_LABEL_TH = {
  CARGO_LOAD: "โหลดตู้",
  CARGO_DISCHARGE: "ปล่อยตู้",
  MANOEUVRING: "เดินเครื่อง/เทียบ-ออก",
  FULL_SPEED_AWAY: "เดินทาง (Full speed)",
  ANCHORING: "ทอดสมอ",
  OTHER: "อื่น ๆ",
};

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseVoyagesResponse(data) {
  // รองรับได้ 2 แบบ: array หรือ { voyages: [...] }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.voyages)) return data.voyages;
  return [];
}

function parseActivitiesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.activities)) return data.activities;
  return [];
}

// ตัวอย่างรูปแบบ remark สำหรับท่าเรือ (ตั้งใจทำให้ยืดหยุ่น)
// - "PAT:PortA"
// - "LCB:PortB"
function classifyPortFromRemark(remark = "") {
  const text = String(remark || "").trim();
  if (!text) return null;

  const up = text.toUpperCase();
  if (up.startsWith("PAT:")) return { zone: "PAT", port: text.slice(4).trim() || "-" };
  if (up.startsWith("LCB:")) return { zone: "LCB", port: text.slice(4).trim() || "-" };
  return null;
}

function daysInMonth(year, month) {
  // month: 1-12
  return new Date(year, month, 0).getDate();
}

export const useDashboardStore = create((set, get) => ({
  vessels: [],
  loadingVessels: false,

  // filters
  vesselId: "ALL", // "ALL" | number
  month: "ALL", // "ALL" | 1..12
  year: new Date().getFullYear(), // number

  // summary
  loadingSummary: false,
  summary: {
    voyCount: 0,

    container: {
      total: 0,
      c20: 0,
      c40: 0,
      reefer: 0,
      dg: 0,
    },

    fuel: {
      totalUsed: 0,
      byActivityType: {}, // { CARGO_LOAD: 123, ... }
    },

    ports: {
      PAT: { totalCalls: 0, byPort: {} },
      LCB: { totalCalls: 0, byPort: {} },
    },

    trend: [], // [{ x: '1', y: 2 }, ...]
    recentVoyages: [], // [{ id, voyNo, startAt, endAt, vesselName }]
  },

  setFilter: (patch) => set((s) => ({ ...s, ...patch })),

  fetchVessels: async () => {
    set({ loadingVessels: true });
    try {
      const { data } = await dashboardApi.listVessels();
      const vessels = Array.isArray(data) ? data : [];
      set({ vessels });
    } finally {
      set({ loadingVessels: false });
    }
  },

  fetchSummary: async () => {
    const { vesselId, month, year } = get();

    set({ loadingSummary: true });
    try {
      // 1) เลือก vessel list
      let vessels = get().vessels;
      if (!vessels?.length) {
        const r = await dashboardApi.listVessels();
        vessels = Array.isArray(r.data) ? r.data : [];
        set({ vessels });
      }

      const selectedVessels =
        vesselId === "ALL" ? vessels : vessels.filter((v) => Number(v.id) === Number(vesselId));

      // 2) ดึง voyages ตาม filter
      const allVoyages = [];
      for (const v of selectedVessels) {
        const r = await dashboardApi.listVoyagesByVessel(v.id, {
          year: year || undefined,
          month: month === "ALL" ? undefined : month,
        });
        const voyages = parseVoyagesResponse(r.data).map((x) => ({
          ...x,
          vesselName: v.name,
        }));
        allVoyages.push(...voyages);
      }

      // เรียงล่าสุดก่อน (startAt desc)
      allVoyages.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

      // 3) trend (จำนวน Voy ต่อวันในเดือนที่เลือก)
      // ถ้าเลือก month=ALL -> trend จะเป็น 12 เดือน (ง่าย ๆ)
      let trend = [];
      if (month !== "ALL") {
        const m = Number(month);
        const dmax = daysInMonth(Number(year), m);
        const bucket = Array.from({ length: dmax }, (_, i) => ({ x: String(i + 1), y: 0 }));
        for (const voy of allVoyages) {
          const d = new Date(voy.startAt);
          if (Number.isNaN(d.getTime())) continue;
          const dd = d.getDate();
          if (dd >= 1 && dd <= dmax) bucket[dd - 1].y += 1;
        }
        trend = bucket;
      } else {
        const bucket = Array.from({ length: 12 }, (_, i) => ({ x: String(i + 1), y: 0 }));
        for (const voy of allVoyages) {
          const d = new Date(voy.startAt);
          if (Number.isNaN(d.getTime())) continue;
          const mm = d.getMonth() + 1;
          bucket[mm - 1].y += 1;
        }
        trend = bucket;
      }

      // 4) ดึง activities เพื่อรวม fuel + container + ports
      const fuelByType = {};
      let fuelTotal = 0;

      let containerTotal = 0;
      let reeferTotal = 0;

      const ports = {
        PAT: { totalCalls: 0, byPort: {} },
        LCB: { totalCalls: 0, byPort: {} },
      };

      // หมายเหตุ: นี่เป็นวิธี “client compute” (ง่าย/เร็วต่อการทำ UI)
      // ถ้าข้อมูลเยอะ ค่อยทำ backend summary endpoint ทีหลัง
      for (const voy of allVoyages) {
        const r = await dashboardApi.listActivitiesByVoyage(voy.id);
        const activities = parseActivitiesResponse(r.data);

        for (const a of activities) {
          const used = safeNum(a.fuelUsed);
          if (used > 0) {
            fuelTotal += used;
            const k = a.type || "OTHER";
            fuelByType[k] = (fuelByType[k] || 0) + used;
          }

          // ตู้รวม: ใช้ containerCount จาก cargo load/discharge
          if (a.type === "CARGO_LOAD" || a.type === "CARGO_DISCHARGE") {
            containerTotal += safeNum(a.containerCount);
          }

          // reefer รวม (ตามที่ระบบมีอยู่ตอนนี้)
          reeferTotal += safeNum(a.reeferCount);

          // ports จาก remark
          const info = classifyPortFromRemark(a.remark);
          if (info) {
            ports[info.zone].totalCalls += 1;
            ports[info.zone].byPort[info.port] = (ports[info.zone].byPort[info.port] || 0) + 1;
          }
        }
      }

      const recentVoyages = allVoyages.slice(0, 8);

      set({
        summary: {
          voyCount: allVoyages.length,
          container: {
            total: containerTotal,
            c20: 0, // รอเพิ่ม field ในอนาคต
            c40: 0, // รอเพิ่ม field ในอนาคต
            reefer: reeferTotal,
            dg: 0, // รอเพิ่ม field ในอนาคต
          },
          fuel: {
            totalUsed: fuelTotal,
            byActivityType: fuelByType,
          },
          ports,
          trend,
          recentVoyages,
        },
      });
    } finally {
      set({ loadingSummary: false });
    }
  },
}));
