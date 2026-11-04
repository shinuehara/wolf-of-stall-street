import type { StoryId } from '../sim/types';
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
export const STORIES: Record<StoryId, Story> = {
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
