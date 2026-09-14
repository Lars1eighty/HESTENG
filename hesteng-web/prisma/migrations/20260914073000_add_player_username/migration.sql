-- Public HESTENG username. Nullable keeps existing profiles compatible until they choose one.
ALTER TABLE "PlayerProfile" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "PlayerProfile_username_key" ON "PlayerProfile"("username");
