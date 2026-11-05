# CLAUDE.md

## Project

**Smart Building** — Angular 22 SPA built for a Product Engineer case study (SaaS + IoT platform for office buildings, goal: cut energy-related emissions).

- **Starting point**: a deliberately limited app reproducing the *current* client experience — sensor data shown one page per equipment, no prioritization, no way to act — fed by mocked data.
- **Then**: successive evolutions toward the proposed experience. Every evolution reuses the same mock dataset so "before / after" can be demoed side by side.

Conversation with the user: **French**. Code, comments, agent and rule files: **English**. UI strings: **French**.

## Stack

Angular 22 (standalone, zoneless, signals) · TypeScript 6 (maximum strictness) · SCSS with design tokens + utility classes · Chart.js · Vitest + jsdom · ESLint (angular-eslint, flat config) · npm.

Standards: **read `docs/STANDARD.md` before any code-related task** — single source of truth, never restated elsewhere.

## Orchestration

The main thread is the **orchestrator**: it analyzes the request, plans, delegates to the agents below, and reports back. It does not write production code or tests itself, except under the exceptions listed.

| Agent        | Domain                                                    | Writes                                  |
| ------------ | --------------------------------------------------------- | --------------------------------------- |
| `code-agent` | Production code — creation, fixes, refactoring, mocks     | `src/**` except `*.spec.ts`, `src/testing/**` |
| `test-agent` | Unit tests — creation, repair, coverage                   | `*.spec.ts`, `src/testing/**`           |

### Routing

1. Task produces or changes production code → `code-agent`.
2. Then, once implementation is stable, behavior changed or tests broke → `test-agent`, **single final pass**.
3. Anything else (docs in `docs/`, `CLAUDE.md`, `.claude/**`, config files) → main thread, on explicit user request.

Before each delegation, announce: `Délégation → <agent> : <intent>`.
Brief agents with intent + scope only (files, expected behavior, constraints from the conversation); they load standards and rules themselves.

### Exceptions — the main thread acts directly

- **Conversational**: question, opinion, explanation, planning — no artifact produced.
- **Mechanical micro-fix**: ≤ 2 files, location and correct form already known (typo, import path, constant, missing `data-cy`). The main thread still reads the matching rule and runs `npm run typecheck` before yielding. Never covers tests.

### Agent replies

Agents end with a closing block; read `Statut:` first.

- `done` — validated.
- `too-big. split: …` — re-plan with the proposed split.
- `needs-confirm. op: …` — surface the exact operation to the user; never authorize it on their behalf.
- `ambiguous. ask: …` — answer from the conversation if possible, otherwise ask the user, then re-delegate.
- `regressed. …` — route the fix or revert to `code-agent` before anything else.

Never report a task as done to the user unless the quality gate above is green; otherwise say exactly what is red.

Findings about data loss, coverage reduction or security are relayed to the user verbatim.

## Quality gate — zero error, zero warning

**Ready for review** (the only state in which work is handed to the user as done) means `npm run check` is green:
lint with **0 warning** · typecheck · spec typecheck · all tests pass with **no console warning/error** · production build with **0 warning**.

A warning is an error. The baseline is always zero, so any warning present is attributable to the work in flight and must be fixed — never suppressed: inline `eslint-disable` is ignored by config (`noInlineConfig`), `@ts-ignore` / `@ts-expect-error` are banned, and raising a budget, a `maxWarnings` or relaxing a flag needs explicit user approval.

When the gate runs — once per strategic moment, never in a loop:

| Moment                       | Who                     | Gate                                            |
| ---------------------------- | ----------------------- | ----------------------------------------------- |
| While coding                 | `code-agent`            | `npm run typecheck` only (≈ 2 s)                |
| `code-agent` finishes        | Stop hook (automatic)   | `npm run validate` — lint + typecheck + build   |
| `test-agent` finishes        | Stop hook (automatic)   | `npm run check` — full gate                     |
| Before reporting to the user | main thread             | `npm run check` — skipped if `test-agent` just passed it on the same tree |

The Stop hook (`.claude/hooks/require-green.sh`) is skipped when the working tree is identical to the last green run, and lets the agent stop on its second attempt so it can report `regressed.` instead of looping. Agents never run the gate script themselves — the hook does.

Other discipline: never `--watch` in agent runs; read the Vitest summary line, not the exit code, when output is piped. When available, the main thread also checks the IDE diagnostics before reporting — some TypeScript config errors only surface there.

## Rules — loaded by file type

`.claude/rules/*.md` are scoped with `paths:` frontmatter and load automatically when a matching file is read. Agents still **read the matching rule explicitly before editing**:

| Pattern                         | Rule                          |
| ------------------------------- | ----------------------------- |
| `*.component.ts`                | `.claude/rules/component.md`  |
| `*.component.html`              | `.claude/rules/template.md`   |
| `*.scss`                        | `.claude/rules/scss.md`       |
| `*.service.ts`                  | `.claude/rules/service.md`    |
| `*.dao.ts`                      | `.claude/rules/dao.md`        |
| `*.pipe.ts`                     | `.claude/rules/pipe.md`       |
| `src/app/models/**`, `src/app/utils/**` | `.claude/rules/model-utils.md` |
| `src/app/mocks/**`              | `.claude/rules/mocks.md`      |
| `*.spec.ts`, `src/testing/**`   | `.claude/rules/spec.md`       |

## Skills

| Skill                    | Used by      | When                                                       |
| ------------------------ | ------------ | ---------------------------------------------------------- |
| `apply-design-system`    | `code-agent` | Writing or reviewing a template / SCSS                     |
| `add-mock-endpoint`      | `code-agent` | Exposing new mocked data to the app                        |
| `validate-test-coverage` | `test-agent` | Final coverage pass and gap report                         |
| `challenge-tests`        | `test-agent` | Auditing whether existing specs really protect behavior    |
| `write-spec`             | main thread  | Writing a product/technical spec in `docs/` before coding  |

## Repository hygiene

- Everything this repo needs lives in this repo. Never reference a path, package or convention from outside it.
- Never commit, push or run destructive git commands without an explicit user request.
- Never edit `package.json`, `angular.json`, `tsconfig*.json` or `eslint.config.js` without explicit user instruction — except adding a `#` alias for a new top-level type folder.
