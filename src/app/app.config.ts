import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  type ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { ThemeService } from '#services/theme.service';

import { routes } from './app.routes';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    // Applies the persisted / preferred light or dark mode before the first render.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
  ],
};
