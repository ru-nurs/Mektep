import { Link } from "react-router-dom";
import { Module } from "../../types";

export default function ModuleTree({ modules }: { modules: Module[] }) {
  return (
    <div className="space-y-4">
      {modules.map((module) => (
        <section key={module.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="font-heading text-lg font-semibold">{module.title}</h4>
          <div className="mt-3 space-y-2">
            {module.lessons.map((lesson) => (
              <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block rounded-md border border-slate-200 px-3 py-2 text-sm">
                {lesson.title}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
