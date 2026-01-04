import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ship,
  Route,
  UserCircle,
  Users,
} from "lucide-react";
import { useAuthStore } from "../stores/auth.store";

function navItemsByRole(role) {
  // Employee: 1) Profile 2) Voy
  if (role === "EMPLOYEE") {
    return [
      { to: "/profile", label: "โปรไฟล์", icon: UserCircle },
      { to: "/voy", label: "Voy", icon: Route },
    ];
  }

  // Non-employee: Dashboard, Vessel, Voy
  const base = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/vessels", label: "เรือ", icon: Ship },
    { to: "/voy", label: "Voy", icon: Route },
  ];

  // Admin เพิ่ม Users
  if (["SUPERVISOR", "MANAGER", "ADMIN"].includes(role)) {
    base.push({ to: "/users", label: "ผู้ใช้งาน", icon: Users });
  }

  return base;
}

export default function Sidebar() {
  const me = useAuthStore((s) => s.me);
  const role = me?.role ?? "EMPLOYEE";
  const items = navItemsByRole(role);

  return (
    <aside className="h-full w-64 shrink-0 border-r border-slate-100 bg-white">
      <div className="p-4">
        <div className="text-sm text-slate-500">เมนู</div>
        <div className="font-semibold text-slate-900">{role}</div>
      </div>

      <nav className="px-2 pb-4">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              ].join(" ")
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
