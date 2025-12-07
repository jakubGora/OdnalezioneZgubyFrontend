import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AccessibilityStore } from '../../stores/accessibility.store';
import { DOCUMENT } from '@angular/common';
import { filter } from 'rxjs';

type HighContrastMode = 'normal' | 'black-white' | 'black-yellow' | 'yellow-black';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  protected readonly accessibilityStore = inject(AccessibilityStore);
  protected readonly router = inject(Router);
  protected readonly document = inject(DOCUMENT);
  
  protected currentRoute = '';

  constructor() {
    // Apply high contrast mode to body
    effect(() => {
      const body = this.document.body;
      const html = this.document.documentElement;
      const contrastMode = this.accessibilityStore.highContrastMode();
      
      // Remove all contrast classes
      body.classList.remove('black-white', 'black-yellow', 'yellow-black');
      html.classList.remove('black-white', 'black-yellow', 'yellow-black');
      
      // Add the current contrast mode
      if (contrastMode !== 'normal') {
        body.classList.add(contrastMode);
        html.classList.add(contrastMode);
      }
    });

    // Apply font size to html
    effect(() => {
      const html = this.document.documentElement;
      const fontSize = this.accessibilityStore.fontSizePercent();
      html.style.fontSize = `${fontSize}%`;
    });
  }

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
      });
  }

  protected skipTo(elementId: string, event: Event): void {
    event.preventDefault();
    const element = this.document.getElementById(elementId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  protected disableHighContrast(): void {
    this.accessibilityStore.setHighContrastMode('normal');
  }

  protected useHighContrast(mode: HighContrastMode): void {
    this.accessibilityStore.setHighContrastMode(mode);
  }

  protected useFontSize(percent: number): void {
    this.accessibilityStore.setFontSizePercent(percent);
  }
}

