import { citationsForTags } from "@equalens/shared/citations";
import type { AnalyzeMode, AnalyzeRequest, AnalyzeResponse, Finding, Severity } from "@equalens/shared/types";
import { useEffect, useRef, useState } from "react";

export type AnalysisAction = "explain" | "excluded" | "evidence" | "redesign";
export type AnalyzeHandler = (request: AnalyzeRequest) => Promise<AnalyzeResponse>;
export type RedesignHandler = (finding: Finding, request: AnalyzeRequest) => Promise<void>;
export type AnalysisIndicator = { mode: "idle" } | { mode: "thinking" } | { mode: "alert"; count: number };

interface AnalysisCardProps {
  request: AnalyzeRequest;
  onAnalyze: AnalyzeHandler;
  onRedesign: RedesignHandler;
  onIndicatorChange: (indicator: AnalysisIndicator) => void;
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; mode: AnalyzeMode }
  | { status: "success"; mode: AnalyzeMode; response: AnalyzeResponse }
  | { status: "error"; mode: AnalyzeMode; message: string };

type RedesignState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success" }
  | { status: "error"; message: string };

const ACTIONS: ReadonlyArray<{ id: AnalysisAction; label: string }> = [
  { id: "explain", label: "Explain" },
  { id: "excluded", label: "Who's excluded?" },
  { id: "evidence", label: "Evidence" },
  { id: "redesign", label: "Redesign" },
];

