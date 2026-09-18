export default function ComingSoon({
  title,
  intro,
  planned,
}: {
  title: string;
  intro: string;
  planned: { name: string; body: string }[];
}) {
  return (
    <div>
      <header className="mb-8">
        <div className="mb-2 inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
          On the roadmap
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-muted">{intro}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {planned.map((f) => (
          <div key={f.name} className="rounded-2xl border border-border p-5">
            <h3 className="font-semibold">{f.name}</h3>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
