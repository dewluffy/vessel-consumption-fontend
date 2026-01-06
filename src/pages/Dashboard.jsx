import { useEffect, useMemo } from "react";
import { BarChart3, RefreshCcw, Ship, Calendar, Flame, Boxes, Anchor } from "lucide-react";
import { useDashboardStore } from "../stores/dashboard.store";

import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function numberFmt(n, digits = 0) {
  const x = Number(n || 0);
  return x.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function AreaMiniChart({ data = [] }) {
  const w = 760;
  const h = 240;
  const pad = 16;

  // ✅ กันเคส data ว่าง หรือมี 1 จุด
  if (!Array.isArray(data) || data.length < 2) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-fuchsia-50 via-white to-sky-50 p-6">
        <div className="text-sm text-slate-500">แนวโน้มจำนวนเที่ยวเดินเรือ</div>
        <div className="text-xl font-semibold text-slate-900">ภาพรวม</div>
        <div className="mt-3 text-sm text-slate-500">ยังไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ</div>
      </div>
    );
  }

  const maxY = Math.max(1, ...data.map((d) => Number(d.y || 0)));

  const pts = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((Number(d.y || 0) / maxY) * (h - pad * 2));
    return { x, y };
  });

  // ✅ line ต้องขึ้นต้นด้วย M เสมอ
  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const lastX = pts[pts.length - 1].x;
  const baseY = h - pad;

  // ✅ area ต่อท้ายจาก line ที่เริ่มด้วย M อยู่แล้ว
  const area = `${line} L ${lastX.toFixed(2)} ${baseY.toFixed(2)} L ${pad.toFixed(
    2
  )} ${baseY.toFixed(2)} Z`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-fuchsia-50 via-white to-sky-50">
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
        <defs>
          <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(236,72,153,0.45)" />
            <stop offset="45%" stopColor="rgba(147,51,234,0.35)" />
            <stop offset="100%" stopColor="rgba(14,165,233,0.25)" />
          </linearGradient>
          <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(147,51,234,0.55)" />
            <stop offset="100%" stopColor="rgba(147,51,234,0.05)" />
          </linearGradient>
        </defs>

        {Array.from({ length: 5 }).map((_, i) => {
          const y = pad + (i * (h - pad * 2)) / 4;
          return (
            <line
              key={i}
              x1={pad}
              x2={w - pad}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="1"
            />
          );
        })}

        <path d={area} fill="url(#g2)" />
        <path d={line} fill="none" stroke="url(#g1)" strokeWidth="3.5" />

        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="rgba(236,72,153,0.8)" />
        ))}
      </svg>

      <div className="absolute left-4 top-4">
        <div className="text-sm text-slate-500">แนวโน้มจำนวนเที่ยวเดินเรือ</div>
        <div className="text-xl font-semibold text-slate-900">ภาพรวม</div>
      </div>
    </div>
  );
}


function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
      {children}
    </span>
  );
}

