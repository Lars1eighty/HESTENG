CREATE TABLE "ClubPlayer" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubPlayer_clubId_name_key" ON "ClubPlayer"("clubId", "name");
CREATE INDEX "ClubPlayer_clubId_idx" ON "ClubPlayer"("clubId");

ALTER TABLE "ClubPlayer"
ADD CONSTRAINT "ClubPlayer_clubId_fkey"
FOREIGN KEY ("clubId") REFERENCES "Club"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
