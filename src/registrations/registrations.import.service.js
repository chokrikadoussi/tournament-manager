import { parse } from 'csv-parse/sync';
import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus, Gender } from '../generated/prisma/client.js';

const GENDER_MAP = {
  m: Gender.MALE, masculin: Gender.MALE, male: Gender.MALE, homme: Gender.MALE, h: Gender.MALE,
  garcon: Gender.MALE, 'garçon': Gender.MALE,
  f: Gender.FEMALE, feminin: Gender.FEMALE, féminin: Gender.FEMALE, female: Gender.FEMALE, femme: Gender.FEMALE,
  fille: Gender.FEMALE,
};

function parseGender(raw) {
  if (!raw) return null;
  return GENDER_MAP[raw.trim().toLowerCase()] ?? null;
}

// Accepte DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, YYYY
function parseBirthYear(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}$/.test(s)) return parseInt(s, 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return parseInt(dmy[3], 10);
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) return parseInt(ymd[1], 10);
  return null;
}

function parseRows(buffer) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  });
  return records.map((row, i) => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      // NFD décompose les accents en marques combinantes ; \p{M} les retire.
      normalized[key.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()] = row[key];
    }
    return { _line: i + 2, ...normalized };
  });
}

function resolveCategory(categories, gender, birthYear) {
  const matches = categories.filter((c) => {
    const genderMatch = c.gender === gender || c.gender === Gender.MIXED;
    const yearMatch =
      (!c.birthYearMin || birthYear >= c.birthYearMin) &&
      (!c.birthYearMax || birthYear <= c.birthYearMax);
    return genderMatch && yearMatch;
  });
  if (matches.length === 1) return matches[0].id;
  return null;
}

// ── Shared runner — db is either `prisma` or a transaction client ──────────────
async function _runImport(db, tournamentId, rows, tournament, mode) {
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };

  if (mode === 'replace') {
    await db.tournamentRegistration.deleteMany({ where: { tournamentId } });
  }

  let tournamentCount = await db.tournamentRegistration.count({ where: { tournamentId } });
  const catCounts = {};
  {
    const grouped = await db.tournamentRegistration.groupBy({
      by: ['categoryId'],
      where: { tournamentId, categoryId: { not: null } },
      _count: { _all: true },
    });
    grouped.forEach((g) => { catCounts[g.categoryId] = g._count._all; });
  }

  for (const row of rows) {
    const line = row._line;
    const nom = row['nom'] ?? '';
    const prenom = row['prenom'] ?? '';
    const genreRaw = row['genre'] ?? '';
    const dateRaw = row['datenaissance'] ?? row['date de naissance'] ?? row['datedenaissance'] ?? '';
    const club = row['club'] || null;

    const name = `${prenom} ${nom}`.trim();
    if (!name) {
      results.errors.push({ line, message: 'Nom et Prénom manquants' });
      continue;
    }

    const gender = parseGender(genreRaw);
    if (genreRaw && !gender) {
      results.errors.push({ line, message: `Genre non reconnu : "${genreRaw}" — importé sans catégorie` });
    }

    const birthYear = parseBirthYear(dateRaw);
    if (!birthYear) {
      results.errors.push({ line, message: `Date de naissance invalide : "${dateRaw}"` });
      continue;
    }

    const currentYear = new Date().getFullYear();
    if (birthYear < 1900 || birthYear > currentYear) {
      results.errors.push({
        line,
        message: `Année de naissance hors limites : ${birthYear} (attendu 1900–${currentYear})`,
      });
      continue;
    }

    const categoryId = gender ? resolveCategory(tournament.categories, gender, birthYear) : null;

    try {
      // Upsert atomique : élimine la race condition findFirst + create (#Bug6)
      // et met à jour le genre/club depuis le CSV si fournis (#Bug4).
      const competitor = await db.competitor.upsert({
        where: { competitor_name_birthYear_key: { name, birthYear } },
        create: { name, club, gender: gender ?? undefined, birthYear },
        update: {
          ...(gender ? { gender } : {}),
          ...(club    ? { club }   : {}),
        },
      });

      const existing = await db.tournamentRegistration.findUnique({
        where: { tournamentId_competitorId: { tournamentId, competitorId: competitor.id } },
      });

      if (existing) {
        if (existing.categoryId === null && categoryId !== null) {
          await db.tournamentRegistration.update({
            where: { tournamentId_competitorId: { tournamentId, competitorId: competitor.id } },
            data: { categoryId },
          });
          results.updated++;
        } else {
          results.skipped++;
        }
        continue;
      }

      if (tournament.maxParticipants && tournamentCount >= tournament.maxParticipants) {
        results.errors.push({ line, message: 'Tournoi complet — inscription ignorée' });
        continue;
      }

      let effectiveCategoryId = categoryId;
      if (effectiveCategoryId) {
        const cat = tournament.categories.find((c) => c.id === effectiveCategoryId);
        if (cat?.maxParticipants && (catCounts[effectiveCategoryId] ?? 0) >= cat.maxParticipants) {
          results.errors.push({ line, message: `Catégorie "${cat.name}" complète — inscrit en liste d'attente` });
          effectiveCategoryId = null;
        }
      }

      await db.tournamentRegistration.create({
        data: { tournamentId, competitorId: competitor.id, categoryId: effectiveCategoryId },
      });

      tournamentCount++;
      if (effectiveCategoryId) {
        catCounts[effectiveCategoryId] = (catCounts[effectiveCategoryId] ?? 0) + 1;
      }
      results.created++;
    } catch (err) {
      results.errors.push({ line, message: err.message ?? 'Erreur inconnue' });
    }
  }

  return results;
}

// ── Helpers communs ────────────────────────────────────────────────────────────
async function _loadTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { categories: true },
  });
  if (!tournament) throw new AppError('Tournament not found', 404);
  if (![TournamentStatus.DRAFT, TournamentStatus.OPEN].includes(tournament.status)) {
    throw new AppError('Cannot import into a tournament that is not open', 400);
  }
  return tournament;
}

function _parseOrThrow(fileBuffer) {
  try {
    return parseRows(fileBuffer);
  } catch {
    throw new AppError('Fichier CSV invalide ou mal formaté', 400);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const importCSV = async (tournamentId, fileBuffer, mode = 'merge') => {
  const tournament = await _loadTournament(tournamentId);
  const rows = _parseOrThrow(fileBuffer);
  return _runImport(prisma, tournamentId, rows, tournament, mode);
};

const PREVIEW_ROLLBACK = Symbol('PREVIEW_ROLLBACK');

export const previewCSV = async (tournamentId, fileBuffer, mode = 'merge') => {
  const tournament = await _loadTournament(tournamentId);
  const rows = _parseOrThrow(fileBuffer);

  let results;
  try {
    await prisma.$transaction(
      async (tx) => {
        results = await _runImport(tx, tournamentId, rows, tournament, mode);
        // Always roll back — we only want the computed results, not the writes
        throw PREVIEW_ROLLBACK;
      },
      { timeout: 30_000 },
    );
  } catch (err) {
    if (err !== PREVIEW_ROLLBACK) throw err;
  }
  return results;
};
