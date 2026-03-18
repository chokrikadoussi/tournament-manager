import { getTotalRounds } from './bracket.utils.js';
import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import {
  TournamentStatus,
  TournamentFormat,
} from '../generated/prisma/client.js';
import { generateRoundRobin } from './generators/roundRobin.js';
import { generateSingleElim } from './generators/singleElim.js';

const VALID_STATUS = [TournamentStatus.OPEN, TournamentStatus.DRAFT];

export async function generateBracket(tournamentId, thirdPlaceMatch = false) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      status: true,
      format: true,
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

  const participants = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    select: { competitorId: true, seed: true },
    orderBy: { createdAt: 'asc' },
  });

  const participantIds = participants.map((p) => p.competitorId);

  await prisma.$transaction(async (tx) => {
    switch (tournament.format) {
      case TournamentFormat.SINGLE_ELIM:
        await generateSingleElim(
          tx,
          participantIds,
          tournamentId,
          participants,
          thirdPlaceMatch,
        );
        break;

      case TournamentFormat.ROUND_ROBIN:
        await generateRoundRobin(tx, tournamentId, participants);
        break;

      case TournamentFormat.DOUBLE_ELIM:
        throw new AppError(
          'Double elimination format is not supported yet',
          400,
        );

      default:
        throw new AppError('Unsupported tournament format', 400);
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.IN_PROGRESS },
    });
  });
}
export async function getBracket(tournamentId, thirdPlaceMatch = false) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      _count: {
        select: { registrations: true },
      },
    },
  });

  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  if (
    tournament.status !== TournamentStatus.IN_PROGRESS &&
    tournament.status !== TournamentStatus.COMPLETED
  ) {
    throw new AppError('Bracket has not been generated yet', 400);
  }

  const totalRounds = getTotalRounds(tournament._count.registrations);
  const rounds = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matches = await prisma.match.findMany({
      where: { tournamentId, round },
      select: {
        id: true,
        position: true,
        status: true,
        winnerId: true,
        participants: {
          select: {
            slot: true,
            competitorId: true,
            competitor: { select: { name: true } },
          },
        },
      },
      orderBy: { position: 'asc' },
    });
    rounds.push({ round, matches });
  }

  const data = {
    tournamentId: tournament.id,
    totalRounds,
    rounds,
  };

  return data;
}
