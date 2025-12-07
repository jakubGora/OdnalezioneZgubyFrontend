import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { LostItemService, LostItemFormData } from '../../services/lost-item.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-add-single-item',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './add-single-item.component.html',
  styleUrl: './add-single-item.component.scss',
})
export class AddSingleItemComponent {
  private readonly lostItemService = inject(LostItemService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  currentStep: 1 | 2 = 1;

  // Step 1 fields
  name: string = '';
  itemColor: string = '';
  additionalInfo: string = '';

  // Step 2 fields
  foundDate: string = '';
  location: string = '';
  foundPlace: string = '';
  warehousePlace: string = '';

  goToStep2(): void {
    if (this.name.trim()) {
      this.currentStep = 2;
    }
  }

  goToStep1(): void {
    this.currentStep = 1;
  }

  cancelForm(): void {
    if (confirm('Czy na pewno chcesz anulować wypełnianie formularza? Wszystkie wprowadzone dane zostaną utracone.')) {
      this.resetForm();
      this.router.navigate(['/']);
    }
  }

  addItem(): void {
    const formData: LostItemFormData = {
      name: this.name,
      itemColor: this.itemColor,
      additionalInfo: this.additionalInfo,
      foundDate: this.foundDate,
      location: this.location,
      foundPlace: this.foundPlace,
      notificationDate: this.foundDate, // Używamy foundDate jako notificationDate
      warehousePlace: this.warehousePlace,
    };

    this.lostItemService.submitLostItem(formData).subscribe({
      next: (response) => {
        console.log('✅ Przedmiot został dodany pomyślnie:', response);
        this.notificationService.showSuccess(
          `Przedmiot został dodany pomyślnie! ID: ${response.id}`
        );
        // Opcjonalnie: przekieruj do strony głównej lub wyczyść formularz
        this.resetForm();
      },
      error: (error) => {
        console.error('❌ Błąd podczas dodawania przedmiotu:', error);
        this.notificationService.showError(
          'Wystąpił błąd podczas dodawania przedmiotu. Spróbuj ponownie.'
        );
      },
    });
  }

  private resetForm(): void {
    this.currentStep = 1;
    this.name = '';
    this.itemColor = '';
    this.additionalInfo = '';
    this.foundDate = '';
    this.location = '';
    this.foundPlace = '';
    this.warehousePlace = '';
  }
}

