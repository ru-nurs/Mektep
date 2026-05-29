export default function VideoBlock({ url }: { url: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <iframe className="h-72 w-full" src={url} title="lesson-video" allowFullScreen />
    </div>
  );
}
