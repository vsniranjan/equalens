import type { InterestCategory } from "@equalens/shared/types";

export type BuddyStyle = "orb" | "minimal";

export interface EqualensPreferences {
  buddyStyle: BuddyStyle;
  categories: InterestCategory[];
  onboardingComplete: boolean;
}

export const INTEREST_CATEGORIES: readonly InterestCategory[] = [
  "safety",
  "sizing-fit",
  "language",
  "everyday-usability",
];

export const DEFAULT_PREFERENCES: Readonly<EqualensPreferences> = {
  buddyStyle: "orb",
  categories: [...INTEREST_CATEGORIES],
  onboardingComplete: false,
};

const STORAGE_KEY = "equalensPreferences";

export async function loadPreferences(): Promise<EqualensPreferences> {
  const storage = syncStorage();
  if (!storage) return cloneDefaults();
  const stored = await storage.get(STORAGE_KEY);
  return normalizePreferences(stored[STORAGE_KEY]);
}

export async function savePreferences(preferences: EqualensPreferences): Promise<EqualensPreferences> {
  const storage = syncStorage();
  if (!storage) throw new Error("Chrome sync storage is unavailable");
  const normalized = normalizePreferences(preferences);
  await storage.set({ [STORAGE_KEY]: normalized });
  return normalized;
}

export function watchPreferences(listener: (preferences: EqualensPreferences) => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return () => undefined;
  const handleChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string): void => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) return;
    listener(normalizePreferences(changes[STORAGE_KEY].newValue));
  };
  chrome.storage.onChanged.addListener(handleChange);
  return () => chrome.storage.onChanged.removeListener(handleChange);
}

function normalizePreferences(value: unknown): EqualensPreferences {
  if (!isRecord(value)) return cloneDefaults();
  const buddyStyle: BuddyStyle = value.buddyStyle === "minimal" ? "minimal" : "orb";
  const storedCategories = value.categories;
  const categories = Array.isArray(storedCategories)
    ? INTEREST_CATEGORIES.filter((category) => storedCategories.includes(category))
    : [...INTEREST_CATEGORIES];
  return {
    buddyStyle,
    categories: categories.length > 0 ? categories : [...INTEREST_CATEGORIES],
    onboardingComplete: value.onboardingComplete === true,
  };
}

function cloneDefaults(): EqualensPreferences {
  return { ...DEFAULT_PREFERENCES, categories: [...DEFAULT_PREFERENCES.categories] };
}

function syncStorage(): chrome.storage.SyncStorageArea | null {
  return typeof chrome !== "undefined" && chrome.storage?.sync ? chrome.storage.sync : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
