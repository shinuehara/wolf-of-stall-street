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
- **Profecia do trimestre:** cada ativo tem um destino oculto para o trimestre e é puxado para
  ele; especialistas respondem sobre o trimestre (vale o trimestre todo, dá para perguntar de
  novo); **corretagem** de 0,5% por compra/venda.
- **Árvores dos ajudantes:** 5 patentes cada; Bêbado enrola menos, Astróloga lê mais astros
  (votação), Espião faz análise completa e relatório da guilda; confidente treina pela metade.
- **Bêbado que nunca mente:** cada bebida compra uma fofoca verdadeira sobre a causa (o
  jogador interpreta) ou bobagem; o treino acrescenta ícone da guilda, bairro, seta e empresa.
- **Gestores contratados** (Carteira → Gestores): Frei Prudêncio, Dona Ambrosina, Rodrigo
  Rompe-Bolsa investem parte do fundo sozinhos, com estilo e taxa próprios.
- **Promoções e quedas múltiplas** no fim do trimestre (um título por teto ultrapassado).
- **Investidores:** julgam os últimos 3 meses (aporte lento, resgate rápido); propostas de aporte
  (Milícia suja, Abade talvez desviado, Viúva limpa) com risco de confisco e multa.
- **Influencer a cada guilda nova** ("A nova febre: …"), ganhando seguidores.
- **Time-lapse** de ~2 s no fim de cada semana com explosão de pixels verdes/vermelhos.
- **Visitantes** nas semanas 4 e 8 de cada trimestre: Mercador (itens legais, 4 semanas) ou
  Contrabandista (itens fortes com risco de flagrante quando o efeito acaba).

Balanceamento atual (bots, 60 partidas, até 300 semanas): só títulos nunca vence; sem
informação vence 55% e vai para a masmorra em 12%; Espião sem melhorias ~155 semanas; com
melhorias ~128 semanas; oráculo (teto) ~88. Quem usa o Espião não vai para a masmorra.

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
- Investidores julgam o histórico (3 meses), não um mês isolado; resgates mais rápidos.
- Idles = **sub-gestores** que cuidam de parte do fundo (opção b).
- Promoções múltiplas se o fundo bate a meta de várias classes; quedas múltiplas também.
- O dono **delegou a dificuldade** a Claude ("não tenho essa sensibilidade"). Regra adotada:
  perder exige erros repetidos (queda de classe alta para em Servo com último aviso; saques
  param 15% acima do piso). Metas: ~10% de masmorra para quem chuta, 0 para quem se informa.
- O jogo induzia a comprar/vender tudo toda semana. Ideia do dono: informação dos agentes
  vale o trimestre; o jogador segura ou realiza conforme o que já aconteceu frente à
  profecia. Implementado junto com a corretagem. O Arauto passou a anunciar a faixa do
  trimestre e a semana virou só o "humor da semana" (decisão de Claude, dono não opinou).
- O Bêbado era inútil. Pedido do dono: fala **sempre verdadeira mas pouco compreensível**,
  sobre causas macro sem dizer o impacto; cada nível de treino acrescenta uma pista na mesma
  frase (ícone da guilda + bairro, ícone do bairro, seta, empresa). Furo do Bêbado não é
  mentira, é **bobagem paga** ("minha filha cantou na escola"), cada vez mais rara com o
  treino. Um botão só, "Pagar uma bebida", sem escolher o assunto.
- Igualar os ajudantes em 5 patentes, com crescimento próprio (o dono acha que o jogador
  foca em um só): Bêbado começa com monólogo cheio de divagação e o treino corta até sobrar a
  frase útil; Astróloga consulta vários astros ("2 de 3 alta"); Espião ganha análise completa
  (economia + setor + bairro + empresa). Claude acrescentou o confidente (treino pela metade).
- Ideias aceitas para depois: relatórios por setor e panorama macro do Espião (pacotes),
  assinatura semanal.

## Perguntas em aberto (aguardando o dono)

1. **Espião sem treino mostra números extremos** ("93%") que parecem certeza. Proposta:
   achatar as estimativas para o meio quanto pior a patente.
2. **Ritmo geral:** ~100 semanas no melhor bot. Está bom ou encurtar a escada?
3. **Próximas etapas da história:** o que libera a Astróloga/Espião, seguro, visitantes, etc.

## Próximos passos sugeridos (prioridade sugerida por Claude)

1. **Relatórios por setor e panorama macro** (pedido do dono): combinam muito com a
   profecia (comprar a guilda inteira de uma vez por trimestre).
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
| `222ce6e`                       | Aportes/resgates, propostas de aporte, influencer por guilda, time-lapse |
| `cea8ed2`                       | Investidores por 3 meses, promoções/quedas múltiplas, gestores           |
| `7c64891`                       | Último aviso antes da masmorra, saques param acima do piso               |
| `9803b83`                       | Profecia do trimestre, corretagem, perguntas valem o trimestre           |
| `c6fbe64`                       | Bêbado que nunca mente: fofocas a interpretar, bobagens, 5 patentes      |
| `5ce6055`                       | Árvores dos ajudantes (5 patentes), astros, análise completa, confidente |
| (este)                          | Botão Vender tudo (Mercado e Carteira) com confirmação                   |
