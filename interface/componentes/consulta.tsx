'use client';

import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Play, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api, mensagemDe, tiposSinal, urlMidia, type DadosSinal, type VerbetePublicado } from './dados';

const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function Consulta({ assuntos, abrir, contribuir }: {
  assuntos: string[];
  abrir: (verbete: VerbetePublicado) => void;
  contribuir: () => void;
}) {
  const [busca, mudarBusca] = useState('');
  const [letra, mudarLetra] = useState('');
  const [assunto, mudarAssunto] = useState('');
  const [ordem, mudarOrdem] = useState('az');
  const [verbetes, mudarVerbetes] = useState<VerbetePublicado[]>([]);
  const [destaque, mudarDestaque] = useState<VerbetePublicado>();
  const [situacao, mudarSituacao] = useState('carregando');
  const [erro, mudarErro] = useState('');
  const [tentativa, tentar] = useState(0);
  const filtrando = Boolean(busca.trim() || letra || assunto);

  useEffect(() => {
    let vigente = true;
    const atraso = window.setTimeout(() => {
      mudarSituacao('carregando');
      mudarErro('');
      const consulta = new URLSearchParams({ busca: busca.trim(), letra, assunto, ordem });
      api<VerbetePublicado[]>(`verbetes?${consulta}`).then((lista) => {
        if (!vigente) return;
        mudarVerbetes(lista);
        const referencia = lista.find((verbete) => verbete.sinais.some((sinal) => sinal.amostra?.tipo === 'referencia'));
        if (referencia || (!busca && !letra && !assunto)) mudarDestaque(referencia);
        mudarSituacao('pronto');
      }).catch((falha) => {
        if (!vigente) return;
        mudarErro(mensagemDe(falha));
        mudarSituacao('erro');
      });
    }, 180);
    return () => { vigente = false; window.clearTimeout(atraso); };
  }, [busca, letra, assunto, ordem, tentativa]);

  return <>
    <section className="abertura" aria-labelledby="titulo-principal">
      <div className="abertura-texto">
        <p className="sobretitulo"><span aria-hidden="true" /> Língua Brasileira de Sinais</p>
        <h1 id="titulo-principal" tabIndex={-1}>Dicionário<br />de Libras<span>.</span></h1>
        <p className="introducao">Encontre palavras, veja os sinais em vídeo e explore suas variações.</p>
        <form className="caixa-busca" role="search" onSubmit={(evento) => {
          evento.preventDefault();
          document.getElementById('titulo-acervo')?.focus();
        }}>
          <Search size={21} aria-hidden="true" />
          <label className="somente-leitor" htmlFor="busca">Buscar no dicionário</label>
          <input id="busca" type="search" placeholder="Palavra, assunto ou exemplo" maxLength={160}
            value={busca} onChange={(evento) => mudarBusca(evento.target.value)} />
          <button type="submit" aria-label="Ver resultados"><ArrowRight size={22} aria-hidden="true" /></button>
        </form>
      </div>
      {destaque ? <figure className="destaque">
        <div className="fotogramas" aria-hidden="true">
          <Image className="quadro-principal" src="/acervo/wikipedia.jpg" alt="" width={480} height={480} unoptimized />
          <Image className="quadro-secundario" src="/acervo/wikipedia-segundo-quadro.jpg" alt="" width={480} height={480} unoptimized />
        </div>
        <figcaption>
          <span className="destaque-legenda"><small>Sinal em vídeo</small><strong>{destaque.palavra}</strong></span>
          <button className="acao-destaque" type="button" onClick={() => abrir(destaque)}
            aria-label={`Ver sinal de ${destaque.palavra}`}><Play size={22} fill="currentColor" aria-hidden="true" /></button>
        </figcaption>
      </figure> : <div className="capa-indice">
        <a href="#indice">Consultar<br />o índice <ArrowDownRight size={34} aria-hidden="true" /></a>
      </div>}
    </section>
    <section id="indice" className="catalogo" aria-labelledby="titulo-acervo">
      <div className="cabecalho-acervo">
        <div>
          <h2 id="titulo-acervo" tabIndex={-1}>Índice de verbetes</h2>
          <p aria-live="polite" className="contagem">{situacao === 'carregando' ? 'Buscando verbetes…'
            : situacao === 'pronto' ? `${verbetes.length} ${verbetes.length === 1 ? 'verbete' : 'verbetes'}` : ''}</p>
        </div>
        <label className="ordem-indice">Ordenar
          <select value={ordem} onChange={(evento) => mudarOrdem(evento.target.value)}>
            <option value="az">A–Z</option><option value="za">Z–A</option>
          </select>
        </label>
      </div>
      <div className="alfabeto" role="group" aria-label="Filtrar pela inicial">
        {['', ...alfabeto].map((item) => <button key={item} type="button" aria-pressed={letra === item}
          onClick={() => mudarLetra(item)}>{item || 'Todas'}</button>)}
      </div>
      <div className="grade-acervo">
        <aside className="assuntos-indice" aria-labelledby="titulo-assuntos">
          <h3 id="titulo-assuntos">Filtrar por assunto</h3>
          <ul>
            {['', ...assuntos].map((item) => <li key={item}>
              <button type="button" aria-pressed={assunto === item} onClick={() => mudarAssunto(item)}>
                {item || 'Todos os assuntos'}<ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </li>)}
          </ul>
          {filtrando && <button className="botao texto limpar-indice" onClick={() => {
            mudarBusca(''); mudarLetra(''); mudarAssunto('');
          }}>Limpar filtros</button>}
        </aside>
        <div className="resultados">
          {situacao === 'erro' && <div className="vazio"><p role="alert">{erro}</p>
            <button className="botao secundario" onClick={() => tentar((valor) => valor + 1)}>Tentar novamente</button></div>}
          {situacao === 'pronto' && (verbetes.length ? <ul className="verbetes">
            {verbetes.map((verbete) => {
              const amostra = verbete.sinais[0]?.amostra;
              return <li key={verbete.id}>
                <button type="button" className="ficha-verbete" onClick={() => abrir(verbete)}>
                  <span className="letra-verbete" aria-hidden="true">{verbete.palavra[0].toUpperCase()}</span>
                  <span className="texto-verbete"><strong>{verbete.palavra}</strong><span>{verbete.acepcao}</span></span>
                  <span className="dados-ficha">
                    <span>{verbete.assunto}</span>
                    <span>{verbete.sinais.length} {verbete.sinais.length === 1 ? 'sinal' : 'sinais'}
                      {amostra?.tipo === 'simulada' && ' · Simulado'}</span>
                  </span>
                  <ArrowUpRight size={23} aria-hidden="true" />
                </button>
              </li>;
            })}
          </ul> : <div className="vazio">
            <h3>{filtrando ? 'Nenhum verbete encontrado' : 'O acervo está começando'}</h3>
            <p>{filtrando ? 'Tente outro termo ou limpe os filtros.' : 'Os verbetes aparecem aqui depois da aprovação da moderação.'}</p>
            {!filtrando && <button className="botao secundario" onClick={contribuir}>Contribuir com um verbete <ArrowUpRight size={17} aria-hidden="true" /></button>}
          </div>)}
        </div>
      </div>
    </section>
  </>;
}

