import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, X, Pencil, Trash2 } from "lucide-react";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { api } from "../lib/api";
import { alertConfirm, alertError, alertSuccess } from "../lib/alert";

const ROLE_OPTIONS = ["EMPLOYEE", "SUPERVISOR", "MANAGER", "ADMIN"];

function RoleBadge({ role }) {
  const cls =
    role === "ADMIN"
      ? "bg-rose-50 text-rose-700 border-rose-100"
      : role === "MANAGER"
        ? "bg-indigo-50 text-indigo-700 border-indigo-100"
        : role === "SUPERVISOR"
          ? "bg-amber-50 text-amber-700 border-amber-100"
          : "bg-slate-50 text-slate-700 border-slate-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {role}
    </span>
  );
}

function fmtDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    role: "EMPLOYEE",
    password: "",
  });

  // Edit modal
  const [openEdit, setOpenEdit] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    role: "EMPLOYEE",
    password: "", // optional (reset)
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = (u.name ?? "").toLowerCase();
      const role = (u.role ?? "").toLowerCase();
      return email.includes(s) || name.includes(s) || role.includes(s);
    });
  }, [items, q]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/users");
      setItems(Array.isArray(data) ? data : data?.users ?? []);
    } catch (e) {
      await alertError(
        "โหลดข้อมูลไม่สำเร็จ",
        e?.response?.data?.message || "ไม่สามารถโหลดรายการผู้ใช้งานได้"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Create ----------
  const onOpenCreate = () => {
    setCreateForm({ email: "", name: "", role: "EMPLOYEE", password: "" });
    setOpenCreate(true);
  };

  const onCloseCreate = () => {
    if (savingCreate) return;
    setOpenCreate(false);
  };

  const submitCreate = async (e) => {
    e.preventDefault();

    const email = createForm.email.trim();
    const name = createForm.name.trim();
    const role = createForm.role;
    const password = createForm.password;

    if (!email) return alertError("ข้อมูลไม่ครบ", "กรุณากรอกอีเมล");
    if (!password || password.length < 6)
      return alertError("ข้อมูลไม่ถูกต้อง", "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");
    if (!ROLE_OPTIONS.includes(role)) return alertError("ข้อมูลไม่ถูกต้อง", "Role ไม่ถูกต้อง");

    const ok = await alertConfirm({
      title: "ยืนยันการสร้างผู้ใช้งาน",
      text: `สร้างผู้ใช้ ${email} (Role: ${role}) ใช่หรือไม่`,
      confirmText: "สร้างผู้ใช้งาน",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setSavingCreate(true);
    try {
      await api.post("/api/users", {
        email,
        name: name || undefined,
        role,
        password, // admin/supervisor/manager กำหนดให้
      });

      setOpenCreate(false);
      await alertSuccess("สร้างสำเร็จ", "เพิ่มผู้ใช้งานเรียบร้อย");
      await load();
    } catch (e2) {
      await alertError("สร้างไม่สำเร็จ", e2?.response?.data?.message || "ไม่สามารถสร้างผู้ใช้งานได้");
    } finally {
      setSavingCreate(false);
    }
  };

  // ---------- Edit ----------
  const onOpenEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      email: u.email ?? "",
      name: u.name ?? "",
      role: u.role ?? "EMPLOYEE",
      password: "", // เว้นว่าง = ไม่เปลี่ยน
    });
    setOpenEdit(true);
  };

  const onCloseEdit = () => {
    if (savingEdit) return;
    setOpenEdit(false);
    setEditingUser(null);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingUser?.id) return;

    const email = editForm.email.trim();
    const name = editForm.name.trim();
    const role = editForm.role;
    const password = editForm.password;

    if (!email) return alertError("ข้อมูลไม่ครบ", "กรุณากรอกอีเมล");
    if (!ROLE_OPTIONS.includes(role)) return alertError("ข้อมูลไม่ถูกต้อง", "Role ไม่ถูกต้อง");
    if (password && password.length < 6)
      return alertError("ข้อมูลไม่ถูกต้อง", "รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร");

    const ok = await alertConfirm({
      title: "ยืนยันการแก้ไขผู้ใช้งาน",
      text: `แก้ไขผู้ใช้ ${editingUser.email} ใช่หรือไม่`,
      confirmText: "บันทึก",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    setSavingEdit(true);
    try {
      await api.patch(`/api/users/${editingUser.id}`, {
        email,
        name: name || null, // ให้ล้างชื่อได้
        role,
        ...(password ? { password } : {}),
      });

      setOpenEdit(false);
      setEditingUser(null);
      await alertSuccess("บันทึกสำเร็จ", "แก้ไขข้อมูลเรียบร้อย");
      await load();
    } catch (e2) {
      await alertError("บันทึกไม่สำเร็จ", e2?.response?.data?.message || "ไม่สามารถแก้ไขผู้ใช้งานได้");
    } finally {
      setSavingEdit(false);
    }
  };

  // ---------- Delete ----------
  const onDelete = async (u) => {
    const ok = await alertConfirm({
      title: "ยืนยันการลบผู้ใช้งาน",
      text: `ลบผู้ใช้ ${u.email} ใช่หรือไม่`,
      confirmText: "ลบ",
      cancelText: "ยกเลิก",
    });
    if (!ok) return;

    try {
      await api.delete(`/api/users/${u.id}`);
      await alertSuccess("ลบสำเร็จ", "ลบผู้ใช้งานเรียบร้อย");
      await load();
    } catch (e) {
      await alertError("ลบไม่สำเร็จ", e?.response?.data?.message || "ไม่สามารถลบผู้ใช้งานได้");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold flex items-center gap-2">
            <Users size={22} />
            ผู้ใช้งาน
          </div>
          <div className="text-sm text-slate-500">จัดการผู้ใช้งานในระบบ</div>
        </div>

        <Button className="gap-2" onClick={onOpenCreate}>
          <Plus size={16} />
          เพิ่มผู้ใช้งาน
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">รายการผู้ใช้งาน</div>

            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="ค้นหา (email / name / role)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {loading ? (
            <div className="text-sm text-slate-500">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500">ไม่พบข้อมูล</div>
          ) : (
            <div className="overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">ID</th>
                    <th className="text-left font-medium px-4 py-3">ชื่อ</th>
                    <th className="text-left font-medium px-4 py-3">อีเมล</th>
                    <th className="text-left font-medium px-4 py-3">Role</th>
                    <th className="text-left font-medium px-4 py-3">เรือที่ได้รับมอบหมาย</th>
                    <th className="text-left font-medium px-4 py-3">สร้างเมื่อ</th>
                    <th className="text-right font-medium px-4 py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-white">
                      <td className="px-4 py-3 text-slate-700">{u.id}</td>
                      <td className="px-4 py-3 text-slate-900">{u.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{u.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {u.assignments?.[0]?.vessel?.name ?? <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" className="gap-2" onClick={() => onOpenEdit(u)}>
                            <Pencil size={16} />
                            แก้ไข
                          </Button>
                          <Button variant="danger" className="gap-2" onClick={() => onDelete(u)}>
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
        </CardBody>
      </Card>

      {/* Create Modal */}
      {openCreate && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseCreate} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">เพิ่มผู้ใช้งาน</div>
                  <Button variant="ghost" onClick={onCloseCreate} disabled={savingCreate}>
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                <form className="space-y-3" onSubmit={submitCreate}>
                  <div>
                    <label className="text-sm text-slate-600">อีเมล</label>
                    <Input
                      value={createForm.email}
                      onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">ชื่อ (ไม่บังคับ)</label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600">Role</label>
                      <Select
                        value={createForm.role}
                        onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm text-slate-600">รหัสผ่าน</label>
                      <Input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="อย่างน้อย 6 ตัวอักษร"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onCloseCreate} disabled={savingCreate}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={savingCreate} className="gap-2">
                      <Plus size={16} />
                      {savingCreate ? "กำลังบันทึก..." : "สร้างผู้ใช้งาน"}
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {openEdit && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onCloseEdit} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">แก้ไขผู้ใช้งาน</div>
                  <Button variant="ghost" onClick={onCloseEdit} disabled={savingEdit}>
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                <form className="space-y-3" onSubmit={submitEdit}>
                  <div>
                    <label className="text-sm text-slate-600">อีเมล</label>
                    <Input
                      value={editForm.email}
                      onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="name@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-600">ชื่อ</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="ชื่อ-นามสกุล"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600">Role</label>
                      <Select
                        value={editForm.role}
                        onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm text-slate-600">รหัสผ่านใหม่ (ไม่บังคับ)</label>
                      <Input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="เว้นว่างถ้าไม่เปลี่ยน"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={onCloseEdit} disabled={savingEdit}>
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={savingEdit} className="gap-2">
                      <Pencil size={16} />
                      {savingEdit ? "กำลังบันทึก..." : "บันทึก"}
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
