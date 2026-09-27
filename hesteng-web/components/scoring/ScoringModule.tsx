"use client";

import MatchScorer, { type MatchScorerProps } from "@/components/MatchScorer";

export type ScoringModuleProps = MatchScorerProps;

/**
 * Canonical HESTENG match scoring module.
 * Competition, club nights and other match flows must enter scoring here
 * instead of owning separate scoring rules.
 */
export default function ScoringModule(props: ScoringModuleProps) {
  return <MatchScorer {...props} />;
}
