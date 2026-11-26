import { Body, Controller, Get, Headers, Param, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { curto, email, ler, perfil } from '../acervo/apresentacao/esquemas';
import { ServicoUsuarios } from '../usuarios/aplicacao/servico-usuarios';

@Controller()
export class ControladorContas {
  constructor(private readonly usuarios: ServicoUsuarios) {}

  @Post('sessao')
  entrar(@Headers('cookie') cookie: string | undefined, @Body() corpo: unknown, @Res({ passthrough: true }) resposta: Response) {
    const dados = ler(z.object({ email, senha: z.string().min(1).max(128) }), corpo);
    const sessao = this.usuarios.entrar(dados.email, dados.senha);
    this.usuarios.sair(cookie);
    resposta.setHeader('Set-Cookie', this.usuarios.cookie(sessao.chave));
    return sessao.usuario;
  }

  @Get('sessao')
  atual(@Headers('cookie') cookie: string | undefined) {
    return { usuario: this.usuarios.usuario(cookie) };
  }

  @Post('sessao/sair')
  sair(@Headers('cookie') cookie: string | undefined, @Res({ passthrough: true }) resposta: Response) {
    this.usuarios.sair(cookie);
    resposta.setHeader('Set-Cookie', this.usuarios.cookie());
    return { encerrada: true };
  }

  @Get('contas')
  contas(@Headers('cookie') cookie: string | undefined) {
    this.usuarios.exigir(cookie, 'administrador');
    return this.usuarios.listar();
  }

  @Post('contas')
  criar(@Headers('cookie') cookie: string | undefined, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'administrador');
    return this.usuarios.criar(ator, ler(z.object({
      email, nome: curto.min(1), senha: z.string().min(8).max(128), perfil,
    }), corpo));
  }

  @Patch('contas/:id')
  atualizar(@Headers('cookie') cookie: string | undefined, @Param('id') id: string, @Body() corpo: unknown) {
    const ator = this.usuarios.exigir(cookie, 'administrador');
    const dados = ler(z.object({ ativo: z.boolean(), perfil }), corpo);
    return this.usuarios.atualizar(ator, id, dados.perfil, dados.ativo);
  }
}
