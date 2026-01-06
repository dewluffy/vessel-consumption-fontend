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

import { alertConfirm, alertError, alertSuccess } from "../lib/alert";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

import { useVoyDetailStore } from "../stores/voyDetail.store";

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
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition cursor-pointer",
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

export default function VoyDetailPage() {
  const { id } = useParams();
  const voyageId = Number(id);
  const navigate = useNavigate();

  const {
    voy,
    activities,
    fuel,
    loadingVoy,
    loadingActivities,
    loadingFuel,
    fetchAll,
    fetchActivities,
    fetchFuel,
    createActivity,
    updateActivity,
    deleteActivity,
    updateFuelRob,
    createFuelBunker,
    updateFuelBunker,
    deleteFuelBunker,
  } = useVoyDetailStore();

  const [tab, setTab] = useState("activity");

  // Activity modal
  const [openActModal, setOpenActModal] = useState(false);
  const [savingAct, setSavingAct] = useState(false);
  const [actStep, setActStep] = useState("type"); // type | form
  const [editActId, setEditActId] = useState(null);
  const [actType, setActType] = useState("");
  const [actForm, setActForm] = useState({
    startAt: "",
    endAt: "",
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

  // Fuel form
  const [fuelRobForm, setFuelRobForm] = useState({ openingRob: "", closingRob: "" });

  // Bunker modal
  const [openBunkerModal, setOpenBunkerModal] = useState(false);
  const [savingBunker, setSavingBunker] = useState(false);
  const [editBunkerId, setEditBunkerId] = useState(null);
  const [bunkerForm, setBunkerForm] = useState({ at: "", amount: "", remark: "" });

  const title = useMemo(() => {
    if (!voy) return `Voy #${id}`;
    return voy.voyNo ? `Voy ${voy.voyNo}` : `Voy #${voy.id}`;
  }, [voy, id]);

  useEffect(() => {
    if (!Number.isFinite(voyageId) || voyageId <= 0) return;
    (async () => {
      try {
        await fetchAll(voyageId);
      } catch (e) {
        await alertError(
          "โหลดข้อมูลไม่สำเร็จ",
          e?.response?.data?.message || e?.message || "ไม่สามารถโหลดข้อมูลได้"
        );
      }
    })();
  }, [voyageId, fetchAll]);

  useEffect(() => {
    // sync fuel rob form when fuel loaded
    if (!fuel?.rob) return;
    setFuelRobForm({
      openingRob: String(fuel.rob.openingRob ?? 0),
      closingRob: String(fuel.rob.closingRob ?? 0),
    });
  }, [fuel]);

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
      fswAvgSpeedSum: 0,
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
        base.fswAvgSpeedSum += Number(a.avgSpeed) || 0;
        base.fswCount += 1;
      }
    }

    return {
      ...base,
      fswAvg: base.fswCount ? base.fswAvgSpeedSum / base.fswCount : 0,
    };
  }, [activities]);

  const fuelConsumedFromActivities = useMemo(() => {
    const v = fuel?.computed?.consumedFromActivities;
    if (v != null) return Number(v) || 0;
    return Number(sums.fuelUsed) || 0;
  }, [fuel, sums]);

  const fuelBunkeredTotal = useMemo(() => {
    const list = fuel?.bunkers ?? [];
    return list.reduce((acc, b) => acc + (Number(b.amount ?? 0) || 0), 0);
  }, [fuel]);

  const expectedClosing = useMemo(() => {
    const opening = Number(fuelRobForm.openingRob ?? 0) || 0;
    return opening + fuelBunkeredTotal - fuelConsumedFromActivities;
  }, [fuelRobForm.openingRob, fuelBunkeredTotal, fuelConsumedFromActivities]);

  const diff = useMemo(() => {
    const closing = Number(fuelRobForm.closingRob ?? 0) || 0;
    return closing - expectedClosing;
  }, [fuelRobForm.closingRob, expectedClosing]);

  const openCreateActivity = () => {
    const now = new Date();
    setOpenActModal(true);
    setSavingAct(false);
    setEditActId(null);
    setActStep("type");
    setActType("");
    setActForm({
      startAt: toDatetimeLocalValue(now),
      endAt: toDatetimeLocalValue(now),
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

  const openEditActivity = (a) => {
    setOpenActModal(true);
    setSavingAct(false);
    setEditActId(a.id);
    setActStep("form");
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

  const closeActModal = () => {
    if (savingAct) return;
    setOpenActModal(false);
    setEditActId(null);
  };

  const goNextToActForm = async () => {
    if (!actType) {
      await alertError("ข้อมูลไม่ครบ", "กรุณาเลือกประเภท Activity");
      return;
    }
    setActStep("form");
  };

  const validateActForm = () => {
    if (!actType) return "กรุณาเลือกประเภท Activity";
    if (!actForm.startAt || !actForm.endAt) return "กรุณาเลือกเวลาเริ่ม/สิ้นสุด";

    const s = new Date(toISOFromDatetimeLocal(actForm.startAt));
    const e = new Date(toISOFromDatetimeLocal(actForm.endAt));
    if (e <= s) return "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม";

    if (actType === "OTHER") {
      if (!actForm.remark.trim()) return "กรุณากรอกรายละเอียด";
      return null;
    }

    const required = [
      ["reeferCount", "จำนวนตู้ Reefer"],
      ["mainEngineCount", "จำนวนเครื่องจักรใหญ่"],
      ["mainEngineHours", "ชั่วโมงเครื่องจักรใหญ่"],
      ["generatorCount", "จำนวนเครื่องไฟ"],
      ["generatorHours", "ชั่วโมงเครื่องไฟ"],
    ];

    for (const [k, label] of required) {
      if (String(actForm[k] ?? "").trim() === "") return `กรุณากรอก ${label}`;
    }

    if (actType === "CARGO_LOAD" || actType === "CARGO_DISCHARGE") {
      if (String(actForm.containerCount ?? "").trim() === "") return "กรุณากรอกจำนวนตู้";
      if (String(actForm.totalContainerWeight ?? "").trim() === "") return "กรุณากรอกน้ำหนักตู้ทั้งหมด";
    }

    if (actType === "FULL_SPEED_AWAY") {
      if (String(actForm.avgSpeed ?? "").trim() === "") return "กรุณากรอกความเร็วเฉลี่ย";
    }

    return null;
  };

  const submitActivity = async (e) => {
    e.preventDefault();

    const msg = validateActForm();
    if (msg) {
      await alertError("ข้อมูลไม่ครบ/ไม่ถูกต้อง", msg);
      return;
    }

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

      if (String(actForm.fuelUsed ?? "").trim() !== "") payload.fuelUsed = Number(actForm.fuelUsed);
      if (actForm.remark?.trim()) payload.remark = actForm.remark.trim();

      if (actType === "CARGO_LOAD" || actType === "CARGO_DISCHARGE") {
        payload.containerCount = Number(actForm.containerCount);
        payload.totalContainerWeight = Number(actForm.totalContainerWeight);
      }

      if (actType === "FULL_SPEED_AWAY") {
        payload.avgSpeed = Number(actForm.avgSpeed);
      }
    }

    const ok = await alertConfirm({
      title: editActId ? "ยืนยันการบันทึก" : "ยืนยันการสร้าง",
      text: `${editActId ? "บันทึก" : "สร้าง"} ${typeLabel(actType)} ใช่หรือไม่`,
      confirmText: editActId ? "บันทึก" : "สร้าง",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setSavingAct(true);
    try {
      if (editActId) {
        await updateActivity(editActId, payload);
        await alertSuccess("บันทึกสำเร็จ", "แก้ไข Activity เรียบร้อย");
      } else {
        await createActivity(voyageId, payload);
        await alertSuccess("สร้างสำเร็จ", "เพิ่ม Activity เรียบร้อย");
      }

      setOpenActModal(false);
      setEditActId(null);

      await fetchActivities(voyageId);
      await fetchFuel(voyageId);
    } catch (err) {
      await alertError(
        "ทำรายการไม่สำเร็จ",
        err?.response?.data?.message || err?.message || "ไม่สามารถทำรายการได้"
      );
    } finally {
      setSavingAct(false);
    }
  };

  const onDeleteActivity = async (a) => {
    const ok = await alertConfirm({
      title: "ยืนยันการลบ",
      text: `ลบ ${typeLabel(a.type)} ใช่หรือไม่`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    try {
      await deleteActivity(a.id);
      await alertSuccess("ลบสำเร็จ", "ลบ Activity เรียบร้อย");
      await fetchActivities(voyageId);
      await fetchFuel(voyageId);
    } catch (err) {
      await alertError(
        "ลบไม่สำเร็จ",
        err?.response?.data?.message || err?.message || "ไม่สามารถลบ Activity ได้"
      );
    }
  };

  const saveRob = async () => {
    const opening = Number(fuelRobForm.openingRob);
    const closing = Number(fuelRobForm.closingRob);

    if (Number.isNaN(opening) || opening < 0) return alertError("ข้อมูลไม่ถูกต้อง", "น้ำมันคงเหลือตอนเริ่มงาน ต้องเป็นตัวเลขและ >= 0");
    if (Number.isNaN(closing) || closing < 0) return alertError("ข้อมูลไม่ถูกต้อง", "น้ำมันคงเหลือตอนจบงาน ต้องเป็นตัวเลขและ >= 0");

    const ok = await alertConfirm({
      title: "ยืนยันการบันทึก",
      text: "ต้องการบันทึก Opening/Closing ROB ใช่หรือไม่",
      confirmText: "บันทึก",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    try {
      await updateFuelRob(voyageId, { openingRob: opening, closingRob: closing, unit: "L" });
      await alertSuccess("บันทึกสำเร็จ", "อัปเดต ROB เรียบร้อย");
      await fetchFuel(voyageId);
    } catch (err) {
      await alertError(
        "บันทึกไม่สำเร็จ",
        err?.response?.data?.message || err?.message || "ไม่สามารถบันทึก ROB ได้"
      );
    }
  };

  const openCreateBunker = () => {
    const now = new Date();
    setOpenBunkerModal(true);
    setSavingBunker(false);
    setEditBunkerId(null);
    setBunkerForm({ at: toDatetimeLocalValue(now), amount: "", remark: "" });
  };

  const openEditBunker = (b) => {
    setOpenBunkerModal(true);
    setSavingBunker(false);
    setEditBunkerId(b.id);
    setBunkerForm({
      at: b.at ? toDatetimeLocalValue(b.at) : "",
      amount: b.amount ?? "",
      remark: b.remark ?? "",
    });
  };

  const closeBunkerModal = () => {
    if (savingBunker) return;
    setOpenBunkerModal(false);
    setEditBunkerId(null);
  };

  const submitBunker = async (e) => {
    e.preventDefault();

    if (!bunkerForm.at) return alertError("ข้อมูลไม่ครบ", "กรุณาเลือกวันที่/เวลา");
    const amount = Number(bunkerForm.amount);
    if (Number.isNaN(amount) || amount <= 0) return alertError("ข้อมูลไม่ถูกต้อง", "จำนวนที่เติมต้องเป็นตัวเลขและ > 0");

    const ok = await alertConfirm({
      title: editBunkerId ? "ยืนยันการบันทึก" : "ยืนยันการเพิ่ม",
      text: "ต้องการบันทึกใช่หรือไม่",
      confirmText: editBunkerId ? "บันทึก" : "เพิ่ม",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setSavingBunker(true);
    try {
      const payload = {
        at: toISOFromDatetimeLocal(bunkerForm.at),
        amount,
        unit: "L",
        remark: bunkerForm.remark?.trim() || undefined,
      };

      if (editBunkerId) {
        await updateFuelBunker(editBunkerId, payload);
        await alertSuccess("บันทึกสำเร็จ", "แก้ไขรายการเติมเรียบร้อย");
      } else {
        await createFuelBunker(voyageId, payload);
        await alertSuccess("เพิ่มสำเร็จ", "เพิ่มรายการเติมเรียบร้อย");
      }

      closeBunkerModal();
      await fetchFuel(voyageId);
    } catch (err) {
      await alertError(
        "ทำรายการไม่สำเร็จ",
        err?.response?.data?.message || err?.message || "ไม่สามารถทำรายการได้"
      );
    } finally {
      setSavingBunker(false);
    }
  };

  const onDeleteBunker = async (b) => {
    const ok = await alertConfirm({
      title: "ยืนยันการลบ",
      text: "ต้องการลบรายการเติมใช่หรือไม่",
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    try {
      await deleteFuelBunker(b.id);
      await alertSuccess("ลบสำเร็จ", "ลบรายการเติมเรียบร้อย");
      await fetchFuel(voyageId);
    } catch (err) {
      await alertError(
        "ลบไม่สำเร็จ",
        err?.response?.data?.message || err?.message || "ไม่สามารถลบรายการเติมได้"
      );
    }
  };

  const renderActFields = () => {
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
                    onChange={(e) => setActForm((p) => ({ ...p, totalContainerWeight: e.target.value }))}
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
              <label className="text-sm text-slate-600">หมายเหตุ</label>
              <Input
                value={actForm.remark}
                onChange={(e) => setActForm((p) => ({ ...p, remark: e.target.value }))}
                placeholder="เช่น ชื่อท่าเรือ"
              />
            </div>
          </>
        )}
      </div>
    );
  };

  const loading = loadingVoy;
  const hasVoy = !!voy;

  const byTypeRows = useMemo(() => {
    const map = fuel?.computed?.byActivityType;
    if (map && typeof map === "object" && Object.keys(map).length > 0) {
      return ACTIVITY_TYPES.filter((t) => t.value !== "OTHER").map((t) => ({
        type: t.value,
        label: t.label,
        sum: Number(map[t.value] ?? 0) || 0,
      }));
    }

    return ACTIVITY_TYPES.filter((t) => t.value !== "OTHER").map((t) => {
      const sum = activities
        .filter((a) => a.type === t.value)
        .reduce((acc, a) => acc + (Number(a.fuelUsed ?? 0) || 0), 0);
      return { type: t.value, label: t.label, sum };
    });
  }, [fuel, activities]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 cursor-pointer">
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
              <TabButton active={tab === "activity"} onClick={() => setTab("activity")} icon={ClipboardList}>
                Activity
              </TabButton>
              <TabButton active={tab === "consumption"} onClick={() => setTab("consumption")} icon={Droplets}>
                Consumption
              </TabButton>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {loading ? (
            <div className="text-sm text-slate-500">กำลังโหลด...</div>
          ) : !hasVoy ? (
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
                    <Button onClick={openCreateActivity} className="gap-2 cursor-pointer">
                      <Plus size={16} />
                      สร้าง Activity
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="text-xs text-slate-500">จำนวนรายการ</div>
                      <div className="text-lg font-semibold text-slate-900">{sums.count}</div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="text-xs text-slate-500">ชั่วโมงรวม</div>
                      <div className="text-lg font-semibold text-slate-900">{sums.durationHours.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="text-xs text-slate-500">FuelUsed รวม</div>
                      <div className="text-lg font-semibold text-slate-900">{sums.fuelUsed.toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-white p-3">
                      <div className="text-xs text-slate-500">Reefer รวม</div>
                      <div className="text-lg font-semibold text-slate-900">{sums.reeferCount}</div>
                    </div>
                  </div>

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
                                  <Button variant="ghost" className="gap-2 cursor-pointer" onClick={() => openEditActivity(a)}>
                                    <Pencil size={16} />
                                    แก้ไข
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="gap-2 text-rose-700 cursor-pointer"
                                    onClick={() => onDeleteActivity(a)}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">Consumption (Fuel)</div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => fetchFuel(voyageId)} className="cursor-pointer">
                        รีเฟรช
                      </Button>
                      <Button onClick={openCreateBunker} className="gap-2 cursor-pointer">
                        <Plus size={16} />
                        เพิ่มรายการเติม
                      </Button>
                    </div>
                  </div>

                  {loadingFuel ? (
                    <div className="text-sm text-slate-500">กำลังโหลด...</div>
                  ) : (
                    <>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-slate-100 bg-white p-4">
                          <div className="text-xs text-slate-500 mb-2">น้ำมันคงเหลือตอนเริ่มงาน (ลิตร)</div>
                          <Input
                            value={fuelRobForm.openingRob}
                            onChange={(e) => setFuelRobForm((p) => ({ ...p, openingRob: e.target.value }))}
                            placeholder="เช่น 12000"
                          />
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-white p-4">
                          <div className="text-xs text-slate-500 mb-2">น้ำมันคงเหลือตอนจบงาน (ลิตร)</div>
                          <Input
                            value={fuelRobForm.closingRob}
                            onChange={(e) => setFuelRobForm((p) => ({ ...p, closingRob: e.target.value }))}
                            placeholder="เช่น 8600"
                          />
                        </div>

                        <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-col justify-between">
                          <div>
                            <div className="text-xs text-slate-500">ตรวจสอบ</div>
                            <div className="mt-2 space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Consumed</span>
                                <span className="font-medium text-slate-900">{fuelConsumedFromActivities.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Total Fuel Bunkered</span>
                                <span className="font-medium text-slate-900">{fuelBunkeredTotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Expected Closing</span>
                                <span className="font-semibold text-slate-900">{expectedClosing.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Diff</span>
                                <span
                                  className={[
                                    "font-semibold",
                                    Math.abs(diff) <= 0.01 ? "text-emerald-700" : "text-amber-700",
                                  ].join(" ")}
                                >
                                  {diff.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3">
                            <Button onClick={saveRob} className="w-full cursor-pointer">
                              บันทึก ROB
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <div className="font-medium text-slate-900 mb-3">สรุปการใช้งานตาม Activity</div>
                        <div className="overflow-auto rounded-xl border border-slate-100">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                <th className="text-left font-medium px-4 py-3">ประเภท</th>
                                <th className="text-right font-medium px-4 py-3">FuelUsed (ลิตร)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {byTypeRows.map((r) => (
                                <tr key={r.type} className="border-t border-slate-100">
                                  <td className="px-4 py-3 text-slate-900">{r.label}</td>
                                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{r.sum.toFixed(2)}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-slate-100 bg-slate-50">
                                <td className="px-4 py-3 text-slate-900 font-semibold">รวม</td>
                                <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                                  {fuelConsumedFromActivities.toFixed(2)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-100 bg-white p-4">
                        <div className="font-medium text-slate-900 mb-3">รายการเติมน้ำมัน</div>

                        {fuel?.bunkers?.length ? (
                          <div className="overflow-auto rounded-xl border border-slate-100">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50 text-slate-600">
                                <tr>
                                  <th className="text-left font-medium px-4 py-3">วันที่/เวลา</th>
                                  <th className="text-right font-medium px-4 py-3">จำนวน (ลิตร)</th>
                                  <th className="text-left font-medium px-4 py-3">หมายเหตุ</th>
                                  <th className="text-right font-medium px-4 py-3">ตัวเลือก</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fuel.bunkers.map((b) => (
                                  <tr key={b.id} className="border-t border-slate-100 hover:bg-white">
                                    <td className="px-4 py-3 text-slate-700">{fmtDateTime(b.at)}</td>
                                    <td className="px-4 py-3 text-right text-slate-900 font-medium">
                                      {(Number(b.amount ?? 0) || 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700">{b.remark || "-"}</td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="inline-flex gap-2">
                                        <Button
                                          variant="ghost"
                                          className="gap-2 cursor-pointer"
                                          onClick={() => openEditBunker(b)}
                                        >
                                          <Pencil size={16} />
                                          แก้ไข
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          className="gap-2 text-rose-700 cursor-pointer"
                                          onClick={() => onDeleteBunker(b)}
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
                        ) : (
                          <div className="text-sm text-slate-500">ยังไม่มีรายการเติม</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {openActModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeActModal} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{editActId ? "แก้ไข Activity" : "สร้าง Activity"}</div>
                  <Button variant="ghost" onClick={closeActModal} disabled={savingAct} className="cursor-pointer">
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
                      <Button type="button" variant="ghost" onClick={closeActModal} className="cursor-pointer">
                        ยกเลิก
                      </Button>
                      <Button type="button" className="gap-2 cursor-pointer" onClick={goNextToActForm}>
                        ถัดไป
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form className="space-y-3" onSubmit={submitActivity}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        ประเภท: <span className="font-medium text-slate-900">{typeLabel(actType)}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setActStep("type")}
                        disabled={savingAct}
                        className="cursor-pointer"
                      >
                        เปลี่ยนประเภท
                      </Button>
                    </div>

                    {renderActFields()}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={closeActModal} disabled={savingAct} className="cursor-pointer">
                        ยกเลิก
                      </Button>
                      <Button type="submit" disabled={savingAct} className="gap-2 cursor-pointer">
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

      {openBunkerModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={closeBunkerModal} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{editBunkerId ? "แก้ไขรายการเติม" : "เพิ่มรายการเติม"}</div>
                  <Button variant="ghost" onClick={closeBunkerModal} disabled={savingBunker} className="cursor-pointer">
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                <form className="space-y-3" onSubmit={submitBunker}>
                  <div>
                    <label className="text-sm text-slate-600">วันที่/เวลา</label>
                    <Input
                      type="datetime-local"
                      value={bunkerForm.at}
                      onChange={(e) => setBunkerForm((p) => ({ ...p, at: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">จำนวน (ลิตร)</label>
                    <Input
                      value={bunkerForm.amount}
                      onChange={(e) => setBunkerForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="เช่น 5000"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">หมายเหตุ (ถ้ามี)</label>
                    <Input
                      value={bunkerForm.remark}
                      onChange={(e) => setBunkerForm((p) => ({ ...p, remark: e.target.value }))}
                      placeholder="เช่น ท่าเรือ"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={closeBunkerModal} disabled={savingBunker} className="cursor-pointer">
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={savingBunker} className="cursor-pointer">
                      {savingBunker ? "กำลังบันทึก..." : editBunkerId ? "บันทึก" : "เพิ่ม"}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
