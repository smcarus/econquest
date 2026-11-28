# Desafio de replicação de Bohn (1998)

**Idiomas:** [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · Português

Esta pasta acompanha a Quest **"Reproduza a estimativa de reação fiscal de Bohn para o Brasil"** (`bra-bohn-replication`). Você reconstrói um número que o aplicativo mostra, com seu próprio código, a partir dos mesmos dados públicos. Se muita gente chegar ao mesmo número, os leitores podem confiar no aplicativo. Se um script cuidadoso chegar a outro número, o aplicativo pode estar errado, e isso também resolve a Quest.

## A ideia em palavras simples

Em 1998, Henning Bohn fez uma pergunta simples sobre os Estados Unidos: quando a dívida pública está alta, o governo faz superávits orçamentários maiores (antes dos juros) no ano seguinte? Se faz, a dívida tende a cair com o tempo. Uma reação positiva indica que, nos anos estudados, a dívida foi mantida numa trajetória sustentável. Não encontrar reação não prova que a dívida seja insustentável; só significa que o histórico não dá essa garantia.

O aplicativo faz a mesma pergunta para qualquer país com histórico suficiente no FMI. Nesta Quest o país é o Brasil.

A equação é:

    resultado primário(t) = a + rho × dívida(t−1) + gamma × hiato do produto(t) + erro

- **resultado primário**: o saldo do orçamento do governo antes do pagamento de juros, em % do PIB (Monitor Fiscal do FMI).
- **dívida(t−1)**: a dívida pública no fim do ano anterior, em % do PIB (Perspectivas da Economia Mundial do FMI).
- **hiato do produto**: quanto a economia está acima ou abaixo do seu nível normal, pela estimativa do próprio aplicativo. Retira o efeito dos anos bons e ruins. Quando o hiato não cobre anos suficientes, o aplicativo o deixa de fora e avisa.
- **rho** é o número que você reproduz: quanto o resultado primário sobe, em pontos do PIB, para cada ponto a mais de dívida.

## Passos

1. **Pegue os dados.** No aplicativo, abra **Pesquisa**, escolha o Brasil, depois **Histórico e dados** e então o painel **Reação fiscal**. Clique em **Baixar estas linhas (CSV)**. O arquivo `bohn-bra.csv` traz cada ano que o aplicativo usou, as três colunas acima e o método que o aplicativo informa (fontes, anos da amostra, configurações). Com o aplicativo rodando, você também pode lê-lo direto em `http://localhost:3000/api/bohn/BRA.csv`.
2. **Abra um script inicial.** Escolha `bohn_starter.R`, `bohn_starter.py` ou `bohn_starter.do`. Cada um carrega o arquivo, mostra as linhas e diz se o hiato do produto está incluído. Nenhum roda a regressão: essa parte é sua.
3. **Escreva a estimativa.** Mínimos quadrados ordinários com constante, resultado primário sobre a dívida do ano anterior (e o hiato do produto quando estiver incluído), usando todas as linhas do arquivo. Informe o coeficiente da dívida com três casas decimais.
4. **Opcional: erros-padrão.** O aplicativo usa erros-padrão de Newey-West com defasagem floor(4 × (n/100)^(2/9)), no mínimo 1. Eles não mudam rho, só o grau de certeza sobre ele.
5. **Publique seu script** onde qualquer pessoa possa ler (um repositório ou gist do GitHub; o link começa com https://).
6. **Participe** em Menu > Quests: abra a Quest e escolha Registrar em particular (só neste computador) ou Preparar resposta pública (um pull request no GitHub). Informe seu número, o link para o script e, se quiser, uma nota: qual edição dos dados você usou e qualquer diferença que encontrou.

## Como é resolvida

Depois que as respostas fecham, o responsável abre o mesmo painel com as configurações que a Quest indica e registra o número que o aplicativo mostra. Uma resposta dentro da tolerância da Quest o reproduz. Uma resposta diferente não está "errada": se as notas mostrarem que o aplicativo errou, o responsável registra isso, prepara uma correção e essa resposta resolve a Quest. As replicações aparecem nas páginas dos participantes e nunca são classificadas.

## Pontos de atenção

- O FMI revisa seu histórico a cada edição do WEO. Use o arquivo que o aplicativo fornece e diga qual edição é (a coluna do método informa).
- Os anos que o FMI marca como projeções ficam de fora; só são usados dados observados.
- O artigo de Bohn usou dados dos Estados Unidos de 1916 a 1995 e controles extras para gastos em tempo de guerra. Esta Quest reproduz a versão do teste do aplicativo com os dados do FMI para o Brasil, não a tabela do artigo.

## Leituras

- Bohn, H. (1998), "The Behavior of U.S. Public Debt and Deficits", *Quarterly Journal of Economics* 113(3), 949-963.
- Mendoza, E. G. e Ostry, J. D. (2008), "International evidence on fiscal solvency: Is fiscal policy 'responsible'?", *Journal of Monetary Economics* 55(6), 1081-1093.
- Newey, W. K. e West, K. D. (1987), "A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix", *Econometrica* 55(3), 703-708.

Este guia e os scripts iniciais estão sob a licença CC BY 4.0, como o resto de `quests/`.
