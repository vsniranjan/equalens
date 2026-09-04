import React from "react";
import { createRoot } from "react-dom/client";
import "./popup.css";

function App() {
  return (
    <main className="shell">
      <header className="brand">
        <span className="brand-orb" aria-hidden="true" />
        <h1>EquaLens</h1>
      </header>
      <p>Select text on a page or open the edge orb to inspect an element.</p>
      <div className="status">
        <strong>Overlay ready</strong>
        <span>Analysis requests stay behind the Cloudflare Worker.</span>
      </div>
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
