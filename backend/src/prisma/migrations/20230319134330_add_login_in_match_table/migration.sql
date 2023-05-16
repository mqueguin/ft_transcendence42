/*
  Warnings:

  - You are about to drop the column `PlayerName` on the `Match` table. All the data in the column will be lost.
  - Added the required column `player1` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `player2` to the `Match` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Match" DROP COLUMN "PlayerName",
ADD COLUMN     "player1" TEXT NOT NULL,
ADD COLUMN     "player2" TEXT NOT NULL;
