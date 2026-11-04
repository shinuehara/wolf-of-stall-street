import type { SeasonReview } from '../sim/types';
import type { SpriteName } from './sprites';

export type Mood = 'sad' | 'neutral' | 'happy';

export interface Speaker {
  name: string;
  title: string;
  sprite: SpriteName;
}

/**
 * Who reads your season review depends on your standing. The lower you are, the more
 * arrogant the official; the higher you are, the more he flatters you, even after a bad season.
 */
const SPEAKERS: { minClass: number; speaker: Speaker; lines: Record<Mood, string[]> }[] = [
  {
    minClass: 0,
    speaker: { name: 'O Meirinho', title: 'oficial de justiça do Conde', sprite: 'scroll' },
    lines: {
      sad: [
        'Hum. Eu sabia. Gente do seu tipo nunca passa do pão dormido. Assine aqui e não me faça perder mais tempo.',
        'Que vergonha. Até o porco do moleiro cuidaria melhor desse dinheiro. Próximo!',
      ],
      neutral: [
        'Nem melhor, nem pior. Típico. Volte no fim do trimestre, se ainda tiver sapatos.',
        'Anotado. Continua onde sempre esteve: lá embaixo. Não suje o tapete na saída.',
      ],
      happy: [
        'Ora, ora… a sorte também sorri para os plebeus. Não se acostume.',
        'Impressionante. Para alguém da sua laia. Assine aqui, e com cuidado: o pergaminho é caro.',
      ],
    },
  },
  {
    minClass: 2,
    speaker: {
      name: 'O Escrivão da Guilda',
      title: 'guardião dos livros de Valdouro',
      sprite: 'scroll',
    },
    lines: {
      sad: [
        'Os números não mentem, mestre. Foi um trimestre fraco. A guilda espera mais na próxima.',
        'Lamento registrar perdas, mestre. Os investidores perguntaram por você. Duas vezes.',
      ],
      neutral: [
        'Resultado dentro do esperado. A guilda registra sua permanência. Siga firme.',
        'Um trimestre honesto, mestre. Nem festa, nem luto. O livro está em ordem.',
      ],
      happy: [
        'Excelente trimestre! A guilda reconhece seu mérito e recomenda seu nome ao castelo.',
        'Que colheita, mestre! Os investidores já brindam ao seu nome na taverna.',
      ],
    },
  },
  {
    minClass: 5,
    speaker: {
      name: 'O Camareiro do Castelo',
      title: 'servo humilde de Vossa Senhoria',
      sprite: 'crown',
    },
    lines: {
      sad: [
        'Vossa Senhoria, que trimestre ingrato… certamente culpa dos ventos e dos astros, jamais de vossa sabedoria. Que os bons tempos voltem logo!',
        'Ah, meu senhor, até os maiores enfrentam invernos. O castelo aguarda ansioso vosso retorno triunfal. Mais vinho?',
      ],
      neutral: [
        'Vossa Senhoria mantém o brilho de sempre. Permita-me ajeitar vossa almofada.',
        'Um trimestre sereno, digno de vossa nobreza. Os bardos já ensaiam canções sobre vossa prudência.',
      ],
      happy: [
        'Magnífico! Esplêndido! O castelo inteiro brinda ao vosso nome, meu senhor!',
        'Vossa Senhoria multiplica o ouro como os santos multiplicam os pães! Que honra servir-vos!',
      ],
    },
  },
];

/** The first quarter is bonds only: the Meirinho is not impressed, whatever happened. */
const FIRST_QUARTER_LINES = [
  'Seu servo imprestável… só isso? Doze semanas para render esse trocado? Minha avó ganha mais guardando moeda debaixo do colchão.',
];

export function seasonReturn(review: SeasonReview): number {
  // Deposits and withdrawals are not the manager's merit (or fault).
  return review.startWealth > 0
    ? ((review.endWealth - review.flows) / review.startWealth - 1) * 100
    : 0;
}

export function seasonMood(review: SeasonReview): Mood {
  const ret = seasonReturn(review);
  if (review.outcome === 'down' || review.outcome === 'lost' || ret < -6) return 'sad';
  if (review.outcome === 'up-offer' || ret > 15) return 'happy';
  return 'neutral';
}

export function seasonSpeech(review: SeasonReview): { speaker: Speaker; mood: Mood; line: string } {
  const tier =
    [...SPEAKERS].reverse().find((t) => review.classBefore >= t.minClass) ?? SPEAKERS[0]!;
  const mood = seasonMood(review);
  if (review.season === 1 && review.classBefore === 0 && review.outcome === 'stay') {
    return { speaker: tier.speaker, mood: 'sad', line: FIRST_QUARTER_LINES[0]! };
  }
  const options = tier.lines[mood];
  const line = options[review.season % options.length]!;
  return { speaker: tier.speaker, mood, line };
}
