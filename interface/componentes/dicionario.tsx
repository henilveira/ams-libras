'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, LogOut } from 'lucide-react';
import { Administracao } from './administracao';
import { AreaEnvios } from './area-envios';
import { Consulta, DetalheVerbete } from './consulta';
import { FormularioEnvio } from './formulario-envio';
import { api, mensagemDe, perfis, type RegistroEnvio, type Usuario, type VerbetePublicado } from './dados';

type Tela = 'consulta' | 'verbete' | 'entrar' | 'area' | 'envio' | 'solicitacao';

export function Dicionario() {
  const [tela, mudarTela] = useState<Tela>('consulta');
  const [usuario, mudarUsuario] = useState<Usuario | null>(null);
  const [assuntos, mudarAssuntos] = useState<string[]>([]);
  const [verbete, mudarVerbete] = useState<VerbetePublicado>();
  const [contribuicaoPendente, mudarContribuicaoPendente] = useState(false);
  const [variacao, mudarVariacao] = useState<VerbetePublicado>();
  const [envio, mudarEnvio] = useState<RegistroEnvio>();
  const [sinal, mudarSinal] = useState<string>();
  const [aviso, mudarAviso] = useState('');
  const [erro, mudarErro] = useState('');
  const [ocupado, mudarOcupado] = useState(false);
  const navegou = useRef(false);
  const principal = useRef<HTMLElement>(null);

  useEffect(() => {
    let vigente = true;
    Promise.allSettled([api<{ usuario: Usuario | null }>('sessao'), api<string[]>('assuntos')])
      .then(([sessao, lista]) => {
        if (!vigente) return;
        if (sessao.status === 'fulfilled') mudarUsuario(sessao.value.usuario);
        if (lista.status === 'fulfilled') mudarAssuntos(lista.value);
      });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (!navegou.current) return;
    principal.current?.querySelector<HTMLElement>('#titulo-principal')?.focus();
    window.scrollTo(0, 0);
  }, [tela]);

  function abrirTela(destino: Tela) {
    navegou.current = true;
    mudarAviso('');
    mudarErro('');
    mudarTela(destino);
  }

  function contribuir(alvo?: VerbetePublicado) {
    mudarContribuicaoPendente(!usuario);
    mudarVariacao(alvo);
    mudarEnvio(undefined);
    if (usuario?.perfil === 'colaborador') abrirTela('envio');
    else if (usuario) {
      abrirTela('area');
      mudarAviso('Entre com um perfil de colaborador para enviar verbetes e variações.');
    } else abrirTela('entrar');
  }

  async function entrar(email: string, senha: string) {
    mudarOcupado(true);
    mudarErro('');
    try {
      const conta = await api<Usuario>('sessao', 'POST', { email, senha });
      mudarUsuario(conta);
      abrirTela(contribuicaoPendente && conta.perfil === 'colaborador' ? 'envio' : 'area');
      mudarContribuicaoPendente(false);
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarOcupado(false);
    }
  }

  async function sair() {
    mudarOcupado(true);
    try {
      await api('sessao/sair', 'POST');
      mudarUsuario(null);
      mudarVariacao(undefined);
      abrirTela('consulta');
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarOcupado(false);
    }
  }

  function solicitar(id?: string) {
    mudarSinal(id);
    abrirTela('solicitacao');
  }

  return <>
    <a className="atalho" href="#conteudo">Pular para o conteúdo</a>
    <header className="topo">
      <div className="topo-interno">
        <button type="button" className="marca" onClick={() => abrirTela('consulta')}>
          <span className="marca-icone" aria-hidden="true">L<span>.</span></span>
          <span>Dicionário de Libras</span>
        </button>
        <nav aria-label="Navegação principal">
          <button className="botao texto nave-acervo" aria-current={tela === 'consulta' || tela === 'verbete' ? 'page' : undefined}
            onClick={() => abrirTela('consulta')}>Acervo</button>
          {usuario ? <>
            <button className="botao secundario" aria-current={tela === 'area' || tela === 'envio' ? 'page' : undefined}
              onClick={() => abrirTela('area')}>{perfis[usuario.perfil]}</button>
            <button className="botao texto" aria-label="Sair" disabled={ocupado} onClick={() => void sair()}>
              <LogOut size={19} aria-hidden="true" />
            </button>
          </> : <button className="botao secundario" onClick={() => { mudarContribuicaoPendente(false); mudarVariacao(undefined); abrirTela('entrar'); }}>
            Entrar <ArrowUpRight size={16} aria-hidden="true" />
          </button>}
        </nav>
      </div>
    </header>
    <main id="conteudo" className="conteudo" tabIndex={-1} ref={principal}>
      {aviso && <p className="aviso" role="status">{aviso}</p>}
      {erro && tela !== 'entrar' && <p className="aviso erro" role="alert">{erro}</p>}
      {tela === 'consulta' && <Consulta assuntos={assuntos}
        abrir={(item) => { mudarVerbete(item); abrirTela('verbete'); }} contribuir={() => contribuir()} />}
      {tela === 'verbete' && verbete && <DetalheVerbete key={verbete.id} verbete={verbete}
        voltar={() => abrirTela('consulta')} variar={() => contribuir(verbete)} solicitar={solicitar} />}
      {tela === 'entrar' && <Entrada entrar={entrar} ocupado={ocupado} erro={erro} voltar={() => abrirTela('consulta')} />}
      {tela === 'area' && usuario && (usuario.perfil === 'administrador'
        ? <Administracao usuario={usuario} assuntos={assuntos} atualizarAssuntos={mudarAssuntos} />
        : <AreaEnvios key={usuario.id} usuario={usuario} novo={() => contribuir()} editar={(item) => {
          mudarVariacao(undefined);
          mudarEnvio(item);
          abrirTela('envio');
        }} />)}
      {tela === 'envio' && usuario?.perfil === 'colaborador' && <FormularioEnvio inicial={envio} alvo={variacao}
        assuntos={assuntos} voltar={() => abrirTela('area')} concluir={(mensagem) => {
          abrirTela('area');
          mudarAviso(mensagem);
        }} />}
      {tela === 'solicitacao' && <PedidoTitular sinal={sinal} voltar={() => abrirTela(sinal && verbete ? 'verbete' : 'consulta')} />}
    </main>
    <footer className="rodape">
      <div><span>Dicionário de Libras <small>Projeto acadêmico · AMS0002</small></span>
        <div className="acoes">
          <button className="botao texto" onClick={() => contribuir()}>Contribuir <ArrowUpRight size={16} aria-hidden="true" /></button>
          <button className="botao texto" onClick={() => solicitar()}>Solicitação de titular</button>
        </div>
      </div>
    </footer>
  </>;
}

