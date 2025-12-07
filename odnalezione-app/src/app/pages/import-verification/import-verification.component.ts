import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { FileUploadService, ImportRecord } from '../../services/file-upload.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-import-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './import-verification.component.html',
  styleUrl: './import-verification.component.scss',
})
export class ImportVerificationComponent implements OnInit {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly notificationService = inject(NotificationService);
  private readonly sanitizer = inject(DomSanitizer);

  fileName: string = '';
  records: ImportRecord[] = [];
  selectedRows: Set<number> = new Set();
  acceptedRows: Set<number> = new Set();
  private readonly STORAGE_KEY = 'accepted_import_records';
  
  sortField: 'compliance' | null = null;
  sortDirection: 'asc' | 'desc' = 'asc';

  isModalOpen: boolean = false;
  isInfoModalOpen: boolean = false;
  isPreviewOpen: boolean = false;
  previewContent: string | null = null;
  previewFileName: string = '';
  previewFileType: 'text' | 'pdf' | 'excel' = 'text';
  previewPdfUrl: SafeResourceUrl | null = null;
  editingRecord: ImportRecord | null = null;
  
  highlightedRecordIndex: number | null = null;
  highlightedFieldName: string | null = null;
  editedData: {
    name: string;
    generalDescription: string;
    foundDate: string;
    location: string;
    foundPlace: string;
    pickupDeadline: string;
    placeId: string;
  } = {
    name: '',
    generalDescription: '',
    foundDate: '',
    location: '',
    foundPlace: '',
    pickupDeadline: '',
    placeId: '',
  };

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const fileNameWithoutExtension = decodeURIComponent(params['filename']);
      this.fileName = fileNameWithoutExtension;
      
      const drafts = this.fileUploadService.getDrafts();
      const draft = drafts.find(d => {
        const draftNameWithoutExt = this.removeFileExtension(d.fileName);
        return d.fileName === this.fileName || draftNameWithoutExt === this.fileName;
      });
      
      if (draft) {
        this.records = draft.records;
        this.acceptedRows = new Set(draft.acceptedIndexes || []);
        this.fileName = this.removeFileExtension(draft.fileName);
        const savedFile = this.fileUploadService.getDraftFile(draft.fileName);
        this.fileUploadService.setVerificationData(this.records, draft.fileName, savedFile || undefined);
        this.isInfoModalOpen = false;
      } else {
        const data = this.fileUploadService.getVerificationData();
        if (data) {
          this.records = data;
          this.loadAcceptedFromStorage();
          this.isInfoModalOpen = true;
        } else {
          this.router.navigate(['/importuj-plik']);
          return;
        }
      }
      
