declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        empresaId: string;
        email: string;
      };
    }
  }
}

export {};
