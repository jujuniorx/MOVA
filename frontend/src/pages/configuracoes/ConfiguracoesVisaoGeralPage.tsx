import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../../components/layout/AppLayout";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { useModulos } from "../../context/ModulosContext";
import { empresaApi } from "../../lib/api";

interface CategoriaResumo {
  caminho: string;
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  linhasResumo?: string[];
}

function Icone({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

/**
 * Visão geral de Configurações: em vez de uma página só com tudo empilhado,
 * cada área vira um card com um resumo rápido do estado atual — a pessoa
 * decide pra onde ir sem precisar rolar uma página gigante primeiro.
 */
export function ConfiguracoesVisaoGeralPage() {
  const { empresa } = useAuth();
  const { modulos } = useModulos();
  const [perfilConfigurado, setPerfilConfigurado] = useState<boolean | null>(null);

  useEffect(() => {
    empresaApi
      .obterPerfilOperacional()
      .then((r) => setPerfilConfigurado(Boolean(r.perfilOperacional)))
      .catch(() => setPerfilConfigurado(null));
  }, []);

  const modulosAtivosCount = modulos.filter((m) => m.ativo && !m.sempreAtivo).length;

  const categorias: CategoriaResumo[] = [
    {
      caminho: "/configuracoes/empresa",
      titulo: "Minha empresa",
      descricao: "Informações e contato da sua empresa, e quem faz parte da sua equipe no MOVA.",
      icone: <Icone path="M3 21h18M5 21V7l8-4v18M13 21V11l6 3v7M9 9h.01M9 13h.01M9 17h.01" />,
      linhasResumo: [empresa?.nome ? `Nome: ${empresa.nome}` : "Nome ainda não preenchido"],
    },
    {
      caminho: "/configuracoes/marca",
      titulo: "Minha marca e meu site",
      descricao: "Logo, cores e como seus clientes veem sua empresa.",
      icone: <Icone path="M12 3v18M3 12h18M4 4l16 16M20 4 4 20" />,
      linhasResumo: [
        empresa?.logoUrl ? "Logo: adicionada" : "Logo: ainda não adicionada",
        empresa?.paginaPublicaAtiva ? "Página pública: ativa" : "Página pública: desativada",
        empresa?.corPrimaria || empresa?.corSecundaria ? "Cores: personalizadas" : "Cores: padrão do MOVA",
      ],
    },
    {
      caminho: "/configuracoes/negocio",
      titulo: "Como meu negócio funciona",
      descricao: "Ensine ao MOVA o que você faz, como trabalha e qual é o seu papel na empresa.",
      icone: <Icone path="M9 3v2m6-2v2M4 8h16M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M9 12h6" />,
      linhasResumo: [perfilConfigurado === null ? "" : perfilConfigurado ? "Perfil do negócio: configurado" : "Perfil do negócio: ainda não configurado"].filter(Boolean),
    },
    {
      caminho: "/configuracoes/recursos",
      titulo: "Recursos do MOVA",
      descricao: "Escolha quais recursos fazem sentido para a sua empresa.",
      icone: <Icone path="M4 6h16M4 12h16M4 18h7" />,
      linhasResumo: [`${modulosAtivosCount} recurso${modulosAtivosCount === 1 ? "" : "s"} ativo${modulosAtivosCount === 1 ? "" : "s"}`],
    },
    {
      caminho: "/configuracoes/orcamentos",
      titulo: "Orçamentos",
      descricao: "Configure as etapas do seu processo e o que perguntar ao cliente.",
      icone: <Icone path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />,
    },
    {
      caminho: "/configuracoes/ia",
      titulo: "Inteligência do MOVA",
      descricao: "Tom de comunicação e regras que a IA usa para sugerir mensagens e preços.",
      icone: <Icone path="M12 2a5 5 0 015 5c0 1.5-.7 2.4-1.5 3.3S14 12 14 13v1H10v-1c0-1-.7-1.8-1.5-2.7S7 8.5 7 7a5 5 0 015-5zM9 17h6M10 21h4" />,
    },
    {
      caminho: "/configuracoes/integracoes",
      titulo: "Integrações",
      descricao: "Conecte WhatsApp, Mercado Livre e outros serviços.",
      icone: <Icone path="M9 12a3 3 0 106 0 3 3 0 00-6 0zM4.2 4.2l4.2 4.2M15.6 15.6l4.2 4.2M19.8 4.2l-4.2 4.2M8.4 15.6l-4.2 4.2" />,
    },
    {
      caminho: "/configuracoes/plano",
      titulo: "Plano e indique o MOVA",
      descricao: "Seu plano atual e o programa de indicação do MOVA.",
      icone: <Icone path="M12 8c-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2m0-8V6m0 2v8m0 0v2M4 12a8 8 0 1016 0 8 8 0 00-16 0z" />,
      linhasResumo: [`Plano ${empresa?.planoTipo === "GRATUITO" ? "gratuito" : empresa?.planoTipo ?? ""}`],
    },
    {
      caminho: "/configuracoes/ajuda",
      titulo: "Ajuda",
      descricao: "Tutoriais e orientação para usar o MOVA.",
      icone: <Icone path="M9.1 9a3 3 0 115.8 1c0 2-3 2-3 4M12 17h.01" />,
    },
  ];

  return (
    <AppLayout>
      <PageHeader titulo="Configurações" subtitulo="Configure o MOVA para trabalhar do seu jeito." />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categorias.map((categoria) => (
          <Link
            key={categoria.caminho}
            to={categoria.caminho}
            className="group flex flex-col gap-3 rounded-xl border border-ink-200 bg-surface p-5 shadow-[var(--shadow-card)] transition-colors hover:border-brand-300 dark:hover:border-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                {categoria.icone}
              </span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-ink-900">{categoria.titulo}</p>
              <p className="mt-1 text-sm text-ink-500">{categoria.descricao}</p>
            </div>
            {categoria.linhasResumo && categoria.linhasResumo.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 border-t border-ink-100 pt-3">
                {categoria.linhasResumo.map((linha) => (
                  <li key={linha} className="text-xs text-ink-500">
                    {linha}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
