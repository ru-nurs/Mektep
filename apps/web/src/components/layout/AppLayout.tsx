import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <div className="mx-auto flex max-w-[1400px] gap-4 px-4 py-4">
        <Sidebar />
        <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
