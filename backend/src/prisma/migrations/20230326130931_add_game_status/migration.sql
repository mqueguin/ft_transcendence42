/*
  Warnings:

  - The values [CLASSIC,FUNMODE] on the enum `GameStatus` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `gameType` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('CLASSIC', 'FUNMODE');

-- AlterEnum
BEGIN;
CREATE TYPE "GameStatus_new" AS ENUM ('WAITING', 'INPROGRESS', 'FINISH');
ALTER TABLE "Match" ALTER COLUMN "gameStatus" TYPE "GameStatus_new" USING ("gameStatus"::text::"GameStatus_new");
ALTER TYPE "GameStatus" RENAME TO "GameStatus_old";
ALTER TYPE "GameStatus_new" RENAME TO "GameStatus";
DROP TYPE "GameStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "gameType" "GameType" NOT NULL;
