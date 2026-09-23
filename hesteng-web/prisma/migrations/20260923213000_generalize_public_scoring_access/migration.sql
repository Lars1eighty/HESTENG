-- Generalize public scoring access so it can belong to a club night or a private competition.
ALTER TABLE "PublicClubNight"
  ALTER COLUMN "clubId" DROP NOT NULL,
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "accessType" TEXT NOT NULL DEFAULT 'club-night';

CREATE INDEX "PublicClubNight_ownerUserId_accessType_status_idx"
  ON "PublicClubNight"("ownerUserId", "accessType", "status");
