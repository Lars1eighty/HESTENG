"use client";

import { FormEvent, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

type CompetitionFormat = "pools" | "roundRobin" | "knockout";
type StartingScore = 301 | 501;
type BestOfLegs = 1 | 3 | 5 | 7 | 9;

type GeneratedMatch = { id: string; player1: string; player2: string; round?: string };\ntype GeneratedPool = { name: string; players: string[] };

export default function PrivateCompetitionPage() {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", ""]);
  const [created, setCreated] = useState(false);
  const [format, setFormat] = useState<CompetitionFormat | null>(null);
  const [matchSetupOpen, setMatchSetupOpen] = useState(false);
  const [startingScore, setStartingScore] = useState<StartingScore>(501);
  const [bestOfLegs, setBestOfLegs] = useState<BestOfLegs>(3);
  const [generatedMatches, setGeneratedMatches] = useState<GeneratedMatch[] | null>(null);\n  const [generatedPools, setGeneratedPools] = useState<GeneratedPool[]>([]);

  const activePlayers = players.map((player) => player.trim()).filter(Boolean);

  function updatePlayer(index: number, value: string) {
    setPlayers((current) => current.map((player, i) => (i === index ? value : player)));
  }

  function addPlayer() {
    setPlayers((current) => [...current, ""]);
  }

  function generateCompetition() {
    if (!format) return;
    const matches: GeneratedMatch[] = [];
    const pools: GeneratedPool[] = [];

    if (format === "pools") {
      const poolCount = Math.max(1, Math.ceil(activePlayers.length / 5));
      for (let i = 0; i < poolCount; i += 1) {
        pools.push({ name: `Pulje ${String.fromCharCode(65 + i)}`, players: [] });
      }

      activePlayers.forEach((player, index) => {
        pools[index % poolCount].players.push(player);
      });

      pools.forEach((pool, poolIndex) => {
        for (let i = 0; i < pool.players.length; i += 1) {
          for (let j = i + 1; j < pool.players.length; j += 1) {
            matches.push({
              id: `pool-${poolIndex}-match-${i}-${j}`,
              player1: pool.players[i],
              player2: pool.players[j],
              round: pool.name,
            });
          }
        }
      });
    } else if (format === "roundRobin") {
      for (let i = 0; i < activePlayers.length; i += 1) {
        for (let j = i + 1; j < activePlayers.length; j += 1) {
          matches.push({ id: `match-${i}-${j}`, player1: activePlayers[i], player2: activePlayers[j] });
        }
      }
    } else {
      for (let i = 0; i < activePlayers.length; i += 2) {
        matches.push({ id: `match-${i}`, player1: activePlayers[i], player2: activePlayers[i + 1] ?? "BYE", round: "1. runde" });
      }
    }

    setGeneratedPools(pools);
    setGeneratedMatches(matches);
  }
