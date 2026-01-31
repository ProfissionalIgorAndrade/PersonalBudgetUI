import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/hooks/useAuth";
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
      <h2 className="logo">PersonalBudget</h2>

      <nav>
        <ul>
          <li className="active">
            <span>📊</span>
            <span>Dashboard</span>
          </li>

          <li onClick={handleLogout} className="logout">
            <span>🚪</span>
            <span>Sair</span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
