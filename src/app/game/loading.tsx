export default function GameLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-36 rounded-md bg-muted" />
      <div className="h-4 w-56 rounded bg-muted/70" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="h-52 rounded-xl bg-muted" />
        <div className="h-52 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
