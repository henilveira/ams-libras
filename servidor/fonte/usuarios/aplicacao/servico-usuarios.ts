import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { RepositorioAcervo } from '../../acervo/aplicacao/repositorio-acervo';
import { ErroDeDominio } from '../../acervo/dominio/envio';
import { conferirSenha, protegerSenha } from '../../infraestrutura/segredo';
import type { Conta, Perfil, Usuario } from '../dominio/usuario';

export const duracaoSessao = 8 * 60 * 60 * 1000;
const nomeCookie = 'sessao_libras';

function dadosPublicos({ id, nome, email, perfil, ativo }: Conta): Usuario {
  return { id, nome, email, perfil, ativo };
}

@Injectable()
export class ServicoUsuarios {
  private readonly sessoes = new Map<string, { id: string; expiraEm: number }>();

  constructor(private readonly repositorio: RepositorioAcervo) {}

  entrar(email: string, senha: string) {
    const conta = this.repositorio.consultar().contas.find((item) => item.email === email.toLowerCase());
    if (!conta?.ativo || !conferirSenha(senha, conta.senhaProtegida)) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const agora = Date.now();
    for (const [chave, sessao] of this.sessoes) {
      if (sessao.expiraEm <= agora) this.sessoes.delete(chave);
    }
    const chave = randomBytes(32).toString('hex');
    this.sessoes.set(chave, { id: conta.id, expiraEm: agora + duracaoSessao });
    return { usuario: dadosPublicos(conta), chave };
  }

  usuario(cookie?: string) {
    const sessao = this.sessoes.get(this.chave(cookie));
    if (!sessao || sessao.expiraEm <= Date.now()) return null;
    const conta = this.repositorio.consultar().contas.find((item) => item.id === sessao.id && item.ativo);
    return conta ? dadosPublicos(conta) : null;
  }

  exigir(cookie: string | undefined, ...perfis: Perfil[]) {
    const usuario = this.usuario(cookie);
    if (!usuario) throw new UnauthorizedException('Entre para continuar.');
    if (perfis.length && !perfis.includes(usuario.perfil)) {
      throw new ForbiddenException('Seu perfil não tem acesso a esta operação.');
    }
    return usuario;
  }

  sair(cookie?: string) {
    this.sessoes.delete(this.chave(cookie));
  }

  cookie(chave = '') {
    return `${nomeCookie}=${chave}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${chave ? duracaoSessao / 1000 : 0}`;
  }

  listar() {
    return this.repositorio.consultar().contas.map(dadosPublicos);
  }

  criar(ator: Usuario, dados: { nome: string; email: string; senha: string; perfil: Perfil }) {
    const email = dados.email.toLowerCase();
    return this.repositorio.alterar((acervo) => {
      if (acervo.contas.some((conta) => conta.email === email)) throw new ErroDeDominio('Este e-mail já está em uso.');
      const conta: Conta = {
        id: randomUUID(), nome: dados.nome, email, perfil: dados.perfil, ativo: true,
        senhaProtegida: protegerSenha(dados.senha),
      };
      acervo.contas.push(conta);
      acervo.auditoria.push({ autorId: ator.id, registroId: conta.id, acao: 'Conta criada', data: new Date().toISOString() });
      return dadosPublicos(conta);
    });
  }

  atualizar(ator: Usuario, id: string, perfil: Perfil, ativo: boolean) {
    return this.repositorio.alterar((acervo) => {
      const conta = acervo.contas.find((item) => item.id === id);
      if (!conta) throw new ErroDeDominio('Conta não encontrada.');
      if (conta.id === ator.id && (!ativo || perfil !== 'administrador')) {
        throw new ErroDeDominio('Sua conta deve permanecer como administradora ativa.');
      }
      Object.assign(conta, { perfil, ativo });
      acervo.auditoria.push({ autorId: ator.id, registroId: id, acao: 'Conta atualizada', data: new Date().toISOString() });
      return dadosPublicos(conta);
    });
  }

  private chave(cookie = '') {
    const entrada = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${nomeCookie}=`));
    return entrada?.slice(nomeCookie.length + 1) ?? '';
  }
}
