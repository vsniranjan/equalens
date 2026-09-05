import type { Category, Finding, Severity } from "@equalens/shared/types";
import { createUniqueSelector } from "./selectors";

interface FindingCopy {
  title: string;
  assumption: string;
  impact: string;
  affected: string[];
  evidenceTags: string[];
}

interface TextRule {
  key: string;
  category: Category;
  severity: Severity;
  stereotype?: boolean;
  matches: (text: string) => boolean;
  copy: FindingCopy;
}

const SIZE_RANGE_PATTERN = /\b(?:xxs|xs|small|medium|large|xl|xxl|\d+(?:\.\d+)?)\s*(?:-|–|—|to|through)\s*(?:xxs|xs|small|medium|large|xl|xxl|\d+(?:\.\d+)?)\b/i;
const TEXT_CONTAINER_SELECTOR = "p, li, dd, dt, h1, h2, h3, h4, h5, h6, blockquote, figcaption, label, legend, th, td, button, a, option, article, section, div";
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input:not([type='hidden'])",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const TEXT_RULES: readonly TextRule[] = [
  {
    key: "stereotype",
    category: "language",
    severity: "language",
    stereotype: true,
    matches: (text) => /\b(?:simplified\s+for\s+women|ladies['’]?\s+(?:edition|version)|easy\s+enough\s+for\s+mom)\b/i.test(text)
      || (/\bfemale[-\s]+friendly\b/i.test(text) && /\b(?:fewer|simplif|limited|basic|easy)\w*\b/i.test(text)),
    copy: {
      title: "Gender stereotype presented as inclusion",
      assumption: "Women benefit from fewer features or reduced control.",
      impact: "The fix is never fewer features — it is removing the unsupported gender assumption.",
      affected: ["people who need full capability", "people outside gender stereotypes"],
      evidenceTags: [],
    },
  },
  {
    key: "single-body-safety",
    category: "safety",
    severity: "safety-high",
    matches: (text) => /\b(?:50th[-\s]+percentile|average\s+male|standard\s+crash[-\s]+test)\b/i.test(text),
    copy: {
      title: "Single-body safety baseline",
      assumption: "One average male body represents the full range of people who use this system.",
      impact: "People outside that reference body may receive less protection or have controls placed beyond comfortable reach.",
      affected: ["shorter occupants", "pregnancy", "people with different reach ranges"],
      evidenceTags: ["crash-injury-sex-gap", "crash-dummy-body-range", "seatbelt-pregnancy-fit"],
    },
  },
  {
    key: "unbounded-restraint-spec",
    category: "safety",
    severity: "safety-med",
    matches: (text) => text.length >= 30
      && /\b(?:restraint|harness)\b/i.test(text)
      && /\b(?:certif(?:ied|ication)?|validat(?:ed|ion)?|specification|fixed|standard|\d+\s*(?:cm|mm|kg|inches?))\b/i.test(text)
      && !hasSizeRange(text),
    copy: {
      title: "Safety specification has no fit range",
      assumption: "A restraint or harness can protect everyone without publishing the body range it supports.",
      impact: "People cannot tell whether the safety system accommodates their body dimensions.",
      affected: ["shorter occupants", "larger occupants", "pregnancy"],
      evidenceTags: ["crash-dummy-body-range", "seatbelt-pregnancy-fit"],
    },
  },
  {
    key: "one-size-fits-all",
    category: "usability",
    severity: "usability-high",
    matches: (text) => /\bone[-\s]+size[-\s]+fits?[-\s]+all\b/i.test(text),
    copy: {
      title: "One-size design assumption",
      assumption: "One fixed size or geometry works equally well for every user.",
      impact: "Fixed dimensions can reduce comfort, reach, control, or safe fit for people outside the assumed body range.",
      affected: ["smaller hand spans", "shorter reach", "larger body dimensions"],
      evidenceTags: ["ppe-anthropometric-fit", "handheld-thumb-reach"],
    },
  },
  {
    key: "one-size",
    category: "usability",
    severity: "usability-med",
    matches: (text) => /\bone[-\s]+size\b/i.test(text) && !/\bone[-\s]+size[-\s]+fits?[-\s]+all\b/i.test(text),
    copy: {
      title: "One-size design assumption",
      assumption: "One fixed size or geometry works equally well for every user.",
      impact: "Fixed dimensions can reduce comfort, reach, or control for people outside the assumed body range.",
      affected: ["smaller hand spans", "shorter reach", "larger body dimensions"],
      evidenceTags: ["ppe-anthropometric-fit", "handheld-thumb-reach"],
    },
  },
  {
    key: "standard-fit",
    category: "usability",
    severity: "usability-med",
    matches: (text) => /\bstandard\s+fit\b/i.test(text),
    copy: {
      title: "Unspecified standard fit",
      assumption: "A single unnamed body standard is sufficient for all users.",
      impact: "Without an adjustment or published fit range, users cannot assess whether the design will accommodate them.",
      affected: ["people outside average dimensions", "people needing adjustability"],
      evidenceTags: ["ppe-anthropometric-fit"],
    },
  },
  {
    key: "unisex-without-range",
    category: "usability",
    severity: "usability-med",
    matches: (text) => /\bunisex\b/i.test(text) && !hasSizeRange(text),
    copy: {
      title: "Unisex fit without a size range",
      assumption: "Calling a product unisex is enough to establish that it fits different bodies.",
      impact: "A neutral label does not replace measurements, adjustment, or representative sizing data.",
      affected: ["people outside the sample body", "people comparing fit options"],
      evidenceTags: ["ppe-male-default", "ppe-anthropometric-fit"],
    },
  },
  {
    key: "male-default-language",
    category: "language",
    severity: "language",
    matches: (text) => /\b(?:he|his|manpower|chairman)\b/i.test(text),
    copy: {
      title: "Male-default language",
      assumption: "A male term can stand in for every person in this role.",
      impact: "Generic male language can signal that other people are exceptions rather than expected participants.",
      affected: ["women", "non-binary people", "people who use another title"],
      evidenceTags: [],
    },
  },
];

/** Reads the current document and returns deterministic local findings without mutating it. */
export function runHeuristicScan(document: Document): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const scannedTextContainers = new Set<Element>();
  const root = document.body ?? document.documentElement;

  if (!root) return findings;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!normalizeText(node.nodeValue ?? "")) continue;
    const parent = node.parentElement;
    if (!parent || isExcluded(parent)) continue;
    const container = parent.closest(TEXT_CONTAINER_SELECTOR) ?? parent;
    if (scannedTextContainers.has(container)) continue;
    scannedTextContainers.add(container);

    const text = normalizeText(container.textContent ?? "");
    for (const rule of TEXT_RULES) {
      if (!rule.matches(text)) continue;
      addFinding(findings, seen, container, rule.key, rule.category, rule.severity, rule.copy, {
        ...(rule.stereotype ? { stereotype: true } : {}),
      });
    }
  }

  addLimitedSelectFindings(document, findings, seen);
  addLimitedRadioFindings(document, findings, seen);
  addUnlabeledControlFindings(document, findings, seen);
  addSmallTargetFindings(document, findings, seen);

  return findings;
}

