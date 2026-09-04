-- Correção de preço aprovada na Stage 2: o MOVA Pro passa de
-- R$89,90/R$899 para R$99,90/R$999 (mensal/anual). Nenhuma outra linha de
-- PlanoConfig é afetada.
UPDATE "PlanoConfig"
SET "precoMensal" = 99.90, "precoAnual" = 999, "atualizadoEm" = CURRENT_TIMESTAMP
WHERE "planoTipo" = 'PRO';