export function Reprodutor({ sinal }: { sinal: DadosSinal }) {
  const [velocidade, mudarVelocidade] = useState('1');
  const [falhou, mudarFalhou] = useState(false);
  return <div className="midia">
    {sinal.videoId && <>
      <video controls playsInline preload="metadata" poster={sinal.amostra?.cartaz} src={urlMidia(sinal.videoId)} onRateChange={(evento) => {
        mudarVelocidade(String(evento.currentTarget.playbackRate));
      }} onError={() => mudarFalhou(true)}
        ref={(video) => { if (video) video.playbackRate = Number(velocidade); }}
        aria-label={sinal.glosa ? `Vídeo do sinal ${sinal.glosa}` : 'Vídeo do sinal'}>
        {sinal.legendaId && <track kind="captions" src={urlMidia(sinal.legendaId)} srcLang="pt-BR" label="Português" default />}
        Seu navegador não reproduz este vídeo.
      </video>
      {falhou && <p role="alert">Não foi possível reproduzir o vídeo. <a href={urlMidia(sinal.videoId)}>Abrir o arquivo de vídeo</a></p>}
      {sinal.amostra?.tipo === 'simulada' && <p className="credito-midia">Vídeo simulado para demonstrar o player.</p>}
      {sinal.amostra?.tipo === 'referencia' && <p className="credito-midia">
        <a href={sinal.amostra.credito.url}>{sinal.amostra.credito.titulo}</a>, de {sinal.amostra.credito.autor}.{' '}
        <a href={sinal.amostra.credito.urlLicenca}>{sinal.amostra.credito.licenca}</a>.
      </p>}
      <label className="velocidade">Velocidade
        <select value={velocidade} onChange={(evento) => mudarVelocidade(evento.target.value)}>
          {Array.from(new Set(['0.5', '0.75', '1', '1.25', '1.5', '2', velocidade]))
            .sort((a, b) => Number(a) - Number(b)).map((taxa) =>
              <option key={taxa} value={taxa}>{taxa.replace('.', ',')}×</option>)}
        </select>
      </label>
    </>}
    <dl className="detalhes">
      {sinal.regiao && <div><dt>Região</dt><dd>{sinal.regiao}</dd></div>}
      {sinal.glosa && <div><dt>Glosa</dt><dd>{sinal.glosa}</dd></div>}
      {sinal.movimento && <div><dt>Descrição do movimento</dt><dd>{sinal.movimento}</dd></div>}
      {sinal.observacao && <div><dt>Observação de uso</dt><dd>{sinal.observacao}</dd></div>}
    </dl>
  </div>;
}

