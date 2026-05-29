import { BookOpen, LayoutDashboard, LogIn, LogOut, Trophy, UserRound } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function SiteHeader() {
  const navigate = useNavigate();
  const { isAuthenticated, user, clearSession } = useAuthStore();

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-sm text-white">
            AI
          </span>
          <span style={{ fontFamily: "var(--font-heading)" }}>Mektep</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to={isAuthenticated ? "/dashboard" : "/"} className={navLink}>
            <LayoutDashboard size={16} />
            Главная
          </NavLink>
          <NavLink to="/courses" className={navLink}>
            <BookOpen size={16} />
            Курсы
          </NavLink>
          <NavLink to="/leaderboard" className={navLink}>
            <Trophy size={16} />
            Рейтинг
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 sm:flex"
                type="button"
              >
                <UserRound size={16} />
                {user.fullName || user.username}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  navigate("/login");
                }}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                <LogOut size={16} />
                Выйти
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 sm:flex"
              >
                <LogIn size={16} />
                Войти
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Начать
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
