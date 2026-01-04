import { LayoutDashboard } from "lucide-react";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <div className="text-2xl font-semibold flex items-center gap-2">
        <LayoutDashboard size={22} />
        Dashboard
      </div>

      <Card>
        <CardHeader>
          <div className="font-medium">ภาพรวม</div>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-slate-600">
            (ทำทีหลัง) สรุปจำนวน Voy ตามเดือน/ปี
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
