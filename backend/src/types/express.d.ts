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
    }
  }
}

export {};
