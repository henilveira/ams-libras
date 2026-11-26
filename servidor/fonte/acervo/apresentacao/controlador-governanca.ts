import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { ServicoUsuarios } from '../../usuarios/aplicacao/servico-usuarios';
import { ServicoGovernanca } from '../aplicacao/servico-governanca';
import { email, id, ler, texto } from './esquemas';

@Controller('governanca')
export class ControladorGovernanca {
  constructor(private readonly governanca: ServicoGovernanca, private readonly usuarios: ServicoUsuarios) {}

  @Post('solicitacoes')
  solicitar(@Body() corpo: unknown) {
    const dados = ler(z.object({ contato: email, descricao: texto.min(1), sinalId: id.optional() }), corpo);
    return this.governanca.solicitar(dados.contato, dados.descricao, dados.sinalId);
  }

  @Patch('solicitacoes/:id')
  atender(@Headers('cookie') cookie: string | undefined, @Param('id') solicitacaoId: string, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'administrador');
    const dados = ler(z.object({ verificada: z.literal(true), resposta: texto.min(1), retirar: z.boolean() }), corpo);
    return this.governanca.atender(ator, ler(id, solicitacaoId), dados.resposta, dados.retirar);
  }

  @Get()
  painel(@Headers('cookie') cookie: string | undefined) {
    this.usuarios.exigir(cookie, 'administrador');
    return this.governanca.painel();
  }
}
