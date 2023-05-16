/*
  Warnings:

  - You are about to drop the column `isprotected` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "isprotected",
ADD COLUMN     "isProtected" BOOLEAN NOT NULL DEFAULT false;
