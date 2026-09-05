// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { runHeuristicScan } from "./heuristics";

describe("Phase 5 heuristic scan", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("emits deterministic findings for every copy and form rule family", () => {
    document.body.innerHTML = `
      <main>
        <p id="safety">Certified against the 50th-percentile adult male crash test dummy.</p>
        <p id="harness">Harness certified for a single occupant profile without a published range.</p>
        <p id="one-size">One-size steering grip</p>
        <p id="one-size-all">One-size-fits-all sport seats</p>
        <p id="standard-fit">Standard fit headrest</p>
        <p id="unisex">Unisex protective vest</p>
        <p id="male-default">Each account holder must enter his contact details.</p>
        <p id="stereotype">Female-friendly controls with fewer options.</p>
        <label>Title
          <select id="title"><option>Mr.</option><option>Mrs.</option></select>
        </label>
        <fieldset id="gender">
          <legend>Gender</legend>
          <label><input type="radio" name="gender" value="M" /> Male</label>
          <label><input type="radio" name="gender" value="F" /> Female</label>
        </fieldset>
      </main>
    `;

    const first = runHeuristicScan(document);
    const second = runHeuristicScan(document);

    expect(second).toEqual(first);
    expect(first).toHaveLength(10);
    expect(first.every((finding) => finding.source === "heuristic" && !finding.fixed)).toBe(true);
    expect(first.every((finding) => finding.selector !== null)).toBe(true);
    expect(first.map(({ title }) => title)).toEqual(expect.arrayContaining([
      "Single-body safety baseline",
      "Safety specification has no fit range",
      "One-size design assumption",
      "Unspecified standard fit",
      "Unisex fit without a size range",
      "Male-default language",
      "Gender stereotype presented as inclusion",
      "Title field offers Mr./Mrs. only",
      "Gender field offers a binary choice only",
    ]));

    const stereotype = first.find((finding) => finding.stereotype);
    expect(stereotype).toMatchObject({
      category: "language",
      severity: "language",
      impact: "The fix is never fewer features — it is removing the unsupported gender assumption.",
    });
    expect(first.filter(({ title }) => title === "One-size design assumption").map(({ severity }) => severity).sort())
      .toEqual(["usability-high", "usability-med"]);
  });

  it("detects unlabeled controls and genuinely small click targets", () => {
    document.body.innerHTML = `
      <input id="unlabeled" placeholder="Email" />
      <label for="labeled">Name</label><input id="labeled" />
      <button id="small" type="button">?</button>
      <button id="large" type="button">Continue</button>
    `;
    const small = document.querySelector<HTMLButtonElement>("#small")!;
    const large = document.querySelector<HTMLButtonElement>("#large")!;
    small.getBoundingClientRect = () => DOMRect.fromRect({ width: 20, height: 20 });
    large.getBoundingClientRect = () => DOMRect.fromRect({ width: 80, height: 40 });

    const findings = runHeuristicScan(document);

    expect(findings.filter(({ title }) => title === "Form control has no accessible label"))
      .toHaveLength(1);
    expect(findings.find(({ title }) => title === "Form control has no accessible label")?.selector)
      .toBe("#unlabeled");
    expect(findings.filter(({ title }) => title === "Click target is smaller than 24 px"))
      .toEqual([expect.objectContaining({ selector: "#small", severity: "usability-med" })]);
  });

  it("does not flag inclusive alternatives or the extension overlay itself", () => {
    document.body.innerHTML = `
      <p>Unisex sizing available from XS–XL.</p>
      <p>Female-friendly equipment with the complete professional feature set.</p>
      <select aria-label="Title">
        <option>Mr.</option><option>Mrs.</option><option>Mx.</option><option>No title</option>
      </select>
      <div id="equalens-root"><p>One-size-fits-all</p><input /></div>
    `;

    expect(runHeuristicScan(document)).toEqual([]);
  });
});
