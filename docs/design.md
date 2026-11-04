# Documento de design: The Wolf of Stall Street

> **PT-BR:** _O Lobo do Condado Faria Lima_

## Conceito

Um jogo de investimentos **por turnos** em um reino medieval. Você chega à cidade como
**Servo** com 100 florins e quer chegar a **Conde**. Para isso, compra cotas de guildas,
paga por rumores e informação privilegiada, faz seguro das apostas e deixa o dinheiro
parado render nos Títulos da Coroa.

Pilares:

- **Decisões claras sob informação imperfeita.** O arauto anuncia uma faixa pública, e o
  lado da faixa que é mais provável fica escondido.
- **Informação custa caro e vale a pena.** Especialistas revelam parte da verdade.
- **Pressão constante.** O custo de vida cresce com a classe, e a cada trimestre você pode
  cair, ficar onde está ou subir.
- **Comprar melhores decisões.** Sem melhorias o jogo é difícil; a rentabilidade sobe
  conforme o gestor contrata especialistas melhores.
- **Humor e cerimônia.** Oficiais arrogantes ou bajuladores, festas de fechamento, visitantes.

## Abertura (história e liberação gradual)

O mercado abre aos poucos, contado como história (`state.story`, textos em `src/ui/story.ts`):

1. **Decreto do Rei** (cena ao começar): você é um servo do campo; o Rei permite que o povo
   compre Títulos da Coroa; os vizinhos confiam 100 fl ao seu fundo. **1º trimestre: só
   títulos.** Taverna fechada ("perguntar o quê?"), sem visitantes. É lento de propósito.
