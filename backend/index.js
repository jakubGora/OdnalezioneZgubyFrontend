import { OpenAI } from 'openai';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const TARGET_SCHEMA = [
  { "name": "name", "type": "string", "description": "Krótka nazwa / opis znalezionej rzeczy." },
  { "name": "itemColor", "type": "string", "description": "Kolor rzeczy, jeśli jest znany." },
  { "name": "additionalInfo", "type": "string", "description": "Dodatkowe informacje, np. marka, model, numer seryjny." },
  { "name": "foundDate", "type": "date", "description": "Data znalezienia rzeczy." },
  { "name": "location", "type": "string", "description": "Ogólne miejsce znalezienia (miasto, rejon)." },
  { "name": "foundPlace", "type": "string", "description": "Bardziej szczegółowe miejsce znalezienia." },
  { "name": "notificationDate", "type": "date", "description": "Data przyjęcia zawiadomienia." },
  { "name": "warehousePlace", "type": "string", "description": "Miejsce przechowywania rzeczy." }
];

const SYSTEM_PROMPT = `
Jesteś walidatorem poprawności danych.

Otrzymujesz:
- target_schema: definicję pól docelowego JSON,
- csv_header: listę kolumn CSV,
- csv_row: wartości jednego rekordu CSV,
- json_record: rekord JSON po mapowaniu.

Twoje zadania:
1. Dopasuj każde pole JSON do najbardziej pasujących kolumn CSV.
2. Pobierz wartości źródłowe z CSV (source_value).
3. Porównaj source_value z json_value i oceń ich zgodność (field_score 0–1).
4. Stwórz komentarz (comment), gdy score < 1.0.
5. Policz overall_score jako średnią field_score.
6. Jezeli brak danych w csv, to pole json_value powinno byc puste.
7. Jezeli jest wypelnione pole location to nie musi byc wypelnione pole foundPlace to sama wartoscia.
6. Zwróć WYŁĄCZNIE JSON w formacie:
{
  "overall_score": <0–1>,
  "fields": {
    "<pole>": {
      "source_columns": [...],
      "source_value": "...",
      "json_value": "...",
      "field_score": <0–1>,
      "comment": ""
    }
  }
}

Nie dodawaj nic poza JSON-em.
`;

function buildUserMessage(csvHeader, csvRow, jsonRecord) {
  const payload = {
    target_schema: TARGET_SCHEMA,
    csv_header: csvHeader,
    csv_row: csvRow,
    json_record: jsonRecord
  };
  
  return (
    "Użyj poniższych danych do walidacji zgodności rekordu JSON z rekordem CSV.\n" +
    "Zwróć wyłącznie obiekt JSON opisany w promptcie systemowym.\n\n" +
    "WEJŚCIE:\n" + JSON.stringify(payload, null, 2)
  );
}

async function validateSingleRecord(client, csvHeader, csvRow, jsonRecord) {
  const userMsg = buildUserMessage(csvHeader, csvRow, jsonRecord);
  
  const resp = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      { "role": "system", "content": SYSTEM_PROMPT },
      { "role": "user", "content": userMsg }
    ],
    response_format: { type: "json_object" }
  });
  
  const content = resp.choices[0].message.content;
  const cleanedContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
  
  try {
    return JSON.parse(cleanedContent);
  } catch (e) {
    throw new Error(`Błąd parsowania JSON z walidacji: ${e.message}\nContent: ${cleanedContent}`);
  }
}

function loadCsv(csvContent) {
  let records;
  let header;
  
  try {
    records = parse(csvContent, {
      delimiter: ';',
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true
    });
    
    if (records.length > 0) {
      header = Object.keys(records[0]);
    } else {
      throw new Error("Brak rekordów");
    }
  } catch (e) {
    try {
      const lines = csvContent.split('\n');
      const newContent = lines.slice(1).join('\n');
      records = parse(newContent, {
        delimiter: ';',
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
      });
      
      if (records.length > 0) {
        header = Object.keys(records[0]);
      } else {
        throw new Error("Brak rekordów");
      }
    } catch (e2) {
      records = parse(csvContent, {
        delimiter: ';',
        skip_empty_lines: true,
        relax_column_count: true,
        trim: true
      });
      
      if (records.length > 0) {
        header = records[0].map((_, i) => `col${i}`);
        records = records.slice(1).map(row => {
          const obj = {};
          header.forEach((h, i) => {
            obj[h] = row[i] || '';
          });
          return obj;
        });
      }
    }
  }
  
  const firstCol = header[0]?.toLowerCase().trim();
  if (firstCol?.startsWith('lp')) {
    header = header.slice(1);
    records = records.map(row => {
      const newRow = { ...row };
      delete newRow[Object.keys(row)[0]];
      return newRow;
    });
  }
  
  header = header.map(h => String(h).trim());
  
  const rows = records.map(record => {
    return header.map(col => {
      const val = record[col];
      return val === null || val === undefined ? '' : String(val).trim();
    });
  });
  
  return { header, rows };
}

