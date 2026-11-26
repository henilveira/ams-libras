import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Acervo } from '../acervo/aplicacao/repositorio-acervo';
import type { AmostraMidia, EstadoEnvio, RegistroEnvio, TipoSinal } from '../acervo/dominio/verbete';
import { pastaMidias } from './pastas';

interface Ficha {
  palavra: string;
  assunto: string;
  acepcao: string;
  exemplo: string;
  classe: string;
  estado?: EstadoEnvio;
  revisao?: string;
  variacao?: { tipo: 'regional' | 'social'; regiao: string };
  video?: 'wikipedia' | 'video-simulado';
}

const fichas: Ficha[] = [
  { palavra: 'Água', assunto: 'Cotidiano', classe: 'Substantivo',
    acepcao: 'Líquido essencial à vida, usado para beber, cozinhar e lavar.',
    exemplo: 'Coloquei água na garrafa antes de sair.' },
  { palavra: 'Biblioteca', assunto: 'Educação', classe: 'Substantivo',
    acepcao: 'Espaço onde se pode consultar ou tomar emprestado livros e outros materiais.',
    exemplo: 'Passei na biblioteca para buscar o livro da aula.', variacao: { tipo: 'regional', regiao: 'Sul' } },
  { palavra: 'Bom dia', assunto: 'Saudações', classe: 'Expressão',
    acepcao: 'Cumprimento usado pela manhã.', exemplo: 'Dei bom dia à turma ao chegar.',
    variacao: { tipo: 'social', regiao: 'Comunidade escolar' } },
  { palavra: 'Caderno', assunto: 'Educação', classe: 'Substantivo',
    acepcao: 'Conjunto de folhas encadernadas para fazer anotações.',
    exemplo: 'Anotei a atividade no caderno.' },
  { palavra: 'Café', assunto: 'Cotidiano', classe: 'Substantivo',
    acepcao: 'Bebida feita com grãos torrados e moídos do cafeeiro.',
    exemplo: 'Peguei um café no intervalo.' },
  { palavra: 'Cinema', assunto: 'Cultura', classe: 'Substantivo',
    acepcao: 'Local onde se exibem filmes.', exemplo: 'Assistimos ao filme no cinema do bairro.' },
  { palavra: 'Escola', assunto: 'Educação', classe: 'Substantivo',
    acepcao: 'Instituição dedicada ao ensino.', exemplo: 'A escola organizou uma feira de ciências.' },
  { palavra: 'Obrigado', assunto: 'Saudações', classe: 'Interjeição',
    acepcao: 'Expressão para agradecer algo a alguém.', exemplo: 'Obrigado pela ajuda com o trabalho.' },
  { palavra: 'Reunião', assunto: 'Trabalho', classe: 'Substantivo',
    acepcao: 'Encontro marcado para conversar e tomar decisões.',
    exemplo: 'A equipe marcou uma reunião para a tarde.' },
  { palavra: 'Wikipédia', assunto: 'Cultura', classe: 'Nome próprio',
    acepcao: 'Enciclopédia online, livre e colaborativa.',
    exemplo: 'Consultei a Wikipédia para começar a pesquisa.', video: 'wikipedia' },
  { palavra: 'Museu', assunto: 'Cultura', classe: 'Substantivo',
    acepcao: 'Instituição que preserva e expõe coleções de interesse público.',
    exemplo: 'A turma visitou o museu no sábado.', estado: 'em-revisao' },
  { palavra: 'Bilhete', assunto: 'Cotidiano', classe: 'Substantivo',
    acepcao: 'Mensagem curta escrita para alguém.', exemplo: 'Deixei um bilhete na mesa.', estado: 'em-revisao' },
  { palavra: 'Pesquisa', assunto: 'Educação', classe: 'Substantivo',
    acepcao: 'Investigação para reunir e analisar informações.',
    exemplo: 'Fiz uma pesquisa sobre a história da escola.', estado: 'rascunho' },
  { palavra: 'Feira', assunto: 'Cotidiano', classe: 'Substantivo',
    acepcao: 'Mercado periódico, geralmente ao ar livre.', exemplo: 'Comprei frutas na feira.',
    estado: 'devolvido', revisao: 'Descreva melhor o contexto de uso antes de reenviar.' },
  { palavra: 'Agenda', assunto: 'Trabalho', classe: 'Substantivo',
    acepcao: 'Caderno ou aplicativo para registrar compromissos.',
    exemplo: 'Coloquei o encontro na agenda.',
    estado: 'rejeitado', revisao: 'Este exemplo foi marcado como rejeitado para mostrar o histórico.' },
];

