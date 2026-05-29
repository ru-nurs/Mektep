import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import AiTutor from "../lesson/AiTutor";

export default function GlobalAiTutor() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-[80]">
      {open && (
        <section className="mb-3 h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-xl">
          <div className="flex h-12 items-center justify-between border-b border-emerald-100 px-4">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
              <MessageCircle size={16} className="text-emerald-600" />
              AI-наставник
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              aria-label="Закрыть AI-наставника"
            >
              <X size={16} />
            </button>
          </div>
          <div className="h-[calc(100%-48px)]">
            <AiTutor />
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-12 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700"
      >
        <MessageCircle size={18} />
        Спросить AI
      </button>
    </div>
  );
}
