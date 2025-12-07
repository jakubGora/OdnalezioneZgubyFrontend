import { Injectable, inject } from '@angular/core';
import { Observable, throwError, delay } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';

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
  id?: number;
  generalDescription?: string;
  pickupDeadline?: string;
  placeId?: string;
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
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://function-bun-production-eb96.up.railway.app';
  
  private verificationData: ImportRecord[] | null = null;
  private currentFileName: string | null = null;
  private originalFile: File | null = null;
  private readonly DRAFTS_STORAGE_KEY = 'import_drafts';

  uploadFile(file: File): Observable<ImportFileResponse> {
    const allowedExtensions = ['.csv'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return throwError(() => ({
        success: false,
        error: 'Nieprawidłowy format pliku. Dozwolony format: .csv',
      }));
    }

    return new Observable<ImportFileResponse>((observer) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const csvContent = reader.result as string;
        
        const requestBody = {
          action: 'full',
          csvContent: csvContent
        };
        
        this.http.post<any>(this.apiUrl, requestBody).pipe(
          map((response) => {
            if (response.action === 'full' && response.validationResults && Array.isArray(response.validationResults)) {
              const records: ImportRecord[] = response.validationResults.map((result: any, index: number) => {
                const jsonItem = response.jsonData?.items?.[index] || {};
                
                return {
                  index: result.index || index + 1,
                  source_row: result.source_row || '',
                  overall_score: result.overall_score || 0,
                  id: result.index || index + 1,
                  generalDescription: jsonItem.additionalInfo || '-',
                  pickupDeadline: jsonItem.notificationDate || '',
                  placeId: jsonItem.warehousePlace || '',
                  fields: result.fields || {}
                };
              });
              
              const importResponse: ImportFileResponse = {
                success: true,
                records: records,
                message: 'Plik wgrano poprawnie, zweryfikuj wprowadzone przedmioty'
              };
              
              if (importResponse.success && importResponse.records) {
                this.setVerificationData(importResponse.records, file.name, file);
              }
              
              return importResponse;
            } else {
              throw new Error('Nieprawidłowy format odpowiedzi z API');
            }
          }),
          catchError((error: HttpErrorResponse) => {
            console.error('Błąd API:', error);
            return throwError(() => ({
              success: false,
              error: error.error?.error || error.message || 'Wystąpił błąd podczas przetwarzania pliku',
            }));
          })
        ).subscribe({
          next: (response) => observer.next(response),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      };
      
      reader.onerror = () => {
        observer.error({
          success: false,
          error: 'Błąd odczytu pliku'
        });
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  private generateMockData(): ImportFileResponse {
    const mockRecords: ImportRecord[] = [
      {
        index: 1,
        source_row: 'Portfel skórzany kolor brązowy, 01.12.2025, Warszawa, 31.12.2025, AB1001',
        overall_score: 0.95,
        id: 1,
        generalDescription: '-',
        pickupDeadline: '31.12.2025',
        placeId: 'AB1001',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Portfel skórzany',
            json_value: 'Portfel skórzany',
            field_score: 0.95,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'brązowy',
            json_value: 'brązowy',
            field_score: 0.95,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Warszawa',
            json_value: 'Warszawa',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '01.12.2025',
            json_value: '01.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 2,
        source_row: 'Słuchawki JBL kolor czarny, 04.12.2025, Bydgoszcz, 03.01.2026, AB1002',
        overall_score: 0.98,
        id: 2,
        generalDescription: '-',
        pickupDeadline: '03.01.2026',
        placeId: 'AB1002',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Słuchawki JBL',
            json_value: 'Słuchawki JBL',
            field_score: 0.98,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.98,
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
        source_row: 'Telefon komórkowy czarny, 05.12.2025, Kraków, 04.01.2026, AB1003',
        overall_score: 0.92,
        id: 3,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '04.01.2026',
        placeId: 'AB1003',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Telefon komórkowy',
            json_value: 'Telefon',
            field_score: 0.92,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.92,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Kraków',
            json_value: 'Kraków',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '05.12.2025',
            json_value: '05.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 4,
        source_row: 'Klucze srebrne, 06.12.2025, Gdańsk, 05.01.2026, AB1004',
        overall_score: 0.88,
        id: 4,
        generalDescription: '-',
        pickupDeadline: '05.01.2026',
        placeId: 'AB1004',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Klucze',
            json_value: 'Klucze',
            field_score: 0.88,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'srebrny',
            json_value: 'srebrny',
            field_score: 0.88,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Gdańsk',
            json_value: 'Gdańsk',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '06.12.2025',
            json_value: '06.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 5,
        source_row: 'Okulary czarne, 07.12.2025, Wrocław, 06.01.2026, AB1005',
        overall_score: 0.85,
        id: 5,
        generalDescription: '-',
        pickupDeadline: '06.01.2026',
        placeId: 'AB1005',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Okulary',
            json_value: 'Okulary',
            field_score: 0.85,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.85,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Wrocław',
            json_value: 'Wrocław',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '07.12.2025',
            json_value: '07.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 6,
        source_row: 'Torba czarna, 08.12.2025, Poznań, 07.01.2026, AB1006',
        overall_score: 0.90,
        id: 6,
        generalDescription: '-',
        pickupDeadline: '07.01.2026',
        placeId: 'AB1006',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Torba',
            json_value: 'Torba',
            field_score: 0.90,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.90,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Poznań',
            json_value: 'Poznań',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '08.12.2025',
            json_value: '08.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 7,
        source_row: 'Portmonetka czerwona, 09.12.2025, Łódź, 08.01.2026, AB1007',
        overall_score: 0.75,
        id: 7,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '08.01.2026',
        placeId: 'AB1007',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Portmonetka',
            json_value: 'Portfel',
            field_score: 0.75,
            comment: 'LLM pomylił portmonetkę z portfelem',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czerwony',
            json_value: '',
            field_score: 0.75,
            comment: 'LLM nie rozpoznał koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Łódź',
            json_value: 'Łódź',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '09.12.2025',
            json_value: '09.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 8,
        source_row: 'Kurtka niebieska, 10.12.2025, Szczecin, 09.01.2026, AB1008',
        overall_score: 0.82,
        id: 8,
        generalDescription: '-',
        pickupDeadline: '09.01.2026',
        placeId: 'AB1008',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Kurtka',
            json_value: 'Kurtka',
            field_score: 0.82,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'niebieski',
            json_value: 'niebieski',
            field_score: 0.82,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Szczecin',
            json_value: 'Szczecin',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '10.12.2025',
            json_value: '10.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 9,
        source_row: 'Rękawiczki czarne, 11.12.2025, Katowice, 10.01.2026, AB1009',
        overall_score: 0.78,
        id: 9,
        generalDescription: '-',
        pickupDeadline: '10.01.2026',
        placeId: 'AB1009',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Rękawiczki',
            json_value: 'Rękawiczki',
            field_score: 0.78,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: '',
            field_score: 0.78,
            comment: 'LLM nie rozpoznał koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Katowice',
            json_value: 'Katowice',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '11.12.2025',
            json_value: '11.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 10,
        source_row: 'Czapka szara, 12.12.2025, Lublin, 11.01.2026, AB1010',
        overall_score: 0.80,
        id: 10,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '11.01.2026',
        placeId: 'AB1010',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Czapka',
            json_value: 'Czapka',
            field_score: 0.80,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'szary',
            json_value: 'szary',
            field_score: 0.80,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Lublin',
            json_value: 'Lublin',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '12.12.2025',
            json_value: '12.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 11,
        source_row: 'Szalik czerwony, 13.12.2025, Białystok, 12.01.2026, AB1011',
        overall_score: 0.77,
        id: 11,
        generalDescription: '-',
        pickupDeadline: '12.01.2026',
        placeId: 'AB1011',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Szalik',
            json_value: 'Szalik',
            field_score: 0.77,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czerwony',
            json_value: '',
            field_score: 0.77,
            comment: 'LLM nie rozpoznał koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Białystok',
            json_value: 'Białystok',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '13.12.2025',
            json_value: '13.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 12,
        source_row: 'Buty czarne, 14.12.2025, Gdynia, 13.01.2026, AB1012',
        overall_score: 0.83,
        id: 12,
        generalDescription: '-',
        pickupDeadline: '13.01.2026',
        placeId: 'AB1012',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Buty',
            json_value: 'Buty',
            field_score: 0.83,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.83,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Gdynia',
            json_value: 'Gdynia',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '14.12.2025',
            json_value: '14.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 13,
        source_row: 'Plecak niebieski, 15.12.2025, Częstochowa, 14.01.2026, AB1013',
        overall_score: 0.86,
        id: 13,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '14.01.2026',
        placeId: 'AB1013',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Plecak',
            json_value: 'Plecak',
            field_score: 0.86,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'niebieski',
            json_value: 'niebieski',
            field_score: 0.86,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Częstochowa',
            json_value: 'Częstochowa',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '15.12.2025',
            json_value: '15.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 14,
        source_row: 'Parasol czarny, 16.12.2025, Radom, 15.01.2026, AB1014',
        overall_score: 0.79,
        id: 14,
        generalDescription: '-',
        pickupDeadline: '15.01.2026',
        placeId: 'AB1014',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Parasol',
            json_value: 'Parasol',
            field_score: 0.79,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: '',
            field_score: 0.79,
            comment: 'LLM nie rozpoznał koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Radom',
            json_value: 'Radom',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '16.12.2025',
            json_value: '16.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 15,
        source_row: 'Książka, 17.12.2025, Sosnowiec, 16.01.2026, AB1015',
        overall_score: 0.88,
        id: 15,
        generalDescription: '-',
        pickupDeadline: '16.01.2026',
        placeId: 'AB1015',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Książka',
            json_value: 'Książka',
            field_score: 0.88,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: '',
            json_value: '',
            field_score: 1.0,
            comment: 'Brak koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Sosnowiec',
            json_value: 'Sosnowiec',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '17.12.2025',
            json_value: '17.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 16,
        source_row: 'Dokumenty, 18.12.2025, Toruń, 17.01.2026, AB1016',
        overall_score: 0.91,
        id: 16,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '17.01.2026',
        placeId: 'AB1016',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Dokumenty',
            json_value: 'Dokumenty',
            field_score: 0.91,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: '',
            json_value: '',
            field_score: 1.0,
            comment: 'Brak koloru',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Toruń',
            json_value: 'Toruń',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '18.12.2025',
            json_value: '18.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 17,
        source_row: 'Portfel skórzany brązowy, 19.12.2025, Kielce, 18.01.2026, AB1017',
        overall_score: 0.94,
        id: 17,
        generalDescription: '-',
        pickupDeadline: '18.01.2026',
        placeId: 'AB1017',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Portfel skórzany',
            json_value: 'Portfel skórzany',
            field_score: 0.94,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'brązowy',
            json_value: 'brązowy',
            field_score: 0.94,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Kielce',
            json_value: 'Kielce',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '19.12.2025',
            json_value: '19.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 18,
        source_row: 'Słuchawki bezprzewodowe białe, 20.12.2025, Gliwice, 19.01.2026, AB1018',
        overall_score: 0.87,
        id: 18,
        generalDescription: '-',
        pickupDeadline: '19.01.2026',
        placeId: 'AB1018',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Słuchawki bezprzewodowe',
            json_value: 'Słuchawki',
            field_score: 0.87,
            comment: 'LLM nie rozpoznał pełnej nazwy',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'biały',
            json_value: 'biały',
            field_score: 0.87,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Gliwice',
            json_value: 'Gliwice',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '20.12.2025',
            json_value: '20.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 19,
        source_row: 'Powerbank czarny, 21.12.2025, Zabrze, 20.01.2026, AB1019',
        overall_score: 0.84,
        id: 19,
        generalDescription: 'Dodatkowe informacje o przedmiocie',
        pickupDeadline: '20.01.2026',
        placeId: 'AB1019',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Powerbank',
            json_value: 'Powerbank',
            field_score: 0.84,
            comment: '',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'czarny',
            json_value: 'czarny',
            field_score: 0.84,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Zabrze',
            json_value: 'Zabrze',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '21.12.2025',
            json_value: '21.12.2025',
            field_score: 1.0,
            comment: '',
          },
        },
      },
      {
        index: 20,
        source_row: 'Kabel USB biały, 22.12.2025, Bytom, 21.01.2026, AB1020',
        overall_score: 0.81,
        id: 20,
        generalDescription: '-',
        pickupDeadline: '21.01.2026',
        placeId: 'AB1020',
        fields: {
          name: {
            source_columns: ['Nazwa rzeczy'],
            source_value: 'Kabel USB',
            json_value: 'Kabel',
            field_score: 0.81,
            comment: 'LLM nie rozpoznał pełnej nazwy',
          },
          itemColor: {
            source_columns: ['Kolor'],
            source_value: 'biały',
            json_value: 'biały',
            field_score: 0.81,
            comment: '',
          },
          location: {
            source_columns: ['Miejsce znalezienia'],
            source_value: 'Bytom',
            json_value: 'Bytom',
            field_score: 1.0,
            comment: '',
          },
          foundDate: {
            source_columns: ['Data znalezienia'],
            source_value: '22.12.2025',
            json_value: '22.12.2025',
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

  private addDays(dateStr: string, days: number): string {
    const [day, month, year] = dateStr.split('.');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setDate(date.getDate() + days);
    const newDay = String(date.getDate()).padStart(2, '0');
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newYear = date.getFullYear();
    return `${newDay}.${newMonth}.${newYear}`;
  }

  setVerificationData(records: ImportRecord[], fileName: string, file?: File): void {
    this.verificationData = records;
    this.currentFileName = fileName;
    if (file) {
      this.originalFile = file;
    }
    this.saveDraft(fileName, records, [], file);
  }

  getOriginalFile(): File | null {
    return this.originalFile;
  }

  updateDraft(fileName: string, records: ImportRecord[], acceptedIndexes: number[]): void {
    const drafts = this.getDrafts();
    const existingDraft = drafts.find(d => d.fileName === fileName);
    const file = existingDraft?.fileContent ? this.base64ToFile(existingDraft.fileContent, existingDraft.fileName, existingDraft.fileType) : undefined;
    this.saveDraft(fileName, records, acceptedIndexes, file).catch((error: unknown) => {
      console.error('Błąd aktualizacji szkicu:', error);
    });
  }

  private async saveDraft(fileName: string, records: ImportRecord[], acceptedIndexes: number[], file?: File): Promise<void> {
    try {
      const drafts = this.getDrafts();
      const existingDraftIndex = drafts.findIndex(d => d.fileName === fileName);
      
      let fileContent: string | undefined;
      let fileType: string | undefined;
      if (file) {
        fileContent = await this.fileToBase64(file);
        fileType = file.type;
      } else {
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
      
      if (file) {
        this.originalFile = file;
      }
    } catch (error) {
      console.error('Błąd zapisu szkicu:', error);
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

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

  removeDraft(fileName: string): void {
    try {
      const drafts = this.getDrafts();
      const filtered = drafts.filter(d => d.fileName !== fileName);
      localStorage.setItem(this.DRAFTS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Błąd usuwania szkicu:', error);
    }
  }

  getVerificationData(): ImportRecord[] | null {
    return this.verificationData;
  }

  getCurrentFileName(): string | null {
    return this.currentFileName;
  }

  clearVerificationData(): void {
    this.verificationData = null;
    this.currentFileName = null;
  }
}

