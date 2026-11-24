// Next.js llama a `register` una vez al iniciar cada instancia del servidor,
// antes de atender peticiones. Aquí se valida la configuración (lib/arranque.ts).
// Solo en el runtime de Node: mssql no corre en Edge.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validarArranque } = await import("./lib/arranque");
    await validarArranque();
  }
}
