/** One breadcrumb step, rendered by `BreadcrumbComponent`. */
export interface BreadcrumbLink {
  readonly label: string;
  /** `null` for the current page, rendered as plain text. */
  readonly routerLink: string | null;
  /** `data-testid` hook of the rendered link. */
  readonly testId: string;
}
