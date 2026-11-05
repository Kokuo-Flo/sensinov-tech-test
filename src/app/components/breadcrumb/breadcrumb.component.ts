import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { type BreadcrumbLink } from '#models/breadcrumb.model';

@Component({
  selector: 'sb-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class BreadcrumbComponent {
  // --- Inputs ---
  /** Steps from the root to the current page; the current page has no `routerLink`. */
  public readonly items = input.required<readonly BreadcrumbLink[]>();
}
