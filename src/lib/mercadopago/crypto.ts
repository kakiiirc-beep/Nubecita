import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

function obtenerClave(): Buffer {
  const valor = process.env.MERCADOPAGO_TOKEN_ENCRYPTION_KEY;

  if (!valor || !/^[a-fA-F0-9]{64}$/.test(valor)) {
    throw new Error(
      "MERCADOPAGO_TOKEN_ENCRYPTION_KEY debe contener exactamente 64 caracteres hexadecimales."
    );
  }

  return Buffer.from(valor, "hex");
}

export function cifrarToken(token: string): string {
  if (!token) {
    throw new Error("No se puede cifrar un token vacío.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", obtenerClave(), iv);

  const contenido = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    contenido.toString("base64url"),
  ].join(".");
}

export function descifrarToken(valorCifrado: string): string {
  const partes = valorCifrado.split(".");

  if (partes.length !== 4 || partes[0] !== "v1") {
    throw new Error("Formato de token cifrado no válido.");
  }

  const [, ivTexto, tagTexto, contenidoTexto] = partes;

  const decipher = createDecipheriv(
    "aes-256-gcm",
    obtenerClave(),
    Buffer.from(ivTexto, "base64url")
  );

  decipher.setAuthTag(Buffer.from(tagTexto, "base64url"));

  const contenido = Buffer.concat([
    decipher.update(Buffer.from(contenidoTexto, "base64url")),
    decipher.final(),
  ]);

  return contenido.toString("utf8");
}