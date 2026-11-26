'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { Reprodutor } from './consulta';
import {
  api, dataCurta, estados, mensagemDe, operacoes, tiposSinal, urlMidia,
  type Decisao, type RegistroEnvio, type Usuario,
} from './dados';

const estadosRevisao = ['em-revisao', 'devolvido', 'aprovado', 'rejeitado'] as const;

export function AreaEnvios({ usuario, novo, editar }: {
  usuario: Usuario;
  novo: () => void;
  editar: (envio: RegistroEnvio) => void;
}) {
  const moderador = usuario.perfil === 'moderador';
  const [estado, mudarEstado] = useState(moderador ? 'em-revisao' : '');
  const [desde, mudarDesde] = useState('');
  const [ate, mudarAte] = useState('');
  const [envios, mudarEnvios] = useState<RegistroEnvio[]>([]);
  const [publicacoes, mudarPublicacoes] = useState<RegistroEnvio[]>([]);
  const [abertos, mudarAbertos] = useState<string[]>([]);
  const [versao, recarregar] = useState(0);
  const [carregando, mudarCarregando] = useState(true);
  const [ocupado, mudarOcupado] = useState(false);
  const [confirmar, mudarConfirmar] = useState('');
  const [erro, mudarErro] = useState('');
  const [sucesso, mudarSucesso] = useState('');

  useEffect(() => {
    let vigente = true;
    const consulta = new URLSearchParams();
    if (estado) consulta.set('estado', estado);
    if (desde) consulta.set('desde', desde);
    if (ate) consulta.set('ate', ate);
    Promise.all([
      api<RegistroEnvio[]>(`envios?${consulta}`),
      moderador ? Promise.resolve([]) : api<RegistroEnvio[]>('envios/publicados'),
    ]).then(([lista, publicados]) => {
      if (!vigente) return;
      mudarEnvios(lista);
      mudarPublicacoes(publicados);
    }).catch((falha) => {
      if (vigente) mudarErro(mensagemDe(falha));
    }).finally(() => { if (vigente) mudarCarregando(false); });
    return () => { vigente = false; };
  }, [estado, desde, ate, moderador, versao]);

  async function executar(acao: () => Promise<unknown>, texto?: string) {
    mudarOcupado(true);
    mudarErro('');
    mudarSucesso('');
    try {
      await acao();
      if (texto) {
        mudarSucesso(texto);
        recarregar((atual) => atual + 1);
      }
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarOcupado(false);
      mudarConfirmar('');
    }
  }

  return <section className="pagina-interna">
    <div className="titulo-pagina com-acoes">
      <div>
        <h1 id="titulo-principal" tabIndex={-1}>{moderador ? 'Fila de moderação' : 'Meus envios'}</h1>
        <p>{moderador ? 'Confira o sinal, o vídeo e a documentação antes de decidir.' : 'Gerencie seus rascunhos e acompanhe as decisões da moderação.'}</p>
      </div>
      {!moderador && <button className="botao principal" onClick={novo}><Plus size={18} aria-hidden="true" /> Novo verbete</button>}
    </div>
    <div className="grade-painel">
      <aside className="lateral-painel">
        {moderador ? <div className="filtros filtros-revisao">
          <h2>Filtrar fila</h2>
          <label>Estado
            <select value={estado} onChange={(evento) => mudarEstado(evento.target.value)}>
              <option value="">Todos</option>
              {estadosRevisao.map((item) => <option key={item} value={item}>{estados[item]}</option>)}
            </select>
          </label>
          <label>De<input type="date" value={desde} onChange={(evento) => mudarDesde(evento.target.value)} /></label>
          <label>Até<input type="date" value={ate} min={desde || undefined} onChange={(evento) => mudarAte(evento.target.value)} /></label>
        </div> : <>
          <h2>Meu acervo</h2>
          <dl>
            <div><dt>Envios</dt><dd>{envios.length}</dd></div>
            <div><dt>Sinais publicados</dt><dd>{publicacoes.length}</dd></div>
          </dl>
        </>}
      </aside>
      <div className="miolo-painel">
        {erro && <div className="aviso erro" role="alert">{erro}{' '}
          <button className="botao texto" onClick={() => { mudarErro(''); recarregar((atual) => atual + 1); }}>Atualizar lista</button></div>}
        {sucesso && <p className="aviso" role="status">{sucesso}</p>}
        {carregando ? <p role="status">Carregando envios…</p> : !envios.length
          ? <p className="vazio">{moderador ? 'Nenhum envio neste filtro.' : 'Você ainda não tem envios.'}</p>
          : <ul className="lista-paineis">{envios.map((envio) => {
            const aberto = abertos.includes(envio.id);
            const editavel = !moderador && ['rascunho', 'devolvido'].includes(envio.estado);
            return <li className="painel" key={envio.id}>
              <div className="linha-painel">
                <div><h2>{envio.verbete.palavra || 'Verbete sem título'}</h2>
                  <p className="suave">{operacoes[envio.operacao]} · {tiposSinal[envio.sinal.tipo]} · {dataCurta(envio.atualizadoEm)}</p></div>
                <div className="metadados-envio">
                  <span className={`estado estado-${envio.estado}`}>{estados[envio.estado]}</span>
                  {envio.demonstracao && <small>Envio de demonstração</small>}
                </div>
              </div>
              {envio.revisoes.at(-1)?.justificativa && <p><strong>Última decisão:</strong> {envio.revisoes.at(-1)?.justificativa}</p>}
              <div className="acoes">
                <button className="botao secundario" aria-expanded={aberto} onClick={() =>
                  mudarAbertos((lista) => aberto ? lista.filter((id) => id !== envio.id) : [...lista, envio.id])}>
                  {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                </button>
                {editavel && <>
                  <button className="botao secundario" onClick={() => editar(envio)}>Editar envio</button>
                  {confirmar === envio.id ? <>
                    <button className="botao perigo" disabled={ocupado} onClick={() => void executar(
                      () => api(`envios/${envio.id}`, 'DELETE'), 'Envio excluído.',
                    )}>Confirmar exclusão</button>
                    <button className="botao texto" onClick={() => mudarConfirmar('')}>Cancelar</button>
                  </> : <button className="botao texto" onClick={() => mudarConfirmar(envio.id)}>Excluir envio</button>}
                </>}
              </div>
              {aberto && <div className="detalhe-envio"><DetalheEnvio envio={envio} />
                {moderador && envio.estado === 'em-revisao' && <Decidir ocupado={ocupado} onDecidir={(decisao, justificativa) => {
                  void executar(() => api(`envios/${envio.id}/revisoes`, 'POST', { decisao, justificativa }), 'Decisão registrada.');
                }} />}
              </div>}
            </li>;
          })}</ul>}
        {!moderador && publicacoes.length > 0 && <section className="secao">
          <h2>Meus sinais publicados</h2>
          <ul className="lista-paineis">{publicacoes.map((envio) => <li className="painel linha-painel" key={envio.id}>
            <div><h3>{envio.verbete.palavra}</h3><p className="suave">{tiposSinal[envio.sinal.tipo]} · {envio.sinal.glosa}</p></div>
            <div className="acoes">{(['alteracao', 'remocao'] as const).map((operacao) => <button key={operacao} className="botao secundario"
              disabled={ocupado} onClick={() => void executar(async () => {
                const criado = await api<RegistroEnvio>('envios/propostas', 'POST', { sinalId: envio.sinalId, operacao });
                editar(criado);
              })}>{operacao === 'alteracao' ? 'Propor alteração' : 'Solicitar remoção'}</button>)}</div>
          </li>)}</ul>
        </section>}
      </div>
    </div>
  </section>;
}

function DetalheEnvio({ envio }: { envio: RegistroEnvio }) {
  const { autorizacao, verbete, sinal } = envio;
  const declaracao = (valor?: boolean) => valor === undefined ? 'Não informado' : valor ? 'Sim' : 'Não';
  return <>
    <div className="detalhe-colunas">
      <div>
        <Reprodutor sinal={sinal} />
        <dl className="detalhes">
          {Object.entries({
            Assunto: verbete.assunto, Acepção: verbete.acepcao, Origem: verbete.origem,
            'Classe gramatical': verbete.classeGramatical, 'Configuração de mão': verbete.configuracaoMao,
            'Exemplo em português': verbete.exemploPortugues, 'Exemplo em Libras': verbete.exemploLibras,
          }).filter(([, valor]) => valor).map(([rotulo, valor]) =>
            <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}
        </dl>
        {verbete.imagemId && <Image className="imagem-verbete" src={urlMidia(verbete.imagemId)}
          alt={verbete.textoAlternativo || 'Imagem anexada ao envio'} width={480} height={320} unoptimized />}
      </div>
      <div>
        <h3>Autorização</h3>
        <dl className="detalhes">
          <div><dt>Pessoas identificáveis</dt><dd>{declaracao(autorizacao.identificaveis)}</dd></div>
          <div><dt>Menores identificáveis</dt><dd>{declaracao(autorizacao.menores)}</dd></div>
          <div><dt>Base de uso</dt><dd>{autorizacao.base || 'Não informada'}</dd></div>
          <div><dt>Finalidade</dt><dd>{autorizacao.finalidade || 'Não informada'}</dd></div>
          {autorizacao.comprovanteId && <div><dt>Documentação</dt><dd><a href={urlMidia(autorizacao.comprovanteId)}>Baixar comprovante em PDF</a></dd></div>}
        </dl>
      </div>
    </div>
    {envio.revisoes.length > 0 && <div className="secao"><h3>Histórico de decisões</h3>
      <ul>{envio.revisoes.map((revisao, indice) => <li key={indice}>
        {estados[revisao.decisao]} · {dataCurta(revisao.data)}{revisao.justificativa && ` · ${revisao.justificativa}`}
      </li>)}</ul></div>}
  </>;
}

function Decidir({ ocupado, onDecidir }: { ocupado: boolean; onDecidir: (decisao: Decisao, motivo: string) => void }) {
  const [decisao, mudarDecisao] = useState<Decisao | ''>('');
  const [motivo, mudarMotivo] = useState('');

  function decidir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (decisao) onDecidir(decisao, motivo);
  }

  return <form className="formulario secao" onSubmit={decidir}>
    <h3>Registrar decisão</h3>
    <label>Decisão
      <select required value={decisao} onChange={(evento) => mudarDecisao(evento.target.value as Decisao)}>
        <option value="">Selecione uma decisão</option>
        <option value="aprovado">Aprovar</option><option value="devolvido">Devolver para ajustes</option>
        <option value="rejeitado">Rejeitar</option>
      </select>
    </label>
    <label>Justificativa<textarea value={motivo} onChange={(evento) => mudarMotivo(evento.target.value)}
      maxLength={2000} required={decisao === 'devolvido' || decisao === 'rejeitado'} /></label>
    <button className="botao principal" type="submit" disabled={ocupado}>Registrar decisão</button>
  </form>;
}
