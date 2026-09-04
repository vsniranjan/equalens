import type { Severity } from "./types";

export const TOKENS = {
  primary: "#0F5257",
  primaryDark: "#003A3E",
  canvas: "#EAF4F4",
  ink: "#0E1B1D",
  border: "#D5E3E3",
  resolved: "#2D936C",
  severity: {
    safetyHigh: "#D64550",
    usability: "#E8A13C",
    language: "#3E7CB1",
  },
} as const;

export const SCORE_WEIGHTS: Readonly<Record<Severity, number>> = {
  "safety-high": 18,
  "safety-med": 12,
  "usability-high": 10,
  "usability-med": 6,
  language: 3,
};

export function calculateInclusionScore(severities: readonly Severity[]): number {
  const deductions = severities.reduce((total, severity) => total + SCORE_WEIGHTS[severity], 0);
  return Math.max(0, 100 - deductions);
}
