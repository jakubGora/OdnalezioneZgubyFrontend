import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // w milisekundach, domyślnie 5000
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);

  /**
   * Pobiera strumień powiadomień
   */
  getNotifications(): Observable<Notification[]> {
    return this.notifications$.asObservable();
  }

  /**
   * Wyświetla powiadomienie o sukcesie
   */
  showSuccess(message: string, duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'success',
      message,
      duration,
    });
  }

  /**
   * Wyświetla powiadomienie o błędzie
   */
  showError(message: string, duration: number = 7000): void {
    this.show({
      id: this.generateId(),
      type: 'error',
      message,
      duration,
    });
  }

  /**
   * Wyświetla powiadomienie informacyjne
   */
  showInfo(message: string, duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'info',
      message,
      duration,
    });
  }

  /**
   * Wyświetla powiadomienie ostrzegawcze
   */
  showWarning(message: string, duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'warning',
      message,
      duration,
    });
  }

  /**
   * Dodaje powiadomienie do listy
   */
  private show(notification: Notification): void {
    const current = this.notifications$.value;
    this.notifications$.next([...current, notification]);

    // Automatyczne usunięcie po określonym czasie
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, notification.duration);
    }
  }

  /**
   * Usuwa powiadomienie
   */
  remove(id: string): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
  }

  /**
   * Usuwa wszystkie powiadomienia
   */
  clear(): void {
    this.notifications$.next([]);
  }

  /**
   * Generuje unikalne ID dla powiadomienia
   */
  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

