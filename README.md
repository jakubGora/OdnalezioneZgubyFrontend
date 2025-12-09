# Rejestr rzeczy znalezionych

## Aplikacja napisana na HackNation 2025 w 24h :D 

Aplikacja webowa do zarządzania rejestrem rzeczy znalezionych, zbudowana w Angular 20 z wykorzystaniem NX monorepo. Aplikacja umożliwia ręczne dodawanie przedmiotów, import plików CSV z automatyczną konwersją i walidacją danych przy użyciu AI, oraz przeglądanie i zarządzanie zapisanymi przedmiotami.

# Demo: https://www.youtube.com/watch?v=KTjW4EjQPq0
# BE: https://github.com/ArkadiuszGrzyb/OdnalezioneZguby

## 🚀 Technologie

- **Angular 20** - Framework aplikacji
- **NX 22** - Monorepo i narzędzia buildowe
- **TypeScript** - Język programowania
- **SCSS** - Preprocesor CSS z metodologią BEM
- **@ngrx/signals** - Zarządzanie stanem (Signal Store)
- **RxJS** - Programowanie reaktywne
- **Bun** - Runtime dla funkcji backendowych (Railway)

## 📋 Wymagania

- Node.js 18+ lub nowszy
- npm lub yarn
- (Opcjonalnie) Bun - dla uruchomienia funkcji backendowych lokalnie

## 🛠️ Instalacja

1. Sklonuj repozytorium:
```bash
git clone <repository-url>
cd odnalezioneFront
```

2. Zainstaluj zależności:
```bash
npm install
```

3. (Opcjonalnie) Zainstaluj zależności dla backendu:
```bash
cd backend
bun install
```

## ▶️ Uruchomienie

### Aplikacja frontendowa

Uruchom serwer deweloperski:
```bash
npx nx serve odnalezione-app
```

Aplikacja będzie dostępna pod adresem: `http://localhost:4200`

### Build produkcyjny

```bash
npx nx build odnalezione-app
```

Zbudowana aplikacja znajdzie się w katalogu `dist/odnalezione-app/browser`

### Uruchomienie zbudowanej aplikacji

```bash
npx nx serve-static odnalezione-app
```

### Backend (funkcja Bun)

Backend jest wdrożony na Railway. Aby uruchomić lokalnie:

```bash
cd backend
bun index.js
```

Więcej informacji w [backend/README.md](./backend/README.md)

## 📁 Struktura projektu

```
odnalezioneFront/
├── backend/                    # Funkcja Bun dla przetwarzania CSV
│   ├── index.js               # Główny plik funkcji
│   ├── package.json           # Zależności backendu
│   └── README.md              # Dokumentacja backendu
├── odnalezione-app/           # Główna aplikacja Angular
│   ├── public/               # Statyczne zasoby
│   │   ├── images/           # Obrazy (herb, logo)
│   │   ├── eu-logo/          # Logo UE
│   │   └── icons/            # Ikony SVG
│   └── src/
│       ├── app/
│       │   ├── components/   # Komponenty współdzielone
│       │   │   ├── header/    # Nagłówek strony
│       │   │   ├── footer/    # Stopka strony
│       │   │   ├── breadcrumbs/ # Nawigacja okruszkowa
│       │   │   ├── notification/ # Komponent powiadomień
│       │   │   └── accessibility-settings/ # Ustawienia dostępności
│       │   ├── pages/         # Strony aplikacji
│       │   │   ├── home/      # Strona główna z listą przedmiotów
│       │   │   ├── add-single-item/ # Formularz dodawania przedmiotu
│       │   │   ├── import-file/ # Import pliku CSV
│       │   │   └── import-verification/ # Weryfikacja zaimportowanych danych
│       │   ├── services/      # Serwisy Angular
│       │   │   ├── file-upload.service.ts # Obsługa importu plików
│       │   │   ├── lost-item.service.ts # API dla przedmiotów
│       │   │   └── notification.service.ts # System powiadomień
│       │   ├── stores/        # Signal Stores
│       │   │   └── accessibility.store.ts # Stan dostępności
│       │   ├── app.ts         # Główny komponent
│       │   ├── app.routes.ts  # Routing
│       │   └── app.config.ts  # Konfiguracja aplikacji
│       ├── styles.scss        # Globalne style
│       └── main.ts            # Entry point
├── odnalezione-app-e2e/       # Testy E2E (Playwright)
├── package.json              # Zależności główne
├── nx.json                   # Konfiguracja NX
└── tsconfig.base.json        # Konfiguracja TypeScript
```

## 🎯 Główne funkcjonalności

### 1. Strona główna (`/`)
- Przeglądanie wszystkich przedmiotów w rejestrze
- Wyszukiwanie po nazwie (case-insensitive, częściowe dopasowanie)
- Sortowanie po dacie znalezienia i statusie
- Edycja i usuwanie przedmiotów
- Lista nieopublikowanych szkiców (draftów)

### 2. Dodawanie przedmiotu ręcznie (`/add-single-item`)
- Dwukrokowy formularz dodawania przedmiotu
- Walidacja pól wymaganych
- Integracja z API backendowym

### 3. Import pliku (`/importuj-plik`)
- Upload plików CSV
- Drag & drop
- Obsługa formatów: CSV, XLS, PDF
- Automatyczna konwersja CSV → JSON przy użyciu AI
- Walidacja zgodności danych

