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

### Guildas (ações)

| Guilda                    | Setor       | Volatilidade | Liberada a partir de |
| ------------------------- | ----------- | ------------ | -------------------- |
| 🍞 Guilda dos Padeiros    | Alimentos   | baixa        | Servo                |
| ⛏️ Minas de Ferro         | Commodities | média        | Servo                |
| 🧪 Boticários             | Saúde       | baixa/média  | Servo                |
| 🪙 Casa dos Cambistas     | Bancos      | média        | Camponês             |
| 🎪 Feira dos Mercadores   | Varejo      | média/alta   | Camponês             |
| ⚒️ Forja Real             | Indústria   | alta         | Artesão              |
| ⛵ Companhia de Navegação | Navegação   | muito alta   | Mercador             |
| 🌶️ Mercado de Especiarias | Especiarias | absurda      | Burguês              |

**Modelo de previsão.** Cada semana, cada guilda tem uma faixa pública `[low, high]`,
dividida em 4 faixas iguais, cada uma com uma **probabilidade escondida**. A faixa pública
é centrada em _drift da guilda + efeito dos eventos + ruído_. Um "viés" escondido
(entre -1 e +1, também puxado pelos eventos) concentra probabilidade em um dos lados. O
resultado sorteia uma faixa pelo peso e depois um ponto uniforme dentro dela.

### Especialistas

|                      | Custo                     | O que revela                                             | Classe   |
| -------------------- | ------------------------- | -------------------------------------------------------- | -------- |
| 🍺 Bêbado da Taverna | grátis                    | alta ou baixa, com 50% de acerto (puro ruído, e um meme) | Servo    |
| 🔮 Astróloga         | 0,1 + 0,05% do patrimônio | alta ou baixa, com 75% de acerto                         | Servo    |
| 🕵️ Espião            | 0,3 + 0,2% do patrimônio  | a probabilidade real de cada uma das 4 faixas            | Camponês |

### Seguro (hedge)

Para uma posição, o jogador pode contratar seguro da Guilda dos Seguradores: a faixa de
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

### Eventos do reino

Até 2 ativos ao mesmo tempo, com 30% de chance de surgir um por semana. Cada evento desloca
as faixas de alguns setores e o viés escondido. Exemplos: Guerra (Forja ▲, Feira ▼), Peste
(Boticários ▲), Dragão nas Minas (Minas ▼▼), Retorno da Frota (Especiarias ▲), Moeda
Raspada (Cambistas ▼).

## Balanceamento

`src/sim/bots.ts` tem três jogadores automáticos, e `src/sim/balance.test.ts` garante que:

- pagar por informação faz subir mais rápido (`naive` > `astrologer` > `spy` em semanas);
- uma run bem informada dura entre 40 e 90 semanas.

Referência atual (60 seeds): naive ~128 semanas, astróloga ~80, espião ~68.

## Ideias para depois

- 🧪 **Alquimista**: revela correlações entre setores.
- 🧑‍🏫 **Coach de mercadores** na taverna, que vende cursos de enriquecimento (palpites ruins, muito meme).
- **Calote da Coroa** em tempos de guerra (risco na renda fixa).
- **Empréstimos/alavancagem** com agiotas.
- **Prazo do Rei** (modo desafio: vire Conde em N semanas).
- Progressão entre runs: especialistas e guildas desbloqueáveis.
- Animações (dados e moedas), sons, arte própria.
- i18n (EN/PT-BR) e deploy no GitHub Pages.
