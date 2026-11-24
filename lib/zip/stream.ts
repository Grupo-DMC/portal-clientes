// Un .zip armado EN STREAMING: cada archivo se escribe a medida que se lee de la
// base, a tramos, sin tener nunca el .zip ni un video entero en memoria.
//
// Formato: entradas sin compresión (método 0; fotos y videos ya vienen
// comprimidos) con «data descriptor» (bit 3): el CRC y el tamaño se escriben
// DESPUÉS de los datos, cuando ya se conocen. Nombres en UTF-8 (bit 11).
// Sin zip64: el tope es 4 GB y 65 535 entradas, muy por encima de una visita
// (a lo más 25 MB por video).
//
// sys_tecnicos arma el zip en la memoria del navegador (lib/ui/zip.ts y
// lib/ui/descarga.ts con fflate); aquí se pidió streaming desde el servidor.

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 incremental: se parte de 0 y se le pasa cada trozo. */
export function crc32(previo: number, bytes: Uint8Array): number {
  let c = (previo ^ 0xffffffff) >>> 0;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface EntradaZip {
  nombre: string;
  /** Entrega los bytes del archivo, trozo a trozo. */
  trozos: () => AsyncIterable<Uint8Array>;
}

const TOPE_32 = 0xffffffff;
const BANDERAS = 0x0808; // bit 3: data descriptor · bit 11: nombre en UTF-8

function fechaDos(d: Date): { hora: number; fecha: number } {
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * ReadableStream con el .zip de `entradas`, en orden. Se lee bajo demanda
 * (pull): si quien descarga va lento, no se piden más trozos a la base.
 * `alFallar` se llama si un archivo falla a mitad: el stream se corta con error
 * (un .zip a medias no se puede reparar en el camino).
 */
export function zipEnStreaming(entradas: EntradaZip[], alFallar?: (err: unknown, nombre: string) => void): ReadableStream<Uint8Array> {
  const codificador = new TextEncoder();
  const { hora, fecha } = fechaDos(new Date());
  const central: Uint8Array[] = [];
  let desplazamiento = 0;

  async function* generar(): AsyncGenerator<Uint8Array> {
    for (const e of entradas) {
      const nombre = codificador.encode(e.nombre);
      const inicio = desplazamiento;

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, BANDERAS, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, hora, true);
      local.setUint16(12, fecha, true);
      // CRC y tamaños en 0: van en el data descriptor.
      local.setUint16(26, nombre.length, true);
      yield new Uint8Array(local.buffer);
      yield nombre;
      desplazamiento += 30 + nombre.length;

      let crc = 0;
      let tam = 0;
      try {
        for await (const t of e.trozos()) {
          crc = crc32(crc, t);
          tam += t.length;
          desplazamiento += t.length;
          yield t;
        }
      } catch (err) {
        alFallar?.(err, e.nombre);
        throw err;
      }
      if (tam > TOPE_32 || desplazamiento > TOPE_32) throw new Error("El .zip supera 4 GB (sin zip64).");

      const desc = new DataView(new ArrayBuffer(16));
      desc.setUint32(0, 0x08074b50, true);
      desc.setUint32(4, crc, true);
      desc.setUint32(8, tam, true);
      desc.setUint32(12, tam, true);
      yield new Uint8Array(desc.buffer);
      desplazamiento += 16;

      const ficha = new DataView(new ArrayBuffer(46));
      ficha.setUint32(0, 0x02014b50, true);
      ficha.setUint16(4, 20, true);
      ficha.setUint16(6, 20, true);
      ficha.setUint16(8, BANDERAS, true);
      ficha.setUint16(10, 0, true);
      ficha.setUint16(12, hora, true);
      ficha.setUint16(14, fecha, true);
      ficha.setUint32(16, crc, true);
      ficha.setUint32(20, tam, true);
      ficha.setUint32(24, tam, true);
      ficha.setUint16(28, nombre.length, true);
      ficha.setUint32(42, inicio, true);
      const entrada = new Uint8Array(46 + nombre.length);
      entrada.set(new Uint8Array(ficha.buffer), 0);
      entrada.set(nombre, 46);
      central.push(entrada);
    }

    const tamCentral = central.reduce((s, e) => s + e.length, 0);
    for (const e of central) yield e;
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, central.length, true);
    fin.setUint16(10, central.length, true);
    fin.setUint32(12, tamCentral, true);
    fin.setUint32(16, desplazamiento, true);
    yield new Uint8Array(fin.buffer);
  }

  const it = generar();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await it.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await it.return(undefined);
    },
  });
}
