export type Club = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export const DEMO_CLUB_ID = "club-jyden-dartklub";

export const clubs: Club[] = [
  {
    id: DEMO_CLUB_ID,
    name: "Jyden Dartklub",
    slug: "jyden-dartklub",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
