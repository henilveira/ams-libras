import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Usuario } from '../../usuarios/dominio/usuario';
import { Envio, ErroDeDominio } from '../dominio/envio';
import type { ConteudoEnvio, Decisao, EstadoEnvio, RegistroEnvio, TipoMidia, VerbetePublicado } from '../dominio/verbete';
import { RepositorioAcervo, type Acervo } from './repositorio-acervo';

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function publicados(acervo: Acervo) {
  return acervo.envios.filter((envio) => acervo.publicados[envio.sinalId] === envio.id);
}

function registrar(acervo: Acervo, autorId: string, registroId: string, acao: string) {
  acervo.auditoria.push({ autorId, registroId, acao, data: new Date().toISOString() });
}

function midiasDoEnvio(envio: ConteudoEnvio): [TipoMidia, string | undefined][] {
  return [
    ['imagem', envio.verbete.imagemId], ['video', envio.sinal.videoId],
    ['legenda', envio.sinal.legendaId], ['autorizacao', envio.autorizacao.comprovanteId],
  ];
}

@Injectable()
export class ServicoAcervo {
  constructor(private readonly repositorio: RepositorioAcervo) {}

  consultar(termo: string, letra: string, assunto: string, ordem: string): VerbetePublicado[] {
    const acervo = this.repositorio.consultar();
    const grupos = new Map<string, VerbetePublicado>();
    const sinais = publicados(acervo);
    for (const envio of sinais) {
      if (envio.sinal.tipo === 'referencia') {
        grupos.set(envio.verbeteId, { ...envio.verbete, id: envio.verbeteId, sinais: [] });
      }
    }
    for (const envio of sinais) {
      grupos.get(envio.verbeteId)?.sinais.push({ ...envio.sinal, id: envio.sinalId });
    }
    const busca = normalizar(termo);
    return [...grupos.values()].filter((verbete) =>
      (!assunto || verbete.assunto === assunto)
      && normalizar(verbete.palavra).startsWith(normalizar(letra))
      && [verbete.palavra, verbete.assunto, verbete.acepcao, verbete.exemploPortugues, verbete.exemploLibras]
        .some((campo) => normalizar(campo).includes(busca)))
      .map((verbete) => ({
        ...verbete,
        sinais: verbete.sinais.sort((a, b) =>
          Number(b.tipo === 'referencia') - Number(a.tipo === 'referencia') || a.regiao.localeCompare(b.regiao, 'pt-BR')),
      }))
      .sort((a, b) => a.palavra.localeCompare(b.palavra, 'pt-BR') * (ordem === 'za' ? -1 : 1));
  }

  assuntos() {
    return this.repositorio.consultar().assuntos;
  }

  criarAssunto(ator: Usuario, assunto: string) {
    return this.repositorio.alterar((acervo) => {
      if (acervo.assuntos.some((item) => normalizar(item) === normalizar(assunto))) {
        throw new ErroDeDominio('Esse assunto já existe.');
      }
      acervo.assuntos.push(assunto);
      acervo.assuntos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
      registrar(acervo, ator.id, assunto, 'Assunto criado');
      return acervo.assuntos;
    });
  }

  envios(ator: Usuario, estado?: EstadoEnvio, desde?: string, ate?: string) {
    return this.repositorio.consultar().envios.filter((envio) => {
      const visivel = ator.perfil === 'colaborador' ? envio.autorId === ator.id : envio.estado !== 'rascunho';
      const data = envio.atualizadoEm.slice(0, 10);
      return visivel && envio.estado !== 'excluido'
        && (!estado || envio.estado === estado) && (!desde || data >= desde) && (!ate || data <= ate);
    }).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
  }

  gerenciarPublicados(ator: Usuario) {
    return publicados(this.repositorio.consultar()).filter((envio) => envio.autorId === ator.id);
  }

  criar(ator: Usuario, conteudo: ConteudoEnvio, verbeteId?: string) {
    return this.repositorio.alterar((acervo) => {
      if (verbeteId) {
        const referencia = this.referencia(acervo, verbeteId);
        if (conteudo.sinal.tipo === 'referencia') throw new ErroDeDominio('Escolha um tipo de variação.');
        conteudo.verbete = { ...referencia.verbete };
      } else if (conteudo.sinal.tipo !== 'referencia') {
        throw new ErroDeDominio('Publique primeiro o sinal de referência.');
      }
      this.validarMidias(acervo, ator.id, conteudo, verbeteId ? conteudo.verbete.imagemId : undefined);
      return this.novoEnvio(acervo, ator.id, conteudo, verbeteId ?? randomUUID(), randomUUID(), 'inclusao');
    });
  }

  propor(ator: Usuario, sinalId: string, operacao: 'alteracao' | 'remocao') {
    return this.repositorio.alterar((acervo) => {
      const atual = publicados(acervo).find((envio) => envio.sinalId === sinalId);
      if (!atual || atual.autorId !== ator.id) throw new NotFoundException('Publicação própria não encontrada.');
      if (acervo.envios.some((envio) => envio.sinalId === sinalId
        && ['rascunho', 'devolvido', 'em-revisao'].includes(envio.estado))) {
        throw new ErroDeDominio('Já existe uma solicitação em aberto para este sinal.');
      }
      const conteudo: ConteudoEnvio = { verbete: atual.verbete, sinal: atual.sinal, autorizacao: atual.autorizacao };
      return this.novoEnvio(acervo, ator.id, conteudo, atual.verbeteId, sinalId, operacao);
    });
  }

