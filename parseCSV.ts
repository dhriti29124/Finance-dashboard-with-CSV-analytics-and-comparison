// app/utils/parseCSV.ts

export type Txn = {
  date: string;
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number | null;

  type: "spend" | "income" | "transfer";
  category: string;
  merchant: string;
};

function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  const s = String(v).trim();
  if (!s) return 0;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseCSVText(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }

  row.push(cur);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Merchant grouping rules */
const MERCHANT_RULES: Array<{ name: string; patterns: RegExp[] }> = [
  { name: "Walmart", patterns: [/wal[- ]?mart/i] },
  { name: "Apple", patterns: [/apple\.com/i, /\bapple\b/i] },
  { name: "DoorDash", patterns: [/doordash/i, /\bdd\/doordash/i] },
  { name: "Chegg", patterns: [/chegg/i] },
  { name: "Fido", patterns: [/fido/i] },
  { name: "Remitly", patterns: [/remitly/i] },
  { name: "Affirm", patterns: [/affirm/i] },
];

function merchantFromDescription(desc: string) {
  const d = desc.trim();
  if (!d) return "Unknown";
  for (const rule of MERCHANT_RULES) {
    if (rule.patterns.some((p) => p.test(d))) return rule.name;
  }
  return d.replace(/\s+/g, " ").trim().slice(0, 26);
}

function classify(desc: string): { type: Txn["type"]; category: string } {
  const d = desc.toLowerCase();

  const isTransfer =
    d.includes("transfer") ||
    d.includes("e-transfer") ||
    d.includes("etransfer") ||
    d.includes("br to br") ||
    d.includes("online banking transfer");

  if (isTransfer) return { type: "transfer", category: "Transfer" };

  const isIncome = d.includes("payroll") || d.includes("deposit") || d.includes("received");
  if (isIncome) return { type: "income", category: "Income" };

  if (d.includes("wal-mart") || d.includes("walmart") || d.includes("supercenter")) {
    return { type: "spend", category: "Groceries" };
  }
  if (d.includes("doordash") || d.includes("uber") || d.includes("skip")) {
    return { type: "spend", category: "Food" };
  }
  if (d.includes("chegg") || d.includes("tuition") || d.includes("university")) {
    return { type: "spend", category: "Education" };
  }
  if (d.includes("apple") || d.includes("amazon") || d.includes("best buy")) {
    return { type: "spend", category: "Shopping" };
  }

  return { type: "spend", category: "Other" };
}

/** VISA-style refunds/credits keywords (amount column is positive but is actually money back) */
function looksLikeCredit(desc: string) {
  const d = desc.toLowerCase();
  return (
    d.includes("refund") ||
    d.includes("reversal") ||
    d.includes("return") ||
    d.includes("credit") ||
    d.includes("chargeback") ||
    d.includes("adj") ||
    d.includes("adjustment")
  );
}

export function parseRBCStatementCSV(csvText: string): Txn[] {
  const rows = parseCSVText(csvText);
  if (rows.length < 2) return [];

  // find header row
  let headerRowIndex = 0;
  while (headerRowIndex < rows.length && rows[headerRowIndex].every((c) => !c.trim())) headerRowIndex++;

  const header = rows[headerRowIndex].map(normalizeHeader);

  const idx = {
    // VISA uses "Transaction Date", RBC uses "Date"
    date: header.findIndex((h) => h === "date" || h.includes("transaction date")),
    description: header.findIndex((h) => h === "description" || h.includes("merchant") || h.includes("details")),
    withdrawal: header.findIndex((h) => h.startsWith("withdraw")),
    deposit: header.findIndex((h) => h.startsWith("deposit")),
    balance: header.findIndex((h) => h.startsWith("balance")),
    // VISA column shown as "Amount ($)"
    amount: header.findIndex((h) => h === "amount" || h.includes("amount ($)") || h.includes("amount")),
  };

  // fallback description
  if (idx.description === -1) idx.description = header.findIndex((h) => h.includes("memo") || h.includes("payee"));

  const out: Txn[] = [];

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];

    const date = (row[idx.date] ?? "").trim();
    const description = (row[idx.description] ?? "").trim();
    if (!date && !description) continue;

    // If RBC statement table exists:
    let withdrawal = idx.withdrawal >= 0 ? toNumber(row[idx.withdrawal]) : 0;
    let deposit = idx.deposit >= 0 ? toNumber(row[idx.deposit]) : 0;

    // VISA amount-only: treat amount as spending by default
    if (withdrawal === 0 && deposit === 0 && idx.amount >= 0) {
      const amt = toNumber(row[idx.amount]);

      if (amt > 0) {
        if (looksLikeCredit(description)) deposit = amt; // refund/credit
        else withdrawal = amt; // normal visa purchase
      }
    }

    const balance = idx.balance >= 0 ? toNumber(row[idx.balance]) : null;

    const merchant = merchantFromDescription(description);
    const base = classify(description);

    let type: Txn["type"] = base.type;
    let category = base.category;

    // Force type based on money columns
    if (withdrawal > 0 && deposit === 0) type = base.type === "transfer" ? "transfer" : "spend";
    if (deposit > 0 && withdrawal === 0) type = base.type === "transfer" ? "transfer" : "income";

    out.push({
      date,
      description,
      withdrawal,
      deposit,
      balance,
      type,
      category,
      merchant,
    });
  }

  return out;
}
