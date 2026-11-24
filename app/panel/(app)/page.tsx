import Link from "next/link";

export const metadata = { title: "Panel interno" };

/* Las pantallas del panel se habilitan una por una al conectarlas a DMC_Core. */
export default function Page() {
  return (
    <div className="empty-state">
      <h2>Panel interno</h2>
      <p>Por ahora puedes gestionar los logos que ven los clientes en su portal. El resto de las pantallas se habilitará a medida que se conecten a la base.</p>
      <Link className="btn-pri" href="/panel/clientes">Logos de clientes</Link>
    </div>
  );
}
