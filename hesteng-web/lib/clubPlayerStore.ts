import { getPrisma } from "@/lib/prisma";

export async function listClubPlayers(clubId: string) {
  return getPrisma().clubPlayer.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
  });
}

export async function createClubPlayer(clubId: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Player name is required");

  const existingPlayers = await getPrisma().clubPlayer.findMany({
    where: { clubId },
  });
  const existing = existingPlayers.find(
    (player) => player.name.trim().toLocaleLowerCase("da-DK") === normalizedName.toLocaleLowerCase("da-DK"),
  );
  if (existing) return existing;

  return getPrisma().clubPlayer.create({
    data: { clubId, name: normalizedName },
  });
}