function Entrada({ entrar, ocupado, erro, voltar }: {
  entrar: (email: string, senha: string) => Promise<void>;
  ocupado: boolean;
  erro: string;
  voltar: () => void;
}) {
  const [email, mudarEmail] = useState('');
  const [senha, mudarSenha] = useState('');

  function autenticar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    void entrar(email, senha);
  }

  return <section className="pagina-interna pagina-entrada">
    <button className="botao texto voltar" onClick={voltar}><ArrowLeft size={18} aria-hidden="true" /> Voltar ao acervo</button>
    <div className="titulo-pagina">
      <h1 id="titulo-principal" tabIndex={-1}>Entrar</h1>
      <p>Acesse a área de colaboração, moderação ou administração.</p>
    </div>
    <form className="painel formulario" onSubmit={autenticar}>
      <label>E-mail<input required type="email" value={email} maxLength={254} autoComplete="username"
        onChange={(evento) => mudarEmail(evento.target.value)} /></label>
      <label>Senha<input required type="password" value={senha} maxLength={128} autoComplete="current-password"
        onChange={(evento) => mudarSenha(evento.target.value)} /></label>
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <button type="submit" className="botao principal" disabled={ocupado}>Entrar <ArrowRight size={17} aria-hidden="true" /></button>
    </form>
    <div className="secao atalhos-demonstracao">
      <h2>Contas de demonstração</h2>
      <div className="acoes">
        {Object.entries(perfis).map(([perfil, rotulo]) => <button className="botao secundario" key={perfil}
          disabled={ocupado} onClick={() => { mudarEmail(`${perfil}@libras.local`); mudarSenha('libras123'); }}>{rotulo}</button>)}
      </div>
    </div>
  </section>;
}

function PedidoTitular({ sinal, voltar }: { sinal?: string; voltar: () => void }) {
  const [protocolo, mudarProtocolo] = useState('');
  const [ocupado, mudarOcupado] = useState(false);
  const [erro, mudarErro] = useState('');

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.currentTarget));
    mudarOcupado(true);
    mudarErro('');
    try {
      const pedido = await api<{ protocolo: string }>('governanca/solicitacoes', 'POST', { ...dados, sinalId: sinal });
      mudarProtocolo(pedido.protocolo);
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarOcupado(false);
    }
  }

  return <section className="pagina-interna pagina-estreita">
    <button className="botao texto" onClick={voltar}><ArrowLeft size={18} aria-hidden="true" /> Voltar</button>
    <div className="titulo-pagina">
      <h1 id="titulo-principal" tabIndex={-1}>Solicitação de titular</h1>
      <p>Registre um pedido sobre seus dados ou sobre um vídeo em que você aparece.</p>
    </div>
    {protocolo ? <p role="status" className="aviso">Pedido registrado. Protocolo <strong>{protocolo}</strong>.</p>
      : <form className="formulario painel" onSubmit={enviar}>
        <label>E-mail para contato<input name="contato" type="email" required maxLength={254} /></label>
        <label>Descrição do pedido<textarea name="descricao" required maxLength={2000} /></label>
        {sinal && <p className="suave">O pedido será vinculado ao sinal selecionado.</p>}
        {erro && <p role="alert" className="aviso erro">{erro}</p>}
        <button className="botao principal" type="submit" disabled={ocupado}>Registrar solicitação</button>
      </form>}
  </section>;
}