  salvar(ator: Usuario, id: string, conteudo: ConteudoEnvio, versao: string, encaminhar: boolean) {
    return this.repositorio.alterar((acervo) => {
      const envio = this.doAutor(acervo, id, ator.id);
      if (envio.registro.atualizadoEm !== versao) throw new ErroDeDominio('Este envio mudou. Reabra-o antes de salvar.');
      if (envio.registro.operacao === 'remocao') {
        conteudo = envio.registro;
      } else {
        const referencia = envio.registro.sinal.tipo === 'referencia';
        if (referencia !== (conteudo.sinal.tipo === 'referencia')) {
          throw new ErroDeDominio('Um sinal de referência não pode ser convertido em variação ou vice-versa.');
        }
        if (!referencia) conteudo.verbete = this.referencia(acervo, envio.registro.verbeteId).verbete;
        this.validarMidias(acervo, ator.id, conteudo, referencia ? undefined : conteudo.verbete.imagemId);
        if (conteudo.sinal.videoId !== envio.registro.sinal.videoId && conteudo.autorizacao.comprovanteId
          && conteudo.autorizacao.comprovanteId === envio.registro.autorizacao.comprovanteId) {
          throw new ErroDeDominio('Anexe a documentação específica para o novo vídeo.');
        }
      }
      const agora = new Date(Math.max(Date.now(), Date.parse(versao) + 1)).toISOString();
      envio.atualizar(conteudo, ator.id, agora);
      if (encaminhar) {
        this.validarDependencias(acervo, envio.registro);
        envio.solicitarRevisao(ator.id, agora);
      }
      registrar(acervo, ator.id, id, encaminhar ? 'Enviado para revisão' : 'Envio atualizado');
      return envio.registro;
    });
  }

  excluir(ator: Usuario, id: string) {
    this.repositorio.alterar((acervo) => {
      this.doAutor(acervo, id, ator.id).excluir(ator.id, new Date().toISOString());
      registrar(acervo, ator.id, id, 'Envio excluído');
    });
  }

  revisar(ator: Usuario, id: string, decisao: Decisao, justificativa: string) {
    return this.repositorio.alterar((acervo) => {
      const registro = acervo.envios.find((item) => item.id === id);
      if (!registro) throw new NotFoundException('Envio não encontrado.');
      const envio = new Envio(registro);
      envio.revisar(decisao, justificativa, ator.id, new Date().toISOString());
      if (decisao === 'aprovado') {
        this.validarDependencias(acervo, registro);
        if (registro.operacao === 'remocao') delete acervo.publicados[registro.sinalId];
        else acervo.publicados[registro.sinalId] = id;
      }
      registrar(acervo, ator.id, id, `Revisão: ${decisao}`);
      return registro;
    });
  }

  private novoEnvio(acervo: Acervo, autorId: string, conteudo: ConteudoEnvio, verbeteId: string,
    sinalId: string, operacao: RegistroEnvio['operacao']) {
    const agora = new Date().toISOString();
    const envio: RegistroEnvio = {
      ...conteudo, id: randomUUID(), autorId, verbeteId, sinalId, operacao,
      estado: 'rascunho', criadoEm: agora, atualizadoEm: agora, revisoes: [],
    };
    acervo.envios.push(envio);
    registrar(acervo, autorId, envio.id, 'Envio criado');
    return envio;
  }

  private doAutor(acervo: Acervo, id: string, autorId: string) {
    const registro = acervo.envios.find((item) => item.id === id && item.autorId === autorId);
    if (!registro) throw new NotFoundException('Envio não encontrado.');
    return new Envio(registro);
  }

  private referencia(acervo: Acervo, verbeteId: string) {
    const registro = publicados(acervo).find((item) => item.verbeteId === verbeteId && item.sinal.tipo === 'referencia');
    if (!registro) throw new ErroDeDominio('O verbete de referência não está publicado.');
    return registro;
  }

  private validarMidias(acervo: Acervo, autorId: string, conteudo: ConteudoEnvio, imagemHerdada?: string) {
    for (const [tipo, id] of midiasDoEnvio(conteudo)) {
      if (!id || (tipo === 'imagem' && id === imagemHerdada)) continue;
      if (!acervo.midias.some((midia) => midia.id === id && midia.tipo === tipo && midia.autorId === autorId)) {
        throw new ErroDeDominio('Um dos arquivos selecionados não pertence a este envio ou tem tipo incorreto.');
      }
    }
  }

  private validarDependencias(acervo: Acervo, registro: RegistroEnvio) {
    if (registro.operacao !== 'inclusao' && !acervo.publicados[registro.sinalId]) {
      throw new ErroDeDominio('O sinal original deixou de estar publicado.');
    }
    if (registro.operacao === 'remocao') {
      if (registro.sinal.tipo === 'referencia' && publicados(acervo).some((item) => item.verbeteId === registro.verbeteId
        && item.sinal.tipo !== 'referencia')) {
        throw new ErroDeDominio('Remova primeiro as variações publicadas deste verbete.');
      }
      return;
    }
    if (registro.sinal.tipo !== 'referencia') {
      this.referencia(acervo, registro.verbeteId);
      return;
    }
    if (!acervo.assuntos.includes(registro.verbete.assunto)) {
      throw new ErroDeDominio('Selecione um assunto do acervo.');
    }
    if (publicados(acervo).some((item) => item.sinal.tipo === 'referencia' && item.verbeteId !== registro.verbeteId
      && normalizar(item.verbete.palavra) === normalizar(registro.verbete.palavra)
      && normalizar(item.verbete.acepcao) === normalizar(registro.verbete.acepcao))) {
      throw new ErroDeDominio('Já existe um verbete com esta palavra e acepção. Envie uma variação pelo verbete publicado.');
    }
  }
}

export { midiasDoEnvio, publicados, registrar };
