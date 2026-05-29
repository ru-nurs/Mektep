import { ArrowLeft, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Неверный email или пароль");
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
              <LogIn size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-950">Вход в AI-Mektep</h1>
            <p className="mt-2 text-slate-500">Продолжи маршрут подготовки.</p>
          </div>

          <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="student@example.com"
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Введите пароль"
                  className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-300 focus:bg-white"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

            <button type="submit" className="mt-5 w-full rounded-md bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
              Войти
            </button>

            <div className="mt-4 text-center text-sm text-slate-500">
              Нет аккаунта?{" "}
              <Link to="/register" className="font-semibold text-emerald-700">
                Зарегистрироваться
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
