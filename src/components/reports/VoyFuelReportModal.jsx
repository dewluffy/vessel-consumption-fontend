import { useEffect, useMemo, useState } from "react";
import { X, BarChart3 } from "lucide-react";
import Button from "../ui/Button";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { api } from "../../lib/api";
import { alertError } from "../../lib/alert";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hoursBetween(startAt, endAt) {
  if (!startAt || !endAt) return 0;
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
  return (e - s) / 3600000;
}

function formatMonthYear(month, year) {
  return `${month}/${year}`;
}

function formatNumber(n, digits = 2) {
  const v = Number(n || 0);
  return v.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function deterministicMockPortCall(voyageId) {
  // mock 2-6 แบบ deterministic
  const x = (voyageId * 9301 + 49297) % 233280;
  return 2 + (x % 5); // 2..6
}

function SmallBarChart({ values = [], avg = 0, kpi = 950 }) {
  // values: number[] per voyage
  const w = 980;
  const h = 320;
  const padL = 54;
  const padR = 24;
  const padT = 26;
  const padB = 42;

  const maxV = Math.max(kpi, avg, ...values, 1);
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const barGap = 6;
  const barW = values.length
    ? Math.max(8, (innerW - barGap * (values.length - 1)) / values.length)
    : 10;

  const yScale = (v) => padT + innerH - (v / maxV) * innerH;
  const xScale = (i) => padL + i * (barW + barGap);

  const avgY = yScale(avg);
  const kpiY = yScale(kpi);

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-900">Fuel Consumption</div>
        <div className="text-sm text-slate-600 flex items-center gap-2">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            AVG {formatNumber(avg, 2)} ltrs/voyage
          </span>
          <span className="inline-flex items-center gap-2 ml-3">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            KPI {formatNumber(kpi, 0)} ltrs/voyage
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full block">
        {/* grid */}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = padT + (innerH * i) / 5;
          return (
            <line
              key={i}
              x1={padL}
              x2={w - padR}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="1"
            />
          );
        })}

        {/* y-axis labels */}
        {Array.from({ length: 6 }).map((_, i) => {
          const v = Math.round((maxV * (5 - i)) / 5);
          const y = padT + (innerH * i) / 5;
          return (
            <text
              key={i}
              x={padL - 10}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="rgba(100,116,139,0.9)"
            >
              {v.toLocaleString("th-TH")}
            </text>
          );
        })}

        {/* avg line */}
        <line
          x1={padL}
          x2={w - padR}
          y1={avgY}
          y2={avgY}
          stroke="rgba(14,165,233,0.85)"
          strokeWidth="2"
        />
        {/* kpi line */}
        <line
          x1={padL}
          x2={w - padR}
          y1={kpiY}
          y2={kpiY}
          stroke="rgba(244,63,94,0.85)"
          strokeWidth="2"
        />

        {/* bars */}
        {values.map((v, i) => {
          const x = xScale(i);
          const y = yScale(v);
          const bh = padT + innerH - y;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx="6"
              fill="rgba(37,99,235,0.75)"
            />
          );
        })}

        {/* x-axis labels */}
        {values.map((_, i) => (
          <text
            key={i}
            x={xScale(i) + barW / 2}
            y={h - 18}
            textAnchor="middle"
            fontSize="12"
            fill="rgba(100,116,139,0.9)"
          >
            {i + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function VoyFuelReportModal({
  open,
  onClose,
  vessel,
  month,
  year,
  voyages,
  kpi = 950,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]); // per voyage metrics

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoading(true);
      try {
        // fetch activities for each voyage
        // จำกัด concurrent 4
        const limit = 4;
        const results = new Array(voyages.length);
        let idx = 0;

        const worker = async () => {
          while (idx < voyages.length) {
            const i = idx++;
            const voy = voyages[i];
            const { data } = await api.get(`/api/voyages/${voy.id}/activities`);
            const acts = Array.isArray(data) ? data : data?.activities ?? [];

            let totalConsumption = 0; // sum fuelUsed
            let teus = 0; // placeholder: sum containerCount (ยังไม่แยก 20/40)
            let weight = 0; // sum totalContainerWeight
            let reeferPlug = 0; // ใช้ max reeferCount ใน voy
            let idleTime = 0; // sum anchoring duration hours

            for (const a of acts) {
              totalConsumption += safeNum(a.fuelUsed);
              if (a.type === "CARGO_LOAD" || a.type === "CARGO_DISCHARGE") {
                teus += safeNum(a.containerCount);
                weight += safeNum(a.totalContainerWeight);
              }
              reeferPlug = Math.max(reeferPlug, safeNum(a.reeferCount));
              if (a.type === "ANCHORING")
                idleTime += hoursBetween(a.startAt, a.endAt);
            }

            const portCall = deterministicMockPortCall(voy.id); // mock

            results[i] = {
              voyageId: voy.id,
              voyNo: voy.voyNo || String(i + 1),
              totalConsumption,
              teus,
              weight,
              portCall,
              reeferPlug,
              idleTime,
            };
          }
        };

        await Promise.all(
          Array.from({ length: Math.min(limit, voyages.length) }, worker)
        );
        setRows(results);
      } catch (e) {
        await alertError(
          "สร้างรายงานไม่สำเร็จ",
          e?.response?.data?.message || "ไม่สามารถโหลดข้อมูลรายงานได้"
        );
        onClose();
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [open, voyages, onClose]);

  const metrics = useMemo(() => {
  const n = rows.length || 1;

  const totalConsumption = rows.reduce((a, r) => a + r.totalConsumption, 0);
  const avgConsumption = totalConsumption / n;

  const totalTeus = rows.reduce((a, r) => a + r.teus, 0);
  const totalWeight = rows.reduce((a, r) => a + r.weight, 0);
  const totalPortCall = rows.reduce((a, r) => a + r.portCall, 0);
  const totalReefer = rows.reduce((a, r) => a + r.reeferPlug, 0);
  const totalIdle = rows.reduce((a, r) => a + r.idleTime, 0);

  return {
    n,
    totalConsumption,
    avgConsumption,

    totalTeus,
    avgTeus: totalTeus / n,

    totalWeight,
    avgWeight: totalWeight / n,

    totalPortCall,
    avgPortCall: totalPortCall / n,

    totalReefer,
    avgReefer: totalReefer / n,

    totalIdle,
    avgIdle: totalIdle / n,

    values: rows.map((r) => r.totalConsumption),
  };
}, [rows]);


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 p-4 sm:p-6 overflow-auto">
        <div className="mx-auto max-w-[90vw]">
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 size={20} />
                    {vessel?.name} – Fuel consumption on{" "}
                    {formatMonthYear(month, year)}
                  </div>
                  {/* <div className="text-sm text-slate-500">
                    แสดงผลตามเดือน/ปี ที่บันทึก (postingMonth/postingYear)
                  </div> */}
                </div>

                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  <X size={18} />
                </Button>
              </div>
            </CardHeader>

            <CardBody>
              {loading ? (
                <div className="text-sm text-slate-500">
                  กำลังสร้างรายงาน...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* TABLE */}
                  <div className="rounded-2xl border border-slate-100 bg-white overflow-auto">
                    <table className="min-w-[1100px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="text-left font-medium px-4 py-3 w-56">
                            Voyage
                          </th>

                          {rows.map((_, i) => (
                            <th
                              key={i}
                              className="text-center font-medium px-3 py-3"
                            >
                              {i + 1}
                            </th>
                          ))}

                          <th className="text-center font-medium px-4 py-3">
                            Total
                          </th>
                          <th className="text-center font-medium px-4 py-3">
                            Average
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {/* Voyage */}
                        {/* <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Voyage
                          </td>

                          {rows.map((_, i) => (
                            <td
                              key={i}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {i + 1}
                            </td>
                          ))}

                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {rows.length}
                          </td>

                          <td className="px-4 py-3 text-center text-slate-500">
                            -
                          </td>
                        </tr> */}

                        {/* Total consumption */}
                        <tr className="border-t border-slate-100 bg-slate-50/30">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Total consumption (ลิตร)
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-900"
                            >
                              {formatNumber(r.totalConsumption, 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalConsumption, 0)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgConsumption, 0)}
                          </td>
                        </tr>

                        {/* TEUs */}
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Teus
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {formatNumber(r.teus, 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalTeus, 0)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgTeus, 2)}
                          </td>
                        </tr>

                        {/* Weight */}
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Weight
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {formatNumber(r.weight, 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalWeight, 0)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgWeight, 0)}
                          </td>
                        </tr>

                        {/* Port call (mock) */}
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Port call
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {formatNumber(r.portCall, 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalPortCall, 0)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgPortCall, 2)}
                          </td>
                        </tr>

                        {/* Reefer plug */}
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Reefer plug
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {formatNumber(r.reeferPlug, 0)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalReefer, 0)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgPortCall, 2)}
                          </td>
                        </tr>

                        {/* Idle time (Anchoring) */}
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            Idle time (ชั่วโมง)
                          </td>
                          {rows.map((r) => (
                            <td
                              key={r.voyageId}
                              className="px-3 py-3 text-center text-slate-700"
                            >
                              {formatNumber(r.idleTime, 2)}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.totalIdle, 2)}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-900">
                            {formatNumber(metrics.avgIdle, 2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* CHART */}
                  <SmallBarChart
                    values={metrics.values}
                    avg={metrics.avgConsumption}
                    kpi={kpi}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
