import { Link } from "react-router-dom";
import { Card, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

/**
 * Ponte rápida entre o dashboard e a página pública — o empreendedor não
 * deveria precisar ir até Configurações só para pegar o link e compartilhar.
 * Mesma fonte de verdade que PaginaPublicaCard (empresa.paginaPublicaAtiva +
 * slugPublico), nunca duplica lógica de publicação, só oferece o atalho.
 */
export function MinhaPaginaCard() {
  const { empresa } = useAuth();
  const { mostrarSucesso } = useToast();

  const publicada = Boolean(empresa?.paginaPublicaAtiva && empresa?.slugPublico);
  const url = empresa?.slugPublico ? `${window.location.origin}/loja/${empresa.slugPublico}` : null;

  async function copiarLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      mostrarSucesso("Link copiado.");
    } catch {
      // Silencioso: o link continua visível na tela para copiar manualmente.
    }
  }

  return (
    <Card>
      <CardHeader titulo="Minha página" descricao="A vitrine pública da sua empresa." />
      {publicada && url ? (
        <div className="mt-3">
          <p className="break-all text-sm text-ink-600">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" tamanho="sm" variante="secundario" onClick={copiarLink}>
              Copiar link
            </Button>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <Button type="button" tamanho="sm" variante="secundario">
                Ver página
              </Button>
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-ink-500">Sua página pública ainda não está pronta.</p>
          <Link to="/configuracoes" className="mt-3 inline-block">
            <Button type="button" tamanho="sm">
              Configurar página
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
