import type { Conta } from '../../usuarios/dominio/usuario';
import type { RegistroEnvio, TipoMidia } from '../dominio/verbete';

export interface Midia {
  id: string;
  autorId: string;
  tipo: TipoMidia;
  nome: string;
  extensao: string;
  formato: string;
}

export interface SolicitacaoTitular {
  id: string;
  contato: string;
  descricao: string;
  criadaEm: string;
  identidadeVerificada: boolean;
  resposta?: string;
  atendidaEm?: string;
  sinalId?: string;
}

export interface Evento {
  data: string;
  autorId: string;
  acao: string;
  registroId: string;
}

export interface Acervo {
  contas: Conta[];
  assuntos: string[];
  envios: RegistroEnvio[];
  publicados: Record<string, string>;
  midias: Midia[];
  solicitacoes: SolicitacaoTitular[];
  auditoria: Evento[];
}

export abstract class RepositorioAcervo {
  abstract consultar(): Acervo;
  abstract alterar<T>(alteracao: (acervo: Acervo) => T): T;
}
