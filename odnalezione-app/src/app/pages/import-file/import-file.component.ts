import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FileUploadService, ImportFileResponse, ImportRecord } from '../../services/file-upload.service';

@Component({
  selector: 'app-import-file',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-file.component.html',
  styleUrl: './import-file.component.scss',
})
export class ImportFileComponent {
  private readonly fileUploadService = inject(FileUploadService);
  private readonly router = inject(Router);

  isDragging = false;
  selectedFile: File | null = null;
  isLoading = false;
  uploadResponse: ImportFileResponse | null = null;
  error: string | null = null;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  private handleFile(file: File): void {
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      this.error = 'Nieprawidłowy format pliku. Dozwolone formaty: .csv, .xls, .pdf';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.error = null;
    this.uploadResponse = null;
    this.uploadFile();
  }

  private uploadFile(): void {
    if (!this.selectedFile) {
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.uploadResponse = null;

    this.fileUploadService.uploadFile(this.selectedFile).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.uploadResponse = response;
        console.log('📤 Odpowiedź z serwera:', JSON.stringify(response, null, 2));
        
        // Przekieruj do widoku weryfikacji po sukcesie
        if (response.success && this.selectedFile) {
          // Zapisz plik w serwisie dla podglądu
          const fileNameWithoutExtension = this.removeFileExtension(this.selectedFile.name);
          this.fileUploadService.setVerificationData(response.records || [], this.selectedFile.name, this.selectedFile);
          // Usuń rozszerzenie z nazwy pliku dla routingu
          const encodedFileName = encodeURIComponent(fileNameWithoutExtension);
          this.router.navigate(['/importuj-plik/weryfikuj', encodedFileName]);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.error = error.error || 'Wystąpił błąd podczas wgrywania pliku';
        console.error('❌ Błąd wgrywania pliku:', error);
      },
    });
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    fileInput?.click();
  }

  get records(): ImportRecord[] {
    return this.uploadResponse?.records || [];
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
}