2. **Fim do 1º trimestre:** o Meirinho humilha ("Seu servo imprestável… só isso? … trocado").
   Depois, a cena do **influencer Lucrécio Lucrativo** ("Pare de investir só na Coroa! Olha
   esse gráfico! Esse aqui era servo e hoje é Duque só investindo em padarias!"). Libera a
   **Guilda dos Padeiros** e os especialistas.
3. **Fim do 2º trimestre:** Minas e Boticários abrem para o povo.
4. Daí em diante as guildas abrem por classe, como na tabela abaixo.

**Toda guilda nova ganha um vídeo novo do influencer** ("A nova febre: Boticários!"):
ele declara a moda anterior "coisa do passado, até a minha sogra já investe", faz o
discurso da guilda nova (um texto por guilda em `story.ts`) e ganha seguidores a cada vídeo.
As cenas ficam numa fila (`state.story.queue`); cada guilda é anunciada uma vez
(`state.story.announced`), mesmo que você caia e suba de classe de novo.

Cada guilda tem `minChapter` (padrão 1) e `minClass`; as duas precisam ser atendidas.

## Loop de turno (1 turno = 1 semana)

1. **O Arauto** anuncia a **profecia do trimestre** de cada ativo (onde termina o trimestre,
   ex: `-8% a +14%`, e quanto já andou), o "humor da semana" e as notícias.
2. O gestor **consulta especialistas** (opcional, pago do bolso); a resposta vale até o fim do
   trimestre.
3. **Aloca** o fundo entre cotas, cestas e Títulos da Coroa, e liga ou desliga o **seguro**.
4. **Encerrar semana:** o mercado se move (com possíveis choques), os seguros são cobrados,
   os títulos rendem, as taxas vão do fundo para o bolso e o custo de vida sai do bolso.
5. Nas semanas **4 e 8** de cada trimestre chega um **visitante**; na semana **12** há a
   **avaliação de classe** e a festa de fechamento.

## Mecânicas

### A profecia do trimestre (modelo de mercado)

Pedido do dono: o jogo induzia a comprar e vender tudo toda semana, porque cada semana era um
jogo novo. Agora a informação vale o trimestre e segurar ou realizar vira decisão.

- No começo de cada trimestre, cada fator (cidade, bairro, setor, empresa) ganha uma **faixa
  pública** (`QUARTER_WIDTH` × a largura semanal) e um **destino oculto** sorteado dentro dela
  (com a inclinação escondida de sempre).
- Toda semana o fator anda `PULL` (0,5) da distância até o caminho reto rumo ao destino, mais
  um ruído (`WEEKLY_NOISE` × largura). Quem sabe o destino percebe quando o preço **correu na
  frente** (vender e realizar) ou **ficou para trás** (comprar).
- O **humor da semana** do Arauto é calculado só com a faixa pública; pode errar e ser
  ultrapassado. O seguro limita a semana a essa faixa.
- **Notícias** movem o destino (`NEWS_TARGET` 0,4 do efeito por semana) e só um pouco a faixa
  pública (`NEWS_VISIBILITY` 0,25). **Choques** movem tudo (destino, progresso e faixa
  pública), porque todos veem o incêndio.
- O ativo (cesta ou empresa) combina as profecias dos seus fatores com os mesmos pesos dos
  movimentos (`assetProphecy`). O Mercado mostra a faixa do trimestre e "já andou X%"; o
  detalhe mostra a barra com a posição de agora e o palpite do Espião.
- **Corretagem da guilda** (`TRADE_FEE` 0,5%) em cada compra e venda de cestas e empresas
  (não em Títulos nem gestores). Girar a carteira toda semana custa ~1% por volta.

### Você é um fundo de investimentos

O patrimônio é **dinheiro de investidores**: o **fundo**. Você, o gestor, tem o seu
**bolso**, que começa com 10 fl.

- Toda semana o bolso recebe, tirado do fundo:
  - **taxa de administração** = t_a × fundo (0,15%/sem como Servo até 0,30% como Conde);
  - **taxa de performance** = t_p × lucro da semana, só quando há lucro (20% a 30%).
- Do bolso saem: **especialistas**, **melhorias**, **títulos de nobreza** e o **custo de vida**.
- Seguros são custo do fundo.
- A **classe** é medida pelo tamanho do fundo (a fama do gestor).
- **Derrota (masmorra):** já sendo Servo, fechar o trimestre com o fundo abaixo do piso de
  Servo (fundo fechado); ou o bolso sem dinheiro para o custo de vida (dívidas).

Isso impede gastar o patrimônio todo em melhorias no dia 0: elas são compradas com as taxas
que você acumula, e performar bem rende mais taxa de performance.

### Títulos da Coroa (renda fixa)

**Ouro parado não rende.** Para render, o jogador compra Títulos da Coroa no Mercado:

| Título         | Rendimento semanal                            | Liquidez                                                                |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| Coroa (livre)  | taxa da classe: 0,20% (Servo) a 0,50% (Barão) | compra e venda a qualquer momento                                       |
| Coroa (4 sem.) | 2× a taxa da classe, fixa na compra           | preso por 4 semanas; no vencimento volta sozinho para os florins livres |

O título preso conta no patrimônio para a avaliação do trimestre, mas **não** pode ser vendido
para pagar contas nem para comprar um título de nobreza. É a troca entre rendimento e liquidez.

### Guildas, empresas e cestas (ações)

Cada guilda é um **setor** com **3 empresas** de perfis diferentes. O jogador compra:

- a **cesta** da guilda, que move a média das 3 empresas e é mais diversificada; ou
- uma **empresa específica**.

| Guilda      | Setor       | Empresas (estável · segue o setor · arriscada)          | Liberada a partir de |
| ----------- | ----------- | ------------------------------------------------------- | -------------------- |
| Padeiros    | Alimentos   | Padaria Real · Forno do Norte · Padaria do Porto        | Servo, 2º trimestre  |
| Mineiros    | Commodities | Companhia da Serra · Veio de Prata · Mina Funda         | Servo, 3º trimestre  |
| Boticários  | Saúde       | Botica do Mosteiro · Botica Central · Elixir da Fênix   | Servo, 3º trimestre  |
| Cambistas   | Bancos      | Banco da Ponte · Casa Fortuna · Câmbio do Ouro Velho    | Camponês             |
| Mercadores  | Varejo      | Armazém Bom Preço · Sedaria Oriental · Tenda do Mascate | Camponês             |
| Ferreiros   | Indústria   | Forja Real · Martelo de Bronze · Ferraria do Vale       | Artesão              |
| Navegantes  | Navegação   | Barca do Rio · Nau do Levante · Galeão Dourado          | Mercador             |
| Especiarias | Especiarias | Pimenta & Cia · Rota do Açafrão · Canela do Oriente     | Burguês              |

**Movimento semanal de uma empresa** = `sensibilidade (β) × movimento do setor + movimento próprio`.
O movimento do setor e o movimento próprio de cada empresa têm cada um sua previsão. A
cesta move a média das 3 empresas. A faixa anunciada de cada ativo é combinada a partir
dessas previsões.

**Modelo de previsão.** Toda semana, cada setor e cada empresa têm uma faixa pública
`[low, high]`, dividida em 4 faixas iguais, cada uma com uma **probabilidade escondida**.
A faixa pública é centrada em _drift + parte das notícias + ruído_. Um "viés" escondido
(entre -1 e +1) concentra probabilidade em um dos lados. **Só 40% do efeito de uma
notícia aparece na faixa pública; o resto vai para o viés escondido.** Assim a notícia
diz a direção, e o especialista diz a intensidade.

### Compra e venda rápida

Cada linha do Mercado tem atalhos `+5% +10% +50% +Tudo` e `-5% -10% -50% -Tudo`. A base é o
**patrimônio total**: com 2000 fl de patrimônio, `+10%` tenta comprar 200 fl, limitado aos
florins livres; `-10%` tenta vender 200 fl, limitado à posição (zera se for menor).
`+Tudo` usa todos os florins livres; `-Tudo` zera a posição.

### A cidade de Valdouro e seus bairros

A cidade tem um **PIB** e três **bairros**. Cada guilda tem uma empresa em cada bairro.

| Bairro        | Perfil  | Sente a economia da cidade |
| ------------- | ------- | -------------------------- |
| Alto da Coroa | nobre   | pouco (×0,7)               |
| Burgo Velho   | médio   | normal (×1,0)              |
| Ribeira       | humilde | muito (×1,3)               |

**Movimento semanal de uma empresa:**

```
cidade (PIB) × sensibilidade do bairro à cidade
+ setor × sensibilidade da empresa ao setor (β)
+ demanda do bairro × quanto o setor vive da freguesia
+ movimento próprio da empresa
```

Quanto o setor vive da freguesia do bairro: Feira 1,2 · Padeiros 1,1 · Boticários 0,8 ·
Cambistas 0,7 · Ferreiros 0,5 · Especiarias 0,5 · Minas 0,3 · Navegação 0,3.

**Longo e curto prazo.** O PIB segue um **ciclo econômico** lento (dura várias semanas e
aparece como tendência no gráfico). As sensibilidades e as notícias inclinam o resultado
por algumas semanas. Mas cada camada sorteia toda semana dentro da sua faixa, então a
volatilidade de curto prazo nunca some.

**Inferência indireta.** Notícias da cidade e dos bairros aparecem **sem setas**: só a
manchete. Exemplo: "A Coroa dará um saco de moedas às famílias da Ribeira" → demanda da
Ribeira ▲ → empresas da Ribeira, principalmente padaria e feira. Quem lê o Almanaque
faz essa conta antes dos outros.

**Almanaque** (na Praça): descrição da cidade, dos bairros e das guildas, gráficos do PIB
e da demanda de cada bairro, empresas de cada bairro e notícias ativas.

### Investidores: aportes, resgates e propostas

O fundo é dinheiro dos investidores, e eles reagem ao seu desempenho:

- **No fim de cada mês** (a partir do 2º trimestre) calculam o excesso de retorno do mês sobre
  o Título da Coroa e guardam os últimos **3 meses** (`state.monthlyExcess`).
  - **Aporte** (confiança é lenta): só se a **média dos 3 meses** passar de +2 pontos e o mês
    também for positivo: `0,8 × média` % do fundo, no máximo **+12%**.
  - **Resgate** (medo é rápido): basta o mês **ou** a média ficar abaixo de -2 pontos:
    `1,0 × o pior dos dois` % do fundo, no máximo **-15%**.
  - Humor aleatório de ±25% sobre o valor. Resgates vendem posições se faltar ouro livre.
  - **Resgates param 15% acima do piso da classe** (`FLOW_FLOOR_MARGIN`): sem isso, uma
    espiral de saques mandava 1 em 3 jogadores sem informação para a masmorra. A masmorra
    tem de vir do mercado, não dos saques.
- Aportes e resgates **não contam como lucro**: ficam fora da taxa de performance, do
  retorno do trimestre (cerimônia) e da pior semana dos bots. O livro-caixa registra `flows`.
- **Propostas de aporte** (10% de chance por semana, fora das semanas de visitante). Valem até
  o fim da semana: aceitar, recusar ou pensar.

| Investidor         | Aporte    | Origem                                  | Risco (12 semanas)                                         |
| ------------------ | --------- | --------------------------------------- | ---------------------------------------------------------- |
| Capitão da Milícia | 35% fundo | sempre suja                             | 5%/sem. de o Meirinho rastrear: confisca + multa 40% bolso |
| Abade de São Bento | 25% fundo | 40% de chance de ser desvio (escondido) | se for desvio, 5%/sem. de o Bispo tomar o aporte de volta  |
| Viúva do Armador   | 15% fundo | limpa                                   | nenhum                                                     |

O dinheiro aceito conta para a classe e rende taxa de administração. Os bots recusam todas as
propostas.

### Fim da semana: time-lapse

Ao encerrar a semana, antes do relatório, um replay de ~2 s mostra o caminho do fundo na
semana (linha que se desenha) e uma explosão de pixels verdes ou vermelhos, maior quanto
maior o movimento, com os ativos da carteira aparecendo em seguida. Clique ou tecla pula.

### Gestores contratados ("idle")

Na **Carteira → Gestores** você contrata gestores (taxa única do bolso) e entrega parte do
fundo a eles. Cada um investe sozinho toda semana, lendo as previsões com algum erro, e cobra
uma taxa semanal sobre o que gere mais uma parte do ganho. O dinheiro continua no fundo (é uma
posição `mgr.<id>`), conta para a classe e para as suas taxas; entra e sai pelos botões
rápidos. Dispensar devolve tudo como ouro livre.

| Gestor              | Estilo                                   | Classe   | Contratação | Taxa/sem + ganho | Média/sem* | Pior semana* |
| ------------------- | ---------------------------------------- | -------- | ----------- | ---------------- | ---------- | ------------ |
| Frei Prudêncio      | 70% Coroa + 30% na melhor cesta          | Artesão  | 5 fl        | 0,05% + 10%      | 0,6%       | -11%         |
| Dona Ambrosina      | 3 melhores cestas (Coroa se nada presta) | Mercador | 12 fl       | 0,08% + 15%      | 0,8%       | -12%         |
| Rodrigo Rompe-Bolsa | 2 empresas mais promissoras, sem seguro  | Burguês  | 20 fl       | 0,10% + 20%      | 1,3%       | -28%         |

\* medido com 30 partidas × 80 semanas como Burguês; a Coroa rendia 0,4%/sem. Ficam abaixo
de um jogador ativo bem informado: são conveniência, não atalho. Erro de leitura: `noise` em
`MANAGERS` (data.ts); escolhas em `managerPicks` (game.ts).

### Trimestres, meses e visitantes

O jogo anda em **trimestres de 12 semanas**, divididos em **3 meses de 4 semanas**.

- **Fim de cada mês (semanas 4 e 8):** um visitante arma a tenda na praça até o fim da semana.
  - **Mercador Viajante** (3 ofertas, legais, efeito de 4 semanas): Lunetas de Bronze
    (Astróloga +10 pontos), Mapa dos Atalhos (avisa choques), Selo dos Seguradores (seguro
    grátis), Pena Afiada (perguntas pela metade) e Amuleto da Sorte (choques ruins pela metade).
  - **Contrabandista** (2 ofertas, fortes e ilegais): Livro-Caixa Roubado (Espião exato por
    4 semanas; 30% de ser pego: metade do bolso), Sussurro da Corte (taxa de performance em
    dobro até o fim do trimestre; 35%: o fundo perde 8%) e Balança Viciada (+3% no fundo na
    hora; 40%: multa de 6% do fundo e metade do bolso). A chance de ser pego é sorteada quando
    o efeito acaba.
- **Fim do trimestre (semana 12):** avaliação de classe e a festa de fechamento.

### Avaliação do trimestre (festa de fechamento)

Uma tela cheia com a festa do fechamento em pixel art, que cresce com a classe: Jantar
Modesto (Servo), Ceia na Taverna, Banquete da Guilda, Festim dos Mercadores, Sarau do Burgo,
Festa no Castelo, Grande Banquete do Barão e Baile de Gala do Conde (lustres, dançarinos,
músicos e fogos). Trimestre ruim deixa a sala escura e chuvosa; trimestre bom joga confete.
Primeiro o oficial discursa (caixa de diálogo); depois vêm os números do trimestre: fundo,
bolso, semanas no azul, gráfico, destaque e decepção, e o veredito.

### Avaliação do oficial

Quem discursa na festa muda com a sua classe, e o tom muda com o resultado: triste (caiu de
classe ou o fundo perdeu mais de 6% no trimestre), feliz (pode subir ou ganhou mais de 15%)
ou neutro. Cada combinação tem 2 frases que se alternam.

| Classe              | Quem fala              | Tom                                                             |
| ------------------- | ---------------------- | --------------------------------------------------------------- |
| Servo, Camponês     | o Meirinho             | arrogante, olhando o plebeu de cima, mesmo quando você vai bem  |
| Artesão a Burguês   | o Escrivão da Guilda   | formal                                                          |
| Cavaleiro em diante | o Camareiro do Castelo | bajulador: mesmo na derrota, deseja "que os bons tempos voltem" |

### Carteira (Casa de Contas)

Um local próprio com duas visões:

- **Posição de hoje:** patrimônio, quanto está em cotas e quanto está livre, ganho em aberto,
  barra de distribuição e uma tabela por ativo (valor, custo, ganho em fl e %, peso, faixa
  da semana, seguro). O custo de uma posição cai na mesma proporção quando se vende parte dela.
- **Rentabilidade:** rentabilidade desde o início e nas últimas 4 semanas, melhor e pior
  semana, gráfico do patrimônio, ranking de quanto cada ativo já rendeu e o livro-caixa semana
  a semana (cotas, títulos da Coroa, seguros, custo de vida e outros gastos, como especialistas
  e títulos de nobreza).

### Notícias

- **Do reino**, que afetam setores: Guerra (Ferreiros ▲, Mercadores ▼), Peste (Boticários ▲),
  Dragão nas Minas, Retorno da Frota, Moeda Raspada… Até 2 ativas, com 30% de chance por semana.
- **De empresas**, que afetam uma empresa só: "Nobres se mudaram para perto do Forno do Norte",
  "Piratas atacaram a Nau do Levante". Até 3 ativas, com 40% de chance por semana, duram 1 a 3 semanas.

### Especialistas (falíveis)

|              | Custo                                | O que diz                                                                                                      | Base   |
| ------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------ |
| 🍺 Bêbado    | 0,05 fl por bebida, até 3 por semana | uma **fofoca verdadeira** e difícil de ler, ou **bobagem** (50% como aprendiz, 10% treinado)                   | sempre |
| 🔮 Astróloga | 0,01 + 0,01% do fundo, do seu bolso  | se o trimestre termina acima ou abaixo do meio da profecia, **60%** de acerto                                  | sempre |
| 🕵️ Espião    | 0,04 + 0,05% do patrimônio           | uma **estimativa** de onde o ativo termina o trimestre, faixa por faixa, com erro e às vezes **furo plantado** | sempre |

**O Bêbado nunca mente.** Ideia do dono: materializar a sensação de falar com um bêbado.
Cada bebida (um único botão, sem escolher o assunto) compra uma fofoca sobre uma das empresas
cujo destino do trimestre está mais longe do meio da faixa pública (pelo menos 3 pontos),
ou só bobagem ("minha filha foi cantar na escola hoje"). A fofoca fala da **causa**, não do
efeito ("O grão de trigo tá vindo meio esquisito" = Padarias para baixo); o jogador interpreta.
O treino (Banho e Sopa, 4 níveis) acrescenta pistas, e vale também para fofocas antigas:

| Patente            | O que aparece na mesma frase                                 | Bobagem |
| ------------------ | ------------------------------------------------------------ | ------- |
| Bêbado da Taverna  | só a frase                                                   | 50%     |
| Bêbado de Meio-Dia | ícone da guilda + o bairro dito na frase                     | 40%     |
| Bêbado Remediado   | + selo do bairro                                             | 30%     |
| Quase Sóbrio       | + seta ▲/▼ junto ao ícone                                    | 20%     |
| Ex-Bêbado          | o selo do bairro vira o nome da empresa (e aparece no ativo) | 10%     |

Frases por setor e direção em `DRUNK_RUMORS` (data.ts), bobagens em `DRUNK_RAMBLES`.

Cada pergunta à Astróloga e ao Espião é sobre o **PIB da cidade**, um **bairro**, uma **cesta** ou uma **empresa**
(o ativo inteiro, como é negociado) e fala de **onde termina o trimestre**. A resposta vale
até o fim do trimestre; dá para **perguntar de novo** (pagando de novo) quando notícias mudam
o quadro. A resposta é lida em relação à faixa pública: se a faixa andou desde então (um
incêndio), o palpite anda junto. O Espião aprendiz erra mais e planta furos (15%).

### Patentes dos especialistas (árvores)

Todos têm **5 patentes**, e cada um cresce de um jeito (pedido do dono: o jogador tende a
focar em um só). O **primeiro ajudante que você treinar vira seu confidente**: o treino dele
custa a metade (`CONFIDANT_DISCOUNT`).

| Patente | 🍺 Bêbado (Banho e Sopa: 1·3·6·12)                                                               | 🔮 Astróloga (Telescópio: 3·8·15·25)                | 🕵️ Espião (Veterano: 6·15·25·40)                                              |
| ------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0       | Bêbado da Taverna: a fofoca vem enterrada em 3 frases de enrolação antes e 2 depois; bobagem 50% | Aprendiz: 1 astro (☉), 60%                          | Aprendiz: palpite do ativo, erro grande, 15% de furos                         |
| 1       | de Meio-Dia: enrola menos (2+1); ícone da guilda e o bairro na frase; bobagem 40%                | Formada: 3 astros, 62% cada (votação "2 de 3 alta") | Júnior: erro menor, 8% de furos                                               |
| 2       | Remediado: 1 frase de enrolação; selo do bairro; 30%                                             | da Corte: 66% cada                                  | Analista: **análise completa** (economia + setor + bairro + a empresa em si)  |
| 3       | Quase Sóbrio: só a fofoca, em destaque; seta ▲/▼; 20%                                            | Grã-Astróloga: 5 astros                             | Experiente: **relatório da guilda** (a cesta traz as 3 empresas); 2% de furos |
| 4       | Ex-Bêbado: o nome da empresa; 10%                                                                | Oráculo de Valdouro: 70% cada e **mapa da guilda**  | Mestre: quase não erra, 1% de furos                                           |

O treino do Bêbado vale também para o que ele já disse. As frases de enrolação estão em
`DRUNK_FILLER`, os astros em `ASTROS` (data.ts).

### Melhorias (perks)

A diversão vem de comprar melhores decisões. Sem melhorias, a informação ajuda pouco;
com elas, a rentabilidade sobe de verdade. Compradas na Taverna, aba "Contratar melhorias".

| Melhoria                    | Níveis (custo do bolso · classe mínima)    | Efeito                                                                |
| --------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Banho e Sopa para o Bêbado  | 1 · Servo / 3 · Camponês                   | Bêbado acerta 50% → 55% → 60%                                         |
| Telescópio da Astróloga     | 3 · Servo / 8 · Camponês                   | Astróloga acerta 60% → 68% → 75%                                      |
| Espião Veterano             | 6 · Camponês / 15 · Artesão / 35 · Burguês | erro do Espião cai muito; furos plantados 25% → 12% → 5% → 1%         |
| Rede de Informantes         | 15 · Artesão                               | avisa (⚠) quais empresas estão com risco alto de choque na semana     |
| Contrato com os Seguradores | 8 · Camponês                               | seguro 40% mais barato                                                |
| Cronista                    | 10 · Artesão                               | mostra os pesos de cidade, setor e bairro na previsão de cada empresa |
| Livro-caixa do Escriba      | 4 · Servo                                  | gráficos com 40 semanas (antes 8)                                     |
| Amigo do Tesoureiro         | 20 · Mercador                              | Títulos da Coroa rendem 50% a mais                                    |

### Choques

Toda semana, cada empresa tem uma pequena chance (2%, ou 12% em semanas de risco alto) de
um **choque fora da faixa anunciada**: incêndio, escândalo, roubo (-14% a -28%) ou, mais
raramente, um golpe de sorte (+12% a +22%). O **seguro protege também dos choques**, pois
limita o resultado à faixa segurada. A Rede de Informantes avisa as semanas de risco alto.

### Seguro (hedge)

Para qualquer posição (cesta ou empresa), o jogador pode contratar seguro da Guilda dos Seguradores: a faixa de
resultado encolhe 1/4 da largura de cada lado (`[-3, +5]` vira `[-1, +3]`). O prêmio é
cobrado toda semana, de 1,0% (Servo) a 0,4% (Barão) do valor segurado.

### Escada social e avaliação por trimestre

`Servo → Camponês → Artesão → Mercador → Burguês → Cavaleiro → Barão → Conde 👑`

| Classe    | Piso | Teto | Título seguinte (bolso) | Custo de vida/sem | Adm./sem | Performance |
| --------- | ---- | ---- | ----------------------- | ----------------- | -------- | ----------- |
| Servo     | 60   | 125  | 3                       | 0,12              | 0,15%    | 20%         |
| Camponês  | 112  | 155  | 4                       | 0,18              | 0,17%    | 21%         |
| Artesão   | 140  | 195  | 6                       | 0,25              | 0,19%    | 22%         |
| Mercador  | 175  | 245  | 8                       | 0,35              | 0,21%    | 23%         |
| Burguês   | 220  | 305  | 10                      | 0,45              | 0,23%    | 24%         |
| Cavaleiro | 275  | 380  | 13                      | 0,60              | 0,25%    | 25%         |
| Barão     | 345  | 475  | 17                      | 0,80              | 0,28%    | 27%         |
| Conde     | —    | —    | —                       | 0                 | 0,30%    | 30%         |

Cada classe tem **piso** e **teto** do fundo. A cada **12 semanas** o fundo é comparado com eles:

- **L1 (abaixo do piso):** cai **quantas classes forem precisas** até o fundo caber no piso.
  Quem **já era Servo** e fecha abaixo do piso vai para a **masmorra** (game over). Quem cai de
  uma classe mais alta para em Servo mesmo abaixo do piso, com um **último aviso**: mais um
  trimestre assim e é masmorra. Perder exige erros repetidos, não um trimestre ruim.
- **L2 (entre os dois):** mantém a classe.
- **L3 (acima do teto):** o camareiro oferece **um título por teto ultrapassado** (fundo acima
  dos tetos de Servo e Camponês = 2 títulos). Você escolhe até onde subir, pagando a soma dos
  títulos; vale até o fim da semana.

O título é pago do bolso, então comprá-lo não reduz o fundo; o teto de cada classe fica
acima do piso da seguinte.

**Regalias por classe:** guildas novas, especialistas, juros maiores nos Títulos e seguros
mais baratos. **Vitória:** virar Conde. A pontuação é o número de semanas.

Se faltar dinheiro livre no fundo para as taxas, cotas são vendidas proporcionalmente. Se o
bolso não paga o custo de vida, masmorra.

## Balanceamento

`src/sim/bots.ts` tem jogadores automáticos que só usam o que um jogador vê (faixas públicas
e respostas dos especialistas, com erro). `src/sim/balance.test.ts` garante que:

- só renda fixa não paga o custo de vida (nunca vence);
- informação vence o chute, e melhorias vencem a informação crua;
- com melhorias há menos quedas de classe, mas ainda há semanas de -10% ou pior;
- chutar não é um caminho confiável para a nobreza.

Referência (60 partidas, limite de 300 semanas, trimestres de 12 semanas, com a abertura
gradual):

| Bot                   | Vence    | Semanas até Conde | Quedas de classe  | Pior semana |
| --------------------- | -------- | ----------------- | ----------------- | ----------- |
| Só títulos            | 0        | —                 | —                 | —           |
| Sem informação        | 33 de 60 | ~199              | 0,3 (7 masmorras) | -14%        |
| Espião sem melhorias  | 59 de 60 | ~155              | 0,2 (nenhuma)     | -13%        |
| Espião com melhorias  | 60 de 60 | ~128              | 0,02 (nenhuma)    | -11%        |
| Oráculo (diagnóstico) | 60 de 60 | ~88               | 0                 | -11%        |

Leitor perfeito do Bêbado (bot `drunk`, 60 partidas): interpreta cada pista certo; como
aprendiz aposta na cesta da guilda, depois na empresa. Treinando o Bêbado: 58 de 60 vitórias,
~150 semanas, 1 masmorra. Sem treinar (`drunkRookie`): 55 de 60, ~163 semanas, 3 masmorras.
A fofoca típica aponta um destino ~11 pontos longe do meio da faixa pública.

Metas escolhidas por Claude (o dono delegou a dificuldade): quem chuta vai para a masmorra em
~10% das partidas; quem se informa, nunca; o melhor jogador chega em ~100 semanas (sobe
várias classes num trimestre bom). Versões anteriores: ~135 (abertura) e ~121 (aportes por mês). Antes da
abertura gradual o melhor bot levava ~118 semanas. Os bots ainda não compram itens
dos visitantes. O mínimo possível hoje é 96 semanas (1 trimestre só de títulos + 7
promoções).

Com a profecia do trimestre (v0.16) o Espião mestre chega perto do oráculo, e quem não
pergunta fica bem atrás. O bot **oráculo** (`'oracle'`) conhece todos os destinos: é o teto do
que a informação pode render, para diagnóstico. Os bots seguram posições enquanto ainda valem
a corretagem e repetem perguntas com mais de 4 semanas.

Alavancas principais: `PULL`, `QUARTER_WIDTH`, `WEEKLY_NOISE`, `NEWS_TARGET`,
`NEWS_VISIBILITY`, `DRIFT_SCALE` (1,0) em `forecast.ts`; `TRADE_FEE`, `FLOW_FLOOR_MARGIN`
(1,3), ruído e furos do Espião, choques e preços das melhorias em `data.ts`.

## Ideias para depois

- **Aportes e resgates de investidores** conforme o desempenho do trimestre.
- **Promoção dupla** num trimestre excepcional (o fundo passa de dois tetos).
- **Tutorial / primeiro trimestre guiado** pelo Meirinho.
- **Dilemas no meio do jogo:** empréstimo forçado do Rei, fundo rival, cotas com desconto.

- **Fase 2: etiquetas de empresa e analistas contratáveis.** Cada empresa ganha
  características (atendimento, equipamento, fornecedores, reputação…). Algumas notícias
  acertam empresas por etiqueta ("Fiscais inspecionam fornos antigos"). As etiquetas
  começam escondidas e são reveladas contratando analistas, como um **analista de
  atendimento ao cliente** que avalia as empresas nesse quesito.
- 🧪 **Alquimista**: revela correlações entre setores.
- 🧑‍🏫 **Coach de mercadores** na taverna, que vende cursos de enriquecimento (palpites ruins, muito meme).
- **Calote da Coroa** em tempos de guerra (risco na renda fixa).
- **Empréstimos/alavancagem** com agiotas.
- **Prazo do Rei** (modo desafio: vire Conde em N semanas).
- Progressão entre runs: especialistas e guildas desbloqueáveis.
- Animações (dados e moedas), sons, arte própria.
- i18n (EN/PT-BR) e deploy no GitHub Pages.
