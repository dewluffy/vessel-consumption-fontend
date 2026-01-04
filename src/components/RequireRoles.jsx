import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

export default function RequireRoles({ roles, children }) {
  const me = useAuthStore((s) => s.me);

  if (!me) return null; // รอโหลด
  if (!roles.includes(me.role)) return <Navigate to="/" replace />;

  return children;
}
