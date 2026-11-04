import { getGuild } from '../sim/data';
import type { StoryEvent } from '../sim/types';
import type { Mood } from './ceremony';
import type { StoryScene } from './scenes';
import type { SpriteName } from './sprites';

export interface StoryBeat {
  name: string;
  title: string;
  sprite: SpriteName;
  mood: Mood;
  text: string;
}

export interface Story {
  scene: StoryScene;
  kicker: string;
  heading: string;
  beats: StoryBeat[];
  /** Shown with the last beat: what this scene changed in the game. */
  unlock: string;
  finish: string;
}

const NARRATOR = {
  name: 'Narrador',
  title: 'era uma vez em Valdouro',
  sprite: 'hourglass' as SpriteName,
};
const HERALD = {
  name: 'O Arauto do Rei',
  title: 'voz oficial da Coroa',
  sprite: 'scroll' as SpriteName,
};
const INFLUENCER = {
  name: 'Lucrécio Lucrativo',
  title: 'o Arauto da Fortuna · 300 mil seguidores no mural da praça',
  sprite: 'influencer' as SpriteName,
};

/** Cut scenes, in Portuguese like all in-game text. */
export const STORIES: Record<'intro' | 'influencer', Story> = {
  intro: {
    scene: 'intro',
    kicker: 'Valdouro, ano da graça de 1347',
    heading: 'O Decreto do Rei',
    beats: [
      {
        ...NARRATOR,
        mood: 'neutral',
        text: 'Você é um servo simples do campo. Nunca teve terra nem título, só um baú de economias e um sonho antigo: subir na vida.',
      },
      {
        ...HERALD,
        mood: 'happy',
        text: 'Ouçam, ouçam! Por decreto de Sua Majestade, a partir de hoje o povo comum pode comprar TÍTULOS DA COROA! Rendimento garantido pelo Rei em pessoa!',
      },
      {
        ...NARRATOR,
        mood: 'neutral',
        text: 'Seus vizinhos juntam as economias e confiam 100 florins a você. Você fica com uma pequena taxa por cuidar do fundo, e tem 10 florins seus no bolso.',
      },
      {
        ...NARRATOR,
        mood: 'neutral',
        text: 'Rende pouco, é lento, é seguro. Mas é um começo. No fim do trimestre (12 semanas), o Meirinho virá conferir quanto você conseguiu.',
      },
    ],
    unlock: 'Por enquanto, só os Títulos da Coroa estão liberados no Mercado.',
    finish: 'Ir ao Mercado',
  },
  influencer: {
    scene: 'influencer',
    kicker: 'Enquanto isso, na carroça da praça…',
    heading: 'Pare de investir só na Coroa!',
    beats: [
      {
        ...INFLUENCER,
        mood: 'happy',
        text: 'FALA, PLEBE! Aqui é o Lucrécio, e hoje eu vou te mostrar por que você continua POBRE. Fica até o final, que no final tem segredo!',
      },
      {
        ...INFLUENCER,
        mood: 'neutral',
        text: 'Você ainda deixa seu ouro dormindo em Título da Coroa? Rendendo MIGALHA? Olha esse gráfico. OLHA ESSE GRÁFICO! Só sobe!',
      },
      {
        ...INFLUENCER,
        mood: 'happy',
        text: 'Esse rapaz aqui era servo igualzinho a você. Hoje? DUQUE! Só investindo em PADARIAS. Pão todo mundo come, meu povo, todo santo dia!',
      },
      {
        ...INFLUENCER,
        mood: 'happy',
        text: 'Não é recomendação de investimento, hein? Mas se eu fosse você… Toca o sino da capela e deixa seu joinha no pergaminho! Até a próxima!',
      },
    ],
    unlock:
      'A Guilda dos Padeiros abriu para o povo: cesta e 3 padarias no Mercado, e o Bêbado, a Astróloga e o Espião já aceitam perguntas na Taverna. Minas e Boticários abrem no próximo trimestre.',
    finish: 'Ver as Padarias',
  },
};

/** The influencer's pitch for each guild when it opens ("the new trend is…"). */
const HYPE: Record<string, string> = {
  bakers: 'PADARIAS! Pão todo mundo come, todo santo dia!',
  mines:
    'A nova tendência é MINAS, meu povo! Prata é o novo pão! Quem comprou picareta no começo hoje tem castelo com fosso… de moedas!',
  apothecaries:
    'BOTICÁRIOS! Com essa tosse que anda pela cidade, xarope vai valer mais que ouro! Elixir da Fênix: guardem esse nome!',
  changers:
    'CAMBISTAS, plebe! Dinheiro que faz dinheiro! Banco nunca perde: quem perde é você, que não está no banco!',
  fair: 'A FEIRA é o futuro! Todo mundo compra alguma coisa toda semana. Isso é matemática, é CIÊNCIA!',
  forge:
    'FERREIROS! O Rei vai entrar em guerra (fonte: confia) e espada não nasce em árvore, meu povo!',
  fleet: 'NAVEGAÇÃO! Do outro lado do mar tem ouro, seda e gente que nunca ouviu falar de imposto!',
  spices:
    'ESPECIARIAS! Pimenta é o novo ouro! O ouro também continua sendo ouro, mas a pimenta é mais gostosa!',
};

/** A new influencer video for guilds that just opened; `announced` is the order they opened. */
export function storyFor(event: StoryEvent, announced: string[]): Story {
  if (event.id !== 'trend') return STORIES[event.id];
  const first = announced.indexOf(event.guilds[0]!);
  const old = first > 0 ? getGuild(announced[first - 1]!) : getGuild('bakers');
  const followers = 300 + 150 * Math.max(1, first);
  const names = event.guilds.map((id) => getGuild(id).short);
  const who = {
    ...INFLUENCER,
    title: `o Arauto da Fortuna · ${followers} mil seguidores no mural da praça`,
  };
  return {
    scene: 'influencer',
    kicker: 'Lucrécio Lucrativo, ao vivo da carroça',
    heading: `A nova febre: ${names.join(' e ')}!`,
    beats: [
      {
        ...who,
        mood: 'happy',
        text: `FALA, PLEBE! Lucrécio de volta, agora com ${followers} mil seguidores! Obrigado, família!`,
      },
      {
        ...who,
        mood: 'sad',
        text: `${old.short}? Isso é COISA DO PASSADO! Todo mundo já investe nisso, até a minha sogra. E quando a sogra entra, o esperto sai!`,
      },
      ...event.guilds.map((id) => ({ ...who, mood: 'happy' as Mood, text: HYPE[id] ?? '' })),
      {
        ...who,
        mood: 'neutral',
        text: 'Corre que ainda dá tempo! Não é recomendação de investimento, hein? Toca o sino da capela e compartilha com o compadre!',
      },
    ],
    unlock: `Liberado no Mercado: ${event.guilds
      .map((id) => getGuild(id).name)
      .join(' e ')} (cesta e 3 empresas cada).`,
    finish: `Ver ${names.join(' e ')}`,
  };
}
