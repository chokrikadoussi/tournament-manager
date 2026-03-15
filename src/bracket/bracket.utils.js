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
