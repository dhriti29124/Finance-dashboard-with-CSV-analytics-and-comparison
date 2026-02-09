# 💸 Finance Dashboard – CSV-Based Spending Analytics

A web-based personal finance dashboard that helps users **analyze, categorize, and compare bank & credit card transactions** by uploading CSV statements.

Built to handle **real-world financial data** with clean parsing, merchant normalization, and visual insights.

🌐 **Live Demo:** https://finance-dashboard-dhriti.vercel.app

---

## ✨ Features

### 📂 CSV Upload (Recommended)
- Upload **RBC bank statements** (Withdrawals / Deposits format)
- Upload **Visa credit card statements** (single “Amount” column)
- Parsing runs **locally in the browser** — no data is stored

### 📊 Dashboard Analytics
- Total **Spent**, **Income**, and **Net**
- Spending breakdown by **Category**
- **Histogram & charts** for visual insights

### 🏪 Merchant Normalization
Groups similar merchants together automatically:
- All *WAL-MART* transactions → **Walmart**
- APPLE.COM → **Apple**
- FIDO → **Fido**
- REMITLY → **Remitly**
- Unknown merchants → safely grouped as **Other**

### 🔁 Statement Comparison
- Upload **two CSVs** to compare:
  - Spending changes
  - Income differences
  - Category & merchant deltas
- Useful for **month-to-month analysis**

### 🧾 Transactions View
- Clean, readable transaction table
- Categories, merchants, and amounts clearly visible

---

## 🧠 Why CSV instead of PDF?

PDF bank statements are:
- Visually structured but **data-hostile**
- Unreliable for accurate parsing

CSV files are:
- Structured
- Accurate
- Scalable
- Used by real financial tools

This project prioritizes **data integrity over brittle OCR parsing**.

> PDF parsing is intentionally treated as best-effort only.

---

## 🛠 Tech Stack

- **Next.js (React)**
- **TypeScript**
- Custom CSV parsing (no external CSV libraries)
- Rule-based merchant normalization
- Data aggregation & visualization
- Responsive, dark-themed UI

---

## ⚠️ Disclaimer

- CSV parsing is **best-effort**
- Merchant detection is **rule-based and extensible**
- Unknown merchants are grouped as **“Other”**
- All processing happens **locally in the browser**
- No financial data is stored or sent to a server

---

## 🚀 Getting Started (Local Setup)

```bash
git clone https://github.com/your-username/finance-dashboard.git
cd finance-dashboard
npm install
npm run dev
