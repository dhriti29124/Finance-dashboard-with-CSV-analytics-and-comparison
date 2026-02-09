export type Txn = {
  date: string; // "8 Dec"
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number | null;
};

function toNumber(s: string) {
  const x = Number(s.replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
}

const MONEY_RE = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b/g;

// supports: 8Dec, 8 Dec, Dec 8, December 8
const DATE_GLOBAL =
  /\b(\d{1,2})\s*([A-Za-z]{3,9})\b|\b([A-Za-z]{3,9})\s*(\d{1,2})\b/g;

function normalize(s: string) {
  return s
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function month3(m: string) {
  const x = m.toLowerCase();
  const map: Record<string, string> = {
    jan: "Jan", january: "Jan",
    feb: "Feb", february: "Feb",
    mar: "Mar", march: "Mar",
    apr: "Apr", april: "Apr",
    may: "May",
    jun: "Jun", june: "Jun",
    jul: "Jul", july: "Jul",
    aug: "Aug", august: "Aug",
    sep: "Sep", sept: "Sep", september: "Sep",
    oct: "Oct", october: "Oct",
    nov: "Nov", november: "Nov",
    dec: "Dec", december: "Dec",
  };
  return map[x] || m.slice(0, 3);
}

function toDate(m: RegExpMatchArray) {
  // (1)(2) => day month
  // (3)(4) => month day
  if (m[1] && m[2]) return `${m[1]} ${month3(m[2])}`;
  if (m[3] && m[4]) return `${m[4]} ${month3(m[3])}`;
  return "Unknown";
}

function classify(desc: string) {
  const d = desc.toLowerCase();

  const isDeposit =
    d.includes("payroll") ||
    d.includes("deposit") ||
    d.includes("received") ||
    d.includes("transfer received");

  const isWithdrawal =
    d.includes("visa") ||
    d.includes("purchase") ||
    d.includes("debit") ||
    d.includes("payment") ||
    d.includes("affirm") ||
    d.includes("sent");

  return { isDeposit, isWithdrawal };
}

export function parseRBC(raw: string): Txn[] {
  const text = normalize(raw.replace(/\r/g, " ").replace(/\n/g, " "));

  const matches = Array.from(text.matchAll(DATE_GLOBAL));
  if (matches.length === 0) return [];

  const txns: Txn[] = [];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i] as any;
    const start = m.index ?? 0;
    const end = (matches[i + 1]?.index ?? text.length);

    const date = toDate(m);

    let chunk = normalize(text.slice(start, end));

    // Remove headers/scam stuff if it leaks into chunk
    const low = chunk.toLowerCase();
    if (low.includes("opening balance") || low.includes("closing balance")) continue;
    if (low.includes("withdrawals") && low.includes("deposits") && low.includes("balance")) continue;
    if (low.includes("cyber") && low.includes("scam")) continue;

    // Remove the first date token occurrence from chunk
    chunk = normalize(chunk.replace(m[0], ""));

    // Now: repeatedly peel off transactions from the RIGHT side:
    // Each transaction ends with "... amount balance"
    // We grab the last two money values each time.
    while (true) {
      const nums = Array.from(chunk.matchAll(MONEY_RE));
      if (nums.length < 2) break;

      const last = nums[nums.length - 1];
      const secondLast = nums[nums.length - 2];

      const balanceStr = last[0];
      const amountStr = secondLast[0];

      const balance = toNumber(balanceStr);
      const amount = toNumber(amountStr);

      // Description = text before secondLast number (end of row)
      const rowText = normalize(chunk.slice(0, secondLast.index ?? chunk.length));

      // But we only want the LAST "row" description, not all previous rows
      // So take a reasonable tail window (RBC rows aren't huge)
      const tail = rowText.slice(Math.max(0, rowText.length - 220));
      const desc = normalize(tail);

      const { isDeposit, isWithdrawal } = classify(desc);

      let withdrawal = 0;
      let deposit = 0;

      if (isDeposit && !isWithdrawal) deposit = amount;
      else withdrawal = amount; // default: treat as spending

      txns.push({
        date,
        description: desc,
        withdrawal,
        deposit,
        balance,
      });

      // Remove this peeled row from chunk so we can find the next one
      // Cut everything up to the start of secondLast number (we already used it)
      chunk = normalize(chunk.slice(0, Math.max(0, (secondLast.index ?? 0) - 1)));

      // Safety: avoid infinite loop
      if (chunk.length < 5) break;
    }
  }

  // We peeled from right → left, so reverse for natural order
  txns.reverse();

  // Dedup
  const seen = new Set<string>();
  const out: Txn[] = [];
  for (const t of txns) {
    const key = `${t.date}|${t.balance}|${t.withdrawal}|${t.deposit}|${t.description}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(t);
    }
  }

  return out;
}
