import { MatchStatus } from '../../generated/prisma/client.js';

export async function generateRoundRobin(tx, tournamentId, registrations, categoryId = null) {
  const participants = registrations
    .sort((a, b) => {
      if (a.seed === null) return 1;
      if (b.seed === null) return -1;
      return a.seed - b.seed;
    })
    .map((r) => r.competitorId);

  // 1. Si n impair → ajouter null dans le tableau (= BYE fictif)
  if (participants.length % 2 === 1) {
    participants.push(null);
  }

  // 2. Calculer nb de rounds (n-1 si pair, n si impair)
  const totalParticipants = participants.length;
  const totalRounds = totalParticipants - 1;

  // 3. Pour chaque round : calculer les paires avec la rotation
  const matchesParticipants = [];
  for (let round = 1; round <= totalRounds; round++) {
    for (let j = 0; j < totalParticipants / 2; j++) {
      const slot0 = participants[j];
      const slot1 = participants[totalParticipants - 1 - j];
      matchesParticipants.push({
        round,
        slot0,
        slot1,
        position: j % (totalParticipants / 2),
      });
    }

    const last = participants[totalParticipants - 1];
    for (let i = totalParticipants - 1; i > 1; i--) {
      participants[i] = participants[i - 1];
    }
    participants[1] = last;
  }

  // 4. tx.match.createMany() → tous les matchs (round, position, tournamentId)
  const createdMatches = await tx.match.createManyAndReturn({
    data: matchesParticipants.map((mp) => ({
      tournamentId,
      round: mp.round,
      position: mp.position,
      ...(categoryId && { categoryId }),
    })),
    select: {
      id: true,
      round: true,
      position: true,
    },
  });

  // 5. tx.matchParticipant.createMany() → les participants réels (pas le BYE fictif)
  const matchParticipantsData = createdMatches.flatMap((match) => {
    const mp = matchesParticipants.find(
      (m) => m.round === match.round && m.position === match.position,
    );
    const slot0 = mp.slot0;
    const slot1 = mp.slot1;
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

  // 6. Status : 2 vrais participants → READY, 1 vrai + BYE → BYE + winnerId = le vrai participant
  const populatedMatches = await tx.match.findMany({
    where: { tournamentId, ...(categoryId && { categoryId }) },
    include: {
      _count: {
        select: { participants: true },
      },
      participants: {
        select: { competitorId: true },
      },
    },
  });

  for (const match of populatedMatches) {
    if (match._count.participants === 2) {
      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.READY },
      });
    } else {
      const winnerId = match.participants[0]?.competitorId || null;
      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.BYE, winnerId },
      });
    }
  }
}
