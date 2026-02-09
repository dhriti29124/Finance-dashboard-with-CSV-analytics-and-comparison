"use client";

import React, { useMemo, useState } from "react";
import { parseRBCStatementCSV, Txn } from "./utils/parseCSV";

type Tab = "dashboard" | "transactions" | "compare" | "settings";

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Single statement
  const [status, setStatus] = useState<string>("Upload a CSV exported from Excel.");
  const [txns, setTxns] = useState<Txn[]>([]);

  // Compare A/B
  const [statusA, setStatusA] = useState<string>("Upload Statement A (CSV)");
  const [statusB, setStatusB] = useState<string>("Upload Statement B (CSV)");
  const [txnsA, setTxnsA] = useState<Txn[]>([]);
  const [txnsB, setTxnsB] = useState<Txn[]>([]);

  async function onCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Reading CSV...");
    setTxns([]);

    try {
      const text = await file.text();
      const parsed = parseRBCStatementCSV(text);
      setTxns(parsed);
      setStatus(`Done ✅ Loaded ${parsed.length} rows from CSV`);
      setActiveTab("dashboard");
    } catch (err: any) {
      setStatus("Failed ❌ " + (err?.message ?? "Unknown error"));
    }
  }

  async function onCompareChange(which: "A" | "B", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (which === "A") {
      setStatusA("Reading Statement A...");
      setTxnsA([]);
    } else {
      setStatusB("Reading Statement B...");
      setTxnsB([]);
    }

    try {
      const text = await file.text();
      const parsed = parseRBCStatementCSV(text);

      if (which === "A") {
        setTxnsA(parsed);
        setStatusA(`Done ✅ Loaded ${parsed.length} rows`);
      } else {
        setTxnsB(parsed);
        setStatusB(`Done ✅ Loaded ${parsed.length} rows`);
      }
      setActiveTab("compare");
    } catch (err: any) {
      if (which === "A") setStatusA("Failed ❌ " + (err?.message ?? "Unknown error"));
      else setStatusB("Failed ❌ " + (err?.message ?? "Unknown error"));
    }
  }

  const summary = useMemo(() => computeSummary(txns), [txns]);
  const summaryA = useMemo(() => computeSummary(txnsA), [txnsA]);
  const summaryB = useMemo(() => computeSummary(txnsB), [txnsB]);

  const compare = useMemo(() => {
    const a = summaryA;
    const b = summaryB;
    const delta = {
      spent: b.spent - a.spent,
      income: b.income - a.income,
      net: b.net - a.net,
      transfers: b.transfers - a.transfers,
    };
    return { a, b, delta };
  }, [summaryA, summaryB]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Header />

        {/* Upload */}
        {activeTab !== "compare" ? (
          <UploadCard
            title="Upload CSV"
            subtitle={status}
            buttonLabel="Upload CSV"
            onChange={onCSVChange}
          />
        ) : (
          <div style={styles.compareUploadGrid}>
            <UploadCard
              title="Statement A"
              subtitle={statusA}
              buttonLabel="Upload CSV A"
              onChange={(e) => onCompareChange("A", e)}
            />
            <UploadCard
              title="Statement B"
              subtitle={statusB}
              buttonLabel="Upload CSV B"
              onChange={(e) => onCompareChange("B", e)}
            />
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabsRow}>
          <TabButton label="Dashboard" active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} />
          <TabButton label="Transactions" active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")} />
          <TabButton label="Compare" active={activeTab === "compare"} onClick={() => setActiveTab("compare")} />
          <TabButton label="Settings" active={activeTab === "settings"} onClick={() => setActiveTab("settings")} />
        </div>

        {/* Panel */}
        <div style={styles.panel}>
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {txns.length === 0 ? (
                <EmptyState text="Upload a CSV first to see your dashboard." />
              ) : (
                <>
                  <div style={styles.cardsGrid}>
                    <StatCard title="Spent" value={money(summary.spent)} accent="teal" />
                    <StatCard title="Income" value={money(summary.income)} accent="blue" />
                    <StatCard title="Net" value={money(summary.net)} accent={summary.net >= 0 ? "green" : "red"} />
                    <StatCard title="Transfers" value={money(summary.transfers)} accent="purple" hint="Excluded from Spent/Income" />
                  </div>

                  <div style={styles.sectionGrid}>
                    <Card title="Spending by Category (Pie)">
                      {summary.categories.length === 0 ? <Muted>No spending rows found.</Muted> : <PieCard data={summary.categories} />}
                    </Card>

                    <Card title="Spending Amounts (Histogram)">
                      {summary.histogram.totalCount === 0 ? <Muted>No spending rows found.</Muted> : <HistogramCard bins={summary.histogram.bins} />}
                    </Card>
                  </div>

                  <div style={styles.sectionGrid}>
                    <Card title="Top Categories">
                      <CategoryList data={summary.categories} />
                    </Card>

                    <Card title="Top Merchants (Grouped)">
                      <MerchantList data={summary.merchants} />
                    </Card>
                  </div>

                  <div style={styles.footerNote}>
                    Transfers are excluded from Spent/Income totals (recommended).
                  </div>
                </>
              )}
            </>
          )}

          {/* TRANSACTIONS */}
          {activeTab === "transactions" && (
            <>
              {txns.length === 0 ? (
                <EmptyState text="Upload a CSV first to see parsed transactions." />
              ) : (
                <TransactionsTable txns={txns} />
              )}
            </>
          )}

          {/* COMPARE */}
          {activeTab === "compare" && (
            <>
              {(txnsA.length === 0 || txnsB.length === 0) ? (
                <EmptyState text="Upload both Statement A and Statement B to compare." />
              ) : (
                <>
                  <div style={styles.cardsGrid}>
                    <StatCard title="A: Spent" value={money(compare.a.spent)} accent="teal" />
                    <StatCard title="B: Spent" value={money(compare.b.spent)} accent="teal" />
                    <DeltaCard title="Spent Δ (B−A)" value={money(compare.delta.spent)} />

                    <StatCard title="A: Income" value={money(compare.a.income)} accent="blue" />
                    <StatCard title="B: Income" value={money(compare.b.income)} accent="blue" />
                    <DeltaCard title="Income Δ (B−A)" value={money(compare.delta.income)} />

                    <StatCard title="A: Net" value={money(compare.a.net)} accent={compare.a.net >= 0 ? "green" : "red"} />
                    <StatCard title="B: Net" value={money(compare.b.net)} accent={compare.b.net >= 0 ? "green" : "red"} />
                    <DeltaCard title="Net Δ (B−A)" value={money(compare.delta.net)} />
                  </div>

                  <div style={styles.sectionGrid}>
                    <Card title="Compare Totals (Bars)">
                      <CompareBars
                        rows={[
                          { label: "Spent", a: compare.a.spent, b: compare.b.spent },
                          { label: "Income", a: compare.a.income, b: compare.b.income },
                          { label: "Transfers", a: compare.a.transfers, b: compare.b.transfers },
                        ]}
                      />
                    </Card>

                    <Card title="Compare Top Categories (Δ)">
                      <CompareNamedList a={compare.a.categories} b={compare.b.categories} label="Category" />
                    </Card>
                  </div>

                  <div style={styles.sectionGrid}>
                    <Card title="Compare Top Merchants (Δ)">
                      <CompareNamedList a={compare.a.merchants} b={compare.b.merchants} label="Merchant" />
                    </Card>

                    <Card title="Merchant Mix (Pie) — Statement B">
                      {compare.b.merchants.length === 0 ? <Muted>No spending merchants found.</Muted> : <PieCard data={compare.b.merchants.slice(0, 10)} />}
                      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
                        Showing top 10 merchants in Statement B.
                      </div>
                    </Card>
                  </div>

                  <div style={styles.footerNote}>
                    Compare uses the same rule: Transfers excluded from Spent/Income.
                  </div>
                </>
              )}
            </>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div style={{ display: "grid", gap: 12 }}>
              <h2 style={{ margin: 0 }}>Settings</h2>
              <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.6 }}>
                CSV is recommended because it’s accurate and consistent. PDF parsing is bank-specific and best-effort.
              </p>
              <div style={styles.callout}>
                <b>Tip:</b> In Excel → <b>Save As</b> → <b>CSV (Comma delimited)</b>
              </div>
              <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>
                Built by Dhriti • No bank login • You control your files
              </p>
            </div>
          )}
        </div>

        <div style={styles.bottomLine}>
          Built by Dhriti • Merchant grouping + compare mode • Deployment-ready for Vercel
        </div>
      </div>
    </div>
  );
}

