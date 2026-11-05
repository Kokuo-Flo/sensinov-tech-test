import { Component } from '@angular/core';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ThemeToggleComponent } from '#components/theme-toggle/theme-toggle.component';

@Component({
  selector: 'sb-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbar, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
