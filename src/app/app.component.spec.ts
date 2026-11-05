import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the application title in the header', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();

    const title: HTMLElement | null = fixture.nativeElement.querySelector('[data-cy="app-title"]');

    expect(title?.textContent?.trim()).toBe('Smart Building');
  });
});
