CREATE TABLE "PublicClubNight" (
    "id" TEXT NOT NULL,
    "clubNightId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "clubNight" JSONB NOT NULL,
    "completedMatches" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicClubNight_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicClubNight_clubNightId_key" ON "PublicClubNight"("clubNightId");
CREATE UNIQUE INDEX "PublicClubNight_publicToken_key" ON "PublicClubNight"("publicToken");
CREATE INDEX "PublicClubNight_clubId_status_idx" ON "PublicClubNight"("clubId", "status");
