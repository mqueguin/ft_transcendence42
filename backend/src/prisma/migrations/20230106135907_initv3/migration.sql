/*
  Warnings:

  - Made the column `id42` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id42" SET NOT NULL;
