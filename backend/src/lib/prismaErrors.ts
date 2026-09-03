import { Prisma } from "@prisma/client";

/**
 * Um DELETE bloqueado por uma FK RESTRICT nem sempre chega como o
 * PrismaClientKnownRequestError (P2003) documentado — o Postgres pode
 * devolver o erro bruto (SQLSTATE 23503/23001), que o Prisma repassa como
 * PrismaClientUnknownRequestError. Esta função cobre os dois casos.
 */
export function isForeignKeyViolation(erro: unknown): boolean {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return erro.code === "P2003";
  }
  if (erro instanceof Prisma.PrismaClientUnknownRequestError) {
    return /23503|23001/.test(erro.message);
  }
  return false;
}
