/**
 * Navigation trail shown at the top of detail pages, built by those pages and rendered by
 * `BreadcrumbComponent`.
 */

/** One step of the trail. */
export interface BreadcrumbLink {
  /** French label. */
  readonly label: string;
  /** Target route; `null` for the current page, rendered as plain text. */
  readonly routerLink: string | null;
  /** `data-testid` of the rendered link. */
  readonly testId: string;
}
