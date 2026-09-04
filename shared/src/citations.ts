export interface Citation {
  tag: string;
  claim: string;
  source: string;
  year: number;
  url: string;
}

// Populated with the verified evidence library in Phase 4.
export const CITATIONS: readonly Citation[] = [];

export const CITATION_TAGS: readonly string[] = CITATIONS.map(({ tag }) => tag);
