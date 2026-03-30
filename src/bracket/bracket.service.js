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

export async function getBracket(tournamentId, format, categoryId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, format: true },
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

  const matchWhere = { tournamentId, ...(categoryId && { categoryId }) };

  const participantCount = await prisma.tournamentRegistration.count({
    where: { tournamentId, ...(categoryId && { categoryId }) },
  });

  const totalRounds = getTotalRounds(participantCount);

  if (
    format === 'visual' &&
    tournament.format === TournamentFormat.SINGLE_ELIM
  ) {
    const allMatches = await prisma.match.findMany({
      where: matchWhere,
      include: {
        participants: {
          include: { competitor: true },
        },
      },
    });

    const finalMatch = allMatches.find(
      (m) => m.round === totalRounds && m.position === 0,
    );

    const tree = buildTree(finalMatch, allMatches);
    return { tournamentId: tournament.id, format: 'visual', final: tree };
  }

  const rounds = [];

  for (let round = 1; round <= totalRounds; round++) {
    const matches = await prisma.match.findMany({
      where: { ...matchWhere, round },
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

  return { tournamentId: tournament.id, totalRounds, rounds };
}

function buildTree(match, allMatches) {
  const children = allMatches.filter(
    (m) =>
      m.round === match.round - 1 &&
      Math.floor(m.position / 2) === match.position,
  );
  return {
    matchId: match.id,
    round: match.round,
    position: match.position,
    status: match.status,
    winnerId: match.winnerId,
    participants: match.participants.map((p) => ({
      slot: p.slot,
      competitorId: p.competitorId,
      name: p.competitor.name,
    })),
    children: children.map((child) => buildTree(child, allMatches)),
  };
}
