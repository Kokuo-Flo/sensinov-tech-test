---
name: challenge-tests
description: Audit existing specs to decide whether they really protect behavior or only inflate coverage. Use when reviewing a spec file or a set of specs.
---

# Challenge tests

## 1. Read production first

For each spec, read the file it covers and list: public methods and their branches, inputs/outputs, error paths, state transitions.

## 2. Classify every `it()`

| ID   | Severity   | Finding                                                                 |
| ---- | ---------- | ----------------------------------------------------------------------- |
| T-B1 | blocker    | No meaningful assertion (lone `toBeTruthy` / `toBeDefined` / smoke test) |
| T-B2 | blocker    | Tautology — asserts a constant or a passthrough mock value              |
| T-B3 | blocker    | Tests Angular/framework, not app behavior (manual `emit`, getter/setter) |
| T-B4 | blocker    | Private member access, `any`, `!`                                        |
| T-W1 | warning    | Hand-rolled mock where `provideServiceMock` applies                     |
| T-W2 | warning    | Positional access or CSS/tag selector instead of `data-testid`              |
| T-W3 | warning    | Bare `toHaveBeenCalled()` where arguments matter                         |
| T-W4 | warning    | Name does not match what is asserted                                    |
| T-S1 | suggestion | Missing error/edge path for a covered method                            |
| T-S2 | suggestion | Redundant test (same branch, same assertion)                            |

A test passes (✅) when it would fail on regression, asserts concrete values, and its name matches its assertions.

## 3. Score

`Quality = ✅ tests / total tests` → ≥ 80 % HEALTHY · 50–79 % NEEDS_IMPROVEMENT · < 50 % HOLLOW_COVERAGE.

## 4. Report

```
Fichier(s) : <spec> ↔ <production file>
Bloquants (T-B) : <id file:line — fix>
Avertissements (T-W) : …
Suggestions (T-S) : …
Qualité : X% — <verdict>
Actions : <prioritized rewrites/additions>
```
