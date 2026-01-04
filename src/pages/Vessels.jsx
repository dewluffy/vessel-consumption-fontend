import { useEffect, useMemo, useState } from "react";
import { Plus, Ship, UserPlus, X, Search } from "lucide-react";

import { api } from "../lib/api";
import { alertConfirm, alertError, alertSuccess } from "../lib/alert";
import { useAuthStore } from "../stores/auth.store";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function Vessels() {
  const me = useAuthStore((s) => s.me);
  const canManage = useMemo(
    () => ["SUPERVISOR", "MANAGER", "ADMIN"].includes(me?.role),
    [me?.role]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create vessel modal
  const [openCreate, setOpenCreate] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", code: "" });

  // Assign modal
  const [openAssign, setOpenAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);

  const [userQ, setUserQ] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/vessels");
      setItems(Array.isArray(data) ? data : data?.vessels ?? []);
    } catch (e) {
      await alertError(
        "โหลดข้อมูลไม่สำเร็จ",
        e?.response?.data?.message || "ไม่สามารถโหลดรายการเรือได้"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async (q = "") => {
  setLoadingUsers(true);
  try {
    const { data } = await api.get("/api/users", {
      params: {
        role: "EMPLOYEE",
        unassigned: true, // ✅ เอาเฉพาะคนที่ยังไม่ถูก assign
        minimal: true,    // ✅ เอาเบา ๆ สำหรับ dropdown
        q: q || undefined,
      },
    });
    setEmployeeList(Array.isArray(data) ? data : data?.users ?? []);
  } catch (e) {
    await alertError(
      "โหลดรายชื่อไม่สำเร็จ",
      e?.response?.data?.message || "ไม่สามารถโหลดรายชื่อพนักงานได้"
    );
  } finally {
    setLoadingUsers(false);
  }
};

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Create Vessel ----------
  const onOpenCreate = () => {
    setCreateForm({ name: "", code: "" });
    setOpenCreate(true);
  };

  const onCloseCreate = () => {
    if (savingCreate) return;
    setOpenCreate(false);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const name = createForm.name.trim();
    const code = createForm.code.trim();

    if (!name) return alertError("ข้อมูลไม่ครบ", "กรุณากรอกชื่อเรือ");

    const ok = await alertConfirm({
      title: "ยืนยันการเพิ่มเรือ",
      text: `เพิ่มเรือ "${name}" ใช่หรือไม่`,
      confirmText: "เพิ่มเรือ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setSavingCreate(true);
    try {
      await api.post("/api/vessels", {
        name,
        code: code || undefined,
      });
      setOpenCreate(false);
      await alertSuccess("เพิ่มสำเร็จ", "เพิ่มเรือเรียบร้อย");
      await load();
    } catch (e2) {
      await alertError("เพิ่มไม่สำเร็จ", e2?.response?.data?.message || "ไม่สามารถเพิ่มเรือได้");
    } finally {
      setSavingCreate(false);
    }
  };

  // ---------- Assign Responsible ----------
  const onOpenAssign = async (vessel) => {
    setSelectedVessel(vessel);
    setSelectedUserId("");
    setUserQ("");
    setEmployeeList([]);
    setOpenAssign(true);
    await loadEmployees("");
  };

  const onCloseAssign = () => {
    if (assigning) return;
    setOpenAssign(false);
    setSelectedVessel(null);
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!selectedVessel?.id) return;

    const userId = Number(selectedUserId);
    if (!userId) return alertError("ข้อมูลไม่ครบ", "กรุณาเลือกผู้รับผิดชอบ");

    const emp = employeeList.find((x) => x.id === userId);
    const empLabel = emp?.name || emp?.email || `ID ${userId}`;

    const ok = await alertConfirm({
      title: "ยืนยันการเพิ่มผู้รับผิดชอบ",
      text: `กำหนด "${empLabel}" เป็นผู้รับผิดชอบเรือ "${selectedVessel.name}" ใช่หรือไม่`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setAssigning(true);
    try {
      await api.post(`/api/vessels/${selectedVessel.id}/assign`, { userId });
      setOpenAssign(false);
      setSelectedVessel(null);
      await alertSuccess("สำเร็จ", "เพิ่มผู้รับผิดชอบเรียบร้อย");
      await load();
    } catch (e2) {
      await alertError("ทำรายการไม่สำเร็จ", e2?.response?.data?.message || "ไม่สามารถเพิ่มผู้รับผิดชอบได้");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Ship size={22} />
            เรือ
          </div>
          <div className="text-sm text-slate-500">รายการเรือในระบบ</div>
        </div>

        {canManage && (
          <Button className="gap-2" onClick={onOpenCreate}>
            <Plus size={16} />
            เพิ่มเรือ
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">กำลังโหลด...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">ยังไม่มีข้อมูลเรือ</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => {
            const responsible = v.assignments?.[0]?.user; // จาก backend select
            const hasResponsible = Boolean(responsible?.id);

            return (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">ชื่อเรือ</div>
                    <div className="font-semibold text-slate-900 truncate">{v.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Code: <span className="text-slate-700">{v.code ?? "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">ผู้รับผิดชอบ</div>
                  <div className="text-sm text-slate-900">
                    {hasResponsible ? (responsible.name ?? responsible.email) : <span className="text-slate-400">-</span>}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    สร้างเมื่อ: <span className="text-slate-700">{fmtDate(v.createdAt)}</span>
                  </div>

                  {canManage && !hasResponsible && (
                    <Button variant="ghost" className="gap-2" onClick={() => onOpenAssign(v)}>
                      <UserPlus size={16} />
                      เพิ่มผู้รับผิดชอบ
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Vessel Modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseCreate} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">เพิ่มเรือ</div>
                  <Button variant="ghost" onClick={onCloseCreate} disabled={savingCreate}>
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                <form className="space-y-3" onSubmit={submitCreate}>
                  <div>
                    <label className="text-sm text-slate-600">ชื่อเรือ</label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="เช่น BBS Vessel 01"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">Code (ไม่บังคับ)</label>
                    <Input
                      value={createForm.code}
                      onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                      placeholder="เช่น BBS-01"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onCloseCreate} disabled={savingCreate}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={savingCreate} className="gap-2">
                      <Plus size={16} />
                      {savingCreate ? "กำลังบันทึก..." : "เพิ่มเรือ"}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {openAssign && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseAssign} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">
                    เพิ่มผู้รับผิดชอบ: {selectedVessel?.name}
                  </div>
                  <Button variant="ghost" onClick={onCloseAssign} disabled={assigning}>
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                <form className="space-y-3" onSubmit={submitAssign}>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="ค้นหาพนักงาน (ชื่อ/อีเมล)"
                      value={userQ}
                      onChange={(e) => setUserQ(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          await loadEmployees(userQ);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">เลือกผู้รับผิดชอบ</label>
                    <Select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      disabled={loadingUsers}
                    >
                      <option value="">-- เลือก --</option>
                      {employeeList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name ? `${u.name} (${u.email})` : u.email}
                        </option>
                      ))}
                    </Select>
                    {loadingUsers && <div className="text-xs text-slate-500 mt-1">กำลังโหลดรายชื่อ...</div>}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onCloseAssign} disabled={assigning}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={assigning} className="gap-2">
                      <UserPlus size={16} />
                      {assigning ? "กำลังบันทึก..." : "ยืนยัน"}
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
