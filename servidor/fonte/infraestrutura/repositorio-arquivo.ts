import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Acervo, RepositorioAcervo } from '../acervo/aplicacao/repositorio-acervo';
import type { Perfil } from '../usuarios/dominio/usuario';
import { pastaDados } from './pastas';
import { protegerSenha } from './segredo';

@Injectable()
export class RepositorioArquivo extends RepositorioAcervo {
  private readonly caminho = join(pastaDados, 'acervo.json');

  constructor() {
    super();
    mkdirSync(pastaDados, { recursive: true, mode: 0o700 });
    if (!existsSync(this.caminho)) {
      const perfis: Perfil[] = ['colaborador', 'moderador', 'administrador'];
      const senhaProtegida = protegerSenha('libras123');
      this.gravar({
        contas: perfis.map((perfil) => ({
          id: perfil, nome: `${perfil[0].toUpperCase()}${perfil.slice(1)} de demonstração`,
          email: `${perfil}@libras.local`, senhaProtegida, perfil, ativo: true,
        })),
        assuntos: ['Cotidiano', 'Cultura', 'Educação', 'Saudações', 'Trabalho'],
        envios: [], publicados: {}, midias: [], solicitacoes: [], auditoria: [],
      });
    }
  }

  consultar(): Acervo {
    return JSON.parse(readFileSync(this.caminho, 'utf8')) as Acervo;
  }

  alterar<T>(alteracao: (acervo: Acervo) => T): T {
    const acervo = this.consultar();
    const resultado = alteracao(acervo);
    this.gravar(acervo);
    return resultado;
  }

  private gravar(acervo: Acervo) {
    const temporario = `${this.caminho}.tmp`;
    writeFileSync(temporario, JSON.stringify(acervo, null, 2), { mode: 0o600 });
    renameSync(temporario, this.caminho);
  }
}
