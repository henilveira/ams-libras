import type { ConteudoEnvio, Decisao, RegistroEnvio } from './verbete';

export class ErroDeDominio extends Error {}

export class Envio {
  constructor(readonly registro: RegistroEnvio) {}

  podeEditar(autorId: string) {
    return this.registro.autorId === autorId
      && ['rascunho', 'devolvido'].includes(this.registro.estado);
  }

  atualizar(conteudo: ConteudoEnvio, autorId: string, data: string) {
    if (!this.podeEditar(autorId)) throw new ErroDeDominio('Este envio não pode ser editado.');
    Object.assign(this.registro, conteudo, { atualizadoEm: data });
  }

  excluir(autorId: string, data: string) {
    if (!this.podeEditar(autorId)) throw new ErroDeDominio('Apenas rascunhos e devoluções podem ser excluídos.');
    this.registro.estado = 'excluido';
    this.registro.atualizadoEm = data;
  }

  solicitarRevisao(autorId: string, data: string) {
    if (!this.podeEditar(autorId)) throw new ErroDeDominio('Este envio não pode ser encaminhado.');
    this.validarConteudo();
    this.registro.estado = 'em-revisao';
    this.registro.atualizadoEm = data;
  }

  revisar(decisao: Decisao, justificativa: string, moderadorId: string, data: string) {
    if (this.registro.estado !== 'em-revisao') throw new ErroDeDominio('O envio já saiu da fila de revisão.');
    if (this.registro.autorId === moderadorId) throw new ErroDeDominio('O autor não pode revisar o próprio envio.');
    if (decisao !== 'aprovado' && !justificativa) {
      throw new ErroDeDominio('Informe uma justificativa para devolver ou rejeitar.');
    }
    if (decisao === 'aprovado') this.validarConteudo();
    this.registro.revisoes.push({ decisao, justificativa, moderadorId, data });
    this.registro.estado = decisao;
    this.registro.atualizadoEm = data;
  }

  private validarConteudo() {
    const { verbete, sinal, autorizacao, operacao } = this.registro;
    if (operacao === 'remocao') return;
    if (!verbete.palavra || !verbete.assunto || !verbete.acepcao) {
      throw new ErroDeDominio('Preencha a palavra, o assunto e a acepção.');
    }
    if (!sinal.videoId || !sinal.glosa || !sinal.movimento) {
      throw new ErroDeDominio('Anexe um vídeo e preencha a glosa e a descrição do movimento.');
    }
    if (sinal.tipo !== 'referencia' && (!sinal.regiao || !sinal.observacao)) {
      throw new ErroDeDominio('Informe a região e a observação de uso da variação.');
    }
    if (verbete.imagemId && !verbete.textoAlternativo) {
      throw new ErroDeDominio('Preencha o texto alternativo da imagem.');
    }
    if (autorizacao.identificaveis === undefined || autorizacao.menores === undefined
      || !autorizacao.base || !autorizacao.finalidade) {
      throw new ErroDeDominio('Preencha as declarações, a base de uso e a finalidade do vídeo.');
    }
    if (autorizacao.menores && !autorizacao.identificaveis) {
      throw new ErroDeDominio('Declare a presença de pessoas identificáveis ao indicar menores no vídeo.');
    }
    if ((autorizacao.identificaveis || autorizacao.menores) && !autorizacao.comprovanteId) {
      throw new ErroDeDominio('Anexe a documentação exigida, inclusive a do responsável em caso de menores.');
    }
  }
}
