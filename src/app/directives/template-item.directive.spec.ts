import { TemplateItemDirective } from './template-item.directive';

describe('TemplateItemDirective.ngTemplateContextGuard', () => {
  const directive = {} as TemplateItemDirective<string>;

  it('should accept a context carrying $implicit', () => {
    expect(TemplateItemDirective.ngTemplateContextGuard(directive, { $implicit: 'a' })).toBe(true);
  });

  it('should reject a context without $implicit', () => {
    expect(TemplateItemDirective.ngTemplateContextGuard(directive, { other: 1 })).toBe(false);
  });

  it.each([null, undefined, 'text', 3])(
    'should reject the non-object context %s',
    (context: unknown) => {
      expect(TemplateItemDirective.ngTemplateContextGuard(directive, context)).toBe(false);
    },
  );
});