/* ------------------------ UI Components ------------------------ */

function Header() {
  return (
    <div>
      <h1 style={styles.h1}>Finance Dashboard</h1>
      <div style={styles.subhead}>
        Upload CSV → auto-categorize + visualize + group merchants. Compare two statements anytime.
      </div>
    </div>
  );
}

function UploadCard({
  title,
  subtitle,
  buttonLabel,
  onChange,
}: {
  title: string;
  subtitle: string;
  buttonLabel: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div style={styles.uploadCard}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        <div style={{ opacity: 0.9, fontSize: 13 }}>{subtitle}</div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>
          Tip: In Excel → <b>Save As</b> → <b>CSV (Comma delimited)</b>
        </div>
      </div>

      <label style={styles.uploadButton}>
        {buttonLabel}
        <input type="file" accept=".csv,text/csv" onChange={onChange} style={{ display: "none" }} />
      </label>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {}),
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={styles.empty}>
      <div style={{ fontSize: 16, fontWeight: 800 }}>Nothing to show yet</div>
      <div style={{ opacity: 0.8 }}>{text}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ opacity: 0.8 }}>{children}</div>;
}

function StatCard({
  title,
  value,
  accent,
  hint,
}: {
  title: string;
  value: string;
  accent: "teal" | "blue" | "green" | "red" | "purple";
  hint?: string;
}) {
  const border = accentBorder(accent);
  const glow = accentGlow(accent);

  return (
    <div style={{ ...styles.statCard, border: `1px solid ${border}`, boxShadow: glow }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ opacity: 0.85, fontWeight: 900 }}>{title}</div>
        {hint ? <div style={{ opacity: 0.65, fontSize: 12 }}>{hint}</div> : null}
      </div>
      <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.5, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function DeltaCard({ title, value }: { title: string; value: string }) {
  const negative = value.trim().startsWith("-$");
  return (
    <div
      style={{
        ...styles.statCard,
        border: `1px solid ${negative ? "rgba(244,63,94,0.6)" : "rgba(34,197,94,0.6)"}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.35)`,
      }}
    >
      <div style={{ opacity: 0.85, fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 950, marginTop: 8 }}>{value}</div>
    </div>
  );
}

/* ------------------------ Charts (no extra libs) ------------------------ */

function PieCard({ data }: { data: { name: string; amount: number }[] }) {
  const total = data.reduce((s, x) => s + x.amount, 0);
  const colors = palette();

  let startAngle = -Math.PI / 2;
  const slices = data
    .filter((d) => d.amount > 0)
    .slice(0, 12)
    .map((d, i) => {
      const angle = total ? (d.amount / total) * Math.PI * 2 : 0;
      const endAngle = startAngle + angle;
      const path = arcPath(90, 90, 70, startAngle, endAngle);
      const fill = colors[i % colors.length];
      startAngle = endAngle;
      return { ...d, path, fill, pct: total ? (d.amount / total) * 100 : 0 };
    });

  return (
    <div style={styles.pieWrap}>
      <svg width="220" height="220" viewBox="0 0 180 180" style={{ overflow: "visible" }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.fill} opacity={0.95} />
        ))}
        <circle cx="90" cy="90" r="40" fill="rgba(0,0,0,0.55)" />
        <text x="90" y="88" textAnchor="middle" fill="white" fontSize="12" opacity="0.85">
          Total
        </text>
        <text x="90" y="108" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">
          {money(total)}
        </text>
      </svg>

      <div style={styles.legend}>
        {slices.slice(0, 8).map((s, i) => (
          <div key={i} style={styles.legendRow}>
            <span style={{ ...styles.legendDot, background: s.fill }} />
            <div style={{ display: "grid" }}>
              <div style={{ fontWeight: 800 }}>{s.name}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {money(s.amount)} • {s.pct.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistogramCard({ bins }: { bins: { label: string; count: number }[] }) {
  const max = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ opacity: 0.75, fontSize: 12 }}>
        Counts of spending transactions by amount range.
      </div>
      <div style={styles.histWrap}>
        {bins.map((b, i) => (
          <div key={i} style={styles.histCol}>
            <div style={styles.histBarWrap}>
              <div
                style={{
                  ...styles.histBar,
                  height: `${(b.count / max) * 100}%`,
                  background: `linear-gradient(180deg, ${histColor(i)} 0%, rgba(255,255,255,0.06) 100%)`,
                }}
                title={`${b.label}: ${b.count}`}
              />
            </div>
            <div style={styles.histLabel}>{b.label}</div>
            <div style={styles.histCount}>{b.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------ Compare UI ------------------------ */

function CompareBars({ rows }: { rows: { label: string; a: number; b: number }[] }) {
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>{r.label}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>A vs B</div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <BarLine label={`A ${money(r.a)}`} value={r.a} max={max} color="rgba(96,165,250,0.85)" />
            <BarLine label={`B ${money(r.b)}`} value={r.b} max={max} color="rgba(34,197,94,0.85)" />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarLine({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.85 }}>
        <span>{label}</span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function CompareNamedList({
  a,
  b,
  label,
}: {
  a: { name: string; amount: number }[];
  b: { name: string; amount: number }[];
  label: string;
}) {
  const mapA = new Map(a.map((x) => [x.name, x.amount]));
  const mapB = new Map(b.map((x) => [x.name, x.amount]));
  const names = Array.from(new Set([...mapA.keys(), ...mapB.keys()]));

  const rows = names
    .map((name) => ({
      name,
      a: mapA.get(name) ?? 0,
      b: mapB.get(name) ?? 0,
      delta: (mapB.get(name) ?? 0) - (mapA.get(name) ?? 0),
    }))
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, 10);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.name} style={styles.compareRow}>
          <div style={{ fontWeight: 900 }}>{r.name}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <span style={styles.pillBlue}>A: {money(r.a)}</span>
            <span style={styles.pillGreen}>B: {money(r.b)}</span>
            <span
              style={{
                ...styles.pillDelta,
                borderColor: r.delta >= 0 ? "rgba(34,197,94,0.6)" : "rgba(244,63,94,0.6)",
              }}
            >
              Δ: {money(r.delta)}
            </span>
          </div>
        </div>
      ))}
      <div style={{ opacity: 0.7, fontSize: 12 }}>
        Showing biggest changes by {label}.
      </div>
    </div>
  );
}

/* ------------------------ Transactions ------------------------ */

function TransactionsTable({ txns }: { txns: Txn[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <h2 style={{ marginTop: 0, marginBottom: 10 }}>Parsed Transactions</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
            <th style={th}>Date</th>
            <th style={th}>Description</th>
            <th style={th}>Merchant</th>
            <th style={th}>Type</th>
            <th style={th}>Category</th>
            <th style={th}>Withdrawal</th>
            <th style={th}>Deposit</th>
            <th style={th}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <td style={td}>{t.date}</td>
              <td style={td}>{t.description}</td>
              <td style={td}>{t.merchant}</td>
              <td style={td}><Badge kind={t.type} /></td>
              <td style={td}>{t.category}</td>
              <td style={td}>{t.withdrawal ? money(t.withdrawal) : ""}</td>
              <td style={td}>{t.deposit ? money(t.deposit) : ""}</td>
              <td style={td}>{t.balance !== null ? money(t.balance) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ kind }: { kind: "spend" | "income" | "transfer" }) {
  const bg =
    kind === "income" ? "rgba(34,197,94,0.18)" :
    kind === "transfer" ? "rgba(168,85,247,0.18)" :
    "rgba(251,191,36,0.18)";

  const bd =
    kind === "income" ? "rgba(34,197,94,0.5)" :
    kind === "transfer" ? "rgba(168,85,247,0.5)" :
    "rgba(251,191,36,0.5)";

  const label = kind === "income" ? "Income" : kind === "transfer" ? "Transfer" : "Spend";

  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, background: bg, border: `1px solid ${bd}`, fontSize: 12 }}>
      {label}
    </span>
  );
}

/* ------------------------ Lists ------------------------ */

function CategoryList({ data }: { data: { name: string; amount: number }[] }) {
  return (
    <div style={styles.listWrap}>
      {data.slice(0, 12).map((c) => (
        <div key={c.name} style={styles.listRow}>
          <span style={styles.tag}>{c.name}</span>
          <span style={{ fontWeight: 900 }}>{money(c.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function MerchantList({ data }: { data: { name: string; amount: number }[] }) {
  return (
    <div style={styles.listWrap}>
      {data.slice(0, 12).map((m) => (
        <div key={m.name} style={styles.listRow}>
          <span style={styles.tag}>{m.name}</span>
          <span style={{ fontWeight: 900 }}>{money(m.amount)}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------ Data Logic ------------------------ */

function computeSummary(txns: Txn[]) {
  const spent = txns.filter((t) => t.type === "spend").reduce((s, t) => s + (t.withdrawal || 0), 0);
  const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + (t.deposit || 0), 0);
  const transfers = txns
    .filter((t) => t.type === "transfer")
    .reduce((s, t) => s + (t.withdrawal || 0) + (t.deposit || 0), 0);

  const net = income - spent;

  const byCategory = new Map<string, number>();
  const byMerchant = new Map<string, number>();

  for (const t of txns) {
    if (t.type !== "spend") continue;
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + (t.withdrawal || 0));
    byMerchant.set(t.merchant, (byMerchant.get(t.merchant) ?? 0) + (t.withdrawal || 0));
  }

  const categories = Array.from(byCategory.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const merchants = Array.from(byMerchant.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const amounts = txns
    .filter((t) => t.type === "spend")
    .map((t) => t.withdrawal || 0)
    .filter((x) => x > 0);

  const histogram = makeHistogram(amounts);

  return { spent, income, net, transfers, categories, merchants, histogram };
}

function makeHistogram(amounts: number[]) {
  if (amounts.length === 0) return { totalCount: 0, bins: [] as { label: string; count: number }[] };

  const bins = [
    { label: "$0–$25", count: 0 },
    { label: "$25–$50", count: 0 },
    { label: "$50–$100", count: 0 },
    { label: "$100–$200", count: 0 },
    { label: "$200–$400", count: 0 },
    { label: "$400+", count: 0 },
  ];

  for (const a of amounts) {
    if (a < 25) bins[0].count++;
    else if (a < 50) bins[1].count++;
    else if (a < 100) bins[2].count++;
    else if (a < 200) bins[3].count++;
    else if (a < 400) bins[4].count++;
    else bins[5].count++;
  }

  return { totalCount: amounts.length, bins };
}

/* ------------------------ Helpers ------------------------ */

function money(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(2)}`;
}

const th: React.CSSProperties = { padding: "12px 10px", fontSize: 13, opacity: 0.9 };
const td: React.CSSProperties = { padding: "12px 10px", fontSize: 13, verticalAlign: "top" };

function palette() {
  return [
    "rgba(96,165,250,0.95)",
    "rgba(34,197,94,0.95)",
    "rgba(168,85,247,0.95)",
    "rgba(45,212,191,0.95)",
    "rgba(251,191,36,0.95)",
    "rgba(244,63,94,0.95)",
    "rgba(148,163,184,0.95)",
  ];
}

function histColor(i: number) {
  const colors = [
    "rgba(96,165,250,0.85)",
    "rgba(34,197,94,0.85)",
    "rgba(168,85,247,0.85)",
    "rgba(45,212,191,0.85)",
    "rgba(251,191,36,0.85)",
    "rgba(244,63,94,0.85)",
  ];
  return colors[i % colors.length];
}

function accentBorder(accent: "teal" | "blue" | "green" | "red" | "purple") {
  return accent === "teal"
    ? "rgba(45,212,191,0.55)"
    : accent === "blue"
    ? "rgba(96,165,250,0.55)"
    : accent === "green"
    ? "rgba(34,197,94,0.55)"
    : accent === "purple"
    ? "rgba(168,85,247,0.55)"
    : "rgba(244,63,94,0.55)";
}

function accentGlow(accent: "teal" | "blue" | "green" | "red" | "purple") {
  const c = accentBorder(accent);
  return `0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px rgba(0,0,0,0.35), 0 0 25px ${c}`;
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

/* ------------------------ Styles ------------------------ */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: 28,
    background:
      "radial-gradient(1200px 500px at 20% 0%, rgba(96,165,250,0.22), transparent 60%), radial-gradient(900px 500px at 80% 10%, rgba(45,212,191,0.18), transparent 55%), #05070a",
    color: "white",
  },
  container: { maxWidth: 1150, margin: "0 auto", display: "grid", gap: 18 },
  h1: { margin: 0, fontSize: 48, letterSpacing: -1, fontWeight: 950 },
  subhead: { opacity: 0.8, marginTop: 8, lineHeight: 1.5 },

  uploadCard: {
    padding: 18,
    borderRadius: 20,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  uploadButton: {
    padding: "12px 16px",
    borderRadius: 16,
    background: "linear-gradient(90deg,#2dd4bf,#60a5fa)",
    color: "#041016",
    fontWeight: 950,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  },

  compareUploadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  tabsRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  tab: {
    padding: "10px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  tabActive: {
    border: "1px solid rgba(96,165,250,0.8)",
    background: "rgba(96,165,250,0.16)",
  },

  panel: {
    padding: 18,
    borderRadius: 22,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  empty: {
    padding: 26,
    borderRadius: 18,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 8,
  },

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },

  statCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.10)",
  },

  sectionGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  card: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  cardTitle: { fontWeight: 950, marginBottom: 10, opacity: 0.92 },

  pieWrap: { display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, alignItems: "center" },
  legend: { display: "grid", gap: 10 },
  legendRow: { display: "flex", gap: 10, alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 999, display: "inline-block" },

  histWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: 10,
    alignItems: "end",
    paddingTop: 8,
  },
  histCol: { display: "grid", gap: 6, justifyItems: "center" },
  histBarWrap: {
    height: 140,
    width: "100%",
    borderRadius: 14,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    overflow: "hidden",
    display: "flex",
    alignItems: "flex-end",
  },
  histBar: { width: "100%", borderRadius: 14 },
  histLabel: { fontSize: 11, opacity: 0.8, textAlign: "center" },
  histCount: { fontSize: 12, fontWeight: 900, opacity: 0.9 },

  listWrap: { display: "grid", gap: 10 },
  listRow: { display: "flex", justifyContent: "space-between", gap: 12 },
  tag: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 900,
  },

  compareRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  pillBlue: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(96,165,250,0.16)",
    border: "1px solid rgba(96,165,250,0.45)",
    fontWeight: 900,
    fontSize: 12,
  },
  pillGreen: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.45)",
    fontWeight: 900,
    fontSize: 12,
  },
  pillDelta: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.20)",
    fontWeight: 900,
    fontSize: 12,
  },

  callout: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(45,212,191,0.10)",
    border: "1px solid rgba(45,212,191,0.22)",
    lineHeight: 1.6,
  },

  footerNote: { marginTop: 12, opacity: 0.7, fontSize: 12 },
  bottomLine: { opacity: 0.65, fontSize: 12, paddingBottom: 10 },
};