export const scanDocumentHeuristics = runHeuristicScan;

function addLimitedSelectFindings(document: Document, findings: Finding[], seen: Set<string>): void {
  for (const select of document.querySelectorAll<HTMLSelectElement>("select")) {
    if (isExcluded(select)) continue;
    const choices = new Set([...select.options]
      .map((option) => normalizeChoice(option.value || option.textContent || ""))
      .filter(Boolean));
    if (choices.size !== 2 || !choices.has("mr") || !choices.has("mrs")) continue;
    addFinding(findings, seen, select, "limited-title-select", "language", "language", {
      title: "Title field offers Mr./Mrs. only",
      assumption: "Every user wants and can be represented by one of two gendered titles.",
      impact: "People who use another title, no title, or a non-binary identity cannot answer accurately.",
      affected: ["non-binary people", "people with another title", "people who prefer no title"],
      evidenceTags: [],
    });
  }
}

function addLimitedRadioFindings(document: Document, findings: Finding[], seen: Set<string>): void {
  const groups = new Map<string, HTMLInputElement[]>();
  for (const input of document.querySelectorAll<HTMLInputElement>('input[type="radio"]')) {
    if (isExcluded(input)) continue;
    const key = input.name || selectorFor(input) || `unnamed-${groups.size}`;
    groups.set(key, [...(groups.get(key) ?? []), input]);
  }

  for (const radios of groups.values()) {
    const choices = new Set(radios.map((radio) => normalizeChoice(radio.value || labelText(document, radio))));
    const isBinaryPair = choices.size === 2
      && (["m", "male"].some((choice) => choices.has(choice)))
      && (["f", "female"].some((choice) => choices.has(choice)));
    if (!isBinaryPair) continue;
    const target = radios[0]?.closest("fieldset") ?? radios[0]?.parentElement ?? radios[0];
    if (!target) continue;
    addFinding(findings, seen, target, "limited-gender-radios", "language", "language", {
      title: "Gender field offers a binary choice only",
      assumption: "Every user can be represented accurately by M or F.",
      impact: "The control excludes non-binary identities and may request gender where it is not needed.",
      affected: ["non-binary people", "people who prefer not to disclose gender"],
      evidenceTags: [],
    });
  }
}

