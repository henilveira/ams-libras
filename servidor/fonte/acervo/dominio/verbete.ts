export type TipoSinal = 'referencia' | 'regional' | 'social';
export type EstadoEnvio = 'rascunho' | 'em-revisao' | 'devolvido' | 'aprovado' | 'rejeitado' | 'excluido';
export type Decisao = 'aprovado' | 'devolvido' | 'rejeitado';
export type TipoMidia = 'video' | 'imagem' | 'autorizacao' | 'legenda';

export interface DadosVerbete {
  palavra: string;
  assunto: string;
  acepcao: string;
  exemploPortugues: string;
  exemploLibras: string;
  classeGramatical: string;
  origem: string;
  configuracaoMao: string;
  imagemId?: string;
  textoAlternativo: string;
}

export type AmostraMidia =
  | { tipo: 'simulada'; cartaz: string }
  | { tipo: 'referencia'; cartaz: string; credito: {
    autor: string; titulo: string; url: string; licenca: string; urlLicenca: string;
  } };

export interface DadosSinal {
  tipo: TipoSinal;
  regiao: string;
  observacao: string;
  glosa: string;
  movimento: string;
  videoId?: string;
  legendaId?: string;
  amostra?: AmostraMidia;
}

export interface Autorizacao {
  identificaveis?: boolean;
  menores?: boolean;
  base: string;
  finalidade: string;
  comprovanteId?: string;
}

export interface ConteudoEnvio {
  verbete: DadosVerbete;
  sinal: DadosSinal;
  autorizacao: Autorizacao;
}

export interface Revisao {
  decisao: Decisao;
  justificativa: string;
  moderadorId: string;
  data: string;
}

export interface RegistroEnvio extends ConteudoEnvio {
  id: string;
  autorId: string;
  verbeteId: string;
  sinalId: string;
  operacao: 'inclusao' | 'alteracao' | 'remocao';
  estado: EstadoEnvio;
  criadoEm: string;
  atualizadoEm: string;
  revisoes: Revisao[];
  demonstracao?: boolean;
}

export interface SinalPublicado extends DadosSinal {
  id: string;
}

export interface VerbetePublicado extends DadosVerbete {
  id: string;
  sinais: SinalPublicado[];
}
