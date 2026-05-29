import { ArrowLeft, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signUp(form);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Не удалось зарегистрироваться");
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbf7]">
      <div className="container mx-auto px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          На главную
        </Link>
      </div>

      <main className="flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <UserPlus size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-950">Создать аккаунт</h1>
            <p className="mt-2 text-slate-500">После регистрации откроется первый учебный шаг.</p>
          </div>

          <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="fullName">
                  Имя и фамилия
                </label>
                <input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  required
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                  placeholder="Алия Нурсултанова"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="username">
                  Логин
                </label>
                <input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                  placeholder="aliya"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                  placeholder="student@example.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                  placeholder="Минимум 6 символов"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button type="submit" className="mt-5 w-full rounded-md bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              Зарегистрироваться
            </button>

            <div className="mt-4 text-center text-sm text-slate-500">
              Уже есть аккаунт?{" "}
              <Link to="/login" className="font-semibold text-emerald-700">
                Войти
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
