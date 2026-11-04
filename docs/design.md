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
3. **Fim do 2º trimestre:** Minas e Boticários abrem para o povo (mensagem nas notícias).
4. Daí em diante as guildas abrem por classe, como na tabela abaixo.

Cada guilda tem `minChapter` (padrão 1) e `minClass`; as duas precisam ser atendidas.

## Loop de turno (1 turno = 1 semana)

1. **O Arauto** anuncia a faixa de variação esperada de cada ativo (ex: `-3% a +5%`) e as
   notícias do reino, da cidade, dos bairros e das empresas.
2. O gestor **consulta especialistas** (opcional, pago do bolso).
3. **Aloca** o fundo entre cotas, cestas e Títulos da Coroa, e liga ou desliga o **seguro**.
4. **Encerrar semana:** o mercado se move (com possíveis choques), os seguros são cobrados,
   os títulos rendem, as taxas vão do fundo para o bolso e o custo de vida sai do bolso.
5. Nas semanas **4 e 8** de cada trimestre chega um **visitante**; na semana **12** há a
   **avaliação de classe** e a festa de fechamento.

## Mecânicas

### Você é um fundo de investimentos

O patrimônio é **dinheiro de investidores**: o **fundo**. Você, o gestor, tem o seu
**bolso**, que começa com 10 fl.

- Toda semana o bolso recebe, tirado do fundo:
  - **taxa de administração** = t_a × fundo (0,15%/sem como Servo até 0,30% como Conde);
  - **taxa de performance** = t_p × lucro da semana, só quando há lucro (20% a 30%).
- Do bolso saem: **especialistas**, **melhorias**, **títulos de nobreza** e o **custo de vida**.
- Seguros são custo do fundo.
- A **classe** é medida pelo tamanho do fundo (a fama do gestor).
- **Derrota:** fundo abaixo do piso de Servo no fim do trimestre (fundo fechado), ou bolso sem
  dinheiro para o custo de vida (masmorra por dívidas).

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

|              | Custo por pergunta                  | O que diz                                                                                                   | Base   |
| ------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| 🍺 Bêbado    | grátis                              | alta ou baixa, 50% de acerto (puro meme)                                                                    | sempre |
| 🔮 Astróloga | 0,01 + 0,01% do fundo, do seu bolso | alta ou baixa, **60%** de acerto                                                                            | sempre |
| 🕵️ Espião    | 0,04 + 0,05% do patrimônio          | uma **estimativa** da chance de cada faixa, com erro, e às vezes um **furo plantado** (o oposto da verdade) | sempre |

Cada pergunta é sobre o **PIB da cidade**, um **bairro**, um **setor** ou uma **empresa**.
O Espião mostra um selo de confiança (baixa, média, alta) conforme o nível do Espião
Veterano. O selo diz quão bom ele é, não se aquela resposta está certa.

### Patentes dos especialistas

Cada especialista tem uma patente, que sobe com a melhoria que o treina. A patente aparece
no cartão (com estrelas) e em cada resposta, e o retrato fica mais caprichado a cada nível.

| Especialista             | Patentes                                               | Retrato                                                                             |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Bêbado (Banho e Sopa)    | Bêbado da Taverna → Bêbado Remediado → Ex-Bêbado       | caneca suja → caneca limpa → copo de leite                                          |
| Astróloga (Telescópio)   | Astróloga Aprendiz → Astróloga Formada → Grã-Astróloga | bola rachada → bola limpa → suporte de ouro e brilhos                               |
| Espião (Espião Veterano) | Espião Aprendiz → Júnior → Experiente → Mestre Espião  | capuz remendado → capa azul → capa roxa com ouro → máscara dourada e lenço vermelho |

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

- **L1 (abaixo do piso):** cai uma classe. Servo abaixo do piso vai para a **masmorra** (game over).
- **L2 (entre os dois):** mantém a classe.
- **L3 (acima do teto):** o camareiro oferece o próximo título, que deve ser pago até o fim da semana.

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

| Bot                  | Vence    | Semanas até Conde | Quedas de classe | Pior semana |
| -------------------- | -------- | ----------------- | ---------------- | ----------- |
| Só títulos           | 0        | —                 | —                | —           |
| Sem informação       | 37 de 60 | ~220              | 1,1              | -17%        |
| Espião sem melhorias | 59 de 60 | ~165              | 0,12             | -17%        |
| Espião com melhorias | 60 de 60 | ~135              | 0                | -13%        |

Antes da abertura gradual o melhor bot levava ~118 semanas. Os bots ainda não compram itens
dos visitantes. O mínimo possível hoje é 96 semanas (1 trimestre só de títulos + 7
promoções).

Alavancas principais: `DRIFT_SCALE`, `CENTER_NOISE`, `NEWS_VISIBILITY`, `NEWS_LEAN` e
`LEAN_SHARPNESS` em `forecast.ts`; ruído do Espião, choques e preços das melhorias em `data.ts`.

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
