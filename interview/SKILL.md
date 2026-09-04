---
name: interview
description: Interview the user about a plan file before implementation, to surface gaps in technical implementation, UI/UX, and tradeoffs. Use when the user asks to be interviewed about a plan, or right before starting to code from a plan.md file.
---

Find the plan file in the current directory (plan.md, PLAN.md, or the most recently mentioned plan file). If none exists, ask for the path.

Interview the user using the AskUserQuestion tool, one question at a time. Cover:
- Technical implementation choices and their tradeoffs
- UI/UX decisions
- Edge cases and failure modes
- Things the plan assumes but doesn't state

Rules:
- Skip anything already answered clearly in the plan.
- Don't ask questions with an obvious answer from context.
- Stop only when you've covered all four areas above and have a clear understanding of the project and when no guesswork is required.

When done, write the answers into a spec file (spec.md, same directory as the plan) organized by section, and tell the user what changed vs the original plan.
