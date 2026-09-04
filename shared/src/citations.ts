export interface Citation {
  tag: string;
  claim: string;
  source: string;
  year: number;
  url: string;
}

export const CITATIONS: readonly Citation[] = [
  {
    tag: "crash-injury-sex-gap",
    claim: "In 1998–2015 frontal crashes, belted female occupants had 73% greater odds of serious injury than belted male occupants after adjustment for crash and occupant factors.",
    source: "Forman et al., Traffic Injury Prevention",
    year: 2019,
    url: "https://doi.org/10.1080/15389588.2019.1630825",
  },
  {
    tag: "crash-dummy-body-range",
    claim: "The Hybrid III 50th-percentile adult male represents a 5 ft 9 in, 171 lb occupant; the 5th-percentile adult female represents a 4 ft 11 in, 108 lb occupant.",
    source: "National Highway Traffic Safety Administration",
    year: 2022,
    url: "https://www.nhtsa.gov/sites/nhtsa.gov/files/2022-12/Report-to-Congress-Interim-Report-to-Congress-on-Crash-Test-Dummies_FINAL-tag_0.pdf",
  },
  {
    tag: "seatbelt-pregnancy-fit",
    claim: "During pregnancy, the lap belt should fit below the belly across the hips and pelvic bone, with the shoulder belt across the chest.",
    source: "National Highway Traffic Safety Administration",
    year: 2015,
    url: "https://www.nhtsa.gov/sites/nhtsa.dot.gov/files/documents/pregnant-seat-belt-use.pdf",
  },
  {
    tag: "ppe-male-default",
    claim: "Protective equipment designed around average-sized men can fit women poorly and provide less protection.",
    source: "CDC / National Institute for Occupational Safety and Health",
    year: 2013,
    url: "https://www.cdc.gov/niosh/bulletin/2013/womens-health-at-work.html",
  },
  {
    tag: "ppe-anthropometric-fit",
    claim: "PPE sizing data should represent the current working population; body dimensions directly inform respirator, eye, clothing, footwear, and harness design.",
    source: "CDC / National Institute for Occupational Safety and Health",
    year: 2023,
    url: "https://www.cdc.gov/niosh/bulletin/2023/ppe-fit-construction.html",
  },
  {
    tag: "respirator-model-fit",
    claim: "Respirator sizes are not standardized across models, so users need fit testing for each tight-fitting model they wear.",
    source: "CDC / National Institute for Occupational Safety and Health",
    year: 2025,
    url: "https://www.cdc.gov/niosh/ppe/respirators/fit-testing.html",
  },
  {
    tag: "drug-trial-early-exclusion",
    claim: "The FDA's 1977 guideline generally excluded women of childbearing potential from Phase I and early Phase II drug studies until the restriction was withdrawn in 1993.",
    source: "U.S. Food and Drug Administration",
    year: 1993,
    url: "https://www.fda.gov/media/75648/download",
  },
  {
    tag: "clinical-research-inclusion",
    claim: "The NIH Revitalization Act of 1993 required inclusion of women in NIH-supported clinical research and analysis of differing outcomes in clinical trials.",
    source: "National Institutes of Health",
    year: 1993,
    url: "https://grants.nih.gov/policy-and-compliance/policy-topics/inclusion/women-and-minorities/guideline",
  },
  {
    tag: "drug-dose-sex-differences",
    claim: "Across 86 drugs with reported pharmacokinetic differences, 76 produced higher blood concentrations or longer elimination times in women; these differences tracked female-biased adverse reactions.",
    source: "Zucker and Prendergast, Biology of Sex Differences",
    year: 2020,
    url: "https://pubmed.ncbi.nlm.nih.gov/32503637/",
  },
  {
    tag: "speech-recognition-gender-bias",
    claim: "Automatic speech-recognition performance differs by gender, age, accent, language, and model architecture; the advantaged group is context-dependent.",
    source: "Feng et al., Computer Speech & Language",
    year: 2024,
    url: "https://doi.org/10.1016/j.csl.2023.101567",
  },
  {
    tag: "office-temperature-male-baseline",
    claim: "A standard thermal-comfort metabolic rate based on an average male may overestimate female metabolic rate by up to 35%.",
    source: "Kingma and van Marken Lichtenbelt, Nature Climate Change",
    year: 2015,
    url: "https://doi.org/10.1038/nclimate2741",
  },
  {
    tag: "handheld-thumb-reach",
    claim: "Thumb reach envelopes differ across user groups and should inform placement of primary controls on handheld devices.",
    source: "Otten et al., Human Factors",
    year: 2013,
    url: "https://pubmed.ncbi.nlm.nih.gov/23516793/",
  },
];

export const CITATION_TAGS: readonly string[] = CITATIONS.map(({ tag }) => tag);

const CITATIONS_BY_TAG = new Map(CITATIONS.map((citation) => [citation.tag, citation]));

export function citationsForTags(tags: readonly string[]): Citation[] {
  return [...new Set(tags)].flatMap((tag) => {
    const citation = CITATIONS_BY_TAG.get(tag);
    return citation ? [citation] : [];
  });
}