export function DetalheVerbete({ verbete, voltar, variar, solicitar }: {
  verbete: VerbetePublicado;
  voltar: () => void;
  variar: () => void;
  solicitar: (sinalId: string) => void;
}) {
  const [selecionado, selecionar] = useState(verbete.sinais[0].id);
  const sinal = verbete.sinais.find((item) => item.id === selecionado) ?? verbete.sinais[0];
  return <article className="pagina-interna pagina-verbete">
    <button type="button" className="botao texto" onClick={voltar}><ArrowLeft size={18} aria-hidden="true" /> Voltar ao acervo</button>
    <div className="titulo-pagina">
      <p className="sobretitulo">{verbete.assunto}</p>
      <h1 id="titulo-principal" tabIndex={-1}>{verbete.palavra}</h1>
      <p>{verbete.acepcao}</p>
    </div>
    <div className="detalhe-colunas">
      <section className="painel painel-sinais">
        <h2>Sinais deste verbete</h2>
        <label>Sinal
          <select value={sinal.id} onChange={(evento) => selecionar(evento.target.value)}>
            {verbete.sinais.map((item) => <option key={item.id} value={item.id}>
              {tiposSinal[item.tipo]}{item.regiao ? ` · ${item.regiao}` : ''} · {item.glosa}
            </option>)}
          </select>
        </label>
        <Reprodutor key={sinal.id} sinal={sinal} />
        <div className="acoes">
          <button className="botao secundario" onClick={variar}>Propor variação</button>
          <button className="botao texto" onClick={() => solicitar(sinal.id)}>Solicitação de titular</button>
        </div>
      </section>
      <section className="painel ficha-definicao">
        <h2>Sobre a palavra</h2>
        {verbete.imagemId && <Image className="imagem-verbete" src={urlMidia(verbete.imagemId)}
          alt={verbete.textoAlternativo} width={480} height={320} unoptimized />}
        <dl className="detalhes">
          {Object.entries({
            'Classe gramatical': verbete.classeGramatical, Origem: verbete.origem,
            'Configuração de mão': verbete.configuracaoMao, 'Exemplo em português': verbete.exemploPortugues,
            'Exemplo em Libras': verbete.exemploLibras,
          }).filter(([, valor]) => valor).map(([rotulo, valor]) =>
            <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}
        </dl>
      </section>
    </div>
  </article>;
}
