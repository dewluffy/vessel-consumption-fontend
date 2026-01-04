import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";

import AppLayout from "../layouts/AppLayout";
import AuthLayout from "../layouts/AuthLayout";

import Login from "../pages/Login";
import Vessels from "../pages/Vessels";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import Voy from "../pages/Voy";
import VoyDetailPage from "../pages/VoyDetail.jsx";
import UsersPage from "../pages/Users";
import RequireRoles from "../components/RequireRoles";

function Protected({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// redirect หน้าแรกตาม role
function HomeRedirect() {
  const me = useAuthStore((s) => s.me);
  if (!me) return null;

  if (me.role === "EMPLOYEE") return <Navigate to="/profile" replace />;
  return <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },
  {
    path: "/",
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },

      // Employee pages
      { path: "profile", element: <Profile /> },

      // Shared / Non-Employee pages
      { path: "dashboard", element: <Dashboard /> },
      { path: "vessels", element: <Vessels /> },
      { path: "voy", element: <Voy /> },
      { path: "voy/:id", element: <VoyDetailPage /> },

      // Admin only
      {
        path: "users",
        element: (
          <RequireRoles roles={["SUPERVISOR", "MANAGER", "ADMIN"]}>
            <UsersPage />
          </RequireRoles>
        ),
      },
    ],
  },
]);
