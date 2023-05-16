-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "id42" INTEGER,
ADD COLUMN     "twoFaAuth" BOOLEAN NOT NULL DEFAULT false;
