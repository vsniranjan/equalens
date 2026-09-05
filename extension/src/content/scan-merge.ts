import type { Finding } from "@equalens/shared/types";

export function mergeScanFinding(findings: readonly Finding[], incoming: Finding): Finding[] {
  const matchingIndex = findings.findIndex((finding) => (
    incoming.selector !== null && finding.selector === incoming.selector
  ) || finding.id === incoming.id);

  if (matchingIndex < 0) return [...findings, { ...incoming }];

  const current = findings[matchingIndex];
  if (!current) return [...findings, { ...incoming }];
  const merged: Finding = {
    ...current,
    ...incoming,
    id: current.id,
    evidenceTags: [...new Set([...current.evidenceTags, ...incoming.evidenceTags])],
    fixed: current.fixed,
    ...(current.stereotype || incoming.stereotype ? { stereotype: true } : {}),
  };

  return findings.map((finding, index) => index === matchingIndex ? merged : finding);
}

export function mergeScanFindings(findings: readonly Finding[], incoming: readonly Finding[]): Finding[] {
  let merged = [...findings];
  for (const finding of incoming) merged = mergeScanFinding(merged, finding);
  return merged;
}
