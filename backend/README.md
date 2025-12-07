# CSV Processor API

API do przetwarzania plików CSV na JSON oraz walidacji zgodności danych przy użyciu OpenAI.

## Wdrożenie

Obecnie wdrożone jako **Bun Function na Railway**.

**URL produkcyjny:** `https://function-bun-production-eb96.up.railway.app`

Docelowo może być postawione na dowolnym serwerze obsługującym Bun runtime.

## Wymagania

- Bun runtime
- Zmienna środowiskowa `OPENAI_API_KEY` - klucz API OpenAI

## Instalacja

```bash
bun install
```

## Uruchomienie lokalnie

```bash
bun index.js
```

Serwer uruchomi się na porcie określonym przez zmienną środowiskową `PORT` (domyślnie 3000).

## API

### Endpoint

`POST /`

### Request Body

```json
{
  "action": "process" | "validate" | "full",
  "csvContent": "string z zawartością CSV",
  "jsonContent": "string z zawartością JSON (wymagane dla validate)"
}
```

### Akcje

- **`process`**: Konwertuje CSV na JSON
- **`validate`**: Waliduje zgodność JSON z CSV
- **`full`**: Wykonuje pełny proces: CSV → JSON → walidacja

### Response

```json
{
  "action": "full",
  "jsonData": {
    "items": [...]
  },
  "validationResults": [...]
}
```

## Funkcjonalność

1. **Parsowanie CSV** - obsługuje różne formaty, automatycznie wykrywa nagłówki
2. **Konwersja CSV → JSON** - używa OpenAI GPT-4o do mapowania danych
3. **Walidacja** - porównuje wygenerowany JSON z oryginalnym CSV i ocenia zgodność

## CORS

API obsługuje CORS i pozwala na żądania z dowolnego źródła.

