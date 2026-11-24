import "server-only";
import { scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";

/* Contraseñas con scrypt. Formato guardado: `scrypt:<salt base64url>:<hash base64url>`,
   salt aleatorio por cuenta. Nunca se guardan ni se comparan contraseñas en claro. */
const KEYLEN = 64;
const OPTS: ScryptOptions = { N: 16384, r: 8, p: 1 };

const derive = (pw: string, salt: BinaryLike) =>
  new Promise<Buffer>((ok, ko) => scrypt(pw.normalize("NFKC"), salt, KEYLEN, OPTS, (e, k) => (e ? ko(e) : ok(k))));

/** Hash de relleno: se verifica contra él cuando la cuenta no existe, para que el tiempo de respuesta no la delate. */
export const DUMMY_HASH =
  "scrypt:y8af46u7MiufH_ISXE314A:ACoV9mXavnO3vuPxvUpn5V_ekCmijap7Q8YbOLsHxDfz2lwI3gLDMTKhdRX60qMjPWV7ghetBnsquoyUrZhXKw";

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split(":");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  if (want.length !== KEYLEN) return false;
  const got = await derive(password, Buffer.from(salt, "base64url"));
  return timingSafeEqual(got, want);
}