function addUnlabeledControlFindings(document: Document, findings: Finding[], seen: Set<string>): void {
  const selector = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]), select, textarea';
  for (const control of document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)) {
    if (isExcluded(control) || hasAccessibleName(document, control)) continue;
    addFinding(findings, seen, control, "unlabeled-control", "usability", "usability-high", {
      title: "Form control has no accessible label",
      assumption: "Visual position or placeholder text is enough to identify this field.",
      impact: "Screen-reader and voice-control users may be unable to identify or operate the control reliably.",
      affected: ["screen-reader users", "voice-control users", "people with cognitive disabilities"],
      evidenceTags: [],
    });
  }
}

function addSmallTargetFindings(document: Document, findings: Finding[], seen: Set<string>): void {
  const controls = new Set(document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR));
  for (const control of controls) {
    if (isExcluded(control) || control.hasAttribute("disabled")) continue;
    const rect = control.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.width >= 24 || rect.height >= 24) continue;
    addFinding(findings, seen, control, "small-click-target", "usability", "usability-med", {
      title: "Click target is smaller than 24 px",
      assumption: "Every user can precisely activate a small target.",
      impact: "A small hit area increases missed activations for touch, tremor, and limited-dexterity users.",
      affected: ["touch users", "people with tremor", "people with limited dexterity"],
      evidenceTags: [],
    });
  }
}

function addFinding(
  findings: Finding[],
  seen: Set<string>,
  element: Element,
  ruleKey: string,
  category: Category,
  severity: Severity,
  copy: FindingCopy,
  options: { stereotype?: boolean } = {},
): void {
  const selector = selectorFor(element);
  const identity = `${ruleKey}\n${selector ?? ""}\n${normalizeText(element.textContent ?? element.tagName)}`;
  if (seen.has(identity)) return;
  seen.add(identity);

  findings.push({
    id: `heuristic-${ruleKey}-${stableHash(identity)}`,
    selector,
    ...copy,
    category,
    severity,
    confidence: "high",
    source: "heuristic",
    ...(options.stereotype ? { stereotype: true } : {}),
    redesignable: true,
    fixed: false,
  });
}

function selectorFor(element: Element): string | null {
  try {
    return createUniqueSelector(element, element.ownerDocument);
  } catch {
    return null;
  }
}

function hasAccessibleName(document: Document, control: HTMLElement): boolean {
  if (normalizeText(control.getAttribute("aria-label") ?? "")) return true;
  if (normalizeText(control.getAttribute("title") ?? "")) return true;
  const wrappingLabel = control.closest("label");
  if (wrappingLabel && normalizeText(wrappingLabel.textContent ?? "")) return true;

  const labelledBy = (control.getAttribute("aria-labelledby") ?? "").trim().split(/\s+/).filter(Boolean);
  if (labelledBy.some((id) => normalizeText(document.getElementById(id)?.textContent ?? ""))) return true;

  if (control.id && [...document.querySelectorAll<HTMLLabelElement>("label")]
    .some((label) => label.htmlFor === control.id && normalizeText(label.textContent ?? ""))) return true;

  return false;
}

function labelText(document: Document, control: HTMLInputElement): string {
  const wrappingLabel = control.closest("label");
  if (wrappingLabel) return wrappingLabel.textContent ?? "";
  if (!control.id) return "";
  return [...document.querySelectorAll<HTMLLabelElement>("label")]
    .find((label) => label.htmlFor === control.id)?.textContent ?? "";
}

function isExcluded(element: Element): boolean {
  return Boolean(element.closest("#equalens-root, script, style, noscript, template, [hidden], [aria-hidden='true']"));
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeChoice(value: string): string {
  return normalizeText(value).toLocaleLowerCase().replace(/[.]/g, "");
}

function hasSizeRange(value: string): boolean {
  if (SIZE_RANGE_PATTERN.test(value)) return true;
  const namedSizes = value.match(/\b(?:xxs|xs|small|medium|large|xl|xxl)\b/gi) ?? [];
  return new Set(namedSizes.map((size) => size.toLocaleLowerCase())).size >= 2;
}

function stableHash(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}