### 4. Weryfikacja importu (`/importuj-plik/weryfikuj/:filename`)
- Przegląd zaimportowanych rekordów
- Wskaźnik zgodności danych (compliance score)
- Edycja i usuwanie rekordów
- Akceptacja rekordów
- Podgląd oryginalnego pliku
- Podświetlanie dopasowań w źródłowym tekście
- Sortowanie po zgodności
- Automatyczne zapisywanie szkiców

### 5. Funkcje dostępności
- Tryby wysokiego kontrastu (czarno-biały, czarno-żółty, żółto-czarny)
- Zmiana rozmiaru czcionki
- Skip links dla nawigacji klawiaturą
- Zgodność z WCAG 2.2

## 🔧 Konfiguracja

### API Backend

Aplikacja komunikuje się z dwoma backendami:

1. **API przedmiotów** (Java Backend - osobne repozytorium)
   - Endpoint: `http://localhost:8080/item` - CRUD operacje na przedmiotach
   - Endpoint: `http://localhost:8080/item/collection?name=` - Lista przedmiotów z wyszukiwaniem
   - Backend Java znajduje się w osobnym repozytorium

2. **API przetwarzania CSV** (Bun Function na Railway)
   - URL: `https://function-bun-production-eb96.up.railway.app`
   - Konfiguracja w: `odnalezione-app/src/app/services/file-upload.service.ts`
   - Backend odpowiedzialny wyłącznie za odczytywanie i przetwarzanie plików z różnymi źródłami danych o rzeczach zagubionych z różnych urzędów

### Zmienne środowiskowe

Dla funkcji backendowej (Railway):
- `OPENAI_API_KEY` - Klucz API OpenAI (wymagany)
- `PORT` - Port serwera (automatycznie ustawiany przez Railway)

## 🧩 Architektura

### Komponenty

Aplikacja używa architektury komponentowej Angular z podziałem na:
- **Components** - Komponenty współdzielone (header, footer, breadcrumbs, etc.)
- **Pages** - Strony aplikacji (home, add-single-item, import-file, etc.)
- **Services** - Logika biznesowa i komunikacja z API
- **Stores** - Zarządzanie stanem globalnym (Signal Store)

### Routing

Routing zdefiniowany w `app.routes.ts`:
- `/` - Strona główna
- `/add-single-item` - Dodawanie przedmiotu
- `/importuj-plik` - Import pliku
- `/importuj-plik/weryfikuj/:filename` - Weryfikacja importu

### State Management

Aplikacja używa **@ngrx/signals** (Signal Store) do zarządzania stanem:
- `AccessibilityStore` - Stan ustawień dostępności (kontrast, rozmiar czcionki)
- Stan zapisywany w `localStorage` dla trwałości

### Styling

- **SCSS** z metodologią **BEM** (Block Element Modifier)
- Globalne style w `styles.scss`
- Style komponentów w plikach `*.component.scss`
- Wsparcie dla trybów wysokiego kontrastu

## 📝 Development

### Uruchomienie w trybie deweloperskim

```bash
npx nx serve odnalezione-app
```

### Linting

```bash
npx nx lint odnalezione-app
```

### Testy

```bash
npx nx test odnalezione-app
```

### Testy E2E

```bash
npx nx e2e odnalezione-app-e2e
```

### Generowanie nowych komponentów

```bash
npx nx generate @nx/angular:component components/nazwa-komponentu --project=odnalezione-app
```

## 🚢 Deployment

### Build produkcyjny

```bash
npx nx build odnalezione-app --configuration=production
```

### Statyczne pliki

Zbudowane pliki znajdują się w `dist/odnalezione-app/browser` i mogą być wdrożone na dowolny serwer statyczny (np. Nginx, Apache, Vercel, Netlify).

### Backend

**Backend Java** (API przedmiotów) znajduje się w osobnym repozytorium i odpowiada za zarządzanie danymi przedmiotów w rejestrze.

**Backend Bun** (przetwarzanie plików) jest wdrożony jako Bun Function na Railway i odpowiada wyłącznie za odczytywanie i przetwarzanie plików z różnymi źródłami danych o rzeczach zagubionych z różnych urzędów. Więcej informacji w [backend/README.md](./backend/README.md).

## 🔐 Bezpieczeństwo

- Angular DomSanitizer używany do bezpiecznego renderowania HTML i URL
- Walidacja danych po stronie klienta i serwera
- CORS skonfigurowany dla API backendowego

## ♿ Dostępność

Aplikacja została zaprojektowana z myślą o dostępności:
- Zgodność z WCAG 2.2
- Tryby wysokiego kontrastu
- Zmiana rozmiaru czcionki
- Nawigacja klawiaturą
- Skip links
- Semantyczny HTML
- ARIA attributes

## 📚 Dodatkowe informacje

### LocalStorage

Aplikacja używa `localStorage` do przechowywania:
- Ustawień dostępności
- Szkiców importów (draftów)
- Zaakceptowanych rekordów

### Format danych

- **Daty**: Format DD-MM-YYYY w API, konwersja do YYYY-MM-DD dla input date
- **CSV**: Separator `;` (średnik), kodowanie UTF-8
- **JSON**: Standardowy format JSON dla komunikacji z API

## 🤝 Wsparcie

Aplikacja wykonana w ramach hackathonu **HackNation 2025**, 6-7 grudnia.

