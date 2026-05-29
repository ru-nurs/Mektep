import { Lightbulb } from "lucide-react";
import { useState } from "react";

export default function HintBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <button className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700" onClick={() => setOpen((v) => !v)}>
        <Lightbulb size={16} />
        {open ? "Скрыть подсказку" : "Показать подсказку"}
      </button>
      {open && <p className="mt-2 text-sm leading-6 text-amber-900">{text}</p>}
    </div>
  );
}
