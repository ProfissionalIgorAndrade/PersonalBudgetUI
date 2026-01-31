import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import "./appLayout.css";
import type { JSX } from "react";

export default function AppLayout(): JSX.Element {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="app-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
