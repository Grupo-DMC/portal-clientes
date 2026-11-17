export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-4">
      <div className="h-10 w-64 bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />
      {[0, 1, 2, 3, 4].map((i) => (<div key={i} className="h-12 bg-neutral-200" style={{ animation: "dmcPulse 1.2s infinite" }} />))}
    </div>
  );
}
