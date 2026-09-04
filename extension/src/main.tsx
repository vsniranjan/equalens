import React from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

function App() {
  return (
    <main className="shell">
      <span className="eyebrow">SYSTEM READY</span>
      <h1>EquaLens</h1>
      <p>The extension foundation is active. Selection and scan tools arrive in Phase 3.</p>
    </main>
  );
}

const root = document.querySelector<HTMLDivElement>("#root");

if (!root) {
  throw new Error("EquaLens popup root was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
