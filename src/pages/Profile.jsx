import { UserCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { useAuthStore } from "../stores/auth.store";

export default function Profile() {
  const me = useAuthStore((s) => s.me);

  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold flex items-center gap-2">
        <UserCircle size={22} />
        โปรไฟล์
      </div>

      <Card>
        <CardHeader>
          <div className="font-medium">ข้อมูลผู้ใช้</div>
        </CardHeader>
        <CardBody>
          {me ? (
            <div className="text-sm text-slate-700 space-y-1">
              <div><span className="text-slate-500">ชื่อ:</span> {me.name ?? "-"}</div>
              <div><span className="text-slate-500">อีเมล:</span> {me.email}</div>
              <div><span className="text-slate-500">สิทธิ์:</span> {me.role}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">กำลังโหลด...</div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="font-medium">เรือของฉัน</div>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-slate-600">
            (Step ถัดไป) หน้านี้เราจะดึง <b>เรือที่ถูก assign</b> ให้ Employee และแสดงเป็น “โปรไฟล์เรือของตัวเอง”
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
