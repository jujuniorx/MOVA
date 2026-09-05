declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        empresaId: string;
        email: string;
      };
      admin?: {
        id: string;
        email: string;
        nome: string;
      };
      /** Bytes exatos do corpo da requisição, capturados por express.json({ verify }) — necessário para validar assinaturas HMAC calculadas sobre o payload cru (ex.: X-Hub-Signature-256 do WhatsApp). */
      rawBody?: Buffer;
    }
  }
}

export {};
