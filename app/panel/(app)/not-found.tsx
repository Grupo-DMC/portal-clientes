import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="empty-state">
      <h2>No encontramos esta página</h2>
      <p>El registro no existe, se eliminó o tu rol no tiene acceso a este módulo.</p>
      <Link className="btn-pri" href="/panel">Volver al dashboard</Link>
    </div>
  );
}
