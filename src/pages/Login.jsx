import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card, CardBody, CardHeader } from "../components/ui/Card";

import { api } from "../lib/api";
import { alertError, alertSuccess } from "../lib/alert";
import { useAuthStore } from "../stores/auth.store";

export default function Login() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMe = useAuthStore((s) => s.setMe);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginRes = await api.post("/api/auth/login", { email, password });
      const token = loginRes.data.token ?? loginRes.data.accessToken;
      if (!token) throw new Error("Token not found in response");
      setToken(token);

      // ต้องมี endpoint นี้เพื่อรู้ role
      const meRes = await api.get("/api/auth/me");
      const me = meRes.data;
      setMe(me);

      await alertSuccess("เข้าสู่ระบบสำเร็จ", "ยินดีต้อนรับเข้าสู่ระบบ");

      // ✅ redirect ตาม role
      if (me.role === "EMPLOYEE") {
        navigate("/profile");
      } else {
        navigate("/dashboard");
      }
    } catch (e2) {
      await alertError(
        "เข้าสู่ระบบไม่สำเร็จ",
        e2?.response?.data?.message || "กรุณาตรวจสอบอีเมล/รหัสผ่าน"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="text-xl font-semibold">เข้าสู่ระบบ</div>
        <div className="text-sm text-slate-500">กรุณาเข้าสู่ระบบเพื่อใช้งาน</div>
      </CardHeader>

      <CardBody>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-slate-600">อีเมล</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">รหัสผ่าน</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <Button className="w-full gap-2" disabled={loading}>
            <LogIn size={16} />
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
