import type { InterestCategory } from "@equalens/shared/types";
import { useEffect, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  DEFAULT_PREFERENCES,
  INTEREST_CATEGORIES,
  loadPreferences,
  savePreferences,
  type BuddyStyle,
  type EqualensPreferences,
} from "./preferences";
import "./onboarding.css";

const CATEGORY_OPTIONS: ReadonlyArray<{
  value: InterestCategory;
  label: string;
  description: string;
  reference: string;
  symbol: string;
}> = [
  { value: "safety", label: "Safety", description: "Restraints, protective equipment, and safety standards", reference: "SAFETY", symbol: "✚" },
  { value: "sizing-fit", label: "Sizing & fit", description: "One-size claims, grip, reach, and anthropometric fit", reference: "FIT", symbol: "↔" },
  { value: "language", label: "Language", description: "Gendered defaults, labels, and form conventions", reference: "LANG", symbol: "“" },
  { value: "everyday-usability", label: "Accessibility", description: "Targets, labels, contrast, and everyday usability", reference: "A11Y", symbol: "◉" },
];

type SaveState = "idle" | "saving" | "saved" | "error";

function OnboardingApp() {
  const [step, setStep] = useState<1 | 2>(1);
  const [preferences, setPreferences] = useState<EqualensPreferences>({
    ...DEFAULT_PREFERENCES,
    categories: [...DEFAULT_PREFERENCES.categories],
  });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void loadPreferences().then((stored) => {
      if (!active) return;
      setPreferences(stored);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoading(false);
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "EquaLens could not load your settings.");
    });
    return () => { active = false; };
  }, []);

  const selectBuddy = (buddyStyle: BuddyStyle): void => {
    setPreferences((current) => ({ ...current, buddyStyle }));
    setSaveState("idle");
  };

  const toggleCategory = (category: InterestCategory): void => {
    setPreferences((current) => {
      const selected = current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category];
      return { ...current, categories: selected };
    });
    setSaveState("idle");
  };

  const toggleEverything = (): void => {
    setPreferences((current) => ({
      ...current,
      categories: current.categories.length === INTEREST_CATEGORIES.length ? [] : [...INTEREST_CATEGORIES],
    }));
    setSaveState("idle");
  };

  const finish = async (): Promise<void> => {
    if (preferences.categories.length === 0) {
      setSaveState("error");
      setMessage("Choose at least one area for EquaLens to watch.");
      return;
    }
    setSaveState("saving");
    setMessage("");
    try {
      const stored = await savePreferences({ ...preferences, onboardingComplete: true });
      setPreferences(stored);
      setSaveState("saved");
      setMessage("Preferences saved. EquaLens is ready on your open web pages.");
      window.setTimeout(() => window.close(), 350);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "EquaLens could not save your settings.");
    }
  };

  const allSelected = preferences.categories.length === INTEREST_CATEGORIES.length;

  return (
    <div className="onboarding-shell">
      <header className="onboarding-topbar">
        <Brand />
        <span className="onboarding-status"><i aria-hidden="true" /> Local-first browser analysis</span>
      </header>

      <main className="onboarding-main" aria-busy={loading || saveState === "saving"}>
        <section className="setup-panel" aria-labelledby="setup-title">
          <header className="setup-progress">
            <Brand compact />
            <div className="progress-copy">
              <span>Step {step} of 2</span>
              <div className="progress-track" aria-hidden="true"><i style={{ width: step === 1 ? "50%" : "100%" }} /></div>
            </div>
          </header>

          {loading ? <LoadingState /> : step === 1 ? (
            <div className="setup-content">
              <div className="setup-heading">
                <h1 id="setup-title">Choose your companion</h1>
                <p>Select how EquaLens presents findings and suggestions while you browse.</p>
              </div>
              <fieldset className="buddy-options">
                <legend className="visually-hidden">Companion style</legend>
                <BuddyOption
                  active={preferences.buddyStyle === "orb"}
                  description="A subtle animated companion that appears when you select content."
                  label="Orb"
                  onSelect={() => selectBuddy("orb")}
                  preview={<span className="orb-preview" aria-hidden="true"><i /></span>}
                />
                <BuddyOption
                  active={preferences.buddyStyle === "minimal"}
                  description="A compact, static indicator with no character animation."
                  label="Minimal badge"
                  onSelect={() => selectBuddy("minimal")}
                  preview={<span className="badge-preview" aria-hidden="true"><i /> EQL // 00</span>}
                />
              </fieldset>
              <PrivacyNotice />
              <div className="setup-actions">
                <span>Configurable anytime via Settings</span>
                <button className="primary-action" type="button" onClick={() => setStep(2)}>Continue <b aria-hidden="true">→</b></button>
              </div>
            </div>
          ) : (
            <div className="setup-content category-step">
              <div className="setup-heading">
                <h1 id="setup-title">What should EquaLens watch for?</h1>
                <p>Choose the audit dimensions relevant to your design review.</p>
              </div>
              <fieldset className="category-options">
                <legend className="visually-hidden">Interest categories</legend>
                {CATEGORY_OPTIONS.map((option) => (
                  <CategoryOption
                    {...option}
                    checked={preferences.categories.includes(option.value)}
                    key={option.value}
                    onChange={() => toggleCategory(option.value)}
                  />
                ))}
                <label className="category-option category-all" data-checked={allSelected}>
                  <input type="checkbox" checked={allSelected} onChange={toggleEverything} />
                  <span className="check-mark" aria-hidden="true">✓</span>
                  <span><strong>Scan everything</strong><small>Use every available audit dimension</small></span>
                  <b>Recommended</b>
                </label>
              </fieldset>
              <div className="setup-actions setup-actions-final">
                <button className="text-action" type="button" onClick={() => setStep(1)}>← Back</button>
                <button className="primary-action" type="button" disabled={saveState === "saving"} onClick={() => void finish()}>
                  {saveState === "saving" ? "Saving…" : preferences.onboardingComplete ? "Save settings" : "Start browsing"} <b aria-hidden="true">→</b>
                </button>
              </div>
              {message && <p className="save-message" data-state={saveState} role={saveState === "error" ? "alert" : "status"}>{message}</p>}
            </div>
          )}
        </section>
        <footer className="onboarding-footer"><span><i aria-hidden="true" /> Preferences sync through Chrome</span><span>Private by design</span></footer>
      </main>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand-lockup" data-compact={compact}><span className="brand-orb" aria-hidden="true"><i /></span><strong>EquaLens</strong></div>;
}

function BuddyOption({ active, label, description, preview, onSelect }: {
  active: boolean; label: string; description: string; preview: ReactNode; onSelect: () => void;
}) {
  return (
    <label className="buddy-option" data-active={active}>
      <input type="radio" name="buddy-style" checked={active} onChange={onSelect} />
      <span className="buddy-option-title"><strong>{label}</strong>{active && <small>Active</small>}<i aria-hidden="true" /></span>
      <span className="buddy-preview-stage">{preview}</span>
      <span className="buddy-description">{description}</span>
    </label>
  );
}

function CategoryOption({ value, label, description, reference, symbol, checked, onChange }: {
  value: InterestCategory; label: string; description: string; reference: string; symbol: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label className="category-option" data-checked={checked}>
      <input type="checkbox" value={value} checked={checked} onChange={onChange} />
      <span className="check-mark" aria-hidden="true">✓</span>
      <span className="category-symbol" aria-hidden="true">{symbol}</span>
      <span><strong>{label}</strong><small>{description}</small></span>
      <b>{reference}</b>
    </label>
  );
}

function PrivacyNotice() {
  return <p className="privacy-notice"><span aria-hidden="true">✓</span> EquaLens never asks for or stores personal, gender, or medical information.</p>;
}

function LoadingState() {
  return <div className="loading-state" role="status" aria-label="Loading settings"><i /><i /><i /></div>;
}

const root = document.querySelector<HTMLDivElement>("#onboarding-root");
if (!root) throw new Error("EquaLens onboarding root was not found.");
createRoot(root).render(<OnboardingApp />);
