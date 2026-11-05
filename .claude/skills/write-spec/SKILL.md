---
name: write-spec
description: Write a short product/technical spec in docs/ before implementing an evolution (problem, users, goals, solution, data contract, decisions). Use when planning a new step of the app or recording a trade-off.
---

# Write spec

A spec must be implementable: if it cannot become a task list for `code-agent` and `test-agent`, rewrite it.

## Template — `docs/specs/<nn>-<slug>.md`

```markdown
# <nn> — <Evolution name>

**Statut** : Brouillon | Validé | Remplacé · **Date** : YYYY-MM-DD

## Problème
<One paragraph: what the user cannot do or understand today, and why it matters for the goal.>

## Utilisateurs
<Who acts on this screen, what decision they take, how often.>

## Objectifs
- [ ] <verifiable outcome>

## Hors périmètre
- <explicitly excluded, with reason>

## Solution
<2–4 sentences, then the screens / flows.>

### Contrat de données
<TypeScript interfaces of new or changed models, new DAO methods and the dataset they read.>

### Fichiers impactés
| Fichier | Changement | Risque |
| ------- | ---------- | ------ |

## Arbitrages
| Décision | Alternative écartée | Raison |
| -------- | ------------------- | ------ |

## Questions ouvertes
- [ ] <question — owner>
```

## Procedure

1. Problem in one paragraph — if you cannot, the spec is premature.
2. Goals as verifiable outcomes, not activities.
3. Data contract before screens: the models and DAO methods drive the rest.
4. Record every trade-off in **Arbitrages** — they are the talking points of the demo.
5. Specs are written in French (product audience); identifiers stay in English.
