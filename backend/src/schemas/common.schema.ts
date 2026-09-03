import { z } from "zod";

export const idParamSchema = z.string().uuid("ID inválido.");

export function paraUndefinedSeVazio(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

export const stringOpcional = (max: number) =>
  z.preprocess(paraUndefinedSeVazio, z.string().trim().max(max).optional());
