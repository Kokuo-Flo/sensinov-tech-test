import { type AnalystReport } from '#models/analyst-report.model';

/**
 * Manual analysis published after 4 weeks of POC: vague, unquantified, no owner, no follow-up.
 * It hints at A1, A2, A4 and A5 but deliberately misses A3 (Madrid night baseload) — no Madrid recommendation.
 */
export const ANALYST_REPORTS: readonly AnalystReport[] = [
  {
    id: 'rpt-2026-10',
    title: 'Analyse énergétique du parc — 4 premières semaines du POC',
    author: 'Analyste énergie',
    publishedAt: '2026-10-05',
    recommendations: [
      {
        id: 'rec-lyon-setpoints',
        buildingId: 'bld-lyon',
        title: 'Températures intérieures',
        description: 'Les températures semblent élevées, revoir les consignes.',
      },
      {
        id: 'rec-warsaw-weekend',
        buildingId: 'bld-warsaw',
        title: 'Consommation le week-end',
        description: 'Consommation observée le week-end, à investiguer.',
      },
      {
        id: 'rec-berlin-ahu-schedule',
        buildingId: 'bld-berlin',
        title: 'Horaires de la CTA',
        description: 'Horaires de la CTA à optimiser.',
      },
      {
        id: 'rec-munich-spaces',
        buildingId: 'bld-munich',
        title: 'Gestion des espaces',
        description: 'Occupation inférieure à la capacité, réfléchir à la gestion des espaces.',
      },
      {
        id: 'rec-portfolio-eco-gestures',
        buildingId: null,
        title: 'Éco-gestes',
        description:
          'Sensibiliser les occupants aux éco-gestes (éteindre les lumières, fermer les fenêtres).',
      },
      {
        id: 'rec-portfolio-led',
        buildingId: null,
        title: 'Relamping LED',
        description: 'Envisager un relamping LED à moyen terme.',
      },
    ],
  },
];
