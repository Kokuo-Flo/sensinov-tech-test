import { type Route } from '@angular/router';

import { FindingsComponent } from '#components/findings/findings.component';
import { PrioritiesComponent } from '#components/priorities/priorities.component';

import { routes } from './app.routes';

function routeAt(path: string): Route {
  const route = routes.find((candidate: Route) => candidate.path === path);
  if (route === undefined) {
    throw new Error(`No route ${path}`);
  }
  return route;
}

describe('routes', () => {
  it('should send the empty path to the priorities page', () => {
    expect(routeAt('')).toMatchObject({ pathMatch: 'full', redirectTo: 'priorities' });
  });

  it('should send an unknown path to the priorities page', () => {
    expect(routeAt('**').redirectTo).toBe('priorities');
  });

  it('should lazy-load the priorities page', async () => {
    const route = routeAt('priorities');
    const component = typeof route.loadComponent === 'function' ? await route.loadComponent() : null;

    expect(route.title).toBe('Priorités — Smart Building');
    expect(component).toBe(PrioritiesComponent);
  });

  it('should lazy-load the findings page', async () => {
    const route = routeAt('findings');
    const component = typeof route.loadComponent === 'function' ? await route.loadComponent() : null;

    expect(route.title).toBe('Anomalies — Smart Building');
    expect(component).toBe(FindingsComponent);
  });
  it('should lazy-load a component for every routed page', async () => {
    const pages = routes.filter((route: Route) => route.loadComponent !== undefined);

    const components = await Promise.all(
      pages.map((route: Route) => (typeof route.loadComponent === 'function' ? route.loadComponent() : null)),
    );

    expect(pages.map((route: Route) => route.path)).toEqual([
      'priorities',
      'buildings',
      'buildings/:buildingId',
      'equipments/:equipmentId',
      'findings',
      'reports',
    ]);
    expect(components.every((component) => typeof component === 'function')).toBe(true);
  });
});
