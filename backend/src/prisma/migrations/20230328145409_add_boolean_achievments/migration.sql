-- AlterTable
ALTER TABLE "User" ADD COLUMN     "achievments" BOOLEAN[] DEFAULT ARRAY[false, false, false, false, false]::BOOLEAN[];
