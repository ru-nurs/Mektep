import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import SiteHeader from "../components/layout/SiteHeader";

export default function Leaderboard() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    api
      .get("/api/users/leaderboard?period=all_time")
      .then((res) => setList(res.data.leaderboard || []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <SiteHeader />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-6 rounded-lg border border-emerald-100 bg-white p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            <Trophy size={16} />
            Таблица лидеров
          </div>
          <h1 className="text-3xl font-bold text-slate-950">Рейтинг учеников</h1>
          <p className="mt-2 text-slate-500">Мягкое соревнование: сравнивай прогресс, но держи фокус на своем маршруте.</p>
        </section>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="space-y-2">
            {list.length ? (
              list.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-4 py-3 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white font-bold text-emerald-700">
                      {idx + 1}
                    </span>
                    <span className="truncate font-semibold text-slate-800">{item.fullName || item.username}</span>
                  </span>
                  <strong className="flex-shrink-0 text-slate-950">{item.xp} XP</strong>
                </div>
              ))
            ) : (
              <p className="p-4 text-sm text-slate-500">Пока нет данных рейтинга.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
