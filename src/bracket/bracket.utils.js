/**
 * Retourne la plus petite puissance de 2 supérieure ou égale à n.
 * nextPowerOfTwo(5) → 8, nextPowerOfTwo(8) → 8
 */
export function nextPowerOfTwo(n) {
  if (n <= 1) return 1;
  return 1 << Math.ceil(Math.log2(n));
}

/**
 * Mélange un tableau en place (algorithme Fisher-Yates).
 * Retourne le tableau modifié.
 */
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Retourne le nombre total de rounds pour n participants.
 * getTotalRounds(8) → 3, getTotalRounds(5) → 3
 */
export function getTotalRounds(participantCount) {
  const log_base_2 = Math.log2(nextPowerOfTwo(participantCount));
  return Math.ceil(log_base_2);
}

/**
 * Positions de seed standard (méthode du "repli" / fold seeding).
 *
 * Retourne un tableau `positions` où `positions[rang]` est l'index du slot
 * (0-indexé) dans lequel placer la tête de série de rang `rang` (rang 0 = seed 1).
 *
 * Garantit la répartition classique : les meilleures têtes de série sont
 * réparties dans des moitiés/quarts opposés (seed 1 vs seed 2 en finale,
 * seed 1 vs seed 4 / seed 2 vs seed 3 en demies, etc.).
 *
 * Ex. bracketSize 8 → [0, 4, 6, 2, 3, 7, 5, 1]
 *   seed1→slot0, seed2→slot4, seed3→slot6, seed4→slot2 …
 */
export function getSeedPositions(bracketSize) {
  // 1. Construire l'ordre des rangs de seed par slot via le repli successif.
  let order = [0];
  while (order.length < bracketSize) {
    const total = order.length * 2;
    const next = [];
    for (const rank of order) {
      next.push(rank);
      next.push(total - 1 - rank);
    }
    order = next;
  }
  // `order[slot]` = rang de seed attendu à ce slot.
  // 2. Inverser pour obtenir `positions[rang]` = slot.
  const positions = new Array(bracketSize);
  order.forEach((rank, slot) => {
    positions[rank] = slot;
  });
  return positions;
}
