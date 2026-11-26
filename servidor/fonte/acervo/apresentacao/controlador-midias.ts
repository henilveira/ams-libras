import {
  BadRequestException, CanActivate, Controller, ExecutionContext, Get, Headers, Injectable, NotFoundException,
  Param, PayloadTooLargeException, Post, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { rm } from 'node:fs/promises';
import { ServicoUsuarios } from '../../usuarios/aplicacao/servico-usuarios';
import { Arquivos, limiteVideo } from '../../infraestrutura/arquivos';
import { RepositorioAcervo } from '../aplicacao/repositorio-acervo';
import { midiasDoEnvio, publicados } from '../aplicacao/servico-acervo';
import { id, ler, tipoMidia } from './esquemas';

@Injectable()
export class GuardaColaborador implements CanActivate {
  constructor(private readonly usuarios: ServicoUsuarios) {}

  canActivate(contexto: ExecutionContext) {
    this.usuarios.exigir(contexto.switchToHttp().getRequest<Request>().headers.cookie, 'colaborador');
    return true;
  }
}

@Controller('midias')
export class ControladorMidias {
  constructor(
    private readonly arquivos: Arquivos,
    private readonly repositorio: RepositorioAcervo,
    private readonly usuarios: ServicoUsuarios,
  ) {}

  @Post(':tipo')
  @UseGuards(GuardaColaborador)
  @UseInterceptors(FileInterceptor('arquivo', { limits: { fileSize: limiteVideo + 1, files: 1, fields: 0 } }))
  async enviar(@Headers('cookie') cookie: string | undefined, @Param('tipo') tipo: string,
    @UploadedFile() arquivo?: Express.Multer.File) {
    const ator = this.usuarios.exigir(cookie, 'colaborador');
    if (!arquivo) throw new BadRequestException('Selecione um arquivo.');
    if (arquivo.size > limiteVideo) throw new PayloadTooLargeException('O arquivo ultrapassa o limite de 50 MB.');
    const midia = await this.arquivos.guardar(ler(tipoMidia, tipo), arquivo, ator.id);
    try {
      this.repositorio.alterar((acervo) => acervo.midias.push(midia));
    } catch (erro) {
      await rm(this.arquivos.caminho(midia), { force: true });
      throw erro;
    }
    return { id: midia.id, nome: midia.nome };
  }

  @Get(':id')
  abrir(@Headers('cookie') cookie: string | undefined, @Param('id') midiaId: string, @Res() resposta: Response) {
    const acervo = this.repositorio.consultar();
    const midia = acervo.midias.find((item) => item.id === ler(id, midiaId));
    if (!midia) throw new NotFoundException('Arquivo não encontrado.');
    const ator = this.usuarios.usuario(cookie);
    const emEnvio = (envio: Parameters<typeof midiasDoEnvio>[0]) =>
      midiasDoEnvio(envio).some(([, arquivoId]) => arquivoId === midia.id);
    const publico = midia.tipo !== 'autorizacao' && publicados(acervo).some((envio) =>
      (midia.tipo !== 'imagem' || envio.sinal.tipo === 'referencia') && emEnvio(envio));
    const revisavel = ator?.perfil === 'moderador' && acervo.envios.some((envio) =>
      !['rascunho', 'excluido'].includes(envio.estado) && emEnvio(envio));
    if (!publico && ator?.id !== midia.autorId && !revisavel) throw new NotFoundException('Arquivo não encontrado.');

    resposta.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': midia.formato });
    if (midia.tipo === 'autorizacao') resposta.attachment('autorizacao.pdf');
    resposta.sendFile(this.arquivos.caminho(midia), (erro) => {
      if (erro && !resposta.headersSent) resposta.status(404).end();
    });
  }
}
