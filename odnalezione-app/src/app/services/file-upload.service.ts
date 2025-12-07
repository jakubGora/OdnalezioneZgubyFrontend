import { Injectable } from '@angular/core';
import { Observable, of, throwError, delay } from 'rxjs';

export interface FieldData {
  source_columns: string[];
  source_value: string;
  json_value: string;
  field_score: number;
  comment: string;
}

export interface ImportRecord {
  index: number;
  source_row: string;
  overall_score: number;
  fields: Record<string, FieldData>;
  // Dodatkowe pola z rozszerzonego JSON
  id?: number;
  generalDescription?: string;
  pickupDeadline?: string;
  placeId?: string;
  // Status akceptacji
  accepted?: boolean;
}

export interface ImportFileResponse {
  success: boolean;
  records?: ImportRecord[];
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private verificationData: ImportRecord[] | null = null;
  private currentFileName: string | null = null;
  private originalFile: File | null = null;
  private readonly DRAFTS_STORAGE_KEY = 'import_drafts';

  /**
   * Symuluje wgrywanie pliku i zwraca dane do weryfikacji
   * @param file Plik do wgrania
   * @returns Observable z odpowiedzią zawierającą rekordy do weryfikacji lub błąd
   */
  uploadFile(file: File): Observable<ImportFileResponse> {
    // Symulacja czasu przetwarzania pliku
    const processingTime = 2000; // 2 sekundy

    // Sprawdzenie typu pliku
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return throwError(() => ({
        success: false,
        error: 'Nieprawidłowy format pliku. Dozwolone formaty: .csv, .xls, .pdf',
      })).pipe(delay(500));
    }

