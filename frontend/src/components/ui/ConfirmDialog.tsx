import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  titulo: string;
  mensagem: string;
  aberto: boolean;
  confirmando?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  rotuloConfirmar?: string;
  varianteConfirmar?: "perigo" | "sucesso" | "primario";
}

export function ConfirmDialog({
  titulo,
  mensagem,
  aberto,
  confirmando = false,
  aoConfirmar,
  aoCancelar,
  rotuloConfirmar = "Excluir",
  varianteConfirmar = "perigo",
}: ConfirmDialogProps) {
  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={aoCancelar}>
      <p className="text-sm text-slate-600">{mensagem}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variante="secundario" onClick={aoCancelar} disabled={confirmando}>
          Cancelar
        </Button>
        <Button variante={varianteConfirmar} onClick={aoConfirmar} carregando={confirmando}>
          {rotuloConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
