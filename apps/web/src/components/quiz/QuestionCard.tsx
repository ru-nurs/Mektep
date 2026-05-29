export default function QuestionCard({
  question,
  options,
  selected,
  onSelect,
}: {
  question: string;
  options: Array<{ id: string; text: string }>;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 font-heading text-lg font-semibold">{question}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
              selected === option.id ? "border-primary bg-primary-light" : "border-slate-300"
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}
