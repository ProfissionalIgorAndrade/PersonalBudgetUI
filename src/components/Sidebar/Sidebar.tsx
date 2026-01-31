import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { LayoutDashboard, LogOut } from "lucide-react";
import "./sidebar.css";
import type { JSX } from "react";

export default function Sidebar(): JSX.Element {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      {/* HEADER */}
      <div className="sidebar-header">
        <span className="sidebar-logo">PersonalBudget</span>

        <button
          className="logout-icon"
          onClick={handleLogout}
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* NAV */}
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-item ${isActive ? "active" : ""}`
          }
        >

          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
      </nav>
    </aside>
  );
}
