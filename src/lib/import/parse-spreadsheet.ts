import { strFromU8, unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";

export type ParsedSpreadsheetSheet = {
  name: string;
  rows: string[][];
};

export type ParsedSpreadsheetWorkbook = {
  fileName: string;
  sheets: ParsedSpreadsheetSheet[];
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeCellText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeCellText(item))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text = record["#text"];
    const paragraphs = record.p;

    return [normalizeCellText(text), normalizeCellText(paragraphs)].filter(Boolean).join("\n").trim();
  }

  return "";
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function parseOdsRows(xml: string) {
  const maxColumnsPerRow = 40;
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: false,
    processEntities: {
      enabled: true,
      maxEntitySize: 200000,
      maxExpansionDepth: 20,
      maxTotalExpansions: 200000,
      maxExpandedLength: 5_000_000,
      maxEntityCount: 1000
    }
  });
  const document = parser.parse(xml) as Record<string, unknown>;
  const spreadsheet =
    ((document["document-content"] as Record<string, unknown> | undefined)?.body as Record<
      string,
      unknown
    > | undefined)?.spreadsheet as Record<string, unknown> | undefined;

  if (!spreadsheet) {
    throw new Error("ODS content is missing spreadsheet data");
  }

  return asArray(spreadsheet.table).map((tableNode) => {
    const table = tableNode as Record<string, unknown>;
    const name = typeof table.name === "string" ? table.name : "Sheet";
    const rows: string[][] = [];

    for (const rowNode of asArray(table["table-row"])) {
      const row = rowNode as Record<string, unknown>;
      const repeatedRows = Number(row["number-rows-repeated"] ?? 1);
      const values: string[] = [];

      for (const cellNode of [...asArray(row["table-cell"]), ...asArray(row["covered-table-cell"])]) {
        const cell = cellNode as Record<string, unknown>;
        const repeatedCells = Number(cell["number-columns-repeated"] ?? 1);
        const text = normalizeCellText(cell);
        const boundedRepeat = text
          ? Math.min(repeatedCells, maxColumnsPerRow - values.length)
          : Math.min(repeatedCells, Math.max(maxColumnsPerRow - values.length, 0));

        if (boundedRepeat <= 0) {
          continue;
        }

        for (let repeat = 0; repeat < boundedRepeat; repeat += 1) {
          values.push(text);
        }

        if (values.length >= maxColumnsPerRow) {
          break;
        }
      }

      if (!values.some((value) => value.trim().length > 0)) {
        continue;
      }

      while (values.length > 0 && values.at(-1)?.trim() === "") {
        values.pop();
      }

      for (let repeat = 0; repeat < Math.min(repeatedRows, 5); repeat += 1) {
        rows.push([...values]);
      }
    }

    return {
      name,
      rows: rows.filter((row) => row.some((cell) => cell.trim().length > 0))
    };
  });
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSpreadsheetWorkbook> {
  const fileName = file.name;
  const extension = fileName.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (extension === "csv") {
    return {
      fileName,
      sheets: [{ name: fileName.replace(/\.csv$/i, ""), rows: parseCsvRows(new TextDecoder().decode(bytes)) }]
    };
  }

  if (extension === "ods") {
    const archive = unzipSync(bytes);
    const content = archive["content.xml"];

    if (!content) {
      throw new Error("ODS file is missing content.xml");
    }

    return {
      fileName,
      sheets: parseOdsRows(strFromU8(content))
    };
  }

  throw new Error("Unsupported file type. Use .ods or .csv");
}