export function AnalysisCard({ request, onAnalyze, onRedesign, onIndicatorChange }: AnalysisCardProps) {
  const [action, setAction] = useState<AnalysisAction>("explain");
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const [redesignState, setRedesignState] = useState<RedesignState>({ status: "idle" });
  const requestKey = `${request.pageUrl}\n${request.selector}\n${request.text}`;
  const currentRequestKey = useRef(requestKey);
  const previousRequestKey = useRef(requestKey);
  currentRequestKey.current = requestKey;

  useEffect(() => {
    if (previousRequestKey.current === requestKey) return;
    previousRequestKey.current = requestKey;
    setAction("explain");
    setState({ status: "idle" });
    setRedesignState({ status: "idle" });
    onIndicatorChange({ mode: "idle" });
  }, [requestKey, onIndicatorChange]);

  const runAnalysis = async (mode: AnalyzeMode, nextAction: AnalysisAction = mode): Promise<void> => {
    const startedFor = requestKey;
    setAction(nextAction);
    setState({ status: "loading", mode });
    onIndicatorChange({ mode: "thinking" });
    try {
      const response = await onAnalyze({ ...request, mode });
      if (currentRequestKey.current !== startedFor) return;
      setState({ status: "success", mode, response });
      onIndicatorChange(response.findings.length > 0
        ? { mode: "alert", count: response.findings.length }
        : { mode: "idle" });
    } catch (error) {
      if (currentRequestKey.current !== startedFor) return;
      setState({
        status: "error",
        mode,
        message: error instanceof Error ? error.message : "EquaLens could not analyze this selection.",
      });
      onIndicatorChange({ mode: "idle" });
    }
  };

  const chooseAction = (nextAction: AnalysisAction): void => {
    if (nextAction === "redesign") {
      setAction(nextAction);
      void runRedesign();
      return;
    }
    if (nextAction === "evidence") {
      if (state.status === "success") setAction(nextAction);
      else void runAnalysis("explain", nextAction);
      return;
    }
    if (state.status === "success" && state.mode === nextAction) {
      setAction(nextAction);
      return;
    }
    void runAnalysis(nextAction);
  };

  const retry = (): void => {
    const mode = state.status === "error" ? state.mode : "explain";
    void runAnalysis(mode, action);
  };

  async function runRedesign(): Promise<void> {
    const startedFor = requestKey;
    setRedesignState({ status: "loading" });
    onIndicatorChange({ mode: "thinking" });
    try {
      const response = state.status === "success"
        ? state.response
        : await onAnalyze({ ...request, mode: "explain" });
      if (currentRequestKey.current !== startedFor) return;
      const finding = response.findings[0];
      if (!finding) throw new Error("No redesignable assumption was found for this selection.");
      if (!finding.redesignable) throw new Error("This finding cannot be redesigned safely in place.");
      if (state.status !== "success") setState({ status: "success", mode: "explain", response });
      await onRedesign(finding, request);
      if (currentRequestKey.current !== startedFor) return;
      setRedesignState({ status: "success" });
      onIndicatorChange({ mode: "alert", count: 1 });
    } catch (error) {
      if (currentRequestKey.current !== startedFor) return;
      setRedesignState({
        status: "error",
        message: error instanceof Error ? error.message : "EquaLens could not redesign this selection.",
      });
      onIndicatorChange({ mode: "idle" });
    }
  }

  return (
    <section className="eqx-analysis" aria-label="EquaLens selection analysis">
      <header className="eqx-analysis-header">
        <div className="eqx-analysis-identity">
          <span className="eqx-analysis-mark" aria-hidden="true" />
          <strong>EquaLens</strong>
          <span className="eqx-target-label">Active target</span>
        </div>
        <p title={request.text}>{request.text}</p>
      </header>

      <div className="eqx-analysis-tabs" role="group" aria-label="Selection actions">
        {ACTIONS.map(({ id, label }) => (
          <button
            className="eqx-analysis-tab"
            type="button"
            aria-pressed={action === id}
            disabled={state.status === "loading" || redesignState.status === "loading"}
            key={id}
            onClick={() => chooseAction(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="eqx-analysis-body" aria-live="polite">
        {action === "redesign"
          ? <RedesignContent state={redesignState} retry={() => void runRedesign()} />
          : <AnalysisContent action={action} state={state} retry={retry} />}
      </div>
    </section>
  );
}

function AnalysisContent({ action, state, retry }: {
  action: Exclude<AnalysisAction, "redesign">;
  state: AnalysisState;
  retry: () => void;
}) {
  if (state.status === "idle") {
    return (
      <div className="eqx-analysis-prompt">
        <strong>Ready to inspect this assumption</strong>
        <span>Choose an action above. Evidence is matched only to verified sources.</span>
      </div>
    );
  }
  if (state.status === "loading") return <AnalysisSkeleton />;
  if (state.status === "error") {
    return (
      <div className="eqx-analysis-error" role="alert">
        <strong>Analysis paused</strong>
        <span>{state.message}</span>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }

  const finding = state.response.findings[0];
  if (!finding) return <NeutralResult summary={state.response.summary} />;
  if (action === "excluded") return <ExcludedResult finding={finding} />;
  if (action === "evidence") return <EvidenceResult finding={finding} />;
  return <ExplainResult finding={finding} />;
}

export function FindingExplanation({ finding }: { finding: Finding }) {
  const citations = citationsForTags(finding.evidenceTags);
  return (
    <>
      <div className="eqx-finding-heading">
        <span className="eqx-section-label">Hidden assumption</span>
        <div className="eqx-finding-classification">
          {finding.stereotype && <span className="eqx-stereotype-chip">Stereotype</span>}
          <SeverityChip severity={finding.severity} />
        </div>
      </div>
      <p className="eqx-assumption">{finding.assumption}</p>
      <p className="eqx-impact">{finding.impact}</p>

      <span className="eqx-section-label">Affected situations</span>
      <div className="eqx-situation-list">
        {finding.affected.map((item) => <span key={item}>{item}</span>)}
      </div>

      <span className="eqx-section-label">Evidence</span>
      <EvidenceRows finding={finding} citations={citations} />
      <Confidence confidence={finding.confidence} />
    </>
  );
}

const ExplainResult = FindingExplanation;

function ExcludedResult({ finding }: { finding: Finding }) {
  return (
    <>
      <span className="eqx-section-label">Who may be excluded</span>
      <ul className="eqx-excluded-list">
        {finding.affected.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="eqx-result-note">
        <strong>Why it matters</strong>
        <span>{finding.impact}</span>
      </div>
      <Confidence confidence={finding.confidence} />
    </>
  );
}

function EvidenceResult({ finding }: { finding: Finding }) {
  const citations = citationsForTags(finding.evidenceTags);
  return (
    <>
      <span className="eqx-section-label">Sources for this finding</span>
      <EvidenceRows finding={finding} citations={citations} />
      <Confidence confidence={finding.confidence} />
    </>
  );
}

function EvidenceRows({ finding, citations }: { finding: Finding; citations: ReturnType<typeof citationsForTags> }) {
  return (
    <div className="eqx-evidence-list">
      {citations.map((citation) => (
        <a href={citation.url} target="_blank" rel="noreferrer" key={citation.tag}>
          <span>{citation.claim}</span>
          <small><b aria-hidden="true">✓</b> verified source · {citation.source}, {citation.year}</small>
        </a>
      ))}
      <div className="eqx-inference-row">
        <span>{finding.impact}</span>
        <small><b aria-hidden="true">◇</b> AI inference</small>
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="eqx-skeleton" role="status" aria-label="Analyzing selection">
      <span />
      <span />
      <span />
      <small>Checking the assumption against verified evidence…</small>
    </div>
  );
}

function NeutralResult({ summary }: { summary: string }) {
  return (
    <div className="eqx-neutral-result">
      <span className="eqx-neutral-mark" aria-hidden="true">✓</span>
      <strong>No significant assumption found</strong>
      <span>{summary}</span>
    </div>
  );
}

function RedesignContent({ state, retry }: { state: RedesignState; retry: () => void }) {
  if (state.status === "loading") {
    return (
      <div className="eqx-skeleton" role="status" aria-label="Preparing redesign">
        <span /><span /><span />
        <small>Preserving controls and details while preparing the redesign…</small>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="eqx-analysis-error" role="alert">
        <strong>Redesign paused</strong>
        <span>{state.message}</span>
        <button type="button" onClick={retry}>Try again</button>
      </div>
    );
  }
  if (state.status === "success") {
    return (
      <div className="eqx-neutral-result">
        <span className="eqx-neutral-mark" aria-hidden="true">↔</span>
        <strong>Preview ready on the page</strong>
        <span>Compare both versions, then keep the inclusive change or revert it.</span>
      </div>
    );
  }
  return (
    <div className="eqx-analysis-prompt">
      <strong>Ready to redesign this assumption</strong>
      <span>EquaLens will preserve the original controls, information, and user capability.</span>
    </div>
  );
}

export function SeverityChip({ severity }: { severity: Severity }) {
  const label = severity === "language"
    ? "Language"
    : `${severity.startsWith("safety") ? "Safety" : "Usability"} ${severity.endsWith("high") ? "high" : "medium"}`;
  return <span className="eqx-severity" data-severity={severity}><i aria-hidden="true" />{label}</span>;
}

function Confidence({ confidence }: { confidence: Finding["confidence"] }) {
  return (
    <footer className="eqx-confidence">
      <span aria-hidden="true" />
      Confidence: {confidence}
    </footer>
  );
}