      this.filterAcceptedRecords();
      this.saveDraft();
    });
  }

  toggleRowSelection(recordIndex: number): void {
    if (this.selectedRows.has(recordIndex)) {
      this.selectedRows.delete(recordIndex);
    } else {
      this.selectedRows.add(recordIndex);
    }
  }

  toggleAllRows(): void {
    const visibleRecords = this.getVisibleRecords();
    if (this.selectedRows.size === visibleRecords.length && visibleRecords.length > 0) {
      this.selectedRows.clear();
    } else {
      visibleRecords.forEach((record) => {
        this.selectedRows.add(record.index);
      });
    }
  }

  isAllSelected(): boolean {
    const visibleRecords = this.getVisibleRecords();
    if (visibleRecords.length === 0) return false;
    return visibleRecords.every(record => this.selectedRows.has(record.index));
  }

  acceptRecord(recordIndex: number): void {
    this.acceptedRows.add(recordIndex);
    this.saveAcceptedToStorage();
    this.saveDraft();
    // Filtruj zaakceptowane rekordy z widoku
    this.filterAcceptedRecords();
  }

  unacceptRecord(recordIndex: number): void {
    this.acceptedRows.delete(recordIndex);
    this.saveAcceptedToStorage();
    this.saveDraft();
    // Zaktualizuj widok
    this.filterAcceptedRecords();
  }

  acceptSelectedRecords(): void {
    this.selectedRows.forEach((index) => {
      this.acceptedRows.add(index);
    });
    this.saveAcceptedToStorage();
    this.saveDraft();
    this.selectedRows.clear();
    this.filterAcceptedRecords();
  }

  editRecord(recordIndex: number): void {
    const record = this.records.find((r) => r.index === recordIndex);
    if (!record) return;

    this.editingRecord = record;
    const foundDateValue = this.getFieldValue(record, 'foundDate');
    this.editedData = {
      name: this.getFieldValue(record, 'name'),
      generalDescription: record.generalDescription || '',
      foundDate: this.convertDateToInputFormat(foundDateValue),
      location: this.getFieldValue(record, 'location'),
      foundPlace: this.getFieldValue(record, 'foundPlace') || '',
      pickupDeadline: record.pickupDeadline || '',
      placeId: record.placeId || '',
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingRecord = null;
    this.editedData = {
      name: '',
      generalDescription: '',
      foundDate: '',
      location: '',
      foundPlace: '',
      pickupDeadline: '',
      placeId: '',
    };
  }

  closeInfoModal(): void {
    this.isInfoModalOpen = false;
  }

  openPreview(): void {
    const file = this.fileUploadService.getOriginalFile();
    if (!file) {
      this.notificationService.showWarning('Nie znaleziono oryginalnego pliku.');
      return;
    }

    this.previewFileName = file.name;
    this.isPreviewOpen = true;
    this.previewContent = null;
    this.previewPdfUrl = null;
    this.previewFileType = 'text';

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      this.previewFileType = 'pdf';
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          this.previewPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
          this.previewContent = '';
        } else {
          this.previewContent = 'Nie udało się odczytać pliku PDF.';
        }
      };
      reader.onerror = () => {
        this.notificationService.showError('Błąd podczas odczytu pliku PDF.');
        this.previewContent = 'Błąd podczas odczytu pliku PDF.';
      };
      reader.readAsDataURL(file);
      return;
    } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
      this.previewFileType = 'excel';
      this.previewContent = 'Plik Excel wymaga specjalnego podglądu. Zawartość nie może być wyświetlona jako tekst.';
      return;
    }

    this.previewFileType = 'text';
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        this.previewContent = content;
      } else {
        this.previewContent = 'Nie udało się odczytać zawartości pliku.';
      }
    };
    reader.onerror = () => {
      this.notificationService.showError('Błąd podczas odczytu pliku.');
      this.previewContent = 'Błąd podczas odczytu pliku.';
    };

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsText(file, 'UTF-8');
    }
  }

  closePreview(): void {
    this.isPreviewOpen = false;
    this.previewContent = null;
    this.previewFileName = '';
    this.previewPdfUrl = null;
    this.previewFileType = 'text';
  }

  saveEditedRecord(): void {
    if (!this.editingRecord) return;

    if (this.editingRecord.fields['name']) {
      this.editingRecord.fields['name'].json_value = this.editedData.name;
    }
    if (this.editingRecord.fields['foundDate']) {
      this.editingRecord.fields['foundDate'].json_value = this.convertDateFromInputFormat(this.editedData.foundDate);
    }
    if (this.editingRecord.fields['location']) {
      this.editingRecord.fields['location'].json_value = this.editedData.location;
    }

    this.editingRecord.generalDescription = this.editedData.generalDescription;
    if (this.editingRecord.fields['foundPlace']) {
      this.editingRecord.fields['foundPlace'].json_value = this.editedData.foundPlace;
    }
    this.editingRecord.pickupDeadline = this.editedData.pickupDeadline;
    this.editingRecord.placeId = this.editedData.placeId;

    if (this.acceptedRows.has(this.editingRecord.index)) {
      this.saveAcceptedToStorage();
    }

    this.saveDraft();

    this.closeModal();
  }

  deleteRecordFromModal(): void {
    if (!this.editingRecord) return;

    if (confirm('Czy na pewno chcesz usunąć ten rekord?')) {
      const recordIndex = this.editingRecord.index;
      this.records = this.records.filter((r) => r.index !== recordIndex);
      this.selectedRows.delete(recordIndex);
      this.acceptedRows.delete(recordIndex);
      
      this.saveAcceptedToStorage();
      this.saveDraft();
      
      this.closeModal();
    }
  }

  submitAccepted(): void {
    const acceptedRecords = this.getAcceptedRecords();
    if (acceptedRecords.length === 0) {
      this.notificationService.showWarning('Brak zaakceptowanych rekordów do wysłania.');
      return;
    }

    console.log('📤 Wysyłanie zaakceptowanych rekordów:', acceptedRecords);
    console.log('📊 Liczba rekordów:', acceptedRecords.length);
    console.log('📄 JSON:', JSON.stringify(acceptedRecords, null, 2));

    const acceptedIndexes = Array.from(this.acceptedRows);
    this.records = this.records.filter(record => !this.acceptedRows.has(record.index));
    this.acceptedRows.clear();
    
    if (this.fileName) {
      this.fileUploadService.updateDraft(this.fileName, this.records, []);
    }
    
    this.clearAcceptedFromStorage();
    this.filterAcceptedRecords();

    if (this.records.length === 0 && this.fileName) {
      this.fileUploadService.removeDraft(this.fileName);
    }

    this.notificationService.showSuccess(
      `Wysłano ${acceptedRecords.length} zaakceptowanych rekordów.`
    );
  }

  getAcceptedCount(): number {
    return this.acceptedRows.size;
  }

  getAcceptedRecords(): ImportRecord[] {
    return this.records.filter((record) => this.acceptedRows.has(record.index));
  }

  getVisibleRecords(): ImportRecord[] {
    const records = [...this.records];
    
    if (this.sortField === 'compliance') {
      records.sort((a, b) => {
        const aAccepted = this.acceptedRows.has(a.index);
        const bAccepted = this.acceptedRows.has(b.index);
        
        if (aAccepted && !bAccepted) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        if (!aAccepted && bAccepted) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        
        const aScore = a.overall_score || 0;
        const bScore = b.overall_score || 0;
        
        if (aScore < bScore) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (aScore > bScore) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return records;
  }
  
  onSortChange(field: 'compliance'): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }
  
  getSortIcon(field: 'compliance'): string {
    if (this.sortField !== field) {
      return '↓';
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  private filterAcceptedRecords(): void {
    // Nie filtrujemy - zaakceptowane rekordy pozostają widoczne z zielonym tłem
  }

  private saveAcceptedToStorage(): void {
    const acceptedRecords = this.getAcceptedRecords();
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(acceptedRecords));
      // Zaktualizuj szkic w serwisie z listą zaakceptowanych indexów
      if (this.fileName && this.records.length > 0) {
        const acceptedIndexes = Array.from(this.acceptedRows);
        this.fileUploadService.updateDraft(this.fileName, this.records, acceptedIndexes);
      }
    } catch (error) {
      console.error('Błąd zapisu do localStorage:', error);
    }
  }

  private loadAcceptedFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const acceptedRecords: ImportRecord[] = JSON.parse(stored);
        // Dodaj indexy zaakceptowanych rekordów do Set
        acceptedRecords.forEach((record) => {
          this.acceptedRows.add(record.index);
        });
      }
    } catch (error) {
      console.error('Błąd odczytu z localStorage:', error);
    }
  }

  private clearAcceptedFromStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Błąd czyszczenia localStorage:', error);
    }
  }

  /**
   * Zapisuje szkic do localStorage
   */
  private saveDraft(): void {
    if (this.fileName && this.records.length > 0) {
      const acceptedIndexes = Array.from(this.acceptedRows);
      this.fileUploadService.updateDraft(this.fileName, this.records, acceptedIndexes);
    }
  }

  getComplianceLabel(score: number): string {
    const percentage = Math.round(score * 100);
    if (percentage >= 95) return 'Bardzo wysoka';
    if (percentage >= 75) return 'Wysoka';
    if (percentage >= 50) return 'Średnia';
    if (percentage >= 25) return 'Niska';
    return 'Bardzo niska';
  }

  getComplianceStatus(score: number): string {
    const percentage = Math.round(score * 100);
    if (percentage >= 95) return 'very-high';
    if (percentage >= 75) return 'high';
    if (percentage >= 50) return 'medium';
    if (percentage >= 25) return 'low';
    return 'very-low';
  }

  getFieldValue(record: ImportRecord, fieldName: string): string {
    return record.fields[fieldName]?.json_value || '';
  }

  /**
   * Wyodrębnia nazwę przedmiotu
   */
  getItemName(record: ImportRecord): string {
    const nameValue = this.getFieldValue(record, 'name');
    if (!nameValue) return '-';
    return nameValue;
  }

  /**
   * Wyodrębnia kolor przedmiotu z osobnego pola itemColor
   */
  getItemColor(record: ImportRecord): string {
    const colorValue = this.getFieldValue(record, 'itemColor');
    if (!colorValue || colorValue === '-') return '-';
    return colorValue;
  }

  getCompliancePercentage(score: number): number {
    return Math.round(score * 100);
  }

  /**
   * Konwertuje datę z formatu DD-MM-YYYY do YYYY-MM-DD (dla input date)
   * @param dateString Data w formacie DD-MM-YYYY lub YYYY-MM-DD
   * @returns Data w formacie YYYY-MM-DD
   */
  private convertDateToInputFormat(dateString: string): string {
    if (!dateString) return '';

    // Jeśli data jest już w formacie YYYY-MM-DD, zwróć bez zmian
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }

    // Konwersja z DD-MM-YYYY do YYYY-MM-DD
    const parts = dateString.split(/[-\/\.]/);
    if (parts.length === 3) {
      // Sprawdź czy pierwsza część to dzień (mniejsza niż 32) czy rok (większa niż 31)
      const firstPart = parseInt(parts[0], 10);
      if (firstPart <= 31 && parts[2].length === 4) {
        // Format DD-MM-YYYY
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else if (parts[0].length === 4) {
        // Format YYYY-MM-DD
        return dateString;
      }
    }

    return dateString;
  }

  /**
   * Konwertuje datę z formatu YYYY-MM-DD (z input date) do DD-MM-YYYY
   * @param dateString Data w formacie YYYY-MM-DD
   * @returns Data w formacie DD-MM-YYYY
   */
  private convertDateFromInputFormat(dateString: string): string {
    if (!dateString) return '';

    // Jeśli data jest już w formacie DD-MM-YYYY, zwróć bez zmian
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      return dateString;
    }

    // Konwersja z YYYY-MM-DD do DD-MM-YYYY
    const parts = dateString.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    return dateString;
  }

  /**
   * Usuwa rozszerzenie z nazwy pliku
   */
  private removeFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return fileName;
    }
    return fileName.substring(0, lastDotIndex);
  }

  /**
   * Obsługuje najechanie myszką na komórkę z danymi
   */
  onCellMouseEnter(recordIndex: number, fieldName: string): void {
    this.highlightedRecordIndex = recordIndex;
    this.highlightedFieldName = fieldName;
  }

  /**
   * Obsługuje opuszczenie komórki myszką
   */
  onCellMouseLeave(): void {
    this.highlightedRecordIndex = null;
    this.highlightedFieldName = null;
  }

  /**
   * Sprawdza, czy dany rekord i pole są podświetlone
   */
  isHighlighted(recordIndex: number, fieldName: string): boolean {
    return this.highlightedRecordIndex === recordIndex && this.highlightedFieldName === fieldName;
  }

  /**
   * Formatuje source_row z podświetleniem pasujących słów
   */
  getHighlightedSourceRow(record: ImportRecord): SafeHtml {
    if (!record.source_row) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    if (!this.isHighlighted(record.index, this.highlightedFieldName || '')) {
      // Jeśli nie jest podświetlone, zwróć zwykły tekst (escape HTML)
      const escaped = this.escapeHtml(record.source_row);
      return this.sanitizer.bypassSecurityTrustHtml(escaped);
    }

    const fieldName = this.highlightedFieldName;
    if (!fieldName) {
      const escaped = this.escapeHtml(record.source_row);
      return this.sanitizer.bypassSecurityTrustHtml(escaped);
    }

    // Pobierz wartość pola - może być w fields lub bezpośrednio w rekordzie
    let fieldValue = '';
    if (record.fields[fieldName]) {
      fieldValue = record.fields[fieldName].json_value || '';
    } else if (fieldName === 'pickupDeadline') {
      fieldValue = record.pickupDeadline || '';
    } else if (fieldName === 'placeId') {
      fieldValue = record.placeId || '';
    } else if (fieldName === 'generalDescription') {
      fieldValue = record.generalDescription || '';
    }

    if (!fieldValue || fieldValue === '-') {
      const escaped = this.escapeHtml(record.source_row);
      return this.sanitizer.bypassSecurityTrustHtml(escaped);
    }

    const sourceRow = record.source_row;
    
    // Najpierw escape HTML w source_row
    let highlightedText = this.escapeHtml(sourceRow);
    
    // Dla dat - specjalne dopasowanie (różne formaty)
    if (fieldName === 'foundDate' || fieldName === 'pickupDeadline') {
      // Próbuj dopasować datę w różnych formatach
      const datePatterns = this.getDatePatterns(fieldValue);
      datePatterns.forEach(pattern => {
        const regex = new RegExp(this.escapeRegex(pattern), 'gi');
        highlightedText = highlightedText.replace(regex, (match) => {
          return `<mark class="import-verification__source-row-highlight">${match}</mark>`;
        });
      });
    } else if (fieldName === 'location') {
      // Dla location - podświetlaj całą nazwę miejsca (może zawierać spacje, np. "Nowy Sącz")
      // Najpierw spróbuj dopasować całą wartość
      const escapedValue = this.escapeHtml(fieldValue);
      const regex = new RegExp(this.escapeRegex(fieldValue), 'gi');
      highlightedText = highlightedText.replace(regex, (match) => {
        return `<mark class="import-verification__source-row-highlight">${match}</mark>`;
      });
    } else {
      // Dla innych pól - podziel na słowa
      const fieldWords = this.extractWords(fieldValue);
      
      // Znajdź i podświetl pasujące słowa
      fieldWords.forEach(word => {
        if (word.length > 0) { // Podświetlaj wszystkie słowa (również krótkie jak "AB123")
          // Nie escape HTML w słowie - używamy oryginalnego słowa do dopasowania
          const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
          highlightedText = highlightedText.replace(regex, (match) => {
            return `<mark class="import-verification__source-row-highlight">${match}</mark>`;
          });
        }
      });
    }

    return this.sanitizer.bypassSecurityTrustHtml(highlightedText);
  }

  /**
   * Generuje różne wzorce daty z wartości pola (DD-MM-YYYY, DD.MM.YYYY, itp.)
   */
  private getDatePatterns(dateValue: string): string[] {
    if (!dateValue) return [];
    
    const patterns: string[] = [];
    
    // Jeśli data jest w formacie DD-MM-YYYY
    if (dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [day, month, year] = dateValue.split('-');
      // Dodaj różne warianty formatowania
      patterns.push(`${day}-${month}-${year}`);
      patterns.push(`${day}.${month}.${year}`);
      patterns.push(`${day}/${month}/${year}`);
      patterns.push(`${day} ${month} ${year}`);
    }
    // Jeśli data jest w formacie DD.MM.YYYY
    else if (dateValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const [day, month, year] = dateValue.split('.');
      patterns.push(`${day}.${month}.${year}`);
      patterns.push(`${day}-${month}-${year}`);
      patterns.push(`${day}/${month}/${year}`);
      patterns.push(`${day} ${month} ${year}`);
    }
    // Jeśli data jest w formacie YYYY-MM-DD
    else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      patterns.push(`${year}-${month}-${day}`);
      patterns.push(`${day}-${month}-${year}`);
      patterns.push(`${day}.${month}.${year}`);
      patterns.push(`${day}/${month}/${year}`);
    }
    // Dodaj oryginalną wartość jako wzorzec
    else {
      patterns.push(dateValue);
    }
    
    return patterns;
  }

  /**
   * Escapuje HTML w tekście
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Wyodrębnia słowa z tekstu (ignoruje znaki interpunkcyjne)
   */
  private extractWords(text: string): string[] {
    if (!text) return [];
    // Podziel na słowa, usuwając znaki interpunkcyjne i białe znaki
    return text
      .split(/[\s,;:\.\-\(\)\[\]\/\\]+/)
      .filter(word => word.length > 0)
      .map(word => word.trim())
      .filter(word => word.length > 0);
  }

  /**
   * Escapuje znaki specjalne w regex
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

