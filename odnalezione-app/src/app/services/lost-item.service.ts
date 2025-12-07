import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LostItemFormData {
  // Step 1
  name: string;
  itemColor?: string;
  additionalInfo?: string;

  // Step 2
  foundDate: string;
  location: string;
  foundPlace?: string;
  notificationDate: string;
  warehousePlace: string;
}

export interface LostItemRequest {
  id: number | null; // null for new items, number for updates
  name: string;
  itemColor: string | null;
  additionalInfo: string | null;
  foundDate: string;
  location: string;
  foundPlace: string | null;
  notificationDate: string;
  warehousePlace: string;
}

export interface LostItemResponse {
  id: number;
  name: string;
  itemColor?: string;
  additionalInfo?: string;
  foundDate: string;
  location: string;
  foundPlace?: string;
  notificationDate: string;
  warehousePlace: string;
}

export interface LostItemCollectionItem {
  id: number;
  name: string;
  itemColor?: string;
  additionalInfo?: string;
  foundDate: string; // DD-MM-YYYY
  location: string;
  foundPlace?: string;
  notificationDate: string; // DD-MM-YYYY
  warehousePlace: string;
  sourceRow?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LostItemService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:8080/item';

  /**
   * Wysyła dane formularza do API
   * @param formData Dane formularza
   * @returns Observable z odpowiedzią z serwera
   */
  submitLostItem(formData: LostItemFormData): Observable<LostItemResponse> {
    // Przygotowanie danych do wysłania zgodnie z formatem API
    const payload: LostItemRequest = {
      id: null,
      name: formData.name.trim(),
      itemColor: formData.itemColor?.trim() || null,
      additionalInfo: formData.additionalInfo?.trim() || null,
      foundDate: this.formatDate(formData.foundDate),
      location: formData.location.trim(),
      foundPlace: formData.foundPlace?.trim() || null,
      notificationDate: this.formatDate(formData.notificationDate),
      warehousePlace: formData.warehousePlace.trim(),
    };

    // Logowanie JSON do konsoli
    console.log('📤 Wysyłanie danych formularza do API:');
    console.log('URL:', this.apiUrl);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Wysyłanie POST request
    return this.http.post<LostItemResponse>(this.apiUrl, payload);
  }

  /**
   * Formatuje datę z formatu YYYY-MM-DD (z input date) do DD-MM-YYYY
   * @param dateString Data w formacie YYYY-MM-DD
   * @returns Data w formacie DD-MM-YYYY
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    // Jeśli data jest już w formacie DD-MM-YYYY, zwróć bez zmian
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateString;
    }

    // Konwersja z YYYY-MM-DD do DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return dateString;
  }

  /**
   * Pobiera kolekcję przedmiotów z możliwością wyszukiwania po nazwie
   * @param name Nazwa do wyszukania (opcjonalna, jeśli pusta zwraca wszystko)
   * @returns Observable z tablicą przedmiotów
   */
  getItemCollection(name?: string): Observable<LostItemCollectionItem[]> {
    const url = `${this.apiUrl}/collection?name=${name ? encodeURIComponent(name.trim()) : ''}`;
    return this.http.get<LostItemCollectionItem[]>(url);
  }

  /**
   * Pobiera pojedynczy przedmiot po dokładnej nazwie
   * @param name Dokładna nazwa przedmiotu
   * @returns Observable z przedmiotem
   */
  getItemByName(name: string): Observable<LostItemCollectionItem> {
    const url = `${this.apiUrl}?name=${encodeURIComponent(name)}`;
    return this.http.get<LostItemCollectionItem>(url);
  }

  /**
   * Aktualizuje istniejący przedmiot
   * @param item Przedmiot do zaktualizowania (musi zawierać id)
   * @returns Observable z zaktualizowanym przedmiotem
   */
  updateItem(item: LostItemCollectionItem): Observable<LostItemCollectionItem> {
    // Konwersja dat z DD-MM-YYYY (z API) do DD-MM-YYYY (dla API)
    const payload: LostItemRequest = {
      id: item.id,
      name: item.name.trim(),
      itemColor: item.itemColor?.trim() || null,
      additionalInfo: item.additionalInfo?.trim() || null,
      foundDate: item.foundDate, // Już w formacie DD-MM-YYYY
      location: item.location.trim(),
      foundPlace: item.foundPlace?.trim() || null,
      notificationDate: item.notificationDate, // Już w formacie DD-MM-YYYY
      warehousePlace: item.warehousePlace.trim(),
    };

    return this.http.put<LostItemCollectionItem>(this.apiUrl, payload);
  }

  /**
   * Usuwa przedmiot po ID
   * @param id ID przedmiotu do usunięcia
   * @returns Observable z usuniętym przedmiotem
   */
  deleteItem(id: number): Observable<LostItemCollectionItem> {
    const url = `${this.apiUrl}?id=${id}`;
    return this.http.delete<LostItemCollectionItem>(url);
  }
}

