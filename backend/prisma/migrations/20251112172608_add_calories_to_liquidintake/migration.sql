/*
  Warnings:

  - Added the required column `calories` to the `LiquidIntake` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `liquidintake` ADD COLUMN `calories` DOUBLE NOT NULL;
