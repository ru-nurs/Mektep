import { CheckCircle2 } from "lucide-react";

export default function QuizResult({ score, correct, total }: { score: number; correct: number; total: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
      <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
      <h3 className="mt-3 font-heading text-2xl font-semibold text-slate-950">Результат: {score}%</h3>
      <p className="mt-2 text-text-muted">
        Верно {correct} из {total}
      </p>
    </div>
  );
}