function StatCard({ icon: Icon, title, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">{title}</div>
        <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function Dashboard() {
  const {
    vessels,
    loadingVessels,
    vesselId,
    month,
    year,
    loadingSummary,
    summary,
    setFilter,
    fetchVessels,
    fetchSummary,
  } = useDashboardStore();

  useEffect(() => {
    fetchVessels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // โหลดครั้งแรก (หลังมี vessels ก็ได้)
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vesselId, month, year]);

  const vesselOptions = useMemo(() => {
    return [
      { id: "ALL", name: "ทั้งหมด" },
      ...vessels.map((v) => ({ id: v.id, name: v.name })),
    ];
  }, [vessels]);

  const monthOptions = useMemo(
    () => [
      { value: "ALL", label: "ทั้งหมด" },
      ...Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
    ],
    []
  );

  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const list = [];
    for (let y = now - 3; y <= now + 1; y++) list.push(y);
    return list;
  }, []);

  const byTypeRows = useMemo(() => {
    const obj = summary?.fuel?.byActivityType || {};
    const rows = Object.entries(obj)
      .map(([k, v]) => ({ type: k, label: k, value: Number(v || 0) }))
      .sort((a, b) => b.value - a.value);

    return rows.map((r) => ({
      ...r,
      label: r.type ? (r.type in obj ? r.type : r.type) : "-",
      th: {
        CARGO_LOAD: "Cargo work / Load",
        CARGO_DISCHARGE: "Cargo work / Discharge",
        MANOEUVRING: "Manoeuvring",
        FULL_SPEED_AWAY: "Full speed away",
        ANCHORING: "Anchoring",
        OTHER: "Other",
      }[r.type] || r.type,
    }));
  }, [summary]);

  const patPorts = useMemo(() => {
    const m = summary?.ports?.PAT?.byPort || {};
    return Object.entries(m)
      .map(([port, cnt]) => ({ port, cnt }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 10);
  }, [summary]);

  const lcbPorts = useMemo(() => {
    const m = summary?.ports?.LCB?.byPort || {};
    return Object.entries(m)
      .map(([port, cnt]) => ({ port, cnt }))
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 10);
  }, [summary]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 p-2.5 text-white shadow-sm">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-900">แดชบอร์ด</div>
            <div className="text-sm text-slate-500">สรุปภาพรวมตามตัวกรอง</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <Ship size={16} className="text-slate-500" />
            <Select
              value={String(vesselId)}
              onChange={(e) => setFilter({ vesselId: e.target.value })}
              className="min-w-[160px]"
              disabled={loadingVessels}
            >
              {vesselOptions.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <Calendar size={16} className="text-slate-500" />
            <Select value={String(month)} onChange={(e) => setFilter({ month: e.target.value })}>
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
            <Select value={String(year)} onChange={(e) => setFilter({ year: Number(e.target.value) })}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="ghost"
            className="gap-2 cursor-pointer"
            onClick={fetchSummary}
            disabled={loadingSummary}
          >
            <RefreshCcw size={16} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Anchor}
          title="จำนวน Voyage รวม"
          value={numberFmt(summary?.voyCount || 0)}
          sub={loadingSummary ? "กำลังโหลด..." : "ตามตัวกรองที่เลือก"}
        />

        <StatCard
          icon={Boxes}
          title="จำนวนตู้รวม"
          value={numberFmt(summary?.container?.total || 0)}
          sub={`Reefer รวม ${numberFmt(summary?.container?.reefer || 0)}`}
        />

        <StatCard
          icon={Flame}
          title="น้ำมันที่ใช้รวม (ลิตร)"
          value={numberFmt(summary?.fuel?.totalUsed || 0, 2)}
          sub="รวมจากค่า FuelUsed ใน Activity"
        />

        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-sky-50 via-white to-fuchsia-50 p-4 shadow-sm">
          <div className="text-sm text-slate-600">สรุปประเภทตู้</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>20: {numberFmt(summary?.container?.c20 || 0)}</Pill>
            <Pill>40: {numberFmt(summary?.container?.c40 || 0)}</Pill>
            <Pill>Reefer: {numberFmt(summary?.container?.reefer || 0)}</Pill>
            <Pill>DG: {numberFmt(summary?.container?.dg || 0)}</Pill>
            <Pill>รวม: {numberFmt(summary?.container?.total || 0)}</Pill>
          </div>
          {/* <div className="mt-2 text-xs text-slate-500">
            * ตอนนี้ระบบยังไม่ได้เก็บตู้ 20/40/DG แยกประเภท (แสดงเป็น 0 ไว้ก่อน)
          </div> */}
        </div>
      </div>

      {/* charts row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaMiniChart data={summary?.trend || []} />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">จำนวนท่าที่เทียบ</div>
              <div className="text-xl font-semibold text-slate-900">PAT / LCB</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 text-slate-700">
              <Anchor size={18} />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">PAT</div>
              <div className="text-lg font-semibold text-slate-900">
                {numberFmt(summary?.ports?.PAT?.totalCalls || 0)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {patPorts.length === 0 ? (
                  <span className="text-xs text-slate-500">ยังไม่มีข้อมูล</span>
                ) : (
                  patPorts.map((p) => <Pill key={`pat-${p.port}`}>{p.port} · {p.cnt}</Pill>)
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">LCB</div>
              <div className="text-lg font-semibold text-slate-900">
                {numberFmt(summary?.ports?.LCB?.totalCalls || 0)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lcbPorts.length === 0 ? (
                  <span className="text-xs text-slate-500">ยังไม่มีข้อมูล</span>
                ) : (
                  lcbPorts.map((p) => <Pill key={`lcb-${p.port}`}>{p.port} · {p.cnt}</Pill>)
                )}
              </div>
            </div>
          </div>

          {/* <div className="mt-2 text-xs text-slate-500">
            * วิธีใส่ง่าย ๆ ตอนนี้: ให้ใส่ remark เป็น “PAT:ชื่อท่า” หรือ “LCB:ชื่อท่า”
          </div> */}
        </div>
      </div>

      {/* bottom row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="font-medium text-slate-900">น้ำมันที่ใช้ แยกตามกิจกรรม</div>
          </CardHeader>
          <CardBody>
            {loadingSummary ? (
              <div className="text-sm text-slate-500">กำลังโหลด...</div>
            ) : byTypeRows.length === 0 ? (
              <div className="text-sm text-slate-500">ยังไม่มีข้อมูล</div>
            ) : (
              <div className="space-y-2">
                {byTypeRows.map((r) => (
                  <div key={r.type} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="text-sm text-slate-700">{r.th}</div>
                    <div className="text-sm font-semibold text-slate-900">{numberFmt(r.value, 2)}</div>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <div className="text-sm font-semibold text-slate-900">รวม</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {numberFmt(summary?.fuel?.totalUsed || 0, 2)}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="font-medium text-slate-900">เที่ยวเดินเรือล่าสุด</div>
          </CardHeader>
          <CardBody>
            {loadingSummary ? (
              <div className="text-sm text-slate-500">กำลังโหลด...</div>
            ) : (summary?.recentVoyages?.length || 0) === 0 ? (
              <div className="text-sm text-slate-500">ยังไม่มีข้อมูล</div>
            ) : (
              <div className="overflow-auto rounded-2xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">เรือ</th>
                      <th className="text-left font-medium px-4 py-3">VoyNo</th>
                      <th className="text-left font-medium px-4 py-3">เริ่ม</th>
                      <th className="text-left font-medium px-4 py-3">สิ้นสุด</th>
                      <th className="text-left font-medium px-4 py-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentVoyages.map((v) => (
                      <tr key={v.id} className="border-t border-slate-100 hover:bg-white">
                        <td className="px-4 py-3 text-slate-900">{v.vesselName || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{v.voyNo || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{fmtDate(v.startAt)}</td>
                        <td className="px-4 py-3 text-slate-700">{fmtDate(v.endAt)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                            {v.status || "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
