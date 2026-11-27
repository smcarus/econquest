# Recursos e detalhes

[English](./FEATURES.md) · [Español](./FEATURES.es.md) · [Français](./FEATURES.fr.md) · **Português**

Tudo o que o EconQuest faz, em detalhe: cada tarefa e ferramenta, os tamanhos e requisitos, os modelos
de IA e seus ajustes, os idiomas, as Quests, as fontes de dados, como conferir os números e o roteiro.
A introdução curta e os passos de instalação estão no [README](../README.pt.md). Esta é uma tradução
da [versão em inglês](./FEATURES.md), que é a de referência; os comandos e as notas para
desenvolvedores existem só em inglês.

## Conteúdo

- [O que você pode fazer com ele](#o-que-você-pode-fazer-com-ele)
- [Requisitos e tamanhos](#requisitos-e-tamanhos)
- [Modelos de IA: qual usar, tamanhos e ajustes](#modelos-de-ia-qual-usar-tamanhos-e-ajustes)
- [Idiomas](#idiomas)
- [Quests: soluções econômicas construídas por muitos](#quests-soluções-econômicas-construídas-por-muitos)
- [De onde vêm os dados](#de-onde-vêm-os-dados)
- [Como você pode conferir](#como-você-pode-conferir)
- [Roteiro](#roteiro)

---

## O que você pode fazer com ele

| Tarefa | Onde | O que você recebe |
| --- | --- | --- |
| Fazer uma pergunta com palavras simples | **Área de trabalho** (Chat do conselho) | Agentes especializados respondem com os números do app, cada um com sua fonte; sem modelo de IA, primeiro vem uma resposta curta pelas regras declaradas do aplicativo; com um modelo de IA, um agente de síntese escreve um breve resumo que só pode citar esses números, e uma checagem aponta qualquer número que não consiga rastrear |
| Perguntar o que uma mudança faria | **Área de trabalho** (Chat do conselho) | Pergunte "o que aconteceria com a Turquia se o Fed subisse os juros em 1 ponto?". O app mostra a mudança que entendeu (você pode editar os tamanhos e perguntar de novo), o Scenario Agent coloca os números de hoje ao lado dos números depois da mudança, lista o que aconteceu em episódios passados do mesmo tipo e o que estudos publicados encontraram, e a resposta vem em oito partes, cada uma marcada com o tipo de evidência em que se apoia |
| Usar o modelo de país do próprio Banco Mundial | **Histórico e dados > Previsões do FMI por edição**, e as perguntas "e se...?" do Chat do conselho | Para Bolívia, Croácia, Iraque, Nepal, Paquistão e Turquia, com o serviço opcional de modelos ligado ([guia de instalação](./INSTALL.md#add-the-world-bank-country-models-optional), em inglês): a trajetória base guardada no modelo público MFMod do Banco Mundial e *Teste um choque no modelo* (preços mundiais do petróleo ou dos alimentos, compras do governo, ou a taxa básica de juros onde o modelo a tem), mostrado como a diferença em relação à trajetória do próprio modelo, porque as cópias públicas têm dados antigos. O Scenario Agent acrescenta a resposta do modelo às perguntas sobre petróleo, alimentos e taxa básica de juros. Uma verificação escrita antes da execução real testa se o app reproduz os resultados do próprio Banco Mundial |
| Estudar um país | **Pesquisa > Um país** | Resumo, Mercados e sinais, Histórico e dados, e Fontes. Histórico e dados mostra o gráfico do histórico e depois um menu de ferramentas em oito grupos que abrem uma de cada vez: gráficos de muitos anos, estimativas do presente e previsões com faixas, hiato do produto, sustentabilidade da dívida, adequação das reservas, regras de política monetária, alerta antecipado de crise, curva de juros, fatores da inflação, contabilidade do crescimento, previsões do FMI por edição e visões "em um dia passado". Para países de renda mais baixa: remessas, ajuda recebida, inclusão financeira, preços de commodities e termos de troca, preços dos alimentos e segurança alimentar, e desastres naturais. Clima na capital desde 1981 e no país inteiro desde 1901, preços de arroz, trigo, milho e soja desde 1960, um desenhador de seguro paramétrico (custo de sinistralidade, preço justo, períodos de retorno, risco de base), um modelo de perdas por desastres e trajetórias de ciclones tropicais. Como a moeda é administrada de fato, ativos do banco central e pressão no financiamento em dólares. Para a administração pública e para políticos: credibilidade do orçamento (quanto do orçamento aprovado foi gasto, com as faixas de nota do PEFA), um acompanhamento da execução do orçamento com seu próprio arquivo, os projetos do Banco Mundial e o ritmo dos desembolsos, e números regionais. Para economistas e operadores de mercado: faixas a partir de erros passados das previsões, curvas de juros completas dos EUA e da zona do euro, e surpresas nos dados com um índice de surpresas de inflação |
| Comparar países | **Pesquisa > Comparar países** | Sua lista de acompanhamento lado a lado (os 19 países membros do G20 no início, ou os 15 maiores países de baixa renda por região), pautas e onde os preços de mercado e os dados discordam |
| Acompanhar suas posições | **Pesquisa > Minhas posições** | Uma lista de títulos ou posições que você carrega, diante dos riscos e sinais |
| Avaliar uma escolha de política | **Revisão de políticas** (página própria no cabeçalho) | Um dossiê passo a passo: definir o problema, diagnosticar, ordenar opções, checar evidências e precedentes (incluindo **O que aconteceu depois**: o país contra um gêmeo de países que não fizeram a mesma mudança), escrever um memorando de recomendação e um resumo de uma página para quem não é economista, e depois acompanhar o que aconteceu. Compare o diagnóstico com até seis países pares, receba um aviso na página inicial quando um número acompanhado cruzar seu gatilho, e veja o que mudou ao revisar de novo a mesma política. O conselho de políticas pesa uma medida (custos e benefícios a taxas de desconto oficiais, quem ganha e quem perde, o que vem depois, cenários) ou o que um evento significa para um mercado. **Para as pessoas** transforma uma revisão num resumo simples para a população: o que muda, o custo por pessoa, quem ganha e quem paga, e as regiões mais atrasadas |
| Testar um "e se" fiscal | **Histórico e dados**, ou a partir do Chat do conselho | Mude os gastos do governo ou os impostos e veja o efeito provável no crescimento e na dívida, com multiplicadores e elasticidades publicados e uma faixa |
| Escrever um relatório | **Relatórios** (abas: Escrever uma nota, Documentos do conselho, Cadernos, Ensino) | Notas de país e de emissor, avaliações de sustentabilidade, revisões de carteira e resumos do conselho, em Markdown ou PDF com fontes e datas |
| Escrever um texto para discussão | Gráficos do **Chat do conselho**, **Relatórios > Cadernos** | Fixe um gráfico num caderno de pesquisa com a data até onde vão os números e uma impressão digital dos números; baixe o caderno como um único zip (rascunho, dados, scripts de Python, R e Stata, arquivo de citação); depois, *Verificar se ainda vale* diz se cada número continua igual, foi revisado ou sumiu |
| Aprender pelo caminho | Botões do cabeçalho, **Menu > Manual do usuário**, **Menu > Exemplos resolvidos** | Quatro níveis de ajuda (Ajuda desativada, Ajuda essencial, Ajuda completa, Especialista), um glossário em linguagem simples, cinco casos resolvidos, episódios didáticos e modo prova |
| Usar seus próprios dados e testes | **Menu > Seus dados**, **Menu > Modelos e validação** | Carregue suas próprias séries em CSV; registre seu próprio teste de sinal ou modelo com as mesmas regras rígidas dos testes do app |
| Usar os números em R, Python ou Stata | [docs/DATA_API.md](./DATA_API.md) (em inglês) | As mesmas séries, painéis e tabelas das telas, com fonte e data em cada valor |
| Conectar um sistema de carteira | **Menu > Configurações > Tokens de API**, [docs/DATA_API.md](./DATA_API.md) (em inglês) | Outro programa lê resumos de país e eventos, envia suas posições e roda choques e repetições de crises passadas na carteira dele, cada um com um token limitado ao que você marcar. Os países e títulos da lista **Nomes ocultos** não aparecem em lugar nenhum |

O **Chat do conselho** é o coração do app. Os agentes são Banco Central, Fiscal e Dívida, Política e
Eventos, Valor Relativo, Câmbio, Contágio Global, Calendário, Timing e Finanças Comportamentais, mais um
agente de Documentos que lê os documentos de política que você envia, um agente de gráficos para
gráficos e testes, e o **Scenario Agent** para perguntas "e se...?". Se você roda seu próprio servidor
de ferramentas de pesquisa, a **mesa quantitativa** pode trazer para uma resposta do chat os backtests e
os números de volatilidade e de opções dele, cada um com seu link e o rótulo "hipotético" do servidor;
ela fica desligada se você não a configurar. **Executar o conselho completo**
manda um país para nove agentes especializados em três mesas (geopolítica, crédito soberano e economia em
geral); eles debatem, e o app espera a sua aprovação antes de escrever o relatório final. Um modelo de IA
maior atua como **árbitro** e julga se cada resposta se atém aos números.

Por enquanto os agentes entendem melhor perguntas em inglês; o app avisa isso junto à caixa de perguntas.

**Todos os números, gráficos e testes funcionam sem nenhum modelo de IA.** A IA só é necessária para o
resumo do chat, os debates e as explicações em linguagem simples, e cada resposta que ela escreve é
marcada como escrita por IA.

---

## Requisitos e tamanhos

| Item | Mínimo | Recomendado |
| --- | --- | --- |
| Sistema operacional | macOS (as três versões mais recentes), Windows 10 ou 11 (64 bits, WSL 2 para o Docker Desktop) ou Linux 64 bits | O mesmo; Apple Silicon, Intel e AMD funcionam |
| Memória | 8 GB (4 GB no modo leve, uma meta ainda não medida) | 16 GB; 32 GB para rodar o árbitro grande no mesmo computador |
| Disco livre | 5 GB | 10 GB, mais espaço para os modelos de IA |
| Internet | Qualquer conexão | Uma sem limite mensal de dados pequeno |
| Node.js (só a partir do código) | 20.19 ou mais, ou 22.12 ou mais | 22 |

### Tamanhos de download

Cada número diz como foi obtido. "Medido" quer dizer medido na data indicada; "estimativa" traz o
método. As medições de 13 de novembro de 2026 são do branch principal até o pull request #510; o app
compilado e os arquivos de idioma foram medidos de novo em 17 de novembro de 2026, até o pull request
#598.

| O quê | Tamanho | Como o número foi obtido |
| --- | --- | --- |
| Código-fonte (`git clone`) | 70 MB (29 MB de arquivos e 41 MB de histórico) | Medido, clone novo, 13 de novembro de 2026 |
| App pronto (imagem Docker) | Cerca de 170 MB para baixar; 798 MB descompactada | Medido: imagem construída com o Dockerfile do repositório em 13 de novembro de 2026 (798 MB descompactada, 170 MB compactada com gzip). O download do registro é compactado da mesma forma, então o tamanho será parecido |
| Pacotes instalados, a partir do código (`npm install`) | 465 MB | Medido, 13 de novembro de 2026 |
| App web compilado | 7,75 MB no total; 481 KB compactados na inicialização | Medido com `npm run size:check`, 24 de novembro de 2026, até o pull request #677 (limites de 520 KB e 9 MB) |
| Cada idioma adicional | Cerca de 0,85 MB (cerca de 270 KB compactados), só quando escolhido | Medido na compilação, 17 de novembro de 2026 |
| Primeiro download completo de dados | Cerca de 3,6 a 3,8 GB, quase tudo arquivos de notícias do GDELT | Estimativa: GDELT cerca de 3,4 GB para 8 semanas (pelos tamanhos publicados pelo GDELT), edições antigas do FMI cerca de 100 MB (medido), o resto como no download diário |
| Primeiro download no modo leve | Meta: bem menos de 1 GB | Ainda não medido; pendente de um teste no Mac do desenvolvedor antes do lançamento |
| Download diário de dados | Cerca de 150 a 200 MB (4,5 a 6 GB por mês) | Estimativa a partir de respostas gravadas e tamanhos de arquivo. O download diário agora registra quanto baixa; o número medido após uma semana (`npm run go -- status` no Mac do desenvolvedor) vai substituir esta estimativa |
| Modelos de IA via Ollama (opcional) | qwen2.5:7b 4,7 GB; qwen2.5:14b 9 GB; qwen2.5:32b 20 GB | Tamanhos publicados pelo Ollama |
| Histórico longo do GDELT (opcional) | Cerca de 25 GB desde 2016 (35 GB desde 1979); cerca de 5 MB ficam no disco | Tamanhos publicados pelo GDELT |

### Espaço ocupado em uso

| Configuração | Disco aproximado | Composição |
| --- | --- | --- |
| Modo leve, sem IA local | Meta de 2 GB | Ainda não medido |
| App pronto, sem IA local | Cerca de 1 GB, crescendo uns 40 MB por ano | Imagem 0,8 GB (medido) mais a pasta `data/`, cerca de 150 MB após os primeiros dias (medido no Mac do desenvolvedor em 9 de novembro de 2026, 22 países) |
| Com um árbitro de 14B | Cerca de 15 GB | O anterior mais qwen2.5:7b e qwen2.5:14b |
| Com toda a IA local | Cerca de 26 GB | O anterior mais qwen2.5:7b e qwen2.5:32b |
| A partir do código em vez da imagem | Some cerca de 0,5 GB | Código e histórico 70 MB, pacotes 465 MB, compilação 7,75 MB (medido) |

O Docker Desktop precisa de mais alguns GB (veja docker.com). Para ver o tamanho real no seu computador,
rode `du -sh data data/*` na pasta do EconQuest ou abra Menu > Dados offline.

---

## Modelos de IA: qual usar, tamanhos e ajustes

A IA escreve o resumo do conselho, conduz o debate, escolhe os agentes para uma pergunta e explica os
números. Ela nunca fornece um número: cada número vem de uma fonte, de uma série oficial ou do seu
arquivo. Escolha o provedor em Menu > Configurações > Modelo de IA.

| Provedor | Custo | Privacidade | Observações |
| --- | --- | --- | --- |
| **Sem IA** | Grátis | Só saem os pedidos de números públicos | Tudo funciona; os agentes respondem sem resumo escrito |
| **Ollama** no seu computador | Grátis | Tudo fica no seu computador | Precisa do [app Ollama](https://ollama.com/download) e de memória suficiente |
| **Google Gemini** | Grátis até os limites diários do Google; depois é cobrado na sua própria chave | As perguntas e seus números vão para o Google | Precisa de uma chave de API do Gemini; o modelo padrão é `gemini-3.8-flash`, alterado com `GEMINI_MODEL` no `.env` |
| **Ollama, depois Gemini** | Como acima | Como acima | Ollama primeiro; o Gemini responde quando o Ollama não responde |
| Servidor local compatível com OpenAI (como o LM Studio) | Grátis | Fica no seu computador | Em Configuração avançada de IA; você informa o endereço e o modelo |

### Dois papéis: modelo rápido e árbitro

| Papel | O que faz | Padrão | Regra |
| --- | --- | --- | --- |
| **Modelo rápido** | Escolhe os agentes e escreve as respostas das mesas | `qwen2.5:7b` (`OLLAMA_QUICK_MODEL`) | Um modelo de 7 a 8B responde em menos de um minuto na maioria dos Macs |
| **Árbitro** | Etapa final do conselho completo, resumos e explicações do chat, debate dos agentes, etapa de Opções da revisão de política e textos de abertura dos debates das Quests | `qwen2.5:32b` (`OLLAMA_DEEP_MODEL`) | 30B ou mais conta como árbitro completo. Um modelo de 8B ou menos nunca é usado como árbitro. Um árbitro de 14B só é permitido se você ligar **Permitir um árbitro de 14B** (desligado por padrão), e toda resposta que ele julga diz "Árbitro pequeno" |

### Qual configuração para qual computador

| Seu computador | Configuração recomendada |
| --- | --- |
| Notebook de 4 GB | Modo leve com uma chave do Google Gemini, ou sem IA |
| 8 GB | Google Gemini, ou sem IA. Um modelo local deixa pouca memória para o app, o Docker e o navegador |
| 16 GB | Ollama `qwen2.5:7b` para as mesas, com "Ollama, depois Gemini" para o Gemini ser o árbitro; ou ligue um árbitro `qwen2.5:14b`, marcado "Árbitro pequeno" (precisa de cerca de metade da memória do 32B) |
| 32 GB ou mais, ou uma placa de vídeo de 24 GB | Tudo local: `qwen2.5:7b` e `qwen2.5:32b` |

Baixe os modelos uma vez com `ollama pull qwen2.5:7b` e `ollama pull qwen2.5:32b` (ou pelo `npm run go`).
Num computador sem memória suficiente ou sem chip gráfico, o modelo grande pode levar 10 minutos ou mais
por relatório completo; use o Gemini como árbitro ou rode o Ollama numa máquina maior.

### Ajustes que o app usa

Valores atuais do código; os marcados "alterável" ficam em Menu > Configurações > Modelo de IA >
Configuração avançada de IA.

| Ajuste | Valor | Por quê |
| --- | --- | --- |
| Temperatura, resumo e explicações do chat | 0, com semente 42 | Os mesmos números dão a mesma resposta, exatamente com o mesmo modelo Ollama na mesma máquina |
| Temperatura, etapas da revisão de política | 0 | Repetir dá um resultado o mais próximo possível |
| Temperatura, textos de abertura dos debates das Quests | 0, com semente 42, no árbitro | Escritos uma vez e registrados com seus ajustes |
| Temperatura, outras etapas (mesas do conselho completo) | 0,2 (alterável, de 0 a 1,5) | Um pouco de variedade entre as mesas |
| Janela de contexto (`num_ctx` do Ollama) | 8.192 tokens (alterável, de 1.024 a 65.536) | Suficiente para a pergunta, os números e as instruções |
| Tamanho máximo nas etapas longas (`num_predict` do Ollama) | 2.048 tokens; 4.096 para modelos de raciocínio | Interrompe um modelo que continua escrevendo enchimento |
| Espera por chamada | 16 segundos por etapa de mesa e 25 por etapa do conselho completo (alterável, de 5 a 180); pelo menos 120 segundos nas etapas do árbitro | Um endereço fora do ar falha rápido; o árbitro tem tempo |
| Modelo mantido carregado (`keep_alive` do Ollama) | 30 minutos nas etapas longas | A próxima pergunta não recarrega um modelo de 20 GB |
| Formato | JSON conferido por um esquema; nível de raciocínio do Gemini baixo | O app lê cada campo e confere cada número com sua fonte |

No `.env`: `DEFAULT_AI_PROVIDER` (`ollama` ou `gemini`), `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`,
`OLLAMA_DEEP_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `LIGHT_MODE`.

---

## Idiomas

| Idioma | Situação | Tratamento |
| --- | --- | --- |
| Inglês | Completo; idioma de origem | |
| Espanhol | App inteiro | *Usted* |
| Francês | App inteiro | *Vous* |
| Português do Brasil | App inteiro | *Você* |
| Árabe, suaíli | Planejados, não iniciados | |

Todas as telas, menus, textos de ajuda, verbetes do glossário e exemplos resolvidos estão traduzidos; o
resumo de política de uma página sai nos quatro idiomas. Troque com o botão **EN / ES / FR / PT** do
cabeçalho; a escolha fica salva no seu navegador. Um idioma só é baixado quando escolhido.

Algumas coisas ficam como foram escritas, e o app avisa: números, nomes de fontes e de séries aparecem
como a fonte os entrega; o Chat do conselho e o conselho escrevem as respostas no idioma que você escolher (os agentes ainda
entendem melhor perguntas em inglês);
as notas de método citam artigos em inglês; algumas frases que as regras do app escrevem sobre um país
ainda estão em inglês. Nenhuma tradução foi revisada ainda por um falante nativo; ajuda é bem-vinda:
os passos e a lista de arquivos estão em [docs/TRANSLATION_REVIEW.md](./TRANSLATION_REVIEW.md) (em inglês).

Este README e o guia estão nos quatro idiomas. Os outros documentos estão em inglês.

---

## Quests: soluções econômicas construídas por muitos

As Quests transformam perguntas econômicas abertas num jogo público com pontuação do qual qualquer pessoa
pode participar, para que muita gente trabalhe nos problemas de um país, teste os raciocínios uns dos
outros contra os dados e construa um histórico de quem prevê bem. **As Quests estão construídas, mas
desligadas.** Menu > Quests aparece em cinza ("Ainda não disponível") até que cada item da lista em
[docs/QUESTS.md](./QUESTS.md) seja marcado e o projeto se torne público. Para experimentar no seu
computador, adicione `QUESTS_ENABLED=on` ao `.env` e reinicie.

![Menu > Quests com QUESTS_ENABLED=on: lista de Quests em rascunho com tipo e data do resultado](./images/18-quests.png)

**O que é uma Quest.** Um arquivo em `quests/` com uma pergunta e uma regra escrita de como ela é
resolvida a partir das próprias fontes do app. Há quatro tipos:

| Tipo | Exemplo | Como termina |
| --- | --- | --- |
| **Previsão** | "A taxa básica da Turquia estará mais baixa em 30 de junho de 2027 do que no fechamento das participações?" | Resolvida pela fonte conforme sua regra; cada participação recebe pontuação |
| **Debate** | "O que reconstruiria com mais segurança as reservas internacionais do Egito?" | Nunca pontuado. Defende-se uma posição com os números do app; o Claim Check compara cada número citado com o do app; depois do fechamento, um mapa de evidências mostra os argumentos ao lado do que os números mostraram |
| **Replicação** | "Reproduza a estimativa de reação fiscal de Bohn para o Brasil" | Cada participação traz o número que um script público próprio produziu; reproduz o número do app se estiver dentro da tolerância. Uma participação cuidadosa que encontra um erro no app resolve a Quest |
| **Sinal** | "Um posicionamento muito concentrado em futuros se desfaz em seis semanas?" | Propõe-se um teste pré-registrado; cada um roda uma única vez após o fechamento, entra na correção de Holm com todos os outros e recebe um selo como os do app |

**Como o jogo funciona.**

- **No privado ou em público.** Registre uma resposta no privado no seu computador, pratique com dados
  passados (pontuação na hora, nada é salvo) ou participe em público com um pull request que o app
  prepara para você. Quem está num país bloqueado pelo GitHub pode participar por e-mail, por meio de um
  responsável.
- **Pontuação contra uma taxa de base.** As previsões são pontuadas com o escore de Brier contra a
  frequência com que o fato aconteceu no passado, e as previsões numéricas contra "nada muda", de modo
  que sorte e cópia rendem pouco.
- **Placar.** Habilidade com faixa de 90%, calibração, nitidez, desempenho contra a multidão, pontos
  fortes por área e região, sequências, temporadas por ano civil e uma tabela de todos os tempos. Uma
  pessoa só entra no ranking depois de 12 previsões resolvidas e com uma conta no GitHub de pelo menos 90
  dias; ninguém é ranqueado pelo número de Quests de que participa. Debates, replicações e testes
  aparecem na página de cada participante, sem ranking.
- **Nada pode ser alterado depois.** As Quests aprovadas têm impressão digital; os resultados vão para um
  registro encadeado por hash que falha se qualquer linha for alterada; as contestações são decididas em
  público.
- **Aberto a quem não tem o app.** Uma página pública estática (`npm run quests:board`) mostra as
  tabelas, os resultados e a multidão contra a taxa de base, e um conjunto de dados aberto anual pode ser
  depositado com DOI.
- **Regras que mantêm tudo sólido.** Nenhum número escrito num arquivo de Quest; as Quests de previsão só
  se resolvem em fontes cujos termos permitem compartilhar com crédito; perguntas sobre conflitos,
  distúrbios ou vítimas só entram como Debates; sem apostas e sem prêmios. As Quests não são um mercado de
  apostas.
- **Na sala de aula.** Professores podem usar as Quests com um código de turma e uma tabela de turma
  privada; está planejado um piloto de um semestre com dois professores.

Há catorze Quests em rascunho em `quests/drafts/`; nenhuma foi aprovada ainda. As regras completas, os
passos do responsável e a lista de lançamento estão em [docs/QUESTS.md](./QUESTS.md) (em inglês).

---

## De onde vêm os dados

Todas são gratuitas. Algumas precisam de uma chave gratuita, adicionada em Menu > Configurações.

| Área | Fontes |
| --- | --- |
| Crescimento, dívida, orçamentos, comércio | Banco Mundial (indicadores e estatísticas de dívida), FMI (Panorama Econômico Mundial e edições passadas, reservas, balanço de pagamentos, composição das reservas, gasto público por função), OCDE (indicadores antecedentes, preços, PIB trimestral, via DBnomics), preços ao consumidor mensais do FMI, Eurostat, UN Comtrade e WITS |
| Juros e títulos | Curva diária de rendimentos ao par do Tesouro dos EUA e curva de juros dos títulos públicos da zona do euro do BCE (todos os prazos, todo dia), BIS (taxas básicas, títulos de dívida, taxas de câmbio reais, ativos totais dos bancos centrais, crédito em dólares aos não bancos), linhas de swap em dólares do Fed de Nova York, taxas básicas mensais do FMI (Estatísticas Monetárias e Financeiras) para os países que o BIS não cobre, FRED (rendimentos oficiais de 10 anos; chave gratuita), Fed de Nova York, Tesouro dos EUA (detentores estrangeiros, leilões), Tesouro Nacional do Brasil, banco central do Peru (spreads EMBIG), e rendimentos de 10 anos da OCDE e taxas de câmbio H.10 do Federal Reserve, mensais desde 1990 via FRED, para repetir crises passadas |
| Câmbio e commodities | Câmbio à vista (open.er-api.com), taxas de referência do BCE, taxas de câmbio mensais do FMI para moedas sem taxa oficial diária (por exemplo a naira, o xelim e o cedi), preços de commodities do Banco Mundial (Pink Sheet; arroz, trigo, milho e soja desde 1960), preços do petróleo da EIA (chave gratuita), a classificação de regimes cambiais de Ilzetzki, Reinhart e Rogoff (uma planilha que você salva; os autores pedem citação e não indicam licença) |
| Pesquisas e expectativas | Pesquisas com empresas e consumidores da UE (Comissão Europeia, via Eurostat; substituto gratuito dos PMIs pagos, identificado como tal), pesquisa de previsores profissionais do BCE, boletim Focus do Brasil, índice de pressão das cadeias de suprimentos do Fed de Nova York; para as surpresas nos dados, os preços ao consumidor dos EUA do BLS e o mercado de CPI da Kalshi como salvo antes de cada divulgação |
| Orçamentos, projetos e regiões | Execução orçamentária do Banco Mundial a partir das avaliações PEFA (meta 16.6.1 da ONU), projetos do Banco Mundial e o extrato de créditos da AID, produção por pessoa por região do DOSE (Wenz et al. 2023, CC BY 4.0), números do Eurostat para as regiões da UE e o Índice de Desenvolvimento Humano subnacional do Global Data Lab (um arquivo que você salva; termos não comerciais). Seu próprio arquivo de gastos mensais para o acompanhamento da execução do orçamento fica no seu computador |
| Bancos centrais e calendário | Banco Central do Brasil, Banco de México (token gratuito), datas oficiais das decisões (agora também Quênia, Gana, Tanzânia e Índia) e metas de inflação, cada uma lida na página do próprio banco, datas de divulgação de inflação e PIB dos institutos de estatística |
| Instituições e abertura | Indicadores de governança do Banco Mundial (WGI), índice de abertura da conta de capital de Chinn e Ito (baixado no seu computador no máximo uma vez por mês, citado como Chinn e Ito 2006 e nunca repassado) |
| Política, conflitos e transporte marítimo | Notícias do GDELT, dados de conflito do UCDP e do ACLED (o ACLED é baixado à mão), listas de sanções da OFAC e da ONU, índice de risco geopolítico, IMF PortWatch |
| Mercados e posicionamento | Mercados de previsão Kalshi e Polymarket, relatório Commitments of Traders da CFTC |
| Países de renda mais baixa | Banco Mundial (remessas e o custo de enviá-las, contas do Global Findex, ajuda recebida como republicada a partir da OCDE, segurança alimentar, peso das commodities no comércio e termos de troca); dois arquivos que você mesmo salva: preços ao consumidor da FAOSTAT para a inflação de alimentos, e desastres naturais do EM-DAT, baixados com sua própria conta gratuita do EM-DAT (os termos não permitem que o app os inclua) |
| Clima e ameaças naturais | NASA POWER (temperatura e chuva mensais em cada capital desde 1981), Portal de Conhecimento sobre Mudança do Clima do Banco Mundial (médias por país do CRU TS desde 1901, CC BY 4.0), trajetórias de ciclones tropicais IBTrACS da NOAA desde 1980 (baixadas só quando você clica no botão, ou lidas de um arquivo que você salva) |

**Pago, só com a sua própria assinatura.** Se você já paga Macrobond, Trading Economics (196 países,
incluindo rendimentos de títulos e índices de ações de mercados de fronteira) ou EODHD (preços diários
de índices, moedas e commodities), Menu > Configurações > Suas assinaturas conecta um deles com sua
própria chave. Você escolhe as séries; os números ficam no seu computador e nunca são enviados ao
modelo de IA.

A lista completa está em [docs/DATA_SOURCES.md](./DATA_SOURCES.md) e o que cada fonte permite em
[docs/DATA_LICENCES.md](./DATA_LICENCES.md) (em inglês).

---

## Como você pode conferir

- **Cada número traz sua fonte e data**, e Menu > Saúde dos dados mostra se cada fonte continua chegando
  e se algum número foi revisado desde que apareceu.
- **Sinais e modelos são testados antes de serem usados.** Cada teste é escrito e recebe uma impressão
  digital *antes* de rodar (pré-registro), usa só dados disponíveis na época, conta os custos de
  negociação e é conferido com reamostragem. Os resultados são corrigidos pela sorte entre todos os testes
  (correção de Holm). Um teste que falha fica registrado como falho e nunca é reajustado.
- **Selos**: Validado, Provisório, Em revisão, Retirado ou Revisão pendente. A maioria dos sinais não
  passou no teste, e o app diz isso.
- **Um log de auditoria** guarda o que foi perguntado, quais números foram usados e quem aprovou um
  relatório.
- **Ferramentas de pesquisa externas** (opcional, desligado por padrão): se você tem seu próprio servidor
  de ferramentas de pesquisa, pode informar o endereço e a chave em **Menu > Configurações > Ferramentas
  de pesquisa**. No chat do Conselho, a **mesa quantitativa** responde então a perguntas sobre backtests,
  previsões, volatilidade, nowcasts, preços de opções, quedas máximas ou índices de Sharpe, e mostra cada
  número com o link, a data dos dados e o rótulo do servidor (resultado hipotético com dados passados,
  não uma recomendação). Cada chamada fica no log de auditoria, nunca a chave
  ([docs/RESEARCH_TOOLS.md](./RESEARCH_TOOLS.md), em inglês).

O método completo está em [docs/METHODOLOGY.md](./METHODOLOGY.md) (em inglês).

---

## Roteiro

Situação em 27 de novembro de 2026 (detalhes em [docs/ROADMAP.md](./ROADMAP.md), em inglês):

**Feito**

1. **Citações, manutenção e retorno dos usuários**: "Citar" em cada gráfico, tabela e resposta, uma
   revisão de tamanho, uma verificação mensal das fontes e a comparação de revisões de política
   passadas com o que aconteceu.
2. **Os números de que um terminal completo precisa**: desigualdade, receita tributária e tarifas,
   dívida de países de baixa renda, população, comércio e estrutura da dívida, clima, salários e preços
   de imóveis, saldos setoriais, atividade mensal, e números da zona do euro e do Reino Unido como
   publicados pela primeira vez (a receita por estado é uma segunda etapa que espera uma verificação de
   cobertura).
3. **Ferramentas de análise e de política**: alerta antecipado de crise, sustentabilidade externa,
   curva de juros, fatores da inflação, contabilidade do crescimento, uma calculadora de
   reestruturação, finanças comportamentais e uma revisão de política mais completa, com precedentes,
   regras fiscais, viabilidade política, um gráfico de trade-offs e um resumo de uma página.
4. **Dados para países de renda mais baixa** (adiantados em 13 de novembro): remessas, inclusão
   financeira, preços de commodities e termos de troca, ajuda recebida, preços dos alimentos e
   desastres naturais.
5. **Ferramentas para a revisão de política** (adiantadas em 13 de novembro): comparação com pares,
   avisos na página inicial e comparação de uma revisão com a anterior.
6. **Conexão com outros sistemas** (13 de novembro): tokens de API, eventos e webhooks, alertas de
   indicadores, resumos de país, posições enviadas de fora, nomes ocultos, cenários e repetições de
   crises, um registro de auditoria selado, um guia de implantação e login com OpenID Connect.
7. **Idiomas e ensino**: o app inteiro em português e quatro exemplos resolvidos.
8. **Dados de mercados e financiamento** (antecipados em 14 de novembro): como a moeda é administrada
   de fato (regime cambial), os balanços dos bancos centrais e a pressão no financiamento em dólares
   (crédito em dólares do BIS e linhas de swap do Federal Reserve). Os controles de capital já são
   cobertos pelo índice de Chinn e Ito.
9. **Conselho de políticas** (14 de novembro): dentro de uma revisão de política, pesar uma medida com
   custos e benefícios, quem ganha e quem perde, efeitos de segunda ordem e cenários, ou pesar o que um
   evento significa para a moeda ou os títulos do governo; o conselho ordena as opções contra ela e o
   resumo de uma página traz o resultado.
10. **Clima e seguros** (14 de novembro): clima na capital e no país inteiro, preços de alimentos desde
    1960, um desenhador de gatilho de seguro paramétrico com custo de sinistralidade, preço justo,
    períodos de retorno e risco de base, um modelo de perdas por desastres a partir do EM-DAT e
    trajetórias de ciclones tropicais.
11. **Perguntas de outro programa e páginas mais organizadas** (15 e 16 de novembro): outro programa
    pode fazer uma pergunta ao Chat do conselho com um token `ask:council`; Relatórios em abas, e
    Histórico e dados como o gráfico mais um menu de ferramentas, uma de cada vez.
12. **Perguntas "e se...?"** (17 de novembro): o Chat do conselho lê a mudança que uma pergunta
    descreve, o Scenario Agent coloca os números de hoje ao lado dos números depois da mudança, com o
    que a história e a pesquisa publicada mostram, a resposta vem em oito partes e os tamanhos podem ser
    editados para perguntar de novo.
13. **Cinco perfis de usuário** (17 de novembro): para a administração pública, credibilidade e
    execução do orçamento e projetos do Banco Mundial; para políticos, números regionais e um resumo
    simples para a população; para pesquisadores, um pacote de texto para discussão e uma verificação de
    replicação; para economistas, faixas a partir de erros passados das previsões; para operadores de
    mercado, curvas de juros completas, surpresas nos dados e um índice de surpresas de inflação.
14. **Ferramentas de pesquisa externas** (17 de novembro): o Chat do conselho pode chamar um servidor de
    ferramentas de pesquisa que você roda, pela mesa quantitativa; desligado por padrão.
15. **Melhor cobertura dos países de baixa renda** (17 de novembro): os países que você inclui
    (Pesquisa > Um país > Adicionar um país) são salvos pelo download diário como os já incluídos, com
    histórico, visões "em uma data" e alertas; uma lista de acompanhamento **Países de baixa renda** com
    os 15 maiores por região (Índia, Paquistão, Nigéria, Bangladesh, Etiópia, Egito, Filipinas,
    RD do Congo, Vietnã, Tanzânia, Quênia, Mianmar, Uganda, Gana e Bolívia); taxas de câmbio e taxas
    básicas mensais do FMI onde não há dado diário nem do BIS, usadas também no nowcast e nas
    previsões de inflação e na previsão da taxa básica; e metas de inflação e datas de decisão lidas
    nas páginas dos próprios bancos.
16. **Melhorias rápidas após a comparação com outras plataformas** (23 de novembro): as planilhas se
    atualizam a partir do aplicativo (um assistente de Power Query para Excel e um script para Google
    Sheets); previsões oficiais lado a lado (o FMI, o Banco Mundial e a OCDE, com a diferença entre
    elas) em Histórico e dados; e dias de divulgação, em que o aplicativo relê a cada hora as fontes de
    IPC e de atividade mensal até chegar o novo mês, em Hoje.

17. **Fechar as lacunas com as plataformas líderes** (23 de novembro): previsões escritas antes de os
    números existirem e pontuadas todo mês; uma busca em todos os catálogos gratuitos (Menu > Buscar
    dados); VAR bayesianos e estruturais no Agente de gráficos; um pequeno modelo de economia aberta
    estimado e testado antes de aparecer; números em tempo real para os 38 membros da OCDE;
    documentos oficiais e discursos de banqueiros centrais por país; um relatório de país offline, um
    laboratório macro e um exemplo resolvido sobre commodities; comentários e links somente leitura em
    um servidor doméstico; preços ao vivo da sua própria conta na Interactive Brokers, só na tela;
    respostas do conselho em espanhol, francês ou português; metas de inflação e datas de decisão para
    mais países de baixa renda; um processo de revisão das traduções por falantes nativos; e como os
    choques se espalham entre economias (um pequeno VAR global com pesos de comércio do FMI). O
    arcabouço de dívida dos países de baixa renda espera sua nota de orientação de 2027.
18. **Métodos de previsão e o histórico de acertos** (19 a 23 de novembro): volatilidade cambial GARCH,
    estimativas do trimestre corrente por ridge, lasso, floresta aleatória e fator dinâmico, ARIMA,
    faixas de crescimento por quantis, o teste KPSS, testes com os números como foram publicados pela
    primeira vez e o teste do quadro de risco país. Há 39 testes registrados: 11 aprovados, 8 deles
    continuam de pé quando o número de testes é levado em conta. Os veredictos são copiados de
    execuções reais com `npm run track-record:import`, nunca à mão.
19. **Primeiro uso mais fácil** (24 de novembro): um cartão de início em três passos; uma resposta
    curta no alto do Chat do conselho quando nenhum modelo de IA escreve uma; uma lista de Ausente mais
    curta e mais espaço para a resposta; Revisão de políticas como página própria ao lado de
    Relatórios; e o botão de ajuda como uma lista dos quatro níveis.
20. **Recupera-se sozinho** (24 de novembro): atualizações que não param por causa de arquivos que o
    próprio app escreve; fontes lentas ou ocupadas consultadas de novo antes de contarem como falha;
    uma segunda tentativa para downloads que falharam no fim do download diário e outras tentativas
    depois de duas horas; e a última resposta boa, com as próprias datas, enquanto uma fonte não
    responde.
21. **Recursos comuns de um aplicativo** (24 de novembro): uma página de privacidade
    ([docs/PRIVACY.md](./PRIVACY.md), em inglês), um aviso quando sai uma versão nova, Copiar os
    detalhes e Relatar um problema, uma pergunta antes de apagar uma lista de acompanhamento, seguir o
    modo claro ou escuro do computador, os passos para remover o app e atalhos de teclado.
22. **Verificação para o lançamento e os países mais pobres** (25 de novembro): uma segunda revisão de
    segurança e uma política de segurança mais rígida para as páginas do app compilado; Adicionar um
    país mostra todos os países, não só os do mapa-múndi; os 59 países da lista de dívida de baixa
    renda do FMI e do Banco Mundial (Malaui, Serra Leoa, Haiti, Nepal, os pequenos Estados insulares e
    outros) estão em todas as listas de países, e o download diário os salva assim que entram em uma
    lista de acompanhamento; e a verificação automática no Windows passa.
23. **Os modelos de país do Banco Mundial** (26 de novembro): os modelos macrofiscais que o Banco
    Mundial publica para Bolívia, Croácia, Iraque, Nepal, Paquistão e Turquia rodam no seu computador
    por meio de um serviço opcional; sua trajetória base e os cálculos com um choque em Histórico e
    dados e nas respostas "e se...?"; e uma verificação pré-registrada de que o app reproduz os
    resultados do próprio Banco Mundial, que passou no computador do desenvolvedor em 26 de
    novembro.
24. **Compilações mais seguras e acessibilidade** (26 de novembro): cada etapa de compilação e cada
    imagem base fixadas numa versão exata; análise do código e uma nota de boas práticas quando o
    repositório for público; listas de componentes, somas de verificação e uma prova de compilação
    assinada em cada versão; acessibilidade verificada pela WCAG 2.2, com uma passagem pelo teclado;
    o ajuste "reduzir movimento" do computador é respeitado; e uma declaração de acessibilidade
    ([docs/ACCESSIBILITY.md](./ACCESSIBILITY.md), em inglês).
25. **O que aconteceu depois** (27 de novembro): em Revisão de políticas > Precedentes, escolha uma
    mudança que um país fez (uma grande virada no orçamento, uma desvalorização, um novo regime
    cambial ou regra fiscal, ou uma que você adicione com a fonte) e veja o país contra um "gêmeo" de
    países que não a fizeram, com testes de quão incomum é a diferença; guarde um resultado para o
    resumo de uma página, cite-o ou compare todos os países que fizeram o mesmo tipo de mudança.
    Marcado como Não validado até que seu teste de alarmes falsos, registrado com antecedência, rode
    num computador que alcance o FMI e o Banco Mundial.

26. **Sua assinatura de dados: mais dois serviços** (27 de novembro): Trading Economics e EODHD se
    juntam ao Macrobond em Menu > Configurações > Suas assinaturas, cada um só com a sua própria chave,
    um de cada vez; os números ficam no seu computador, e uma série que cita um CDS é recusada enquanto
    os CDS estiverem ocultos. Ainda não testados com uma chave real.

**Próximo**

- **Primeiro, os testes.** Um pequeno grupo de pessoas convidadas instala o app a partir do código em
  github.com/smcarus/econquest no modo leve e relata problemas com Menu > Relatar um problema ou o
  botão Sinalizar, que abrem issues lá até a cópia pública ser aberta ([TESTING.md](./TESTING.md),
  em inglês).
- **O lançamento público** em e-conquest/econquest. O modo leve, as duas revisões de segurança e a
  verificação automática no Windows estão feitos; faltam uma primeira execução por uma pessoa em um
  computador com Windows, uma medição do modo leve e uma última exportação pública.
- **O ponto de controle 1**, cerca de quatro semanas após o lançamento, é a única revisão antes de
  planejar mais trabalho. O uso real decide o que vem depois; nenhum recurso novo é adicionado antes.

**Em espera**

- **Quests na sala de aula**: o plano está completo (13 mudanças pequenas e depois um piloto de um
  semestre com dois professores); a construção começa quando o responsável pelo projeto disser.
- **Árabe e suaíli**: planejados, pausados pelo responsável pelo projeto.
- **O app para celular**: pausado até depois do lançamento.
- **Checagens no computador do responsável**: algumas fontes (clima, trajetórias de tempestades,
  ativos do banco central, financiamento em dólares, o arquivo de regime cambial) estão construídas e
  testadas com respostas salvas, mas não puderam ser alcançadas da máquina de compilação;
  `npm run check:data` num computador que chegue a elas confirma cada uma. As fontes dos cinco perfis de
  usuário responderam lá em 17 de novembro. As taxas de câmbio, taxas básicas e taxas do mercado
  local mensais do FMI responderam lá em 18 e 19 de novembro. As previsões oficiais, as edições em
  tempo real da OCDE e a busca nos catálogos (linhas `wb_gep`, `oecd_eo`, `oecd_rtd` e `catalogues`)
  aguardam o primeiro teste lá. O que aconteceu depois aguarda lá
  seu primeiro teste de alarmes falsos (`npm run synth:validate`). A mesa quantitativa espera um primeiro teste com um servidor
  real de ferramentas de pesquisa, e as surpresas nos dados precisam de algumas semanas de downloads
  diários para se acumular.
