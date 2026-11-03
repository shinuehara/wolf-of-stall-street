# 🐺 The Wolf of Stall Street

_O Lobo do Condado Faria Lima_

Um jogo medieval de investimentos por turnos. Você chega à cidade como **Servo**, com
100 florins, e quer virar **Conde**. Para isso, compre cotas de guildas, pague por rumores
e informação privilegiada, faça seguro das apostas e não deixe o custo de vida te mandar
para a masmorra.

_A turn-based medieval investing game: climb from Serf to Count by trading guild shares,
buying rumors and insuring your bets._

## Como jogar

- **📯 O Arauto** anuncia toda semana a faixa de variação esperada de cada guilda (ex: `-3% a +5%`).
- **Especialistas** dizem para que lado a faixa pende: 🍺 o Bêbado (grátis e pouco confiável),
  🔮 a Astróloga (acerta 3 em 4) e 🕵️ o Espião (mostra a chance real de cada faixa).
- **Compre e venda** cotas das guildas. Florins livres rendem nos **Títulos da Coroa**.
- **🛡️ Seguro:** pague um prêmio semanal para estreitar a faixa de uma posição (`[-3, +5]` vira `[-1, +3]`).
- **A cada 4 semanas**, seu patrimônio é avaliado: abaixo do piso você **cai de classe**, entre
  o piso e o teto você **se mantém**, e acima do teto pode **comprar o próximo título**.
- Classes mais altas liberam guildas, especialistas e juros melhores, mas custam mais para manter.

Detalhes no [documento de design](docs/design.md).

## Desenvolvimento

Requer Node 20+.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

### Estrutura

```
src/
  sim/        # simulação pura (sem DOM), determinística por seed
    data.ts       # classes, guildas, eventos, especialistas (números de balanceamento)
    forecast.ts   # modelo de previsão em faixas, seguro, eventos
    game.ts       # estado do jogo e ações do jogador
    bots.ts       # jogadores automáticos para checar o balanceamento
  ui/         # renderização em HTML e save no localStorage
  main.ts     # ligação entre eventos da página e ações
```
