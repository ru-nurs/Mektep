import { ExternalLink, FileText } from "lucide-react";
import { getApiBaseUrl } from "../../api/baseUrl";

type Source = {
  label?: string;
  path?: string;
};

function sourceUrl(source: Source) {
  if (!source.path) return "#";
  return `${getApiBaseUrl()}/api/books/file?path=${encodeURIComponent(source.path)}`;
}

export default function SourceBlock({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
        <FileText size={18} className="text-emerald-600" />
        Материалы из книг
      </div>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <a
            key={`${source.path || source.label}-${index}`}
            href={sourceUrl(source)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <span className="min-w-0 truncate">{source.label || source.path}</span>
            <ExternalLink size={16} className="flex-shrink-0 text-slate-400" />
          </a>
        ))}
      </div>
    </div>
  );
}
