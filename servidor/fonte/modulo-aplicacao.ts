import { Module } from '@nestjs/common';
import { RepositorioAcervo } from './acervo/aplicacao/repositorio-acervo';
import { ServicoAcervo } from './acervo/aplicacao/servico-acervo';
import { ServicoGovernanca } from './acervo/aplicacao/servico-governanca';
import { ControladorAcervo } from './acervo/apresentacao/controlador-acervo';
import { ControladorGovernanca } from './acervo/apresentacao/controlador-governanca';
import { ControladorMidias, GuardaColaborador } from './acervo/apresentacao/controlador-midias';
import { Arquivos } from './infraestrutura/arquivos';
import { RepositorioArquivo } from './infraestrutura/repositorio-arquivo';
import { ControladorContas } from './apresentacao/controlador-contas';
import { ServicoUsuarios } from './usuarios/aplicacao/servico-usuarios';

@Module({
  controllers: [ControladorAcervo, ControladorMidias, ControladorContas, ControladorGovernanca],
  providers: [
    { provide: RepositorioAcervo, useClass: RepositorioArquivo },
    ServicoAcervo, ServicoUsuarios, ServicoGovernanca, Arquivos, GuardaColaborador,
  ],
})
export class ModuloAplicacao {}
