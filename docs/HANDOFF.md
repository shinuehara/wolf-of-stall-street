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
- **Abertura em história:** decreto do Rei → 1º trimestre só com Títulos da Coroa → Meirinho
  humilha → cena do influencer Lucrécio Lucrativo libera as Padarias → no 3º trimestre abrem
  Minas e Boticários → depois, por classe.
- **Investidores:** aportes e resgates mensais conforme o desempenho; propostas de aporte
  (Milícia suja, Abade talvez desviado, Viúva limpa) com risco de confisco e multa.
- **Influencer a cada guilda nova** ("A nova febre: …"), ganhando seguidores.
- **Time-lapse** de ~2 s no fim de cada semana com explosão de pixels verdes/vermelhos.
- **Visitantes** nas semanas 4 e 8 de cada trimestre: Mercador (itens legais, 4 semanas) ou
  Contrabandista (itens fortes com risco de flagrante quando o efeito acaba).

Balanceamento atual (bots, 60 partidas, até 300 semanas): só títulos nunca vence; sem
informação vence ~75%, em ~186 semanas, com ~1,9 quedas de classe; Espião sem melhorias
~140 semanas; com melhorias ~121 semanas, sem quedas de classe. Os bots ainda não compram itens de visitantes.

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
- Produtos liberados aos poucos, contados como história: começa só com Títulos da Coroa
  (chato de propósito), Meirinho humilha, influencer medieval clichê de YouTube libera as
  Padarias. Esta é a "primeira etapa"; o dono vai desenhar as próximas.
- Patrimônio com aportes e retiradas conforme o sucesso; aportes podem ser bons ou ruins
  (miliciano: mais taxa, risco de multa; religioso: limpo ou desviado da Igreja).
- Uma cena nova do influencer a cada setor liberado ("padaria não está com nada, a nova
  tendência é boticário").
- Animação curta no fim da semana: time-lapse do preço + explosão de pixels verde/vermelha.
- Ideias aceitas para depois: relatórios por setor e panorama macro do Espião (pacotes),
  assinatura semanal, e "idles" de deixar dinheiro investido com investidores (forma a
  definir: bolso aplicado ou sub-gestores).

## Perguntas em aberto (aguardando o dono)

1. **Promoção dupla:** com a abertura o mínimo é 96 semanas até Conde. Permitir
   subir duas classes num trimestre excepcional (fundo acima de dois tetos)?
2. **Espião sem treino mostra números extremos** ("93%") que parecem certeza. Proposta:
   achatar as estimativas para o meio quanto pior a patente.
3. **Ritmo geral:** ~121 semanas no melhor bot. Encurtar a escada?
4. **Idles:** "deixar dinheiro investido em investidores" quer dizer bolso aplicado com um
   banqueiro ou sub-gestores que cuidam de parte do fundo?
5. **Próximas etapas da história:** o que libera a Astróloga/Espião, seguro, visitantes, etc.
6. **Sem informação vence mais** com os aportes (~75%, era ~62%). Aceitável (mais volátil,
   mais quedas) ou endurecer?

## Próximos passos sugeridos (prioridade sugerida por Claude)

1. **Relatórios por setor e panorama macro** (pedido do dono), depois os idles.
2. **Reputação do gestor:** muda o tamanho e o tipo das propostas de aporte (nobres só
   aparecem para quem tem boa fama; a Milícia procura quem está desesperado).
3. **Continuar a abertura guiada:** próximas etapas da história (especialistas, seguro, visitantes).
4. **Dilemas no meio do jogo** (empréstimo forçado do Rei, fundo rival, cotas com desconto).
5. **Mais emoção no fim da semana:** o time-lapse existe; falta destaque para choques e som.
6. Bots que compram itens dos visitantes, para medir o efeito deles no balanceamento.
7. Refatorar `src/ui/render.ts` (~1900 linhas) em arquivos por tela antes de crescer mais.

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
| `2882f27`                       | Abertura em história: só títulos, Meirinho, influencer libera Padarias   |
| (este)                          | Aportes/resgates, propostas de aporte, influencer por guilda, time-lapse |
