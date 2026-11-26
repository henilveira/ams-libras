import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function ler<T>(esquema: z.ZodType<T>, entrada: unknown): T {
  const resultado = esquema.safeParse(entrada);
  if (!resultado.success) {
    const campo = resultado.error.issues[0]?.path.join('.');
    throw new BadRequestException(campo ? `Confira o campo ${campo}.` : 'Dados inválidos.');
  }
  return resultado.data;
}

export const id = z.uuid();
export const texto = z.string().trim().max(2000);
export const curto = z.string().trim().max(160);
export const email = z.string().trim().max(254).pipe(z.email());
export const perfil = z.enum(['colaborador', 'moderador', 'administrador']);
export const estado = z.enum(['rascunho', 'em-revisao', 'devolvido', 'aprovado', 'rejeitado', 'excluido']);
export const decisao = z.enum(['aprovado', 'devolvido', 'rejeitado']);
export const operacao = z.enum(['alteracao', 'remocao']);
export const tipoMidia = z.enum(['video', 'imagem', 'autorizacao', 'legenda']);

const referencia = id.optional();
export const verbete = z.object({
  palavra: curto, assunto: curto, acepcao: texto, exemploPortugues: texto, exemploLibras: texto,
  classeGramatical: curto, origem: curto, configuracaoMao: texto, imagemId: referencia, textoAlternativo: texto,
});
export const conteudo = z.object({
  verbete,
  sinal: z.object({
    tipo: z.enum(['referencia', 'regional', 'social']), regiao: curto, observacao: texto,
    glosa: texto, movimento: texto, videoId: referencia, legendaId: referencia,
  }),
  autorizacao: z.object({
    identificaveis: z.boolean().optional(), menores: z.boolean().optional(), base: curto,
    finalidade: texto, comprovanteId: referencia,
  }),
});
