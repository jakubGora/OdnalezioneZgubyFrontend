import { Route } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AddSingleItemComponent } from './pages/add-single-item/add-single-item.component';
import { ImportFileComponent } from './pages/import-file/import-file.component';
import { ImportVerificationComponent } from './pages/import-verification/import-verification.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: HomeComponent,
    title: 'Strona główna - Odnalezione',
  },
  {
    path: 'dodaj-przedmiot',
    component: AddSingleItemComponent,
    title: 'Dodaj przedmiot - Odnalezione',
  },
  {
    path: 'importuj-plik',
    component: ImportFileComponent,
    title: 'Importuj plik - Odnalezione',
  },
  {
    path: 'importuj-plik/weryfikuj/:filename',
    component: ImportVerificationComponent,
    title: 'Weryfikuj import - Odnalezione',
  },
];
