import { Component, OnInit, inject, effect } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { AccessibilityStore } from './stores/accessibility.store';
import { DOCUMENT } from '@angular/common';
import { BreadcrumbsComponent, BreadcrumbItem } from './components/breadcrumbs/breadcrumbs.component';
import { NotificationComponent } from './components/notification/notification.component';
import { filter } from 'rxjs';

@Component({
  imports: [RouterModule, HeaderComponent, FooterComponent, BreadcrumbsComponent, NotificationComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly accessibilityStore = inject(AccessibilityStore);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  
  protected breadcrumbs: BreadcrumbItem[] = [];

  constructor() {
    // Apply accessibility classes to body
    effect(() => {
      const body = this.document.body;
      const html = this.document.documentElement;

      // Font size
      body.classList.remove('font-size--normal', 'font-size--large', 'font-size--extra-large');
      body.classList.add(this.accessibilityStore.fontSizeClass());

      // High contrast modes
      const contrastMode = this.accessibilityStore.highContrastMode();
      body.classList.remove('black-white', 'black-yellow', 'yellow-black', 'high-contrast');
      html.classList.remove('black-white', 'black-yellow', 'yellow-black', 'high-contrast');
      
      if (contrastMode !== 'normal') {
        body.classList.add(contrastMode);
        html.classList.add(contrastMode);
      }

      // Reduced motion
      if (this.accessibilityStore.reducedMotion()) {
        body.classList.add('reduced-motion');
      } else {
        body.classList.remove('reduced-motion');
      }

      // Color scheme
      html.setAttribute('data-color-scheme', this.accessibilityStore.colorScheme());
    });
  }

  ngOnInit(): void {
    this.accessibilityStore.loadFromLocalStorage();
    this.updateBreadcrumbs();
    
    // Update breadcrumbs on route change
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateBreadcrumbs();
      });
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    
    if (url === '/' || url === '') {
      this.breadcrumbs = [
        { label: 'Rejestr rzeczy znalezionych' },
      ];
    } else if (url === '/dodaj-przedmiot') {
      this.breadcrumbs = [
        { label: 'Rejestr rzeczy znalezionych', route: '/' },
        { label: 'Dodaj przedmiot' },
      ];
    } else if (url === '/importuj-plik') {
      this.breadcrumbs = [
        { label: 'Rejestr rzeczy znalezionych', route: '/' },
        { label: 'Importuj plik' },
      ];
    } else if (url.startsWith('/importuj-plik/weryfikuj/')) {
      const fileName = decodeURIComponent(url.split('/').pop() || '');
      // Nazwa pliku w routingu jest już bez rozszerzenia
      this.breadcrumbs = [
        { label: 'Rejestr rzeczy znalezionych', route: '/' },
        { label: 'Importuj plik', route: '/importuj-plik' },
        { label: `Weryfikuj: ${fileName}` },
      ];
    } else {
      this.breadcrumbs = [
        { label: 'Rejestr rzeczy znalezionych', route: '/' },
      ];
    }
  }
}
