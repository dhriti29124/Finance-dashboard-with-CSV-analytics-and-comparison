export function categorize(description: string): string {
  const d = description.toLowerCase();

  // Income
  if (d.includes("payroll")) return "Income";

  // Transfers
  if (
    d.includes("online banking transfer") ||
    d.includes("online transfer") ||
    d.includes("e-transfer") ||
    d.includes("etransfer") ||
    d.includes("br to br") ||
    d.includes("transfer received")
  ) return "Transfer";

  // Grocery
  if (d.includes("walmart") || d.includes("sobeys") || d.includes("superstore") || d.includes("costco"))
    return "Grocery";

  // Food
  if (d.includes("tim") || d.includes("tims") || d.includes("starbucks") || d.includes("mcdonald"))
    return "Food";

  // Shopping
  if (d.includes("amazon") || d.includes("apple.com") || d.includes("winners") || d.includes("h&m"))
    return "Shopping";

  // Bills
  if (d.includes("fido") || d.includes("rogers") || d.includes("bell") || d.includes("netflix") || d.includes("spotify"))
    return "Bills";

  return "Other";
}
