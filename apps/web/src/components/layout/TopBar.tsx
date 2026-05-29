import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b border-emerald-100 px-6 py-4">
      <div>
        <p className="text-sm text-text-muted">AI-Mektep</p>
        <h2 className="font-heading text-lg font-semibold">Привет, {user?.fullName || user?.username}</h2>
      </div>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          navigate("/login");
        }}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
      >
        <LogOut size={16} />
        Выйти
      </button>
    </header>
  );
}
