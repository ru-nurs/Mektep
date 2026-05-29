import { Flame, Trophy, UserRound, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import SiteHeader from "../components/layout/SiteHeader";
import { useAuthStore } from "../store/authStore";

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get("/api/users/me/stats").then((res) => setStats(res.data)).catch(() => setStats(null));
  }, []);

  const statCards = [
    { label: "XP", value: stats?.xp ?? "-", icon: Zap, className: "bg-emerald-100 text-emerald-700" },
    { label: "Дней подряд", value: stats?.streak ?? "-", icon: Flame, className: "bg-amber-100 text-amber-700" },
    { label: "Место", value: `#${stats?.rank ?? "-"}`, icon: Trophy, className: "bg-sky-100 text-sky-700" },
  ];

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />
      <main className="container mx-auto px-4 py-8">
        <section className="mb-6 rounded-lg border border-emerald-100 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <UserRound size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">Профиль</h1>
              <p className="mt-1 text-slate-500">{user?.fullName || user?.username}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-md ${item.className}`}>
                  <Icon size={20} />
                </span>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
