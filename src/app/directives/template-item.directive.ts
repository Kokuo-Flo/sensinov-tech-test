import { Directive, input } from '@angular/core';

/** Context a list template receives: `$implicit` is one element of the list. */
interface TemplateItemContext<T> {
  readonly $implicit: T;
}

/**
 * Types the `let-` variable of a library template whose context is untyped. Angular Material's
 * `matCellDef` holds a `TemplateRef<any>`: its row variable is `any` under `strictTemplates`.
 * Bind the list the table renders so the element type is inferred (explicit `<ng-template>` form,
 * the `*matCellDef` shorthand cannot carry a second directive):
 *
 * `<ng-template matCellDef let-building [sbTemplateItemOf]="buildings()">`
 */
@Directive({ selector: 'ng-template[sbTemplateItemOf]' })
export class TemplateItemDirective<T> {
  // --- Inputs ---
  /** Only read by the type checker: it infers `T`. */
  public readonly sbTemplateItemOf = input.required<readonly T[]>();

  /** Read by the template type checker only; the body is a structural sanity check. */
  public static ngTemplateContextGuard<T>(
    _directive: TemplateItemDirective<T>,
    context: unknown,
  ): context is TemplateItemContext<T> {
    return typeof context === 'object' && context !== null && '$implicit' in context;
  }
}
