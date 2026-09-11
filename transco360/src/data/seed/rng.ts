/**
 * Generateur pseudo-aleatoire deterministe.
 *
 * Tout l'aleatoire du prototype passe par ici : a partir d'une meme graine, la
 * meme suite de nombres est produite. C'est ce qui permet de generer les
 * transactions unitaires d'un couple (bus, jour) a la demande tout en
 * garantissant qu'elles somment exactement a l'agregat deja affiche ailleurs.
 */

/** Hachage de chaine 32 bits (FNV-1a) — sert a deriver une graine stable. */
export function hashSeed(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  const input = parts.join('|');
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Flottant dans [0, 1). */
  next(): number;
  /** Flottant dans [min, max). */
  range(min: number, max: number): number;
  /** Entier dans [min, max] inclus. */
  int(min: number, max: number): number;
  /** Vrai avec la probabilite donnee. */
  chance(probability: number): boolean;
  /** Element pris au hasard dans une liste non vide. */
  pick<T>(items: readonly T[]): T;
  /** Bruit centre sur 1, d'amplitude relative `spread` (ex. 0.08 = +/-8 %). */
  jitter(spread: number): number;
  /** Loi normale approchee (somme de 3 tirages), bornee a +/-3 ecarts-types. */
  normal(mean: number, stdDev: number): number;
}

/** mulberry32 — rapide, sans dependance, suffisant pour une simulation. */
export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed) >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    jitter: (spread) => 1 + (next() * 2 - 1) * spread,
    normal: (mean, stdDev) => {
      const sum = next() + next() + next();
      const standard = (sum - 1.5) * 2; // approx. N(0,1) borne a +/-3
      return mean + standard * stdDev;
    },
  };

  return rng;
}

/**
 * Repartit un total entier sur `count` parts avec une variation controlee.
 * La somme des parts est exactement egale au total : c'est la garantie de
 * coherence entre les transactions unitaires et les agregats.
 */
export function splitTotal(
  total: number,
  count: number,
  rng: Rng,
  spread = 0.25,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [total];

  const weights = Array.from({ length: count }, () => Math.max(0.05, rng.jitter(spread)));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const parts: number[] = [];
  let allocated = 0;
  for (let i = 0; i < count - 1; i++) {
    const share = Math.round((total * (weights[i] as number)) / weightSum);
    const bounded = Math.max(0, Math.min(share, total - allocated));
    parts.push(bounded);
    allocated += bounded;
  }
  parts.push(total - allocated);
  return parts;
}
