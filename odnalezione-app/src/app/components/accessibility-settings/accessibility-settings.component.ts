import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccessibilityStore } from '../../stores/accessibility.store';

@Component({
  selector: 'app-accessibility-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accessibility-settings.component.html',
  styleUrl: './accessibility-settings.component.scss',
})
export class AccessibilitySettingsComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  protected readonly store = inject(AccessibilityStore);

  ngOnInit(): void {
    this.store.loadFromLocalStorage();
  }

  protected onFontSizeChange(size: 'normal' | 'large' | 'extra-large'): void {
    this.store.setFontSize(size);
  }

  protected onHighContrastChange(enabled: boolean): void {
    this.store.setHighContrast(enabled);
  }

  protected onReducedMotionChange(enabled: boolean): void {
    this.store.setReducedMotion(enabled);
  }

  protected onColorSchemeChange(scheme: 'auto' | 'light' | 'dark'): void {
    this.store.setColorScheme(scheme);
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onReset(): void {
    this.store.reset();
  }
}

