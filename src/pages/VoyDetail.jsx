import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Route,
  ClipboardList,
  Droplets,
  Plus,
  X,
  Trash2,
  Pencil,
} from "lucide-react";

import { api } from "../lib/api";
import { alertConfirm, alertError, alertSuccess } from "../lib/alert";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Card, CardBody, CardHeader } from "../components/ui/Card";


const API = {
  listActivities: (voyageId) => `/api/voyages/${voyageId}/activities`,
  createActivity: (voyageId) => `/api/voyages/${voyageId}/activities`,
  updateActivity: (activityId) => `/api/activities/${activityId}`,
  deleteActivity: (activityId) => `/api/activities/${activityId}`,
};

function fmtDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function toDatetimeLocalValue(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function toISOFromDatetimeLocal(v) {
  return new Date(v).toISOString();
}

function hoursBetween(startAt, endAt) {
  if (!startAt || !endAt) return 0;
  const s = new Date(startAt).getTime();
  const e = new Date(endAt).getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return (e - s) / 3600000;
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "border-slate-200 bg-white text-slate-900 shadow-sm"
          : "border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      <Icon size={16} />
      {children}
    </button>
  );
}

const ACTIVITY_TYPES = [
  { value: "CARGO_LOAD", label: "Cargo work / Load" },
  { value: "MANOEUVRING", label: "Manoeuvring" },
  { value: "FULL_SPEED_AWAY", label: "Full speed away" },
  { value: "ANCHORING", label: "Anchoring" },
  { value: "CARGO_DISCHARGE", label: "Cargo work / Discharge" },
  { value: "OTHER", label: "Other" },
];

function typeLabel(type) {
  return ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type ?? "-";
}