function loadJsonRecords(jsonContent) {
  const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
  
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return data.items;
  }
  
  throw new Error("Plik JSON musi zawierać listę rekordów lub obiekt z kluczem 'items' zawierającym listę rekordów!");
}

async function validateDataset(client, csvContent, jsonContent) {
  const { header, rows } = loadCsv(csvContent);
  const jsonRecords = loadJsonRecords(jsonContent);
  
  if (rows.length !== jsonRecords.length) {
    throw new Error(
      `Niezgodna liczba rekordów CSV (${rows.length}) i JSON (${jsonRecords.length})`
    );
  }
  
  const results = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const jsonRec = jsonRecords[i];
    
    const evaluation = await validateSingleRecord(client, header, row, jsonRec);
    
    const sourceValueConcat = row
      .filter(v => String(v).trim() !== '')
      .map(v => String(v).trim())
      .join(', ');
    
    results.push({
      index: i + 1,
      source_row: sourceValueConcat,
      overall_score: evaluation.overall_score,
      fields: evaluation.fields
    });
  }
  
  return results;
}

async function processLostItemsFromCsv(client, csvContent, useTimestamp = false) {
  const { header, rows } = loadCsv(csvContent);
  
  const csvText = stringify(rows, {
    header: true,
    columns: header,
    delimiter: ';'
  });
  
  const userPrompt = `
Otrzymasz pełną treść pliku CSV. Twoim zadaniem jest zamiana KAŻDEGO wiersza CSV
na obiekt JSON zgodnie ze schematem JSON wymuszonym przez response_format.

Objaśnienia pól JSON:
- "name": nazwa przedmiotu, krótka etykieta, np. „telefon”, „telefon iPhone 15 Pro”, „portfel skórzany”.
- "itemColor": kolor przedmiotu, np. „czarny”, „czerwony”.
- "additionalInfo": dodatkowe informacje o przedmiocie, np. „w etui”, „uszkodzony ekran”, „z brelokiem”.
- "foundDate": data znalezienia przedmiotu.
- "location": ogólna lokalizacja, np. „DWORZEC PKP”, „Warszawa”.
- "foundPlace": dokładniejsze miejsce znalezienia, np. „peron 2”, „autobus linii 10”.
- "notificationDate": data przyjęcia lub powiadomienia.
- "warehousePlace": miejsce magazynowania przedmiotu.

Zasady ogólne:
- Liczba obiektów JSON musi być identyczna z liczbą wierszy CSV.
- Używaj wyłącznie wartości znajdujących się w CSV.
- Nie wolno zgadywać ani dopowiadać.
- Jeśli kolumna nie istnieje lub wartość jest pusta → użyj "".
- Jeśli dopasowanie nie jest jednoznaczne → użyj "".

ZASADY DLA POLA "name":
- "name" ma być ZAWSZE krótką nazwą przedmiotu (etykietą), a nie opisem całej sytuacji.
- Najpierw szukaj kolumn, których nagłówki zawierają słowa typu:
  „nazwa”, „nazwa przedmiotu”, „przedmiot”, „rzecz”, „opis przedmiotu”.
  TYLKO z takich kolumn wolno brać wartość dla "name".
- Jeśli jest kilka takich kolumn, wybierz tę, która najlepiej wygląda jak krótka nazwa przedmiotu.
- Jeśli w żadnej kolumnie nie ma sensownej nazwy przedmiotu → ustaw "name": "".

ZASADY DLA POLA "additionalInfo":
- "additionalInfo" służy wyłącznie do przechowywania dodatkowych informacji, cech, uwag.
- Najpierw szukaj kolumn, których nagłówki zawierają słowa typu:
  „uwagi”, „dodatkowe informacje", „cechy", „opis", „charakterystyka".
- Z tych kolumn możesz brać dane do "additionalInfo".
- W żadnym wypadku NIE WOLNO kopiować do "additionalInfo" tej samej wartości,
  która została użyta w polu "name".
- Jeśli jedyne dostępne informacje o przedmiocie to nazwa (bez dodatkowych uwag),
  to "additionalInfo" musi być pustym stringiem "".
- Jeśli nie ma wyraźnej kolumny z dodatkowymi informacjami → "additionalInfo" = "".

ZASADY DLA DAT (BEZWZGLĘDNIE WYMAGANE):
- KAŻDA data MUSI zostać przekształcona do formatu RRRR-MM-DD.
- Jeśli w wartości występuje zakres dwóch dni, np. "13-14 lipca 2024 r.",
  ZAWSZE wybierz pierwszą datę i przekształć ją: "2024-07-13".
- Jeśli data zawiera miesiąc zapisany słownie (np. „lipca"), MUSISZ zamienić go na numer miesiąca.
- Jeśli nie jesteś w stanie na 100% ustalić poprawnej daty → wpisz pusty string "".
- NIE WOLNO kopiować oryginalnej wartości daty. Dozwolony jest wyłącznie format RRRR-MM-DD.

Dane CSV:
${csvText}
`;

  const fullPrompt = userPrompt + `

WAŻNE: Zwróć odpowiedź WYŁĄCZNIE jako poprawny JSON w następującym formacie:
{
  "items": [
    {
      "name": "string",
      "itemColor": "string",
      "additionalInfo": "string",
      "foundDate": "string (format: RRRR-MM-DD)",
      "location": "string",
      "foundPlace": "string",
      "notificationDate": "string (format: RRRR-MM-DD)",
      "warehousePlace": "string"
    }
  ]
}

Każdy wiersz CSV musi mieć odpowiadający obiekt w tablicy "items".`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: fullPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0
  });
  
  let data;
  try {
    const content = resp.choices[0].message.content;
    const cleanedContent = content.replace(/^```json\s*|\s*```$/g, '').trim();
    data = JSON.parse(cleanedContent);
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error("Odpowiedź nie zawiera tablicy 'items'");
    }
  } catch (e) {
    throw new Error("Model zwrócił niepoprawny JSON:\n" + (resp.choices[0].message.content || e.message));
  }
  
  return data;
}