    // Symulacja przetwarzania pliku - zwraca mock dane
    const response = this.generateMockData();
    // Zapisz dane do weryfikacji
    if (response.success && response.records) {
      this.setVerificationData(response.records, file.name);
    }
    return of(response).pipe(delay(processingTime));
  }

  /**
   * Generuje mock dane do weryfikacji w nowym formacie JSON
   */
  private generateMockData(): ImportFileResponse {
    const mockRecords: ImportRecord[] = [
      {
        index: 1,
        source_row: 'Portfel, pieniądze, Warszawa, Brak informacji...',
        overall_score: 0.95,
        id: 1,
        generalDescription: '-',
        pickupDeadline: '04.12.2026',
        placeId: 'AB1232',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy - krótki opis'],
            source_value: 'Portfel, pieniądze',
            json_value: 'Portfel, pieniądze',
            field_score: 1.0,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia rzeczy'],
            source_value: 'Warszawa',
            json_value: 'Warszawa',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia rzeczy'],
            source_value: 'Brak informacji',
            json_value: '',
            field_score: 1.0,
            comment: 'Obie strony oznaczają brak danych.',
          },
        },
      },
      {
        index: 2,
        source_row: 'Słuchawki JBL kolor czarny, 04.12.2025, Bydgoszcz, 04.12.2026, AB1232',
        overall_score: 0.20,
        id: 2,
        generalDescription: '-',
        pickupDeadline: '04.12.2026',
        placeId: 'AB1232',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Słuchawki JBL kolor czarny, 04.12.2025, Bydgoszcz, 04.12.2026, AB1232',
            json_value: 'Słuchawki JBL kolor czarny',
            field_score: 0.2,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Bydgoszcz',
            json_value: 'Bydgoszcz',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '04.12.2025',
            json_value: '04.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 3,
        source_row: 'Słuchawki JBL kolor czarny, 04.12.2025, Bydgoszcz, 04.12.2026, komórka pod schodami',
        overall_score: 0.98,
        id: 3,
        generalDescription: '-',
        pickupDeadline: '04.12.2026',
        placeId: 'komórka pod schodami',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Słuchawki JBL kolor czarny',
            json_value: 'Słuchawki JBL kolor czarny',
            field_score: 1.0,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Bydgoszcz',
            json_value: 'Bydgoszcz',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '04.12.2025',
            json_value: '04.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
    ];

    return {
      success: true,
      records: mockRecords,
      message: 'Plik wgrano poprawnie, zweryfikuj wprowadzone przedmioty',
    };
  }

  /**
   * Zapisuje dane weryfikacji do przechowania między komponentami
   */
  setVerificationData(records: ImportRecord[], fileName: string, file?: File): void {
    this.verificationData = records;
    this.currentFileName = fileName;
    if (file) {
      this.originalFile = file;
    }
    // Zapisz szkic do localStorage (wszystkie rekordy)
    // fileName może być już bez rozszerzenia (z routingu) lub z rozszerzeniem (z file.name)
    // Zapisujemy z rozszerzeniem jeśli było, aby zachować kompatybilność
    this.saveDraft(fileName, records, [], file);
  }

  /**
   * Pobiera oryginalny plik
   */
  getOriginalFile(): File | null {
    return this.originalFile;
  }

  /**
   * Aktualizuje szkic z listą zaakceptowanych rekordów
   */
  updateDraft(fileName: string, records: ImportRecord[], acceptedIndexes: number[]): void {
    // Pobierz istniejący szkic, aby zachować zapisany plik
    const drafts = this.getDrafts();
    const existingDraft = drafts.find(d => d.fileName === fileName);
    const file = existingDraft?.fileContent ? this.base64ToFile(existingDraft.fileContent, existingDraft.fileName, existingDraft.fileType) : undefined;
    // Wywołaj asynchronicznie, ale nie czekaj na wynik
    this.saveDraft(fileName, records, acceptedIndexes, file).catch((error: unknown) => {
      console.error('Błąd aktualizacji szkicu:', error);
    });
  }

  /**
   * Zapisuje szkic do localStorage
   */
  private async saveDraft(fileName: string, records: ImportRecord[], acceptedIndexes: number[], file?: File): Promise<void> {
    try {
      const drafts = this.getDrafts();
      const existingDraftIndex = drafts.findIndex(d => d.fileName === fileName);
      
      // Konwertuj plik na base64 jeśli został podany
      let fileContent: string | undefined;
      let fileType: string | undefined;
      if (file) {
        fileContent = await this.fileToBase64(file);
        fileType = file.type;
      } else {
        // Zachowaj istniejący plik jeśli nie podano nowego
        const existingDraft = drafts[existingDraftIndex];
        if (existingDraft?.fileContent) {
          fileContent = existingDraft.fileContent;
          fileType = existingDraft.fileType;
        }
      }
      
      const draft = {
        fileName: fileName,
        lastModified: new Date().toISOString(),
        records: records,
        acceptedIndexes: acceptedIndexes,
        fileContent: fileContent,
        fileType: fileType,
      };

      if (existingDraftIndex >= 0) {
        drafts[existingDraftIndex] = draft;
      } else {
        drafts.push(draft);
      }

      localStorage.setItem(this.DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
      
      // Zaktualizuj również originalFile jeśli został podany
      if (file) {
        this.originalFile = file;
      }
    } catch (error) {
      console.error('Błąd zapisu szkicu:', error);
    }
  }

  /**
   * Konwertuje plik na base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Usuń prefix "data:...;base64," jeśli istnieje
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Konwertuje base64 z powrotem na File
   */
  private base64ToFile(base64: string, fileName: string, fileType?: string): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: fileType || 'application/octet-stream' });
    return new File([blob], fileName, { type: fileType || 'application/octet-stream' });
  }

  /**
   * Pobiera wszystkie szkice z localStorage
   */
  getDrafts(): Array<{ 
    fileName: string; 
    lastModified: string; 
    records: ImportRecord[];
    acceptedIndexes: number[];
    fileContent?: string;
    fileType?: string;
  }> {
    try {
      const stored = localStorage.getItem(this.DRAFTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Błąd odczytu szkiców:', error);
    }
    return [];
  }

  /**
   * Pobiera zapisany plik dla danego szkicu
   */
  getDraftFile(fileName: string): File | null {
    try {
      const drafts = this.getDrafts();
      const draft = drafts.find(d => d.fileName === fileName);
      if (draft?.fileContent) {
        return this.base64ToFile(draft.fileContent, draft.fileName, draft.fileType);
      }
    } catch (error) {
      console.error('Błąd odczytu pliku ze szkicu:', error);
    }
    return null;
  }

  /**
   * Usuwa szkic z localStorage
   */
  removeDraft(fileName: string): void {
    try {
      const drafts = this.getDrafts();
      const filtered = drafts.filter(d => d.fileName !== fileName);
      localStorage.setItem(this.DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Błąd usuwania szkicu:', error);
    }
  }

  /**
   * Pobiera zapisane dane weryfikacji
   */
  getVerificationData(): ImportRecord[] | null {
    return this.verificationData;
  }

  /**
   * Pobiera nazwę aktualnego pliku
   */
  getCurrentFileName(): string | null {
    return this.currentFileName;
  }

  /**
   * Czyści zapisane dane weryfikacji
   */
  clearVerificationData(): void {
    this.verificationData = null;
    this.currentFileName = null;
  }
}

