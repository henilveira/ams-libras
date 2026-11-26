# Dicionário de Libras

Protótipo acadêmico da disciplina Análise e Modelagem de Sistemas (AMS0002). O acervo reúne verbetes e variações da Língua Brasileira de Sinais. A consulta é aberta e mostra os sinais que passaram pela moderação.

[Kanban do trabalho](https://github.com/users/henilveira/projects/1/views/1)

## Como executar

Use Node.js 22.12 ou superior, npm e FFmpeg com os comandos `ffmpeg` e `ffprobe` disponíveis no terminal. As versões fixadas no lockfile incluem Next.js 16.4.6, React 19.3.1, NestJS 11.2.12 e TypeScript 5.9.3.

```bash
git clone https://github.com/henilveira/ams-libras.git
cd ams-libras
npm ci
npm run dev
```

Abra [o dicionário no navegador](http://localhost:3000). O Next.js encaminha as requisições de `/api` ao NestJS na porta 3001. Para executar a compilação de produção, use `npm run build` seguido de `npm start`.

O servidor cria `servidor/dados/acervo.json` e grava os arquivos enviados em `servidor/dados/midias/`. A variável opcional `PASTA_DADOS` aceita o caminho absoluto de outro diretório local. Os dois serviços escutam apenas no computador onde são executados. O protótipo usa uma instância do NestJS por diretório de dados.

### Contas de demonstração

A tela **Entrar** preenche as credenciais ao escolher um perfil de demonstração. A senha inicial de cada conta é `libras123`.

| Perfil | E-mail | Acesso |
| --- | --- | --- |
| Colaborador | `colaborador@libras.local` | Gerencia seus envios e acompanha as decisões |
| Moderador | `moderador@libras.local` | Revisa envios, confere documentos e registra decisões |
| Administrador | `administrador@libras.local` | Cria contas e assuntos, altera perfis, atende solicitações e consulta a auditoria |

## Roteiro da apresentação

1. Entre como colaborador e crie um verbete. Preencha palavra, assunto, acepção, glosa e descrição do movimento. Salve um rascunho para demonstrar a edição.
2. Anexe um vídeo MP4/H.264 ou WebM de até 60 segundos e 50 MiB. Informe a base de uso, a finalidade e a presença de pessoas identificáveis ou menores. Se houver pessoas identificáveis, anexe o comprovante em PDF. Imagens PNG, JPEG ou WebP e comprovantes PDF aceitam até 5 MiB. O vídeo com fala pode receber uma legenda `.vtt`.
3. Envie para revisão. Entre como moderador, abra os detalhes e aprove ou devolva com justificativa. O colaborador acompanha as decisões em **Meus envios** e pode corrigir e reenviar um item devolvido.
4. Consulte o verbete sem entrar. A busca usa palavra, acepção, assunto e exemplos em português ou Libras e funciona com ou sem acentos. Teste os filtros, a ordenação e a velocidade do vídeo.
5. Entre novamente como colaborador e use **Propor variação** no verbete publicado. Em **Meus sinais publicados**, o autor também pode propor alterações ou remoções. A versão anterior segue disponível até a aprovação da proposta. Para retirar um sinal de referência pela moderação, retire primeiro as variações publicadas.
6. Para demonstrar o atendimento, registre uma **Solicitação de titular** na página de um sinal. Entre como administrador e registre a resposta e a verificação de identidade. A retirada administrativa de um sinal de referência retira o verbete inteiro da consulta.

O acervo inicial é vazio. Use um vídeo próprio autorizado para demonstrar um sinal real. Os arquivos e os cadastros usados na validação foram sintéticos.

## Arquitetura

O monólito NestJS organiza a API pelas áreas de acervo e usuários. O Next.js cuida da interface. Os nomes de classes e pastas da aplicação estão em português, com as convenções obrigatórias do Next.js em `interface/app`.

| Camada | Responsabilidade |
| --- | --- |
| Domínio | `Envio` define transições de estado, exigências de documentação e condições para aprovação. |
| Aplicação | Os serviços coordenam permissões, consulta, histórico, publicação, contas e solicitações. |
| Infraestrutura | `RepositorioArquivo` implementa `RepositorioAcervo` com gravação atômica do JSON. Os arquivos de mídia são persistidos em disco. |
| Apresentação | Os controladores NestJS recebem e validam entradas HTTP. A interface Next.js exibe o acervo e os formulários de cada perfil. |

A publicação guarda a referência para a versão aprovada de cada sinal. O estado é modelado no domínio e a trilha é registrada junto das operações. O histórico de decisões serve como notificação dentro do app.

## Verificação e limites do protótipo

| Requisitos | Evidência |
| --- | --- |
| RNF04 e RNF07 | Fluxo principal conferido no navegador em desktop e a 360 px, com verificação de foco pelo teclado e sem rolagem horizontal nas telas do fluxo testado. A auditoria WCAG 2.2 AA e a matriz de navegadores são metas de evolução. |
| RNF05, RNF10 e RNF11 | A validação cobriu permissões dos perfis, mídia privada antes da aprovação, comprovante privado após a publicação e retirada do sinal. A API usa sessão local e hash de senha com sal via scrypt. As metas de segurança e governança de produção dependem de validação em ambiente próprio. |
| RNF01, RNF02, RNF03, RNF06, RNF08 e RNF09 | Passaram o build, a busca, a reprodução e os testes com vídeo sintético. O servidor aceitou 50 MiB e recusou 51 MiB e um vídeo de 61 segundos. As metas de desempenho, disponibilidade, usabilidade, cobertura e escala ficam para evolução. |

Também foram verificadas a devolução, a rejeição, o reenvio, a publicação de variações, a edição de conteúdo aprovado e a remoção lógica. O processamento valida o contêiner, o codec e a duração com FFmpeg e recria o contêiner sem os metadados usuais. A retenção automática, a exclusão física sob demanda, o envio de e-mails e a validação formal de conformidade ficam fora do protótipo local.
