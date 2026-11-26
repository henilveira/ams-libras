'use client';

import { ArrowLeft, ArrowUpRight, BookOpen, Hand, Search } from 'lucide-react';
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
        <p className="sobretitulo">Língua Brasileira de Sinais</p>
        <h1 id="titulo-principal" tabIndex={-1}>Dicionário <em>de Libras</em></h1>
        <p>Busque por palavra, acepção, assunto ou exemplo e veja os sinais em vídeo.</p>
        <div className="caixa-busca" role="search">
          <Search size={21} aria-hidden="true" />
          <label className="somente-leitor" htmlFor="busca">Buscar no dicionário</label>
          <input id="busca" type="search" placeholder="Buscar no acervo" maxLength={160}
            value={busca} onChange={(evento) => mudarBusca(evento.target.value)} />
        </div>
      </div>
      <div className="abertura-arte" aria-hidden="true"><Hand strokeWidth={1.1} size={125} /></div>
    </section>
    <section className="catalogo" aria-labelledby="titulo-acervo">
      <div className="cabecalho-acervo">
        <div>
          <h2 id="titulo-acervo">Explore o acervo</h2>
          <p aria-live="polite" className="suave">{situacao === 'carregando' ? 'Buscando verbetes…'
            : situacao === 'pronto' ? `${verbetes.length} ${verbetes.length === 1 ? 'verbete' : 'verbetes'}` : ''}</p>
        </div>
        <div className="filtros">
          <label className="somente-leitor" htmlFor="assunto-busca">Filtrar por assunto</label>
          <select id="assunto-busca" value={assunto} onChange={(evento) => mudarAssunto(evento.target.value)}>
            <option value="">Todos os assuntos</option>
            {assuntos.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="somente-leitor" htmlFor="ordem-busca">Ordenar verbetes</label>
          <select id="ordem-busca" value={ordem} onChange={(evento) => mudarOrdem(evento.target.value)}>
            <option value="az">A–Z</option><option value="za">Z–A</option>
          </select>
        </div>
      </div>
      <div className="alfabeto" role="group" aria-label="Filtrar pela inicial">
        {['', ...alfabeto].map((item) => <button key={item} type="button" aria-pressed={letra === item}
          onClick={() => mudarLetra(item)}>{item || 'Todas'}</button>)}
      </div>
      {situacao === 'erro' && <div className="vazio"><p role="alert">{erro}</p>
        <button className="botao secundario" onClick={() => tentar((valor) => valor + 1)}>Tentar novamente</button></div>}
      {situacao === 'pronto' && (verbetes.length ? <ul className="verbetes">
        {verbetes.map((verbete) => <li key={verbete.id}>
          <button type="button" className="cartao-verbete" onClick={() => abrir(verbete)}>
            <span className="letra-verbete" aria-hidden="true">{verbete.palavra[0].toUpperCase()}</span>
            <span className="texto-verbete"><strong>{verbete.palavra}</strong><span>{verbete.acepcao}</span>
              <small>{verbete.assunto} · {verbete.sinais.length} {verbete.sinais.length === 1 ? 'sinal' : 'sinais'}</small></span>
            <ArrowUpRight size={19} aria-hidden="true" />
          </button>
        </li>)}
      </ul> : <div className="vazio">
        <BookOpen size={28} aria-hidden="true" />
        <h3>{filtrando ? 'Nenhum verbete encontrado' : 'O acervo está começando'}</h3>
        <p>{filtrando ? 'Tente outro termo ou limpe os filtros.' : 'Os verbetes aparecem aqui depois da aprovação da moderação.'}</p>
        {filtrando
          ? <button className="botao secundario" onClick={() => { mudarBusca(''); mudarLetra(''); mudarAssunto(''); }}>Limpar filtros</button>
          : <button className="botao secundario" onClick={contribuir}>Contribuir com um verbete <ArrowUpRight size={17} aria-hidden="true" /></button>}
      </div>)}
    </section>
  </>;
}

export function Reprodutor({ sinal }: { sinal: DadosSinal }) {
  const [velocidade, mudarVelocidade] = useState('1');
  const [falhou, mudarFalhou] = useState(false);
  return <div className="midia">
    {sinal.videoId && <>
      <video controls playsInline preload="metadata" src={urlMidia(sinal.videoId)} onRateChange={(evento) => {
        mudarVelocidade(String(evento.currentTarget.playbackRate));
      }} onError={() => mudarFalhou(true)}
        ref={(video) => { if (video) video.playbackRate = Number(velocidade); }}
        aria-label={sinal.glosa ? `Vídeo do sinal ${sinal.glosa}` : 'Vídeo do sinal'}>
        {sinal.legendaId && <track kind="captions" src={urlMidia(sinal.legendaId)} srcLang="pt-BR" label="Português" default />}
        Seu navegador não reproduz este vídeo.
      </video>
      {falhou && <p role="alert">Não foi possível reproduzir o vídeo. <a href={urlMidia(sinal.videoId)}>Abrir o arquivo de vídeo</a></p>}
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
  return <article className="pagina-interna">
    <button type="button" className="botao texto" onClick={voltar}><ArrowLeft size={18} aria-hidden="true" /> Voltar ao acervo</button>
    <div className="titulo-pagina">
      <p className="sobretitulo">{verbete.assunto}</p>
      <h1 id="titulo-principal" tabIndex={-1}>{verbete.palavra}</h1>
      <p>{verbete.acepcao}</p>
    </div>
    <div className="detalhe-colunas">
      <section className="painel">
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
      <section className="painel">
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
