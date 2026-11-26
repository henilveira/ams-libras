import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ServicoUsuarios } from '../../usuarios/aplicacao/servico-usuarios';
import { ServicoAcervo } from '../aplicacao/servico-acervo';
import { conteudo, curto, decisao, estado, id, ler, operacao, texto } from './esquemas';

@Controller()
export class ControladorAcervo {
  constructor(private readonly acervo: ServicoAcervo, private readonly usuarios: ServicoUsuarios) {}

  @Get('verbetes')
  verbetes(@Query() consulta: unknown) {
    const { busca, letra, assunto, ordem } = ler(z.object({
      busca: curto.default(''), letra: z.string().regex(/^[a-zá-ú]?$/i).default(''),
      assunto: curto.default(''), ordem: z.enum(['az', 'za']).default('az'),
    }), consulta);
    return this.acervo.consultar(busca, letra, assunto, ordem);
  }

  @Get('assuntos')
  assuntos() {
    return this.acervo.assuntos();
  }

  @Post('assuntos')
  criarAssunto(@Headers('cookie') cookie: string | undefined, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'administrador');
    return this.acervo.criarAssunto(ator, ler(z.object({ assunto: curto.min(1) }), corpo).assunto);
  }

  @Get('envios')
  envios(@Headers('cookie') cookie: string | undefined, @Query() consulta: unknown) {
    const ator = this.usuarios.exigir(cookie, 'colaborador', 'moderador');
    const filtro = ler(z.object({ estado: estado.optional(), desde: z.iso.date().optional(), ate: z.iso.date().optional() }), consulta);
    return this.acervo.envios(ator, filtro.estado, filtro.desde, filtro.ate);
  }

  @Get('envios/publicados')
  publicados(@Headers('cookie') cookie: string | undefined) {
    return this.acervo.gerenciarPublicados(this.usuarios.exigir(cookie, 'colaborador'));
  }

  @Post('envios')
  criar(@Headers('cookie') cookie: string | undefined, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'colaborador');
    const dados = ler(z.object({ conteudo, verbeteId: id.optional() }), corpo);
    return this.acervo.criar(ator, dados.conteudo, dados.verbeteId);
  }

  @Post('envios/propostas')
  propor(@Headers('cookie') cookie: string | undefined, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'colaborador');
    const dados = ler(z.object({ sinalId: id, operacao }), corpo);
    return this.acervo.propor(ator, dados.sinalId, dados.operacao);
  }

  @Patch('envios/:id')
  salvar(@Headers('cookie') cookie: string | undefined, @Param('id') envioId: string, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'colaborador');
    const dados = ler(z.object({ conteudo, encaminhar: z.boolean(), versao: z.iso.datetime() }), corpo);
    return this.acervo.salvar(ator, ler(id, envioId), dados.conteudo, dados.versao, dados.encaminhar);
  }

  @Delete('envios/:id')
  @HttpCode(204)
  excluir(@Headers('cookie') cookie: string | undefined, @Param('id') envioId: string) {
    this.acervo.excluir(this.usuarios.exigir(cookie, 'colaborador'), ler(id, envioId));
  }

  @Post('envios/:id/revisoes')
  revisar(@Headers('cookie') cookie: string | undefined, @Param('id') envioId: string, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'moderador');
    const dados = ler(z.object({ decisao, justificativa: texto }), corpo);
    return this.acervo.revisar(ator, ler(id, envioId), dados.decisao, dados.justificativa);
  }
}
