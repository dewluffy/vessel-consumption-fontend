import { Link, Outlet, useNavigate } from "react-router-dom";
import { Ship, LogOut, Menu } from "lucide-react";
import { useState } from "react";

import Button from "../components/ui/Button";
import Sidebar from "../components/Sidebar";
import { useAuthStore } from "../stores/auth.store";

export default function AppLayout() {
  const me = useAuthStore((s) => s.me);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* mobile menu */}
            <Button
              variant="ghost"
              className="sm:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </Button>

            <Link to="/" className="font-semibold text-slate-900 flex items-center gap-2">
              <Ship size={18} />
              Vessel Consumption
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-slate-600">
              {me ? (
                <>
                  <span className="font-medium text-slate-900">{me.name ?? me.email}</span>{" "}
                  <span className="text-slate-400">•</span> <span>{me.role}</span>
                </>
              ) : (
                <span className="text-slate-500">กำลังโหลด...</span>
              )}
            </div>

            <Button variant="ghost" onClick={onLogout} className="gap-2">
              <LogOut size={16} />
              ออกจากระบบ
            </Button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-4">
          {/* Desktop sidebar */}
          <div className="hidden sm:block h-[calc(100vh-120px)] sticky top-[72px]">
            <Sidebar />
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <div className="font-semibold">เมนู</div>
              <Button variant="ghost" onClick={() => setOpen(false)}>ปิด</Button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
