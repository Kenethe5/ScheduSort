/*
  Warnings:

  - Added the required column `dueAt` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `durationMinutes` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "durationMinutes" INTEGER NOT NULL,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 2;
