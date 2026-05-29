import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizePlainParagraph(line: string) {
  return line
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .trim();
}

function toReadableMarkdown(text: string) {
  const normalized = text.replace(/\r/g, "").replace(/\u00A0/g, " ").trim();
  const hasMarkdownSyntax = /(^|\n)\s{0,3}(#|[-*+] |\d+\.|```|>)/m.test(normalized);

  if (hasMarkdownSyntax) {
    return normalized;
  }

  const lines = normalized
    .split("\n")
    .map((line) => normalizePlainParagraph(line))
    .filter(Boolean);

  const hasParagraphs = /\n\s*\n/.test(normalized);
  if (hasParagraphs) {
    return lines.join("\n\n");
  }

  const joined = lines.join(" ");
  const sentences = joined.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);

  if (sentences.length < 4) {
    return joined;
  }

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }

  return paragraphs.join("\n\n");
}

export default function TextBlock({ markdown }: { markdown: string }) {
  const prepared = toReadableMarkdown(markdown);

  return (
    <article className="text-[1.125rem] leading-8 text-slate-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-5 mt-2 text-3xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-4 mt-8 text-2xl font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-3 mt-6 text-xl font-semibold">{children}</h3>,
          p: ({ children }) => <p className="mb-5 leading-8 text-slate-800">{children}</p>,
          ul: ({ children }) => <ul className="mb-5 list-disc space-y-2 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mb-5 list-decimal space-y-2 pl-6">{children}</ol>,
          li: ({ children }) => <li className="leading-8">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-slate-950">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="mb-5 rounded-r-md border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700">
              {children}
            </blockquote>
          ),
          code: ({ className, children }) =>
            className ? (
              <code className="block overflow-x-auto rounded-md bg-slate-950 p-4 font-mono text-sm text-slate-100">{children}</code>
            ) : (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.95em]">{children}</code>
            ),
        }}
      >
        {prepared}
      </ReactMarkdown>
    </article>
  );
}
