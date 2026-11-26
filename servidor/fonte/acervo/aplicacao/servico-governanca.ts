import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Usuario } from '../../usuarios/dominio/usuario';
import { ErroDeDominio } from '../dominio/envio';
import { RepositorioAcervo, type SolicitacaoTitular } from './repositorio-acervo';
import { publicados, registrar } from './servico-acervo';

@Injectable()
export class ServicoGovernanca {
  constructor(private readonly repositorio: RepositorioAcervo) {}

  solicitar(contato: string, descricao: string, sinalId?: string) {
    return this.repositorio.alterar((acervo) => {
      if (sinalId && !acervo.publicados[sinalId]) throw new NotFoundException('Sinal publicado não encontrado.');
      const solicitacao: SolicitacaoTitular = {
        id: randomUUID(), contato, descricao, sinalId, criadaEm: new Date().toISOString(),
        identidadeVerificada: false,
      };
      acervo.solicitacoes.unshift(solicitacao);
      registrar(acervo, 'visitante', solicitacao.id, 'Solicitação de titular registrada');
      return { protocolo: solicitacao.id };
    });
  }

  painel() {
    const acervo = this.repositorio.consultar();
    return { solicitacoes: acervo.solicitacoes, auditoria: [...acervo.auditoria].reverse() };
  }

  atender(ator: Usuario, id: string, resposta: string, retirar: boolean) {
    return this.repositorio.alterar((acervo) => {
      const solicitacao = acervo.solicitacoes.find((item) => item.id === id);
      if (!solicitacao) throw new NotFoundException('Solicitação não encontrada.');
      if (solicitacao.atendidaEm) throw new ErroDeDominio('Esta solicitação já foi encerrada.');
      if (retirar) {
        const publicado = publicados(acervo).find((item) => item.sinalId === solicitacao.sinalId);
        if (!publicado) throw new ErroDeDominio('O sinal indicado não está publicado.');
        const retirada = publicado.sinal.tipo === 'referencia'
          ? publicados(acervo).filter((item) => item.verbeteId === publicado.verbeteId)
          : [publicado];
        for (const envio of retirada) {
          delete acervo.publicados[envio.sinalId];
          registrar(acervo, ator.id, envio.sinalId, 'Sinal retirado da consulta pública');
        }
      }
      Object.assign(solicitacao, { resposta, identidadeVerificada: true, atendidaEm: new Date().toISOString() });
      registrar(acervo, ator.id, id, 'Solicitação de titular atendida');
      return solicitacao;
    });
  }
}
