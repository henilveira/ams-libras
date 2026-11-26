export type {
  Evento, SolicitacaoTitular,
} from '../../servidor/fonte/acervo/aplicacao/repositorio-acervo';
export type {
  ConteudoEnvio, DadosSinal, DadosVerbete, Decisao, EstadoEnvio, RegistroEnvio, TipoMidia, TipoSinal, VerbetePublicado,
} from '../../servidor/fonte/acervo/dominio/verbete';
export type { Perfil, Usuario } from '../../servidor/fonte/usuarios/dominio/usuario';

import type { ConteudoEnvio, EstadoEnvio, TipoSinal } from '../../servidor/fonte/acervo/dominio/verbete';
import type { Perfil } from '../../servidor/fonte/usuarios/dominio/usuario';

export const estados: Record<EstadoEnvio, string> = {
  rascunho: 'Rascunho', 'em-revisao': 'Em revisão', devolvido: 'Devolvido',
  aprovado: 'Aprovado', rejeitado: 'Rejeitado', excluido: 'Excluído',
};

export const perfis: Record<Perfil, string> = {
  colaborador: 'Colaborador', moderador: 'Moderador', administrador: 'Administrador',
};

export const tiposSinal: Record<TipoSinal, string> = {
  referencia: 'Sinal de referência', regional: 'Variação regional', social: 'Variação de grupo social',
};

export const operacoes = { inclusao: 'Inclusão', alteracao: 'Alteração', remocao: 'Remoção' };

export const conteudoVazio: ConteudoEnvio = {
  verbete: {
    palavra: '', assunto: '', acepcao: '', exemploPortugues: '', exemploLibras: '', classeGramatical: '',
    origem: '', configuracaoMao: '', textoAlternativo: '',
  },
  sinal: { tipo: 'referencia', regiao: '', observacao: '', glosa: '', movimento: '' },
  autorizacao: { base: '', finalidade: '' },
};

export function dataCurta(data: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  }).format(new Date(data));
}

export function mensagemDe(erro: unknown) {
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.';
}

export async function api<T>(caminho: string, metodo = 'GET', dados?: unknown): Promise<T> {
  const arquivo = dados instanceof FormData;
  const resposta = await fetch(`/api/${caminho}`, {
    method: metodo,
    headers: dados !== undefined && !arquivo ? { 'Content-Type': 'application/json' } : undefined,
    body: arquivo ? dados : dados === undefined ? undefined : JSON.stringify(dados),
    cache: 'no-store',
  }).catch(() => {
    throw new Error('Sem conexão com o servidor. Tente novamente.');
  });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null);
    throw new Error(resposta.status === 413 ? 'O arquivo ultrapassa o limite de 50 MB.'
      : typeof erro?.message === 'string' ? erro.message : 'O servidor não respondeu. Tente novamente.');
  }
  if (resposta.status === 204) return undefined as T;
  return resposta.json();
}

export function urlMidia(id: string) {
  return `/api/midias/${id}`;
}
