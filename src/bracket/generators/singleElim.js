import {
  shuffleArray,
  getTotalRounds,
  nextPowerOfTwo,
  getSeedPositions,
} from '../bracket.utils.js';
import { MatchStatus } from '../../generated/prisma/client.js';

export async function generateSingleElim(
  tx,
  participants,
  tournamentId,
  registrations,
  thirdPlaceMatch = false
) {
  const totalRounds = getTotalRounds(participants.length);

  const shuffledParticipants = buildSeededOrder(participants, registrations);

  const matches = [];
  for (let round = 1; round <= totalRounds; round++) {
    let roundMatches = [];
    let nbMatchesInRound =
      nextPowerOfTwo(participants.length) / Math.pow(2, round);

    for (let pos = 0; pos < nbMatchesInRound; pos++) {
      const match = {
        tournamentId,
        round,
        position: pos,
      };
      roundMatches.push(match);
    }

    matches.push(...roundMatches);
  }
  // 1. Créer tous les Match records (tableau d'objets pré-calculés)
  const createdMatches = await tx.match.createManyAndReturn({
    data: matches,
    select: {
      id: true,
      round: true,
      position: true,
    },
  });

  for (const match of createdMatches) {
    if (match.round < totalRounds) {
      const nextMatch = createdMatches.find(
        (m) =>
          m.round === match.round + 1 &&
          m.position === Math.floor(match.position / 2),
      );
      if (nextMatch) {
        await tx.match.update({
          where: { id: match.id },
          data: { nextMatchId: nextMatch.id },
        });
      }
    }
  }

  if (thirdPlaceMatch && totalRounds >= 2) {
    // Créer un match supplémentaire : round = totalRounds, position = 1
    // (position 0 = finale, position 1 = petite finale)
    await tx.match.create({
      data: {
        tournamentId,
        round: totalRounds,
        position: 1,
        status: MatchStatus.PENDING, // les participants seront ajoutés après les demi-finales
      },
    });
  }

  // 2. Créer les MatchParticipant pour Round 1
  const firstRoundMatches = createdMatches.filter((m) => m.round === 1);
  const matchParticipantsData = firstRoundMatches.flatMap((match) => {
    const pos = match.position;
    const slot0 = shuffledParticipants[pos * 2] || null; // null = bye
    const slot1 = shuffledParticipants[pos * 2 + 1] || null; // null = bye
    const data = [];
    if (slot0) {
      data.push({ matchId: match.id, competitorId: slot0, slot: 0 });
    }
    if (slot1) {
      data.push({ matchId: match.id, competitorId: slot1, slot: 1 });
    }
    return data;
  });

  await tx.matchParticipant.createMany({
    data: matchParticipantsData,
  });
  // 3. Propager les byes (voir TOUR-29)
  const populatedMatches = await tx.match.findMany({
    where: { tournamentId, round: 1 },
    include: {
      _count: {
        select: { participants: true },
      },
    },
  });

  for (const match of populatedMatches) {
    let status;
    if (match._count.participants === 2) {
      status = MatchStatus.READY;
    } else {
      status = MatchStatus.BYE;
    }
    await tx.match.update({
      where: { id: match.id },
      data: { status },
    });
  }

  // Gestion des byes pour les rounds suivants
  for (let round = 1; round <= totalRounds - 1; round++) {
    const matchesToPropagate = await tx.match.findMany({
      where: { tournamentId, round },
      include: { participants: true },
    });

    for (const match of matchesToPropagate) {
      await propagateBye(tx, match, match.participants);
    }
  }
}

async function propagateBye(tx, match, participants) {
  if (participants.length === 1 && match.nextMatchId) {
    const winner = participants[0];
    await tx.match.update({
      where: { id: match.id },
      data: { winnerId: winner.competitorId },
    });
    const slot = match.position % 2;
    await tx.matchParticipant.create({
      data: {
        matchId: match.nextMatchId,
        competitorId: winner.competitorId,
        slot,
      },
    });
    const parentCount = await tx.matchParticipant.count({
      where: { matchId: match.nextMatchId },
    });
    if (parentCount === 2) {
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: { status: MatchStatus.READY },
      });
    }
  }

  if (participants.length === 0 && match.round > 1) {
    await tx.match.update({
      where: { id: match.id },
      data: { status: MatchStatus.BYE },
    });
  }
}

const buildSeededOrder = (participants, registrations) => {
  // registrations = [{ competitorId, seed }]
  const bracketSize = nextPowerOfTwo(participants.length);
  const slots = new Array(bracketSize).fill(null);

  // 1. Trier les seedés (asc), shuffler les non-seedés
  const seeded = registrations
    .filter((r) => r.seed !== null)
    .sort((a, b) => a.seed - b.seed);

  const unseeded = shuffleArray(
    registrations.filter((r) => r.seed === null).map((r) => r.competitorId),
  );

  // 2. Placer les seedés aux positions réservées
  const seedPositions = getSeedPositions(bracketSize);
  seeded.forEach((reg, i) => {
    if (seedPositions[i] !== undefined)
      slots[seedPositions[i]] = reg.competitorId;
  });

  // 3. Remplir les slots vides avec les non-seedés
  let u = 0;
  for (let i = 0; i < bracketSize; i++) {
    if (slots[i] === null && u < unseeded.length) slots[i] = unseeded[u++];
  }

  return slots; // array de bracketSize éléments (competitorId | null pour les byes)
};
