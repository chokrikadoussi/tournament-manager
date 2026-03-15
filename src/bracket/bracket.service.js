import {
  shuffleArray,
  getTotalRounds,
  nextPowerOfTwo,
} from './bracket.utils.js';
import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus, MatchStatus } from '../generated/prisma/client.js';

const VALID_STATUS = [TournamentStatus.OPEN, TournamentStatus.DRAFT];

export async function generateBracket(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      status: true,
      _count: {
        select: {
          registrations: true,
          matches: true,
        },
      },
    },
  });

  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  if (!VALID_STATUS.includes(tournament.status)) {
    throw new AppError(
      'Cannot generate bracket for a tournament that is not open',
      400,
    );
  }

  if (tournament._count.registrations < 2) {
    throw new AppError(
      'At least 2 participants are required to generate a bracket',
      400,
    );
  }

  if (tournament._count.matches > 0) {
    throw new AppError(
      'Bracket has already been generated for this tournament',
      400,
    );
  }

  const totalRounds = getTotalRounds(tournament._count.registrations);
  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    include: { competitor: true },
    orderBy: { createdAt: 'asc' },
  });

  const shuffledParticipants = shuffleArray([
    ...registrations.map((r) => r.competitorId),
  ]);

  const matches = [];
  for (let round = 1; round <= totalRounds; round++) {
    let roundMatches = [];
    let nbMatchesInRound =
      nextPowerOfTwo(tournament._count.registrations) / Math.pow(2, round);

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

  await prisma.$transaction(async (tx) => {
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
      } else if (match._count.participants === 1) {
        status = MatchStatus.BYE;
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

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS },
    });
  });
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
