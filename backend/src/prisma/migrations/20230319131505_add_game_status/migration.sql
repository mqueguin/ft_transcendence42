/*
  Warnings:

  - Added the required column `gameStatus` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('CLASSIC', 'FUNMODE');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "gameStatus" "GameStatus" NOT NULL;
