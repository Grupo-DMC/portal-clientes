"use client";

// Error de una pantalla del panel (casi siempre, la base no respondió a tiempo).
// En esta versión de Next el límite de error recibe `retry`, no `reset`.
export default function ErrorPanel({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <h2>No se pudieron leer los datos</h2>
      <p>La consulta a DMC_Core falló o tardó demasiado. Si se repite, revisa /api/salud.</p>
      <button className="btn-pri" type="button" onClick={() => retry()}>Reintentar</button>
    </div>
  );
}
