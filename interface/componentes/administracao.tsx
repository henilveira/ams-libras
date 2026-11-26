'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  api, dataCurta, mensagemDe, perfis, type Evento, type Perfil, type SolicitacaoTitular, type Usuario,
} from './dados';

const secoes = ['Contas', 'Assuntos', 'Solicitações', 'Auditoria'] as const;

export function Administracao({ usuario, assuntos, atualizarAssuntos }: {
  usuario: Usuario;
  assuntos: string[];
  atualizarAssuntos: (lista: string[]) => void;
}) {
  const [secao, mudarSecao] = useState<typeof secoes[number]>('Contas');
  const [contas, mudarContas] = useState<Usuario[]>([]);
  const [painel, mudarPainel] = useState<{ solicitacoes: SolicitacaoTitular[]; auditoria: Evento[] }>({
    solicitacoes: [], auditoria: [],
  });
  const [carregando, mudarCarregando] = useState(true);
  const [erro, mudarErro] = useState('');
  const [sucesso, mudarSucesso] = useState('');
  const [ocupado, mudarOcupado] = useState(false);
  const [versao, recarregar] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([api<Usuario[]>('contas'), api<typeof painel>('governanca')]).then(([lista, registros]) => {
      if (!vigente) return;
      mudarContas(lista);
      mudarPainel(registros);
    }).catch((falha) => {
      if (vigente) mudarErro(mensagemDe(falha));
    }).finally(() => { if (vigente) mudarCarregando(false); });
    return () => { vigente = false; };
  }, [versao]);

  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    mudarOcupado(true);
    mudarErro('');
    mudarSucesso('');
    try {
      await acao();
      mudarSucesso(mensagem);
      recarregar((atual) => atual + 1);
      return true;
    } catch (falha) {
      mudarErro(mensagemDe(falha));
      return false;
    } finally {
      mudarOcupado(false);
    }
  }

  async function criarConta(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));
    if (await executar(() => api('contas', 'POST', dados), 'Conta criada.')) formulario.reset();
  }

  async function criarAssunto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(formulario));
    if (await executar(async () => {
      atualizarAssuntos(await api<string[]>('assuntos', 'POST', dados));
    }, 'Assunto criado.')) formulario.reset();
  }

  return <section className="pagina-interna">
    <div className="titulo-pagina">
      <h1 id="titulo-principal" tabIndex={-1}>Administração</h1>
      <p>Gerencie contas, assuntos e solicitações de titulares.</p>
    </div>
    <div className="segmentos" role="group" aria-label="Seção da administração">
      {secoes.map((item) => <button className="botao secundario" key={item} aria-pressed={secao === item}
        onClick={() => { mudarSecao(item); mudarSucesso(''); }}>{item}</button>)}
    </div>
    {erro && <div className="aviso erro" role="alert">{erro}{' '}
      <button className="botao texto" onClick={() => { mudarErro(''); recarregar((atual) => atual + 1); }}>Atualizar</button></div>}
    {sucesso && <p className="aviso" role="status">{sucesso}</p>}
    {carregando && <p role="status">Carregando administração…</p>}
    {secao === 'Contas' && <>
      <form className="painel formulario" onSubmit={criarConta}>
        <h2>Nova conta</h2>
        <div className="grade-formulario">
          <label>Nome<input name="nome" required maxLength={160} /></label>
          <label>E-mail<input name="email" required type="email" maxLength={254} /></label>
          <label>Senha<input name="senha" required type="password" minLength={8} maxLength={128} autoComplete="new-password" /></label>
          <label>Perfil<select name="perfil">
            {Object.entries(perfis).map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
          </select></label>
        </div>
        <button className="botao principal" disabled={ocupado}>Criar conta</button>
      </form>
      <ul className="lista-paineis">{contas.map((conta) => <li className="painel" key={conta.id}>
        <div className="linha-painel">
          <div><h3>{conta.nome}</h3><p className="suave">{conta.email}</p></div>
          {conta.id === usuario.id ? <span className="estado">Sua conta</span> : <form className="acoes" onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            void executar(() => api(`contas/${conta.id}`, 'PATCH', {
              perfil: dados.get('perfil') as Perfil, ativo: dados.get('ativo') === 'ativo',
            }), 'Conta atualizada.');
          }}>
            <label>Perfil<select name="perfil" defaultValue={conta.perfil}>
              {Object.entries(perfis).map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
            </select></label>
            <label>Situação<select name="ativo" defaultValue={conta.ativo ? 'ativo' : 'inativo'}>
              <option value="ativo">Ativa</option><option value="inativo">Inativa</option>
            </select></label>
            <button className="botao secundario" disabled={ocupado}>Salvar conta</button>
          </form>}
        </div>
      </li>)}</ul>
    </>}
    {secao === 'Assuntos' && <section className="painel">
      <form className="formulario" onSubmit={criarAssunto}>
        <h2>Novo assunto</h2>
        <label>Nome do assunto<input name="assunto" required maxLength={160} /></label>
        <button className="botao principal" disabled={ocupado}>Adicionar assunto</button>
      </form>
      <h2 className="secao">Assuntos cadastrados</h2>
      <ul className="assuntos">{assuntos.map((item) => <li className="estado" key={item}>{item}</li>)}</ul>
    </section>}
    {secao === 'Solicitações' && (painel.solicitacoes.length ? <ul className="lista-paineis">
      {painel.solicitacoes.map((item) => <li className="painel" key={item.id}>
        <div className="linha-painel">
          <div><h2>{item.contato}</h2><p className="suave">{dataCurta(item.criadaEm)}</p></div>
          <span className="estado">{item.atendidaEm ? 'Atendida' : 'Aberta'}</span>
        </div>
        <p>{item.descricao}</p>
        <p className="suave">Protocolo {item.id}</p>
        {item.atendidaEm ? <p><strong>Resposta registrada:</strong> {item.resposta}</p> :
          <form className="formulario secao" onSubmit={(evento) => {
            evento.preventDefault();
            const dados = new FormData(evento.currentTarget);
            void executar(() => api(`governanca/solicitacoes/${item.id}`, 'PATCH', {
              resposta: dados.get('resposta'), verificada: dados.has('verificada'), retirar: dados.has('retirar'),
            }), 'Solicitação atendida.');
          }}>
            <label>Providências e resposta<textarea required name="resposta" maxLength={2000} /></label>
            <label className="marcacao"><input required name="verificada" type="checkbox" /> Identidade verificada fora do sistema</label>
            {item.sinalId && <label className="marcacao"><input name="retirar" type="checkbox" /> Retirar o sinal da consulta pública</label>}
            <button className="botao principal" disabled={ocupado}>Registrar atendimento</button>
          </form>}
      </li>)}
    </ul> : <p className="vazio">Nenhuma solicitação registrada.</p>)}
    {secao === 'Auditoria' && (painel.auditoria.length ? <ul className="lista-paineis">
      {painel.auditoria.map((item, indice) => <li className="painel linha-painel" key={indice}>
        <div><strong>{item.acao}</strong><p className="suave">{contas.find((conta) => conta.id === item.autorId)?.nome ?? item.autorId}
          {' · '}{item.registroId}</p></div>
        <time dateTime={item.data}>{dataCurta(item.data)}</time>
      </li>)}
    </ul> : <p className="vazio">Nenhum evento registrado.</p>)}
  </section>;
}