async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Metoda nie dozwolona. Użyj POST." }),
      { 
        status: 405, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY nie jest ustawione" }),
        { 
          status: 500, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          } 
        }
      );
    }
    
    const client = new OpenAI({ apiKey: apiKey });
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowy format JSON w body" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          } 
        }
      );
    }
    const { csvContent, jsonContent, action } = body;
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: "Brak csvContent w requestcie" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          } 
        }
      );
    }
    
    let result;
    
    if (action === 'process') {
      const jsonData = await processLostItemsFromCsv(client, csvContent, true);
      result = {
        action: 'process',
        jsonData: jsonData
      };
    } else if (action === 'validate') {
      if (!jsonContent) {
        return new Response(
          JSON.stringify({ error: "Brak jsonContent w requestcie dla akcji validate" }),
          { 
            status: 400, 
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type"
            } 
          }
        );
      }
      const validationResults = await validateDataset(client, csvContent, jsonContent);
      result = {
        action: 'validate',
        results: validationResults
      };
    } else if (action === 'full') {
      const jsonData = await processLostItemsFromCsv(client, csvContent, true);
      const jsonString = JSON.stringify(jsonData);
      const validationResults = await validateDataset(client, csvContent, jsonString);
      result = {
        action: 'full',
        jsonData: jsonData,
        validationResults: validationResults
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowa akcja. Użyj 'process', 'validate' lub 'full'" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          } 
        }
      );
    }
    
    return new Response(
      JSON.stringify(result, null, 2),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        } 
      }
    );
  }
}

const port = process.env.PORT || 3000;

Bun.serve({
  port: port,
  fetch: async (req) => {
    return await handler(req);
  },
});

console.log(`🚀 Server running on port ${port}`);

