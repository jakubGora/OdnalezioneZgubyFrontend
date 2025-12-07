import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { computed } from '@angular/core';

export type HighContrastMode = 'normal' | 'black-white' | 'black-yellow' | 'yellow-black';

export interface AccessibilityState {
  fontSize: 'normal' | 'large' | 'extra-large';
  fontSizePercent: number;
  highContrast: boolean;
  highContrastMode: HighContrastMode;
  reducedMotion: boolean;
  colorScheme: 'auto' | 'light' | 'dark';
}

const initialState: AccessibilityState = {
  fontSize: 'normal',
  fontSizePercent: 100,
  highContrast: false,
  highContrastMode: 'normal',
  reducedMotion: false,
  colorScheme: 'auto',
};

export const AccessibilityStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    fontSizeClass: computed(() => {
      const size = store.fontSize();
      return `font-size--${size}`;
    }),
    contrastClass: computed(() => {
      return store.highContrast() ? 'high-contrast' : '';
    }),
    motionClass: computed(() => {
      return store.reducedMotion() ? 'reduced-motion' : '';
    }),
  })),
  withMethods((store) => {
    const saveToLocalStorage = () => {
      const state = {
        fontSize: store.fontSize(),
        fontSizePercent: store.fontSizePercent(),
        highContrast: store.highContrast(),
        highContrastMode: store.highContrastMode(),
        reducedMotion: store.reducedMotion(),
        colorScheme: store.colorScheme(),
      };
      localStorage.setItem('accessibility-settings', JSON.stringify(state));
    };

    return {
      setFontSize: (size: 'normal' | 'large' | 'extra-large') => {
        const percentMap: Record<string, number> = {
          'normal': 100,
          'large': 125,
          'extra-large': 150,
        };
        patchState(store, { fontSize: size, fontSizePercent: percentMap[size] || 100 });
        saveToLocalStorage();
      },
      setFontSizePercent: (percent: number) => {
        let fontSize: 'normal' | 'large' | 'extra-large' = 'normal';
        if (percent >= 200) fontSize = 'extra-large';
        else if (percent >= 150) fontSize = 'extra-large';
        else if (percent >= 125) fontSize = 'large';
        patchState(store, { fontSizePercent: percent, fontSize });
        saveToLocalStorage();
      },
      setHighContrast: (enabled: boolean) => {
        patchState(store, { 
          highContrast: enabled,
          highContrastMode: enabled ? 'black-white' : 'normal'
        });
        saveToLocalStorage();
      },
      setHighContrastMode: (mode: HighContrastMode) => {
        patchState(store, { 
          highContrastMode: mode,
          highContrast: mode !== 'normal'
        });
        saveToLocalStorage();
      },
      setReducedMotion: (enabled: boolean) => {
        patchState(store, { reducedMotion: enabled });
        saveToLocalStorage();
      },
      setColorScheme: (scheme: 'auto' | 'light' | 'dark') => {
        patchState(store, { colorScheme: scheme });
        saveToLocalStorage();
      },
      loadFromLocalStorage: () => {
        const stored = localStorage.getItem('accessibility-settings');
        if (stored) {
          try {
            const settings = JSON.parse(stored);
            // Ensure backward compatibility
            if (!settings.fontSizePercent) {
              const percentMap: Record<string, number> = {
                'normal': 100,
                'large': 125,
                'extra-large': 150,
              };
              settings.fontSizePercent = percentMap[settings.fontSize] || 100;
            }
            if (!settings.highContrastMode) {
              settings.highContrastMode = settings.highContrast ? 'black-white' : 'normal';
            }
            patchState(store, settings);
          } catch (e) {
            console.error('Failed to load accessibility settings', e);
          }
        }
      },
      saveToLocalStorage,
      reset: () => {
        patchState(store, initialState);
        localStorage.removeItem('accessibility-settings');
      },
    };
  })
);

