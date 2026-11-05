---
name: validate-test-coverage
description: Measure test coverage once and report gaps against the 80% target on new or modified code. Use at the end of test-agent's pass or when coverage data is requested.
---

# Validate test coverage

## 1. Measure once

```bash
npm run test:coverage 2>&1 | tail -40
```

The text summary prints Statements / Branches / Functions / Lines. The HTML report lands in `coverage/` — open `coverage/index.html` only to locate uncovered lines in a file.

Do not re-run to "double check": re-measure only if a spec or a production file changed since.

## 2. Scope the verdict

The ≥ 80 % threshold applies to files **created or modified in the task**, all four metrics. Read their rows, not just the global total.

## 3. Prioritize gaps

| Gap                                    | Action                                          |
| -------------------------------------- | ----------------------------------------------- |
| Uncovered branch in a service/util     | One test per branch condition                   |
| Uncovered error path                   | Test the HTTP error / empty / missing-value case |
| Uncovered component interaction       | Render + trigger via `data-cy`, assert the effect |
| Uncovered mock generator branch        | Assert the anomaly or defect it injects         |

Bootstrap files (`main.ts`, `app.config.ts`, `app.routes.ts`) are not gaps.

## 4. Never game the metric

No empty `it()`, no `it.todo()`, no assertion-free render tests, no deleted assertions. Coverage without meaningful assertions is reported as a gap, not a pass.

## 5. Report

```
Couverture (fichiers touchés) : Stmts X% · Branches X% · Funcs X% · Lines X%
Écarts : <file:lines — behavior not protected> | aucun
```
