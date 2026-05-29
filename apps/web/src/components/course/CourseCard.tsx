import { ArrowRight, BookOpenCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Course } from "../../types";

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link
      to={`/courses/${course.slug}`}
      className="group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 hover:-translate-y-0.5 hover:border-emerald-200"
    >
      <div className="mb-5 flex items-center justify-end">
        <BookOpenCheck size={20} className="text-emerald-600" />
      </div>

      <h3 className="font-heading text-xl font-semibold text-slate-950">{course.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
        {course.description || "Короткий курс с теорией, тестами и понятным следующим шагом."}
      </p>

      <div className="mt-5 h-1.5 rounded-full bg-slate-100">
        <div className="h-1.5 w-1/3 rounded-full bg-emerald-500" />
      </div>

      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        Открыть курс
        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
