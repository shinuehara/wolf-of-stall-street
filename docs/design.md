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
- **Pressão constante.** O custo de vida cresce com a classe, e a cada estação você pode
  cair, ficar onde está ou subir.
- **Runs curtas e com humor.** Bom jogador: ~60 a 70 semanas (cliques rápidos).

## Loop de turno (1 turno = 1 semana)

1. **O Arauto** anuncia, para cada guilda, a faixa de variação esperada (ex: `-3% a +5%`)
   e os eventos do reino.
2. O jogador **consulta especialistas** (opcional, pago).
3. **Aloca** florins entre guildas e liga ou desliga o **seguro** de cada posição.
4. **Encerrar semana:** o mercado se move, os seguros são cobrados, o dinheiro livre rende,
   o custo de vida é pago.
5. A cada **4 semanas (uma estação)** acontece a **avaliação de classe**.

## Mecânicas

### Títulos da Coroa (renda fixa)

Todo florim livre (não investido em guildas) rende automaticamente uma taxa semanal baixa
(0,20% para Servo até 0,50% para Barão).

### Guildas, empresas e cestas (ações)

Cada guilda é um **setor** com **3 empresas** de perfis diferentes. O jogador compra:

- a **cesta** da guilda, que move a média das 3 empresas e é mais diversificada; ou
- uma **empresa específica**.

| Guilda      | Setor       | Empresas (estável · segue o setor · arriscada)          | Liberada a partir de |
| ----------- | ----------- | ------------------------------------------------------- | -------------------- |
| Padeiros    | Alimentos   | Padaria Real · Forno do Norte · Padaria do Porto        | Servo                |
| Mineiros    | Commodities | Companhia da Serra · Veio de Prata · Mina Funda         | Servo                |
| Boticários  | Saúde       | Botica do Mosteiro · Botica Central · Elixir da Fênix   | Servo                |
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

### Notícias

- **Do reino**, que afetam setores: Guerra (Ferreiros ▲, Mercadores ▼), Peste (Boticários ▲),
  Dragão nas Minas, Retorno da Frota, Moeda Raspada… Até 2 ativas, com 30% de chance por semana.
- **De empresas**, que afetam uma empresa só: "Nobres se mudaram para perto do Forno do Norte",
  "Piratas atacaram a Nau do Levante". Até 3 ativas, com 40% de chance por semana, duram 1 a 3 semanas.

### Especialistas

|                      | Custo                      | O que revela                                             | Classe   |
| -------------------- | -------------------------- | -------------------------------------------------------- | -------- |
| 🍺 Bêbado da Taverna | grátis                     | alta ou baixa, com 50% de acerto (puro ruído, e um meme) | Servo    |
| 🔮 Astróloga         | 0,05 + 0,03% do patrimônio | alta ou baixa, com 75% de acerto                         | Servo    |
| 🕵️ Espião            | 0,15 + 0,1% do patrimônio  | a probabilidade real de cada uma das 4 faixas            | Camponês |

Cada pergunta é sobre um **setor** (a guilda inteira) ou uma **empresa** (só o movimento próprio dela).

### Seguro (hedge)

Para qualquer posição (cesta ou empresa), o jogador pode contratar seguro da Guilda dos Seguradores: a faixa de
resultado encolhe 1/4 da largura de cada lado (`[-3, +5]` vira `[-1, +3]`). O prêmio é
cobrado toda semana, de 1,0% (Servo) a 0,4% (Barão) do valor segurado.

### Escada social e avaliação por estação

`Servo → Camponês → Artesão → Mercador → Burguês → Cavaleiro → Barão → Conde 👑`

Cada classe tem **piso**, **teto**, **custo de vida** semanal e **taxa de ascensão**. A cada
4 semanas o patrimônio é comparado com o piso e o teto:

- **L1 (abaixo do piso):** cai uma classe. Servo abaixo do piso vai para a **masmorra** (game over).
- **L2 (entre os dois):** mantém a classe.
- **L3 (acima do teto):** o camareiro oferece o próximo título, que deve ser pago até o fim da semana.

O teto menos a taxa sempre cai acima do piso da classe seguinte, então comprar um título
não derruba o jogador imediatamente, mas deixa pouca margem.

**Regalias por classe:** guildas novas, especialistas, juros maiores nos Títulos e seguros
mais baratos. **Vitória:** virar Conde. A pontuação é o número de semanas.

Se faltar dinheiro vivo para pagar as contas, cotas são vendidas proporcionalmente. Sem
patrimônio, masmorra.

## Balanceamento

`src/sim/bots.ts` tem três jogadores automáticos, e `src/sim/balance.test.ts` garante que:

- pagar por informação faz subir mais rápido (`naive` > `astrologer` > `spy` em semanas);
- uma run bem informada dura entre 40 e 90 semanas.

Referência atual (60 seeds): naive ~92 semanas, astróloga ~70, espião ~62.

## Ideias para depois

- 📚 **Perk "Livro-caixa do Escriba"** (comprável): hoje o jogo começa com 26 semanas de
  histórico simulado nos gráficos. No futuro, o histórico visível pode ser curto por padrão
  (ex: 8 semanas) e o perk amplia para meses ou anos, ajudando a ler a tendência de cada empresa.

- 🧪 **Alquimista**: revela correlações entre setores.
- 🧑‍🏫 **Coach de mercadores** na taverna, que vende cursos de enriquecimento (palpites ruins, muito meme).
- **Calote da Coroa** em tempos de guerra (risco na renda fixa).
- **Empréstimos/alavancagem** com agiotas.
- **Prazo do Rei** (modo desafio: vire Conde em N semanas).
- Progressão entre runs: especialistas e guildas desbloqueáveis.
- Animações (dados e moedas), sons, arte própria.
- i18n (EN/PT-BR) e deploy no GitHub Pages.