const fonteWikipedia: AmostraMidia = {
  tipo: 'referencia',
  cartaz: '/acervo/wikipedia.jpg',
  credito: {
    autor: 'Victor de Andrade Lopes',
    titulo: 'Sinais da Wikipédia em Libras',
    url: 'https://commons.wikimedia.org/wiki/File:Sinais_da_Wikip%C3%A9dia_em_Libras.webm',
    licenca: 'CC BY-SA 4.0',
    urlLicenca: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

const amostraSimulada: AmostraMidia = { tipo: 'simulada', cartaz: '/acervo/video-simulado.jpg' };

export function carregarMostruario(acervo: Acervo) {
  const pastaMostruario = resolve(__dirname, '../../mostruario');
  const agora = Date.now();
  const autorId = 'colaborador';
  const moderadorId = 'moderador';
  const comparar = new Intl.Collator('pt-BR', { sensitivity: 'base' });
  mkdirSync(pastaMidias, { recursive: true, mode: 0o700 });

  fichas.forEach((ficha, indice) => {
    if (acervo.envios.some((envio) => comparar.compare(envio.verbete.palavra, ficha.palavra) === 0)) return;
    const verbeteId = randomUUID();
    const estado = ficha.estado ?? 'aprovado';
    const criadoEm = new Date(agora - (indice + 5) * 3_600_000).toISOString();
    const atualizadoEm = new Date(agora - indice * 3_600_000).toISOString();

    function cadastrar(tipo: TipoSinal, regiao: string) {
      const id = randomUUID();
      const sinalId = randomUUID();
      const autorReal = ficha.video === 'wikipedia';
      const amostra = autorReal ? fonteWikipedia : amostraSimulada;
      const videoId = estado === 'rascunho' ? undefined : randomUUID();

      if (videoId) {
        const nome = `${ficha.video ?? 'video-simulado'}.mp4`;
        copyFileSync(join(pastaMostruario, nome), join(pastaMidias, `${videoId}.mp4`));
        acervo.midias.push({ id: videoId, autorId, tipo: 'video', nome, extensao: 'mp4', formato: 'video/mp4', amostra });
      }

      const registro: RegistroEnvio = {
        id, autorId, verbeteId, sinalId, criadoEm, atualizadoEm, estado, operacao: 'inclusao', demonstracao: true,
        verbete: {
          palavra: ficha.palavra, assunto: ficha.assunto, acepcao: ficha.acepcao, classeGramatical: ficha.classe,
          exemploPortugues: ficha.exemplo, exemploLibras: '', configuracaoMao: '', textoAlternativo: '',
          origem: autorReal ? 'Wikimedia Commons' : '',
        },
        sinal: {
          tipo, regiao, glosa: ficha.palavra.toLocaleUpperCase('pt-BR'), videoId,
          observacao: tipo === 'referencia' ? '' : 'Variação fictícia para demonstrar a organização do acervo.',
          movimento: autorReal ? 'O vídeo apresenta duas formas de sinalizar Wikipédia em Libras.'
            : 'O vídeo exibe uma animação gráfica para testar a reprodução.',
        },
        autorizacao: {
          identificaveis: autorReal, menores: false,
          base: autorReal ? 'Obra compartilhada pelo próprio autor no Wikimedia Commons sob CC BY-SA 4.0.' : 'Mídia gráfica simulada',
          finalidade: 'Apresentação acadêmica',
        },
        revisoes: estado === 'aprovado' || estado === 'devolvido' || estado === 'rejeitado'
          ? [{ decisao: estado, moderadorId, data: atualizadoEm, justificativa: ficha.revisao ?? '' }] : [],
      };
      acervo.envios.push(registro);
      if (estado === 'aprovado') acervo.publicados[sinalId] = id;
      acervo.auditoria.push({ autorId, registroId: id, acao: 'Ficha de demonstração carregada', data: criadoEm });
    }

    cadastrar('referencia', '');
    if (ficha.variacao) cadastrar(ficha.variacao.tipo, ficha.variacao.regiao);
  });

  const contato = 'titular-exemplo@libras.local';
  if (!acervo.solicitacoes.some((item) => item.contato === contato)) {
    const sinal = acervo.envios.find((item) => item.demonstracao && item.verbete.palavra === 'Cinema');
    const id = randomUUID();
    const criadaEm = new Date(agora).toISOString();
    acervo.solicitacoes.push({
      id, contato, criadaEm, sinalId: sinal?.sinalId, identidadeVerificada: false,
      descricao: 'Pedido simulado de acesso aos dados associados ao vídeo de demonstração do verbete Cinema.',
    });
    acervo.auditoria.push({ autorId: 'visitante', registroId: id, acao: 'Solicitação de demonstração carregada', data: criadaEm });
  }
}
