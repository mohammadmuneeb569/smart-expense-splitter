# ⚡ SplitSmart — Smart Expense Splitter & Group Debt Settlement System

A production-grade, feature-rich full-stack MERN web application with a modern futuristic dark theme, glassmorphism UI, real-time multi-currency conversion, and an algorithmic debt-simplification engine to minimize cash transactions across group members.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MongoDB** (Local instance or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI)

---

### 2. Backend Setup (`/server`)

```powershell
cd server

# Install dependencies (already completed)
npm install

# (Optional) Seed demo users, groups, and expenses
npm run seed

# Run Debt Simplification algorithm tests
npm run test:algo

# Start Express server with auto-reload
npm run dev
```
> The API server runs at: **`http://localhost:5000`**

---

### 3. Frontend Setup (`/client`)

```powershell
cd client

# Install dependencies (already completed)
npm install

# Start Vite dev server
npm run dev
```
> The web application opens at: **`http://localhost:5173`**

---

## 🔑 Demo Credentials (after running `npm run seed`)
| Name | Email | Password |
|---|---|---|
| **Alice Johnson** | `alice@example.com` | `password123` |
| **Bob Smith** | `bob@example.com` | `password123` |
| **Charlie Davis** | `charlie@example.com` | `password123` |
| **Diana Prince** | `diana@example.com` | `password123` |

---

## 📐 System Architecture & Key Features

### 1. 🧠 Debt Simplification Engine (`server/utils/simplifyDebts.js`)
- **Greedy Two-Pointer Algorithm**: Computes net balances per member and iteratively cancels matching creditor and debtor balances.
- **Minimizes Cash Flows**: Reduces `O(n²)` potential peer-to-peer repayments down to `O(n)` minimal payment transactions.
- Ignores floating point dust (`< 0.005`) and guarantees exact balanced settlements.

### 2. 💱 Live Multi-Currency Conversion (`server/utils/currencyConverter.js`)
- Integrates with the open exchange rate API (`https://open.er-api.com/v6/latest/USD`).
- Converts cross-currency expenses dynamically into the group's default currency during net-balance calculations.
- Implements an **in-memory 1-hour cache** to prevent external API rate-limiting, backed with resilient fallback rate tables.

### 3. 🎨 Modern Futuristic Dark Theme & Glassmorphism Design
- **Tailwind CSS custom styling**: Glass cards (`backdrop-blur-md`, subtle border highlights), glowing input focus rings, and animated badges.
- **Lucide-React** iconography.
- Responsive layout with desktop header, mobile hamburger navigation, currency toggle, and instant feedback alerts.

### 4. 🔒 Protected REST APIs & Real-time Audit Feed
- **JWT Authentication** + **bcryptjs** (12 rounds) salted hashing.
- Group membership authorization guards across all group/expense operations.
- Immutable **ActivityLog** collection tracking all actions (`created group`, `added expense`, `deleted expense`, `settled debt`, `added member`).
