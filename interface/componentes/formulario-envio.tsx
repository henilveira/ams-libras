'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, FileCheck2 } from 'lucide-react';
import {
  api, conteudoVazio, mensagemDe, operacoes, tiposSinal, urlMidia,
  type ConteudoEnvio, type DadosVerbete, type RegistroEnvio, type TipoMidia, type TipoSinal, type VerbetePublicado,
} from './dados';
import { Reprodutor } from './consulta';

const camposVerbete: { nome: Exclude<keyof DadosVerbete, 'imagemId' | 'assunto'>; rotulo: string; longo?: boolean }[] = [
  { nome: 'palavra', rotulo: 'Palavra' }, { nome: 'classeGramatical', rotulo: 'Classe gramatical' },
  { nome: 'acepcao', rotulo: 'Acepção', longo: true }, { nome: 'origem', rotulo: 'Origem' },
  { nome: 'configuracaoMao', rotulo: 'Configuração de mão', longo: true },
  { nome: 'exemploPortugues', rotulo: 'Exemplo em português', longo: true },
  { nome: 'exemploLibras', rotulo: 'Exemplo em Libras', longo: true },
];

export function FormularioEnvio({ inicial, alvo, assuntos, voltar, concluir }: {
  inicial?: RegistroEnvio;
  alvo?: VerbetePublicado;
  assuntos: string[];
  voltar: () => void;
  concluir: (mensagem: string) => void;
}) {
  const [registro, mudarRegistro] = useState(inicial);
  const [conteudo, mudarConteudo] = useState<ConteudoEnvio>(() => inicial ?? (alvo ? {
    ...conteudoVazio, verbete: alvo, sinal: { ...conteudoVazio.sinal, tipo: 'regional' },
  } : conteudoVazio));
  const [ocupado, mudarOcupado] = useState(false);
  const [erro, mudarErro] = useState('');
  const [upload, mudarUpload] = useState('');
  const [nomes, mudarNomes] = useState<Partial<Record<TipoMidia, string>>>({});
  const variacao = conteudo.sinal.tipo !== 'referencia';
  const remocao = inicial?.operacao === 'remocao';
  const { verbete, sinal, autorizacao } = conteudo;

  function alterarVerbete(dados: Partial<ConteudoEnvio['verbete']>) {
    mudarConteudo((atual) => ({ ...atual, verbete: { ...atual.verbete, ...dados } }));
  }
  function alterarSinal(dados: Partial<ConteudoEnvio['sinal']>) {
    mudarConteudo((atual) => ({ ...atual, sinal: { ...atual.sinal, ...dados } }));
  }
  function alterarAutorizacao(dados: Partial<ConteudoEnvio['autorizacao']>) {
    mudarConteudo((atual) => ({ ...atual, autorizacao: { ...atual.autorizacao, ...dados } }));
  }

  function aplicarArquivo(tipo: TipoMidia, id?: string) {
    if (tipo === 'video') {
      mudarConteudo((atual) => ({
        ...atual,
        sinal: { ...atual.sinal, videoId: id, legendaId: atual.sinal.videoId ? undefined : atual.sinal.legendaId },
        autorizacao: atual.sinal.videoId ? { ...conteudoVazio.autorizacao } : atual.autorizacao,
      }));
    }
    if (tipo === 'imagem') alterarVerbete({ imagemId: id });
    if (tipo === 'autorizacao') alterarAutorizacao({ comprovanteId: id });
    if (tipo === 'legenda') alterarSinal({ legendaId: id });
  }

  async function anexar(tipo: TipoMidia, evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.currentTarget.files?.[0];
    evento.currentTarget.value = '';
    if (!arquivo) return;
    mudarErro('');
    mudarUpload(tipo);
    try {
      const formulario = new FormData();
      formulario.set('arquivo', arquivo);
      const anexado = await api<{ id: string; nome: string }>(`midias/${tipo}`, 'POST', formulario);
      aplicarArquivo(tipo, anexado.id);
      mudarNomes((atuais) => ({ ...atuais, [tipo]: arquivo.name }));
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarUpload('');
    }
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (ocupado || upload) return;
    const encaminhar = (evento.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'encaminhar';
    mudarOcupado(true);
    mudarErro('');
    try {
      let atual = registro;
      if (!atual) {
        atual = await api<RegistroEnvio>('envios', 'POST', { conteudo, verbeteId: alvo?.id });
        mudarRegistro(atual);
      }
      if (registro || encaminhar) {
        await api<RegistroEnvio>(`envios/${atual.id}`, 'PATCH', { conteudo, encaminhar, versao: atual.atualizadoEm });
      }
      concluir(encaminhar ? 'Envio encaminhado para revisão.' : 'Rascunho salvo.');
    } catch (falha) {
      mudarErro(mensagemDe(falha));
    } finally {
      mudarOcupado(false);
    }
  }

  function campoArquivo(tipo: TipoMidia, rotulo: string, tipos: string, id?: string) {
    return <div className="campo-arquivo">
      <label>{rotulo}<input type="file" accept={tipos} onChange={(evento) => void anexar(tipo, evento)} /></label>
      {id && <div className="acoes">
        <FileCheck2 size={17} aria-hidden="true" />
        <a href={urlMidia(id)} target="_blank" rel="noreferrer">{nomes[tipo] || 'Ver arquivo anexado'}</a>
        <button type="button" className="botao texto" onClick={() => aplicarArquivo(tipo)}>Remover arquivo</button>
      </div>}
    </div>;
  }

  return <section className="pagina-interna">
    <button type="button" className="botao texto" onClick={voltar} disabled={ocupado || Boolean(upload)}>
      <ArrowLeft size={18} aria-hidden="true" /> Meus envios
    </button>
    <div className="titulo-pagina">
      <h1 id="titulo-principal" tabIndex={-1}>{inicial ? `${operacoes[inicial.operacao]} de sinal` : variacao ? 'Nova variação' : 'Novo verbete'}</h1>
      <p>{remocao ? `Solicitação de retirada do sinal de “${verbete.palavra}”. A retirada depende da revisão.`
        : 'Você pode salvar como rascunho e continuar depois.'}</p>
    </div>
    {inicial?.estado === 'devolvido' && <p className="aviso">Motivo da devolução: {inicial.revisoes.at(-1)?.justificativa}</p>}
    <form className="formulario" onSubmit={salvar}>
      <fieldset disabled={ocupado || Boolean(upload)}>
        <legend>Verbete</legend>
        {variacao || remocao ? <p><strong>{verbete.palavra}</strong> · {verbete.acepcao}</p> : <>
          <div className="grade-formulario">
            {camposVerbete.map(({ nome, rotulo, longo }) =>
              <label key={nome}>{rotulo}
                {longo ? <textarea maxLength={2000} value={verbete[nome]}
                  onChange={(evento) => alterarVerbete({ [nome]: evento.target.value })} />
                  : <input maxLength={160} value={verbete[nome]}
                    onChange={(evento) => alterarVerbete({ [nome]: evento.target.value })} />}
              </label>)}
            <label>Assunto
              <select value={verbete.assunto} onChange={(evento) => alterarVerbete({ assunto: evento.target.value })}>
                <option value="">Selecione um assunto</option>
                {assuntos.map((assunto) => <option key={assunto}>{assunto}</option>)}
              </select>
            </label>
          </div>
          {campoArquivo('imagem', 'Imagem (opcional, até 5 MB)', 'image/png,image/jpeg,image/webp', verbete.imagemId)}
          {verbete.imagemId && <label>Texto alternativo da imagem<input maxLength={2000} value={verbete.textoAlternativo}
            onChange={(evento) => alterarVerbete({ textoAlternativo: evento.target.value })} /></label>}
        </>}
      </fieldset>
      {!remocao && <>
        <fieldset disabled={ocupado || Boolean(upload)}>
          <legend>Sinal e mídia</legend>
          <div className="grade-formulario">
            {variacao ? <label>Tipo de variação
              <select value={sinal.tipo} onChange={(evento) => alterarSinal({ tipo: evento.target.value as TipoSinal })}>
                <option value="regional">{tiposSinal.regional}</option><option value="social">{tiposSinal.social}</option>
              </select></label> : <p className="suave">{tiposSinal.referencia}</p>}
            <label>Região<input maxLength={160} value={sinal.regiao} onChange={(evento) => alterarSinal({ regiao: evento.target.value })} /></label>
            <label>Glosa<input maxLength={2000} value={sinal.glosa} onChange={(evento) => alterarSinal({ glosa: evento.target.value })} /></label>
            <label>Descrição do movimento<textarea maxLength={2000} value={sinal.movimento}
              onChange={(evento) => alterarSinal({ movimento: evento.target.value })} /></label>
            <label>Observação de uso<textarea maxLength={2000} value={sinal.observacao}
              onChange={(evento) => alterarSinal({ observacao: evento.target.value })} /></label>
          </div>
          {campoArquivo('video', 'Vídeo MP4/H.264 ou WebM (até 60 s e 50 MB)', 'video/mp4,video/webm,.mp4,.webm', sinal.videoId)}
          {campoArquivo('legenda', 'Legenda WebVTT (se houver fala)', '.vtt,text/vtt', sinal.legendaId)}
          {sinal.videoId && <Reprodutor key={sinal.videoId} sinal={sinal} />}
        </fieldset>
        <fieldset disabled={ocupado || Boolean(upload)}>
          <legend>Autorização de uso do vídeo</legend>
          <div className="grade-formulario">
            <label>Há pessoas identificáveis?
              <select value={autorizacao.identificaveis?.toString() ?? ''} onChange={(evento) =>
                alterarAutorizacao({ identificaveis: evento.target.value ? evento.target.value === 'true' : undefined })}>
                <option value="">Selecione</option><option value="false">Não</option><option value="true">Sim</option>
              </select>
            </label>
            <label>Há menores identificáveis?
              <select value={autorizacao.menores?.toString() ?? ''} onChange={(evento) =>
                alterarAutorizacao({ menores: evento.target.value ? evento.target.value === 'true' : undefined })}>
                <option value="">Selecione</option><option value="false">Não</option><option value="true">Sim</option>
              </select>
            </label>
            <label>Base de uso<input maxLength={160} value={autorizacao.base} placeholder="Ex.: autorização do participante"
              onChange={(evento) => alterarAutorizacao({ base: evento.target.value })} /></label>
            <label>Finalidade<textarea maxLength={2000} value={autorizacao.finalidade} placeholder="Ex.: consulta educativa no dicionário"
              onChange={(evento) => alterarAutorizacao({ finalidade: evento.target.value })} /></label>
          </div>
          {campoArquivo('autorizacao', 'Comprovante em PDF (obrigatório se houver pessoas identificáveis)', 'application/pdf,.pdf', autorizacao.comprovanteId)}
        </fieldset>
      </>}
      {upload && <p className="aviso" role="status">Enviando e validando o arquivo…</p>}
      {erro && <p className="aviso erro" role="alert">{erro}</p>}
      <div className="acoes">
        <button type="submit" value="rascunho" className="botao secundario" disabled={ocupado || Boolean(upload)}>Salvar rascunho</button>
        <button type="submit" value="encaminhar" className="botao principal" disabled={ocupado || Boolean(upload)}>Enviar para revisão</button>
      </div>
    </form>
  </section>;
}
