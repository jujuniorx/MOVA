import crypto from "crypto";

/**
 * Cifra simétrica (AES-256-GCM) para credenciais de terceiros em repouso
 * (hoje: tokens do Mercado Livre). Nunca usar para senha de usuário — isso
 * continua sendo hash com bcrypt, que é unidirecional de propósito.
 */
function obterChave(): Buffer {
  const chaveBase64 = process.env.TOKEN_ENCRYPTION_KEY;
  if (!chaveBase64) {
    throw new Error("TOKEN_ENCRYPTION_KEY não configurada no .env — necessária para cifrar credenciais de integrações.");
  }
  const chave = Buffer.from(chaveBase64, "base64");
  if (chave.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY precisa decodificar para exatamente 32 bytes (AES-256).");
  }
  return chave;
}

export function cifrar(textoPlano: string): string {
  const chave = obterChave();
  const iv = crypto.randomBytes(12);
  const cifra = crypto.createCipheriv("aes-256-gcm", chave, iv);
  const cifrado = Buffer.concat([cifra.update(textoPlano, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  // formato: iv.tag.cifrado, tudo em base64, para caber num único campo TEXT
  return `${iv.toString("base64")}.${tag.toString("base64")}.${cifrado.toString("base64")}`;
}

export function decifrar(valorCifrado: string): string {
  const chave = obterChave();
  const [ivB64, tagB64, cifradoB64] = valorCifrado.split(".");
  if (!ivB64 || !tagB64 || !cifradoB64) {
    throw new Error("Formato inválido de valor cifrado.");
  }
  const decifra = crypto.createDecipheriv("aes-256-gcm", chave, Buffer.from(ivB64, "base64"));
  decifra.setAuthTag(Buffer.from(tagB64, "base64"));
  const textoPlano = Buffer.concat([decifra.update(Buffer.from(cifradoB64, "base64")), decifra.final()]);
  return textoPlano.toString("utf8");
}
