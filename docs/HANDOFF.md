# Handoff: estado do projeto

Última consolidação: 2026-11-05, depois do commit `46f8700`.
Link de teste (Artifact privado do dono): https://claude.ai/artifact/4d9DY4NaMyWvHfBuC5rhDq

## Onde estamos

O jogo é jogável do começo ao fim e passa em 54 testes. Visão geral do que existe hoje:

- **Você é gestor de um fundo** (100 fl dos investidores) com um **bolso** próprio (10 fl).
  Taxas de administração e performance passam do fundo para o bolso toda semana.
- **Escada social** Servo → Camponês → Artesão → Mercador → Burguês → Cavaleiro → Barão →
  Conde, medida pelo tamanho do fundo, avaliada a cada **trimestre (12 semanas)**.
- **Mercado:** 8 guildas × 3 empresas (uma por bairro) + cesta de cada guilda + Títulos da
  Coroa (livre e preso 4 semanas). Botões rápidos ±5/10/50%/Tudo do patrimônio. Gráficos
  estilo bolsa (com oscilação visual intra-semana). Seguro (hedge) por posição.
- **Cidade de Valdouro:** PIB com ciclo econômico, 3 bairros (Alto da Coroa nobre, Burgo
  Velho médio, Ribeira humilde), notícias do reino, da cidade, dos bairros e das empresas.
  Notícias de cidade e bairro não têm setas (inferência indireta). Almanaque na Praça.
- **Especialistas falíveis** com patentes e retratos que melhoram: Bêbado, Astróloga,
  Espião. Respostas do Espião em 4 faixas coloridas (vermelho forte → verde forte).
- **Melhorias (perks)** na Taverna, pagas do bolso, várias com nível e classe mínima.
- **Choques** fora da faixa (incêndio, escândalo, golpe de sorte).
- **Carteira:** posição de hoje e rentabilidade (livro-caixa semanal, ranking por ativo).
- **Fim de trimestre:** festa em pixel art que cresce com a classe (Jantar Modesto → Baile
  de Gala do Conde), discurso do oficial (Meirinho arrogante, Escrivão formal, Camareiro
  bajulador; humor triste, neutro ou feliz), depois os números e o veredito.
- **Visitantes** nas semanas 4 e 8 de cada trimestre: Mercador (itens legais, 4 semanas) ou
  Contrabandista (itens fortes com risco de flagrante quando o efeito acaba).

Balanceamento atual (bots, 60 partidas, até 300 semanas): só títulos nunca vence; sem
informação vence ~60%, em ~221 semanas; Espião sem melhorias ~146 semanas; com melhorias
~112 semanas, sem quedas de classe. Os bots ainda não compram itens de visitantes.

## Decisões do dono (não desfazer sem perguntar)

- Tela fixa sem rolagem de página, navegação entre locais, pixel art com cores vivas.
- Guildas com 3 empresas cada, cesta da guilda negociável; gráfico de preço por ativo.
- Histórico simulado antes do jogo (26 semanas); o Escriba amplia o gráfico de 8 para 40.
- Botões rápidos na lista do Mercado: metade esquerda info, metade direita grade 2×4
  (compra em cima, venda embaixo); base = patrimônio, limitado pelo livre ou pela posição.
- Botão ▸/▾ para expandir/contrair as empresas de cada cesta.
- Fundo de investidores + bolso do gestor, para impedir gastar tudo em melhorias no dia 0.
- O jogo deve ser difícil sem melhorias; a diversão vem de comprar melhores decisões.
- Gráficos com oscilação estilo mercado, não degraus.
- Faixas do Espião em vermelho forte, vermelho fraco, verde fraco, verde forte.
- "Confiança" virou patente (Aprendiz, Júnior, Experiente, Mestre), com retrato melhorando.
- Ciclo de 12 semanas (trimestre), festa de fechamento crescendo com a classe, visitantes
  mensais (mercador legal / contrabandista ilegal com contraparte).

## Perguntas em aberto (aguardando o dono)

1. **Promoção dupla:** com trimestres de 12 semanas o mínimo é 84 semanas até Conde. Permitir
   subir duas classes num trimestre excepcional (fundo acima de dois tetos)?
2. **Espião sem treino mostra números extremos** ("93%") que parecem certeza. Proposta:
   achatar as estimativas para o meio quanto pior a patente.
3. **Ritmo geral:** o jogo é longo (~112 semanas no melhor bot). Encurtar a escada?

## Próximos passos sugeridos (prioridade sugerida por Claude)

1. **Aportes e resgates de investidores:** trimestres bons trazem dinheiro novo, ruins
   provocam saques. Cria tensão real (hoje quase ninguém perde) e combina com o tema.
2. **Primeira estação guiada / tutorial** com o Meirinho; liberar sistemas aos poucos.
3. **Dilemas no meio do jogo** (empréstimo forçado do Rei, fundo rival, cotas com desconto).
4. **Mais emoção no fim da semana:** animação de preços, destaque para choques, som opcional.
5. Bots que compram itens dos visitantes, para medir o efeito deles no balanceamento.
6. Refatorar `src/ui/render.ts` (~1900 linhas) em arquivos por tela antes de crescer mais.

## Histórico (commits em `main`)

| Commit                          | O que entrou                                                             |
| ------------------------------- | ------------------------------------------------------------------------ |
| `ab13b1b`                       | Protótipo: guildas, especialistas, seguro, escada social, bots           |
| `8cba26e`                       | Confirmação de reinício dentro da página (Artifact bloqueia `confirm()`) |
| `784b0d8`                       | Interface por telas em pixel art (Praça, Mercado, Taverna, Castelo)      |
| `32a777c`                       | 3 empresas por guilda, cestas, gráficos de preço                         |
| `f0ff07e`                       | 26 semanas de histórico simulado no início                               |
| `7c8fffe`, `3985bb1`, `5a0a50f` | Botões rápidos, linha em duas metades, expandir/contrair                 |
| `2537ae0`                       | PIB, 3 bairros, notícias locais, Almanaque                               |
| `4302b8d`                       | Carteira: posição e rentabilidade                                        |
| `5dd2224`                       | Gráficos com oscilação estilo mercado                                    |
| `41c6efc`                       | Títulos da Coroa como produtos (livre e preso)                           |
| `c7d04ef`                       | Mercado mais difícil, especialistas falíveis, choques, loja de melhorias |
| `f8d89e3`                       | Fundo de investidores + bolso do gestor                                  |
| `657dda4`                       | Cerimônia de avaliação com oficiais por classe                           |
| `3a1ef72`                       | Cores nas faixas do Espião                                               |
| `a3c3a0d`                       | Patentes dos especialistas e retratos por nível                          |
| `46f8700`                       | Trimestres de 12 semanas, festa de fechamento, visitantes mensais        |
