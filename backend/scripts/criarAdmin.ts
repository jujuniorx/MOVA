// Único mecanismo de criação/atualização de um AdminUsuario — não existe
// nenhuma rota HTTP de cadastro de administrador. Roda-se localmente, lendo
// e-mail/senha de variáveis de ambiente que NUNCA são commitadas: a senha
// nunca aparece no código, em nenhum commit, nem é logada por este script.
//
// Uso (na pasta backend):
//   1. Adicione ao seu .env (local, já no .gitignore):
//        ADMIN_EMAIL="seu-email@exemplo.com"
//        ADMIN_SENHA="uma-senha-forte-só-sua"
//        ADMIN_NOME="Junior Dev"   (opcional — esse é o padrão)
//   2. Rode: npm run admin:criar
//   3. Depois de criar, é recomendável remover ADMIN_SENHA do .env — a senha
//      já está salva (com hash) no banco, não precisa continuar no arquivo.
//
// Rodar de novo com o mesmo e-mail ATUALIZA a senha desse administrador —
// é assim que você troca sua própria senha depois.

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  const nome = process.env.ADMIN_NOME?.trim() || "Junior Dev";

  if (!email) {
    throw new Error("Defina ADMIN_EMAIL no seu .env antes de rodar este script.");
  }
  if (!senha || senha.length < 8) {
    throw new Error("Defina ADMIN_SENHA no seu .env (mínimo 8 caracteres) antes de rodar este script.");
  }

  const senhaHash = await bcrypt.hash(senha, 12);

  const admin = await prisma.adminUsuario.upsert({
    where: { email },
    create: { nome, email, senhaHash },
    update: { nome, senhaHash, ativo: true },
  });

  console.log(`Administrador pronto: ${admin.nome} <${admin.email}> (role: ${admin.role}).`);
  console.log("A senha NÃO foi exibida nem gravada em nenhum arquivo de log — ela só existe, com hash, no banco.");
}

main()
  .catch((erro) => {
    console.error("Erro ao criar/atualizar administrador:", erro.message ?? erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