export default function VoyDetailPage() {
  const { id } = useParams();
  const voyageId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [voy, setVoy] = useState(null);
  const [editActId, setEditActId] = useState(null);

  const [tab, setTab] = useState("activity"); // activity | consumption

  // activity list
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activities, setActivities] = useState([]);

  // create modal
  const [openCreateAct, setOpenCreateAct] = useState(false);
  const [actStep, setActStep] = useState("type"); // type | form
  const [savingAct, setSavingAct] = useState(false);

  const [actType, setActType] = useState("");
  const [actForm, setActForm] = useState({
    startAt: "",
    endAt: "",

    // cargo only
    containerCount: "",
    totalContainerWeight: "",

    // fsw only
    avgSpeed: "",

    // common
    reeferCount: "",
    mainEngineCount: "",
    mainEngineHours: "",
    generatorCount: "",
    generatorHours: "",
    fuelUsed: "",
    remark: "",
  });

  const title = useMemo(() => {
    if (!voy) return `Voy #${id}`;
    return voy.voyNo ? `Voy ${voy.voyNo}` : `Voy #${voy.id}`;
  }, [voy, id]);

  const loadVoy = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/voyages/${voyageId}`);
      setVoy(data);
    } catch (e) {
      await alertError(
        "โหลดข้อมูลไม่สำเร็จ",
        e?.response?.data?.message || "ไม่สามารถโหลดรายละเอียด Voy ได้"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    setLoadingActivities(true);
    try {
      const { data } = await api.get(API.listActivities(voyageId));
      const list = Array.isArray(data) ? data : data?.activities ?? [];
      setActivities(list);
    } catch (e) {
      await alertError(
        "โหลด Activity ไม่สำเร็จ",
        e?.response?.data?.message || "ไม่สามารถโหลดรายการ Activity ได้"
      );
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    loadVoy();
    loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyageId]);

  const sums = useMemo(() => {
    const base = {
      count: 0,
      durationHours: 0,
      fuelUsed: 0,
      reeferCount: 0,
      mainEngineHours: 0,
      generatorHours: 0,
      containerCount: 0,
      totalContainerWeight: 0,
      fswAvgSpeedAvg: 0,
      fswCount: 0,
    };

    for (const a of activities) {
      base.count += 1;
      base.durationHours += hoursBetween(a.startAt, a.endAt);
      base.fuelUsed += Number(a.fuelUsed ?? 0) || 0;
      base.reeferCount += Number(a.reeferCount ?? 0) || 0;
      base.mainEngineHours += Number(a.mainEngineHours ?? 0) || 0;
      base.generatorHours += Number(a.generatorHours ?? 0) || 0;

      if (a.type === "CARGO_LOAD" || a.type === "CARGO_DISCHARGE") {
        base.containerCount += Number(a.containerCount ?? 0) || 0;
        base.totalContainerWeight += Number(a.totalContainerWeight ?? 0) || 0;
      }

      if (a.type === "FULL_SPEED_AWAY" && a.avgSpeed != null) {
        base.fswAvgSpeedAvg += Number(a.avgSpeed) || 0;
        base.fswCount += 1;
      }
    }

    const fswAvg = base.fswCount > 0 ? base.fswAvgSpeedAvg / base.fswCount : 0;
    return { ...base, fswAvg };
  }, [activities]);

  const openCreateActivity = () => {
    const now = new Date();
    const start = toDatetimeLocalValue(now);
    const end = toDatetimeLocalValue(now);

    setOpenCreateAct(true);
    setEditActId(null);
    setActStep("type");
    setActType("");
    setActForm({
      startAt: start,
      endAt: end,
      containerCount: "",
      totalContainerWeight: "",
      avgSpeed: "",
      reeferCount: "",
      mainEngineCount: "",
      mainEngineHours: "",
      generatorCount: "",
      generatorHours: "",
      fuelUsed: "",
      remark: "",
    });
  };

  const closeCreateActivity = () => {
    if (savingAct) return;
    setOpenCreateAct(false);
    setEditActId(null);
  };

  const goNextToForm = () => {
    if (!actType) return alertError("ข้อมูลไม่ครบ", "กรุณาเลือกประเภท Activity");
    setActStep("form");
  };

  const requiredCheck = () => {
    if (!actType) return "กรุณาเลือกประเภท Activity";
    if (!actForm.startAt || !actForm.endAt) return "กรุณาเลือกเวลาเริ่ม/สิ้นสุด";
    const s = new Date(toISOFromDatetimeLocal(actForm.startAt));
    const e = new Date(toISOFromDatetimeLocal(actForm.endAt));
    if (e <= s) return "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม";

    if (actType === "OTHER") {
      if (!actForm.remark.trim()) return "กรุณากรอกรายละเอียด (remark)";
      return null;
    }

    // common (ยึดตาม schema ที่คุณทำ: count เป็น positive, hours >= 0)
    const need = [
      ["reeferCount", "จำนวนตู้ Reefer"],
      ["mainEngineCount", "จำนวนเครื่องจักรใหญ่"],
      ["mainEngineHours", "ชั่วโมงเครื่องจักรใหญ่"],
      ["generatorCount", "จำนวนเครื่องไฟ"],
      ["generatorHours", "ชั่วโมงเครื่องไฟ"],
    ];

    for (const [k, label] of need) {
      if (String(actForm[k]).trim() === "") return `กรุณากรอก ${label}`;
    }

    if (actType === "CARGO_LOAD" || actType === "CARGO_DISCHARGE") {
      if (String(actForm.containerCount).trim() === "") return "กรุณากรอกจำนวนตู้";
      if (String(actForm.totalContainerWeight).trim() === "") return "กรุณากรอกน้ำหนักตู้ทั้งหมด";
    }

    if (actType === "FULL_SPEED_AWAY") {
      if (String(actForm.avgSpeed).trim() === "") return "กรุณากรอกความเร็วเฉลี่ย";
    }

    return null;
  };

  const submitCreateActivity = async (e) => {
    e.preventDefault();

    const msg = requiredCheck();
    if (msg) return alertError("ข้อมูลไม่ครบ/ไม่ถูกต้อง", msg);

    const payload = {
      type: actType,
      startAt: toISOFromDatetimeLocal(actForm.startAt),
      endAt: toISOFromDatetimeLocal(actForm.endAt),
    };

    if (actType === "OTHER") {
      payload.remark = actForm.remark.trim();
    } else {
      payload.reeferCount = Number(actForm.reeferCount);
      payload.mainEngineCount = Number(actForm.mainEngineCount);
      payload.mainEngineHours = Number(actForm.mainEngineHours);
      payload.generatorCount = Number(actForm.generatorCount);
      payload.generatorHours = Number(actForm.generatorHours);

      if (String(actForm.fuelUsed).trim() !== "") payload.fuelUsed = Number(actForm.fuelUsed);
      if (actForm.remark.trim()) payload.remark = actForm.remark.trim();

      if (actType === "CARGO_LOAD" || actType === "CARGO_DISCHARGE") {
        payload.containerCount = Number(actForm.containerCount);
        payload.totalContainerWeight = Number(actForm.totalContainerWeight);
      }

      if (actType === "FULL_SPEED_AWAY") {
        payload.avgSpeed = Number(actForm.avgSpeed);
      }
    }

    const ok = await alertConfirm({
      title: editActId ? "ยืนยันการแก้ไข Activity" : "ยืนยันการสร้าง Activity",
      text: `${editActId ? "แก้ไข" : "สร้าง"} ${typeLabel(actType)} ใช่หรือไม่`,
      confirmText: editActId ? "บันทึก" : "สร้าง",
      cancelText: "ยกเลิก",
    });

    if (!ok) return;

    setSavingAct(true);
    try {
      if (editActId) {
        await api.patch(API.updateActivity(editActId), payload);
        await alertSuccess("บันทึกสำเร็จ", "แก้ไข Activity เรียบร้อย");
      } else {
        await api.post(API.createActivity(voyageId), payload);
        await alertSuccess("สร้างสำเร็จ", "เพิ่ม Activity เรียบร้อย");
      }

      setOpenCreateAct(false);
      setEditActId(null);
      await loadActivities();
    } catch (err) {
      await alertError(
        editActId ? "บันทึกไม่สำเร็จ" : "สร้างไม่สำเร็จ",
        err?.response?.data?.message || "ไม่สามารถทำรายการได้"
      );
    } finally {
      setSavingAct(false);
    }
    };


    const deleteActivity = async (a) => {
      const ok = await alertConfirm({
        title: "ยืนยันการลบ",
        text: `ลบ ${typeLabel(a.type)} ใช่หรือไม่`,
        confirmText: "ลบ",
        cancelText: "ยกเลิก",
      });
      if (!ok) return;

      try {
        await api.delete(API.deleteActivity(a.id));
        await alertSuccess("ลบสำเร็จ", "ลบ Activity เรียบร้อย");
        await loadActivities();
      } catch (e) {
        await alertError(
          "ลบไม่สำเร็จ",
          e?.response?.data?.message || "ไม่สามารถลบ Activity ได้"
        );
      }
    };

    const openEditActivity = (a) => {
      setOpenCreateAct(true);
      setActStep("form");
      setEditActId(a.id);

      setActType(a.type);

      setActForm({
        startAt: a.startAt ? toDatetimeLocalValue(a.startAt) : "",
        endAt: a.endAt ? toDatetimeLocalValue(a.endAt) : "",

        containerCount: a.containerCount ?? "",
        totalContainerWeight: a.totalContainerWeight ?? "",

        avgSpeed: a.avgSpeed ?? "",

        reeferCount: a.reeferCount ?? "",
        mainEngineCount: a.mainEngineCount ?? "",
        mainEngineHours: a.mainEngineHours ?? "",
        generatorCount: a.generatorCount ?? "",
        generatorHours: a.generatorHours ?? "",
        fuelUsed: a.fuelUsed ?? "",
        remark: a.remark ?? "",
      });
    };


    const renderActFields = () => {
      if (!actType) return null;

      const isCargo = actType === "CARGO_LOAD" || actType === "CARGO_DISCHARGE";
      const isFSW = actType === "FULL_SPEED_AWAY";
      const isOther = actType === "OTHER";

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600">เวลาเริ่ม</label>
              <Input
                type="datetime-local"
                value={actForm.startAt}
                onChange={(e) => setActForm((p) => ({ ...p, startAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">เวลาสิ้นสุด</label>
              <Input
                type="datetime-local"
                value={actForm.endAt}
                onChange={(e) => setActForm((p) => ({ ...p, endAt: e.target.value }))}
              />
            </div>
          </div>

          {isOther ? (
            <div>
              <label className="text-sm text-slate-600">รายละเอียด</label>
              <Input
                value={actForm.remark}
                onChange={(e) => setActForm((p) => ({ ...p, remark: e.target.value }))}
                placeholder="กรอกรายละเอียด"
              />
            </div>
          ) : (
            <>
              {isCargo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600">จำนวนตู้</label>
                    <Input
                      value={actForm.containerCount}
                      onChange={(e) => setActForm((p) => ({ ...p, containerCount: e.target.value }))}
                      placeholder="เช่น 20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">น้ำหนักตู้ทั้งหมด</label>
                    <Input
                      value={actForm.totalContainerWeight}
                      onChange={(e) =>
                        setActForm((p) => ({ ...p, totalContainerWeight: e.target.value }))
                      }
                      placeholder="เช่น 350.5"
                    />
                  </div>
                </div>
              )}

              {isFSW && (
                <div>
                  <label className="text-sm text-slate-600">ความเร็วเฉลี่ย</label>
                  <Input
                    value={actForm.avgSpeed}
                    onChange={(e) => setActForm((p) => ({ ...p, avgSpeed: e.target.value }))}
                    placeholder="เช่น 12.5"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">จำนวนตู้ Reefer</label>
                  <Input
                    value={actForm.reeferCount}
                    onChange={(e) => setActForm((p) => ({ ...p, reeferCount: e.target.value }))}
                    placeholder="เช่น 3"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">ยอดน้ำมันที่ใช้ (ไม่บังคับ)</label>
                  <Input
                    value={actForm.fuelUsed}
                    onChange={(e) => setActForm((p) => ({ ...p, fuelUsed: e.target.value }))}
                    placeholder="เช่น 120.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">เครื่องจักรใหญ่ (จำนวน)</label>
                  <Input
                    value={actForm.mainEngineCount}
                    onChange={(e) => setActForm((p) => ({ ...p, mainEngineCount: e.target.value }))}
                    placeholder="เช่น 2"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">เครื่องจักรใหญ่ (ชั่วโมง)</label>
                  <Input
                    value={actForm.mainEngineHours}
                    onChange={(e) => setActForm((p) => ({ ...p, mainEngineHours: e.target.value }))}
                    placeholder="เช่น 4.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600">เครื่องไฟ (จำนวน)</label>
                  <Input
                    value={actForm.generatorCount}
                    onChange={(e) => setActForm((p) => ({ ...p, generatorCount: e.target.value }))}
                    placeholder="เช่น 1"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600">เครื่องไฟ (ชั่วโมง)</label>
                  <Input
                    value={actForm.generatorHours}
                    onChange={(e) => setActForm((p) => ({ ...p, generatorHours: e.target.value }))}
                    placeholder="เช่น 2"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-600">หมายเหตุ (ถ้ามี กรุณาใส่ท่าเรือ)</label>
                <Input
                  value={actForm.remark}
                  onChange={(e) => setActForm((p) => ({ ...p, remark: e.target.value }))}
                  placeholder="เช่น รายละเอียดเพิ่มเติม หรือชื่อท่าเรือ"
                />
              </div>
            </>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft size={16} />
              กลับ
            </Button>

            <div>
              <div className="text-2xl font-semibold flex items-center gap-2">
                <Route size={22} />
                {title}
              </div>
              <div className="text-sm text-slate-500">รายละเอียด</div>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="font-medium">ข้อมูล</div>

              <div className="flex gap-2">
                <TabButton
                  active={tab === "activity"}
                  onClick={() => setTab("activity")}
                  icon={ClipboardList}
                >
                  Activity
                </TabButton>
                <TabButton
                  active={tab === "consumption"}
                  onClick={() => setTab("consumption")}
                  icon={Droplets}
                >
                  Consumption
                </TabButton>
              </div>
            </div>
          </CardHeader>

          <CardBody>
            {loading ? (
              <div className="text-sm text-slate-500">กำลังโหลด...</div>
            ) : !voy ? (
              <div className="text-sm text-slate-500">ไม่พบข้อมูล</div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">voyNo</div>
                    <div className="text-sm font-semibold text-slate-900">{voy.voyNo ?? "-"}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">เริ่ม</div>
                    <div className="text-sm text-slate-900">{fmtDateTime(voy.startAt)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">สิ้นสุด</div>
                    <div className="text-sm text-slate-900">{fmtDateTime(voy.endAt)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">เดือน/ปี ที่บันทึก</div>
                    <div className="text-sm text-slate-900">
                      {voy.postingMonth && voy.postingYear ? `${voy.postingMonth}/${voy.postingYear}` : "-"}
                    </div>
                  </div>
                </div>

                {tab === "activity" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">Activity</div>
                      <Button onClick={openCreateActivity} className="gap-2">
                        <Plus size={16} />
                        สร้าง Activity
                      </Button>
                    </div>

                    {/* SUM */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">จำนวนรายการ</div>
                        <div className="text-lg font-semibold text-slate-900">{sums.count}</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">ชั่วโมงรวม</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {sums.durationHours.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">FuelUsed รวม</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {sums.fuelUsed.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">Reefer รวม</div>
                        <div className="text-lg font-semibold text-slate-900">{sums.reeferCount}</div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">MainEngineHours รวม</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {sums.mainEngineHours.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">GeneratorHours รวม</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {sums.generatorHours.toFixed(2)}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">จำนวนตู้รวม (Cargo)</div>
                        <div className="text-lg font-semibold text-slate-900">{sums.containerCount}</div>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-3">
                        <div className="text-xs text-slate-500">น้ำหนักรวม (Cargo)</div>
                        <div className="text-lg font-semibold text-slate-900">
                          {sums.totalContainerWeight.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* LIST */}
                    {loadingActivities ? (
                      <div className="text-sm text-slate-500">กำลังโหลด...</div>
                    ) : activities.length === 0 ? (
                      <div className="text-sm text-slate-500">ยังไม่มี Activity</div>
                    ) : (
                      <div className="overflow-auto rounded-xl border border-slate-100">
                        <table className="min-w-full text-sm">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="text-left font-medium px-4 py-3">ประเภท</th>
                              <th className="text-left font-medium px-4 py-3">เริ่ม</th>
                              <th className="text-left font-medium px-4 py-3">สิ้นสุด</th>
                              <th className="text-left font-medium px-4 py-3">ชั่วโมง</th>
                              <th className="text-left font-medium px-4 py-3">FuelUsed</th>
                              <th className="text-right font-medium px-4 py-3">ตัวเลือก</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activities.map((a) => (
                              <tr key={a.id} className="border-t border-slate-100 hover:bg-white">
                                <td className="px-4 py-3 text-slate-900">{typeLabel(a.type)}</td>
                                <td className="px-4 py-3 text-slate-700">{fmtDateTime(a.startAt)}</td>
                                <td className="px-4 py-3 text-slate-700">{fmtDateTime(a.endAt)}</td>
                                <td className="px-4 py-3 text-slate-700">
                                  {hoursBetween(a.startAt, a.endAt).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {a.fuelUsed != null ? Number(a.fuelUsed).toFixed(2) : "-"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="inline-flex gap-2">
                                    <Button
                                      variant="ghost"
                                      className="gap-2"
                                      onClick={() => openEditActivity(a)}
                                    >
                                      <Pencil size={16} />
                                      แก้ไข
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      className="gap-2 text-rose-700"
                                      onClick={() => deleteActivity(a)}
                                    >
                                      <Trash2 size={16} />
                                      ลบ
                                    </Button>
                                  </div>
                                </td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 p-4">
                    <div className="font-medium text-slate-900 mb-1">Consumption</div>
                    <div className="text-sm text-slate-500">ต่อไปค่อยทำ</div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Create Activity Modal */}
        {openCreateAct && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={closeCreateActivity} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2">
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{editActId ? "แก้ไข Activity" : "สร้าง Activity"}</div>
                    <Button variant="ghost" onClick={closeCreateActivity} disabled={savingAct}>
                      <X size={18} />
                    </Button>
                  </div>
                </CardHeader>

                <CardBody>
                  {actStep === "type" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-600">ประเภท</label>
                        <Select value={actType} onChange={(e) => setActType(e.target.value)}>
                          <option value="">-- เลือก --</option>
                          {ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={closeCreateActivity}>
                          ยกเลิก
                        </Button>
                        <Button type="button" className="gap-2" onClick={goNextToForm}>
                          ถัดไป
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form className="space-y-3" onSubmit={submitCreateActivity}>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          ประเภท: <span className="font-medium text-slate-900">{typeLabel(actType)}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setActStep("type")}
                          disabled={savingAct}
                        >
                          เปลี่ยนประเภท
                        </Button>
                      </div>

                      {renderActFields()}

                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={closeCreateActivity} disabled={savingAct}>
                          ยกเลิก
                        </Button>
                        <Button type="submit" disabled={savingAct} className="gap-2">
                          <Plus size={16} />
                          {savingAct ? "กำลังบันทึก..." : editActId ? "บันทึก" : "สร้าง"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }
