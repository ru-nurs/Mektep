import { BookOpen, Gauge, Trophy, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Главная", icon: Gauge },
  { to: "/courses", label: "Курсы", icon: BookOpen },
  { to: "/leaderboard", label: "Рейтинг", icon: Trophy },
  { to: "/profile", label: "Профиль", icon: UserRound },
];

export default function Sidebar() {
  return (
    <aside className="hidden w-[260px] rounded-lg bg-sidebar-bg p-5 text-white lg:block">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-emerald-100">AI-Mektep</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold">Подготовка к ЕНТ</h1>
      </div>

      <nav className="space-y-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isActive ? "bg-sidebar-hover" : "text-emerald-50 hover:bg-sidebar-hover"
                }`
              }
            >
              <Icon size={16} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
