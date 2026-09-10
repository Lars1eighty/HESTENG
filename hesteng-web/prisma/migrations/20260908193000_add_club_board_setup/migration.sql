-- AlterTable
ALTER TABLE "Club"
ADD COLUMN "boardCount" INTEGER,
ADD COLUMN "handicapBoards" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Preserve the existing Jyden setup while leaving other existing clubs unconfigured.
UPDATE "Club"
SET "boardCount" = 13,
    "handicapBoards" = ARRAY[4, 13]::INTEGER[]
WHERE "slug" = 'jyden-dartklub';
