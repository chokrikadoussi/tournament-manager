-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('SINGLE_ELIM', 'DOUBLE_ELIM', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "BracketSide" AS ENUM ('WINNERS', 'LOSERS', 'GRAND_FINAL');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "bracketSide" "BracketSide";

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "format" "TournamentFormat" NOT NULL DEFAULT 'SINGLE_ELIM';
