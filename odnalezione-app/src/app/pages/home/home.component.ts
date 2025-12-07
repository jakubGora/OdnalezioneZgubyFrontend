import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FileUploadService, ImportRecord } from '../../services/file-upload.service';
import { LostItemService, LostItemCollectionItem } from '../../services/lost-item.service';
import { NotificationService } from '../../services/notification.service';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

interface Draft {
  fileName: string;
  fileNameWithoutExtension: string;
  lastModified: string;
  records: ImportRecord[];
  acceptedIndexes: number[];
}

type SortField = 'foundDate' | 'name' | 'location' | 'pickupDeadline' | 'status';
type SortDirection = 'asc' | 'desc';
type ItemStatus = 'do-odbioru' | 'wydano' | 'uplynal-termin';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly lostItemService = inject(LostItemService);
  private readonly notificationService = inject(NotificationService);
  
  drafts: Draft[] = [];
  
  // Tabela przedmiotów
  items: LostItemCollectionItem[] = [];
  filteredItems: LostItemCollectionItem[] = [];
  searchQuery: string = '';
  private searchSubject = new Subject<string>();
  isLoading: boolean = false;
  
  // Sortowanie
  sortField: SortField = 'foundDate';
  sortDirection: SortDirection = 'asc';
  
  // Checkboxy
  selectedItems: Set<number> = new Set();
  
  // Modal edycji
  isModalOpen: boolean = false;
  editingItem: LostItemCollectionItem | null = null;
  editedData: {
    name: string;
    itemColor: string;
    additionalInfo: string;
    foundDate: string;
    location: string;
    foundPlace: string;
    notificationDate: string;
    warehousePlace: string;
  } = {
    name: '',
    itemColor: '',
    additionalInfo: '',
    foundDate: '',
    location: '',
    foundPlace: '',
    notificationDate: '',
    warehousePlace: '',
  };

  /**
   * Enkoduje URI dla routerLink
   */
  encodeURIComponent(value: string): string {
    return encodeURIComponent(value);
  }

  ngOnInit(): void {
    this.loadDrafts();
    this.loadItems();
    
    // Wyszukiwanie z debounce
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query: string) => {
          this.isLoading = true;
          // Jeśli query jest puste, przekaż undefined aby pobrać wszystko
          const searchQuery = query && query.trim() ? query.trim() : undefined;
          return this.lostItemService.getItemCollection(searchQuery);
        })
      )
      .subscribe({
        next: (items) => {
          this.items = items;
          this.filteredItems = [...items];
          this.applySorting();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Błąd podczas pobierania przedmiotów:', error);
          this.isLoading = false;
        },
      });
  }

  private loadDrafts(): void {
    const allDrafts = this.fileUploadService.getDrafts();
    // Filtruj tylko szkice, które mają niezaakceptowane rekordy
    const draftsWithUnaccepted = allDrafts.filter(draft => {
      const acceptedSet = new Set(draft.acceptedIndexes || []);
      return draft.records.some(record => !acceptedSet.has(record.index));
    });

    this.drafts = draftsWithUnaccepted.map(draft => ({
      fileName: draft.fileName,
      fileNameWithoutExtension: this.removeFileExtension(draft.fileName),
      lastModified: this.formatDate(new Date(draft.lastModified)),
      records: draft.records,
      acceptedIndexes: draft.acceptedIndexes || [],
    }));
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

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}, g. ${hours}:${minutes}`;
  }

  /**
   * Ładuje przedmioty z API
   */
  private loadItems(): void {
    this.isLoading = true;
    this.lostItemService.getItemCollection().subscribe({
      next: (items) => {
        this.items = items;
        this.filteredItems = [...items];
        this.applySorting();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Błąd podczas pobierania przedmiotów:', error);
        this.isLoading = false;
      },
    });
  }

  /**
   * Obsługuje wyszukiwanie
   */
  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Obsługuje sortowanie
   */
  onSortChange(field: SortField): void {
    if (this.sortField === field) {
      // Zmień kierunek sortowania
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Ustaw nowe pole i domyślnie rosnąco
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applySorting();
  }

  /**
   * Stosuje sortowanie do danych
   */
  private applySorting(): void {
    this.filteredItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (this.sortField) {
        case 'foundDate':
          aValue = this.parseDate(a.foundDate);
          bValue = this.parseDate(b.foundDate);
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'location':
          aValue = a.location?.toLowerCase() || '';
          bValue = b.location?.toLowerCase() || '';
          break;
        case 'pickupDeadline':
          // Używamy notificationDate jako termin odbioru
          aValue = this.parseDate(a.notificationDate);
          bValue = this.parseDate(b.notificationDate);
          break;
        case 'status':
          // Sortowanie po statusach - używamy priorytetów
          const statusPriority: Record<ItemStatus, number> = {
            'do-odbioru': 1,
            'wydano': 2,
            'uplynal-termin': 3,
          };
          aValue = statusPriority[this.getItemStatus(a)] || 999;
          bValue = statusPriority[this.getItemStatus(b)] || 999;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Parsuje datę z formatu DD-MM-YYYY
   */
  private parseDate(dateString: string): Date {
    if (!dateString) return new Date(0);
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(0);
  }

  /**
   * Formatuje datę do wyświetlenia (DD.MM.YYYY)
   */
  formatDisplayDate(dateString: string): string {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return dateString;
  }

  /**
   * Określa status przedmiotu
   */
  getItemStatus(item: LostItemCollectionItem): ItemStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pickupDate = this.parseDate(item.notificationDate);
    pickupDate.setHours(0, 0, 0, 0);
    
    // TODO: Sprawdzić czy przedmiot został wydany (wymaga dodatkowego pola w API)
    // Na razie sprawdzamy tylko termin odbioru
    
    if (pickupDate < today) {
      return 'uplynal-termin';
    }
    
    return 'do-odbioru';
  }

  /**
   * Pobiera tekst statusu
   */
  getStatusText(status: ItemStatus): string {
    switch (status) {
      case 'do-odbioru':
        return 'Do odbioru';
      case 'wydano':
        return 'Wydano';
      case 'uplynal-termin':
        return 'Upłynął termin';
      default:
        return '';
    }
  }

  /**
   * Obsługuje zaznaczanie wszystkich
   */
  toggleAllItems(): void {
    if (this.selectedItems.size === this.filteredItems.length) {
      this.selectedItems.clear();
    } else {
      this.filteredItems.forEach(item => {
        this.selectedItems.add(item.id);
      });
    }
  }

  /**
   * Sprawdza czy wszystkie są zaznaczone
   */
  isAllSelected(): boolean {
    return this.filteredItems.length > 0 && this.selectedItems.size === this.filteredItems.length;
  }

  /**
   * Obsługuje zaznaczanie pojedynczego przedmiotu
   */
  toggleItemSelection(itemId: number): void {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
  }

  /**
   * Sprawdza czy przedmiot jest zaznaczony
   */
  isItemSelected(itemId: number): boolean {
    return this.selectedItems.has(itemId);
  }

  /**
   * Pobiera ikonę sortowania
   */
  getSortIcon(field: SortField): string {
    if (this.sortField !== field) {
      return '↓'; // Domyślna ikona
    }
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  /**
   * Otwiera modal do edycji przedmiotu
   */
  openEditModal(item: LostItemCollectionItem): void {
    this.editingItem = item;
    // Konwertuj daty z DD-MM-YYYY do YYYY-MM-DD dla input date
    this.editedData = {
      name: item.name || '',
      itemColor: item.itemColor || '',
      additionalInfo: item.additionalInfo || '',
      foundDate: this.convertDateToInputFormat(item.foundDate),
      location: item.location || '',
      foundPlace: item.foundPlace || '',
      notificationDate: this.convertDateToInputFormat(item.notificationDate),
      warehousePlace: item.warehousePlace || '',
    };
    this.isModalOpen = true;
  }

  /**
   * Zamyka modal
   */
  closeModal(): void {
    this.isModalOpen = false;
    this.editingItem = null;
    this.editedData = {
      name: '',
      itemColor: '',
      additionalInfo: '',
      foundDate: '',
      location: '',
      foundPlace: '',
      notificationDate: '',
      warehousePlace: '',
    };
  }

  /**
   * Zapisuje zmiany w przedmiocie
   */
  saveItem(): void {
    if (!this.editingItem) return;

    // Konwertuj daty z YYYY-MM-DD (z input) do DD-MM-YYYY (dla API)
    const updatedItem: LostItemCollectionItem = {
      ...this.editingItem,
      name: this.editedData.name.trim(),
      itemColor: this.editedData.itemColor.trim() || undefined,
      additionalInfo: this.editedData.additionalInfo.trim() || undefined,
      foundDate: this.convertDateFromInputFormat(this.editedData.foundDate),
      location: this.editedData.location.trim(),
      foundPlace: this.editedData.foundPlace.trim() || undefined,
      notificationDate: this.convertDateFromInputFormat(this.editedData.notificationDate),
      warehousePlace: this.editedData.warehousePlace.trim(),
    };

    this.lostItemService.updateItem(updatedItem).subscribe({
      next: (updated) => {
        // Zaktualizuj przedmiot w liście
        const index = this.items.findIndex(item => item.id === updated.id);
        if (index >= 0) {
          this.items[index] = updated;
          this.filteredItems = [...this.items];
          this.applySorting();
        }
        this.notificationService.showSuccess('Przedmiot został zaktualizowany pomyślnie.');
        this.closeModal();
      },
      error: (error) => {
        console.error('Błąd podczas aktualizacji przedmiotu:', error);
        this.notificationService.showError('Wystąpił błąd podczas aktualizacji przedmiotu. Spróbuj ponownie.');
      },
    });
  }

  /**
   * Usuwa przedmiot
   */
  deleteItem(): void {
    if (!this.editingItem) return;

    if (!confirm('Czy na pewno chcesz usunąć ten przedmiot?')) {
      return;
    }

    this.lostItemService.deleteItem(this.editingItem.id).subscribe({
      next: () => {
        // Usuń przedmiot z listy
        this.items = this.items.filter(item => item.id !== this.editingItem!.id);
        this.filteredItems = this.filteredItems.filter(item => item.id !== this.editingItem!.id);
        this.selectedItems.delete(this.editingItem!.id);
        this.notificationService.showSuccess('Przedmiot został usunięty pomyślnie.');
        this.closeModal();
      },
      error: (error) => {
        console.error('Błąd podczas usuwania przedmiotu:', error);
        this.notificationService.showError('Wystąpił błąd podczas usuwania przedmiotu. Spróbuj ponownie.');
      },
    });
  }

  /**
   * Konwertuje datę z formatu DD-MM-YYYY do YYYY-MM-DD (dla input date)
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
}

