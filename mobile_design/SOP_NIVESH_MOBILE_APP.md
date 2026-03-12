# NIVESH — Mobile App SOP (Standard Operating Procedure)

## Production-Grade React Native Frontend — UI/UX Blueprint

> **Version:** 1.0  
> **Date:** March 11, 2026  
> **Platform:** React Native (Expo SDK 52+)  
> **Target:** iOS 15+ / Android 12+ (API 31+)  
> **Language:** TypeScript  
> **Design System:** Nivesh Design Language (NDL)

---

## TABLE OF CONTENTS

1. [Design Philosophy & Brand Identity](#1-design-philosophy--brand-identity)
2. [Color System & Theme Architecture](#2-color-system--theme-architecture)
3. [Typography System](#3-typography-system)
4. [Spacing, Grid & Layout System](#4-spacing-grid--layout-system)
5. [Iconography & Illustration System](#5-iconography--illustration-system)
6. [Component Architecture](#6-component-architecture)
7. [Complete Screen Inventory](#7-complete-screen-inventory)
8. [Application Flow & Navigation Architecture](#8-application-flow--navigation-architecture)
9. [Screen-by-Screen Specification](#9-screen-by-screen-specification)
10. [Micro-Interactions & Animation Guide](#10-micro-interactions--animation-guide)
11. [Accessibility Standards](#11-accessibility-standards)
12. [Project Structure & File Organization](#12-project-structure--file-organization)
13. [Implementation Phases](#13-implementation-phases)
14. [Quality Checklist](#14-quality-checklist)

---

## 1. DESIGN PHILOSOPHY & BRAND IDENTITY

### 1.1 Brand Personality

**Nivesh = Trusted Financial Companion (not a cold dashboard tool)**

| Trait | Expression |
|-------|-----------|
| **Trustworthy** | Soft, warm color palette; no aggressive red/green for gains/losses; calm beige tones |
| **Intelligent** | Clean typography, structured information hierarchy, purposeful whitespace |
| **Indian-First** | ₹ as default currency, Hindi language support, UPI/Aadhaar/PAN flows, Indian holidays awareness |
| **Conversational** | Chat-first interface, friendly tone, suggestion chips, AI assistant personality |
| **Empowering** | Decision-oriented UI (not just data display), clear CTAs, action-first design |

### 1.2 Design Principles

1. **Decisions > Dashboards** — Every screen must lead to an action, not just information
2. **Clarity > Complexity** — Financial data simplified; progressive disclosure for depth
3. **Trust by Design** — Assumptions always visible; explainability built into every AI response
4. **Indian Context First** — Tax years (Apr–Mar), Indian investment instruments (MF/SIP/FD/PPF/NPS), UPI-native
5. **Conversational Finance** — Chat is the primary interface, screens are secondary navigation
6. **Motion with Purpose** — Every animation conveys meaning (loading, success, transition, attention)

### 1.3 Storyline & Emotional Arc

The app follows a **"Financial Awakening"** narrative:

```
ONBOARDING → "I'm confused about money"
     ↓
DISCOVERY → "Now I see my full picture"
     ↓
UNDERSTANDING → "I understand where I stand"
     ↓
PLANNING → "I have a clear plan"
     ↓
ACTION → "I'm making smart moves"
     ↓
CONFIDENCE → "I'm on track and in control"
```

Each screen maps to a stage in this emotional journey.

---

## 2. COLOR SYSTEM & THEME ARCHITECTURE

### 2.1 Primary Palette (Beige Tetradic)

Derived from the brand palette — warm, calming, finance-appropriate:

| Token | Hex | Usage |
|-------|-----|-------|
| `beige.50` | `#FAF8F0` | Page backgrounds, canvas |
| `beige.100` | `#F5F0E1` | Card backgrounds |
| `beige.200` | `#EDE8D0` | **Primary beige** — section backgrounds, subtle fills |
| `beige.300` | `#E0D9BF` | Borders, dividers |
| `beige.400` | `#C9C1A4` | Disabled text, muted elements |
| `beige.500` | `#A89E7E` | Secondary text |
| `mint.100` | `#E8F5EC` | Positive state backgrounds |
| `mint.200` | `#D0EDDA` | **Primary mint** — success, income, positive values |
| `mint.300` | `#A8D9B8` | Success accents |
| `lavender.100` | `#E8E9F5` | Info state backgrounds |
| `lavender.200` | `#D0D5ED` | **Primary lavender** — informational, analytics, AI elements |
| `lavender.300` | `#B0B8D9` | Chart accents, secondary indicators |
| `rose.100` | `#F5E8EE` | Warning/negative state backgrounds |
| `rose.200` | `#EDD0E4` | **Primary rose** — alerts, expenses, negative values |
| `rose.300` | `#D9A8C4` | Alert accents |

### 2.2 Functional Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `primary` | `#1A1A2E` | `#F5F0E1` | Primary text, headings |
| `secondary` | `#6B6B80` | `#A0A0B0` | Secondary text, labels |
| `accent` | `#F5C518` | `#F5C518` | **Yellow accent** — CTAs, primary buttons, highlights |
| `accentPressed` | `#E0B200` | `#E0B200` | Button pressed state |
| `surface` | `#FFFFFF` | `#1A1A2E` | Cards, modals, sheets |
| `background` | `#FAF8F0` | `#0D0D1A` | App background |
| `income` | `#2E9E5A` | `#4ADE80` | Income indicators |
| `expense` | `#D64545` | `#F87171` | Expense indicators |
| `border` | `#E5E5E5` | `#2A2A3E` | Borders, separators |
| `overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal overlays |

### 2.3 Gradient Definitions

```
cardGradient: ['#F5F0E1', '#FAF8F0']        → Card premium feel
heroGradient: ['#EDE8D0', '#D0EDDA']        → Onboarding hero
aiGradient:   ['#D0D5ED', '#E8E9F5']        → AI/Chat backgrounds
alertGradient: ['#EDD0E4', '#F5E8EE']       → Alert/Warning cards
accentGradient: ['#F5C518', '#FFD84D']      → Primary CTA buttons
```

### 2.4 Dark Mode Strategy

- **Not inverted** — carefully mapped dark palette maintaining brand warmth
- Beige tones become deep navy (`#1A1A2E`, `#0D0D1A`)
- Accent yellow remains constant across themes
- Cards elevate via subtle light borders, not shadows

---

## 3. TYPOGRAPHY SYSTEM

### 3.1 Font Family

| Weight | Font | Usage |
|--------|------|-------|
| Regular (400) | `Inter-Regular` | Body text, descriptions |
| Medium (500) | `Inter-Medium` | Labels, secondary headings |
| SemiBold (600) | `Inter-SemiBold` | Subheadings, card titles |
| Bold (700) | `Inter-Bold` | Headings, amounts, emphasis |
| ExtraBold (800) | `Inter-ExtraBold` | Hero numbers, large balance display |

**Hindi Support:** `Noto Sans Devanagari` as fallback for Hindi text rendering.

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `displayLarge` | 40px | 48px | ExtraBold | Balance hero on home |
| `displayMedium` | 32px | 40px | Bold | Section heroes |
| `displaySmall` | 28px | 36px | Bold | Page titles |
| `headingLarge` | 24px | 32px | SemiBold | Card titles, amounts |
| `headingMedium` | 20px | 28px | SemiBold | Section headings |
| `headingSmall` | 18px | 24px | SemiBold | Sub-section headings |
| `bodyLarge` | 16px | 24px | Regular | Primary body text |
| `bodyMedium` | 14px | 20px | Regular | Secondary body, descriptions |
| `bodySmall` | 12px | 16px | Regular | Captions, timestamps |
| `labelLarge` | 14px | 20px | Medium | Button labels, tabs |
| `labelMedium` | 12px | 16px | Medium | Tags, badges, small labels |
| `labelSmall` | 10px | 14px | Medium | Micro labels, overline text |

### 3.3 Amount Formatting (Indian Context)

```
₹1,00,000.00    → Indian number system (lakhs/crores)
₹40,500.80      → Standard display
₹1.2L           → Abbreviated (lakhs)
₹2.5Cr          → Abbreviated (crores)
+₹5,400         → Income (green, with + prefix)
-₹3,543         → Expense (red, with - prefix)
```

---

## 4. SPACING, GRID & LAYOUT SYSTEM

### 4.1 Spacing Scale (4px base)

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing, icon gaps |
| `sm` | 8px | Inline element spacing |
| `md` | 12px | Component internal padding |
| `base` | 16px | Standard padding, gaps |
| `lg` | 20px | Section spacing |
| `xl` | 24px | Card padding |
| `2xl` | 32px | Section margins |
| `3xl` | 40px | Page-level spacing |
| `4xl` | 48px | Hero spacing |
| `5xl` | 64px | Major section breaks |

### 4.2 Layout Grid

- **Screen max-width:** Full device width
- **Horizontal padding:** 16px (each side) = 32px total
- **Card border-radius:** 16px (large), 12px (medium), 8px (small)
- **Button border-radius:** 24px (pill), 12px (rounded rect)
- **Shadow (Light):** `0 2px 8px rgba(0,0,0,0.06)`
- **Shadow (Dark):** `0 1px 4px rgba(0,0,0,0.3)`

### 4.3 Safe Areas

- **Status bar:** Dynamic (notch-aware via `SafeAreaView`)
- **Bottom navigation:** 56px + home indicator padding
- **Keyboard avoidance:** `KeyboardAvoidingView` with `behavior="padding"`

---

## 5. ICONOGRAPHY & ILLUSTRATION SYSTEM

### 5.1 Icon Library

**Primary:** `phosphor-react-native` (consistent, well-designed, 6 weights)  
**Weight:** Regular (default), Bold (emphasis), Fill (active states in navbar)

### 5.2 Icon Sizes

| Token | Size | Usage |
|-------|------|-------|
| `iconXs` | 16px | Inline with small text |
| `iconSm` | 20px | List items, labels |
| `iconMd` | 24px | Standard icons, nav |
| `iconLg` | 32px | Feature icons, cards |
| `iconXl` | 40px | Empty states, hero |
| `iconHero` | 64px | Onboarding, illustrations |

### 5.3 Indian Financial Iconography

Custom icon set for Indian-specific elements:
- ₹ Rupee symbol (stylized)
- UPI logo mark
- Aadhaar symbol (verification flows)
- PAN card icon
- SIP/MF fund icons
- FD/RD/PPF instrument icons
- GST/Tax calendar icon

### 5.4 Illustration Style

- **Style:** Flat, minimal, with beige/mint/lavender tinted backgrounds
- **Characters:** Diverse Indian representation (skin tones, attire)
- **Scenes:** Financial life moments — first salary, home purchase, retirement, child education
- **AI Avatar:** Geometric/abstract pattern (concentric rings with sparkle — inspired by reference images)

---

## 6. COMPONENT ARCHITECTURE

### 6.1 Atomic Design Hierarchy

```
ATOMS → MOLECULES → ORGANISMS → TEMPLATES → SCREENS
```

### 6.2 Atoms (Base Elements)

| Component | Variants | Props |
|-----------|----------|-------|
| `NText` | display, heading, body, label | size, weight, color, align |
| `NButton` | primary, secondary, outline, ghost, danger | size (sm/md/lg), loading, disabled, icon |
| `NIcon` | — | name, size, color, weight |
| `NInput` | text, password, amount, search, otp | label, error, helper, prefix, suffix |
| `NAvatar` | image, initials, icon | size (sm/md/lg/xl), badge |
| `NBadge` | solid, outline | color, size |
| `NDivider` | horizontal, vertical | spacing, color |
| `NChip` | selectable, filter, suggestion | selected, onPress |
| `NSwitch` | — | value, onToggle |
| `NCheckbox` | — | checked, indeterminate |
| `NRadio` | — | selected, group |
| `NProgressBar` | linear, circular | progress, color, animated |
| `NProgressRing` | — | progress, size, strokeWidth |
| `NSkeleton` | text, circle, rect, card | width, height, animated |
| `NSpinner` | — | size, color |

### 6.3 Molecules (Composed Components)

| Component | Description |
|-----------|-------------|
| `AmountDisplay` | Formatted ₹ amount with color coding (+/-), abbreviation support |
| `BalanceCard` | Hero balance with account info, masked number, card brand |
| `TransactionItem` | Transaction row — icon, name, category, amount, timestamp |
| `GoalCard` | Goal name, target, progress ring, deadline |
| `AlertItem` | Alert icon, title, description, action button |
| `QuickAction` | Icon + label circular button (Transfer, Request, Pay, etc.) |
| `AccountSelector` | Dropdown showing bank accounts with balance |
| `CurrencySelector` | Flag + currency name + search |
| `ContactAvatar` | Avatar + name (for frequent transfers) |
| `StatCard` | Label + value + trend arrow + percentage |
| `ChipGroup` | Horizontal scrollable chips (filter/tabs) |
| `SearchBar` | Input with search icon, clear button, voice icon |
| `OTPInput` | 4/6 digit OTP input with auto-focus |
| `PINInput` | 4/6 digit masked PIN entry |
| `BiometricPrompt` | Fingerprint/FaceID authentication modal |
| `DateRangePicker` | Indian fiscal year aware date picker |
| `AmountKeypad` | Custom numeric keypad with ₹ and decimal |
| `SuggestionChip` | AI suggestion pill (tappable quick prompts) |
| `InstrumentBadge` | Investment instrument type indicator (MF/SIP/FD/PPF/NPS) |

### 6.4 Organisms (Feature Components)

| Component | Description |
|-----------|-------------|
| `AccountCarousel` | Horizontal scrollable account cards (multi-account) |
| `TransactionList` | Grouped transactions by date, section headers, pull-to-refresh |
| `GoalGrid` | Grid/list view of goals with progress indicators |
| `ChatBubble` | AI/User message with rich content (text, chart, actions) |
| `ChatInputBar` | Text input + voice + attach + send with suggestion chips above |
| `SimulationSlider` | Range slider with real-time chart update |
| `SimulationChart` | Interactive chart (line/bar) with scenario overlays |
| `NotificationGroup` | Grouped notifications by date with action items |
| `SpendingBreakdown` | Pie/donut chart with category legend |
| `IncomeExpenseBar` | Side-by-side income vs expense with visual bars |
| `NetWorthTimeline` | Line chart showing net worth over time |
| `InvestmentPortfolio` | Portfolio allocation donut + instrument list |
| `BillReminderCard` | Upcoming bill with amount, due date, pay button |
| `FinancialHealthScore` | Animated score gauge with breakdown factors |
| `AIInsightCard` | AI-generated insight with explanation, actions, dismiss |
| `ExplainabilityPanel` | Expandable panel: assumptions, risks, alternatives |
| `QuickTransferBar` | Horizontal scroll of recent transfer contacts |

### 6.5 Templates (Screen Layouts)

| Template | Structure |
|----------|-----------|
| `AuthScreenTemplate` | Logo + illustration + form + CTA + footer link |
| `DashboardTemplate` | Header (greeting + avatar) + scroll body + sticky bottom nav |
| `DetailScreenTemplate` | Back header + hero section + scrollable content + bottom CTA |
| `ChatScreenTemplate` | Header + message list + input bar (keyboard-aware) |
| `SettingsScreenTemplate` | Header + grouped list sections |
| `ModalTemplate` | Overlay + card content + action buttons |
| `BottomSheetTemplate` | Drag handle + content + optional sticky footer |

---

## 7. COMPLETE SCREEN INVENTORY

### 7.1 Screen Count Summary

| Module | Screens | Priority |
|--------|---------|----------|
| Onboarding & Auth | 12 | P0 |
| Home & Dashboard | 5 | P0 |
| AI Chat & Assistant | 6 | P0 |
| Transactions | 8 | P0 |
| Goals & Planning | 7 | P1 |
| Investments & Portfolio | 8 | P1 |
| Simulations | 6 | P0 |
| Transfers & Payments | 10 | P1 |
| Alerts & Notifications | 4 | P1 |
| Profile & Settings | 8 | P2 |
| Reports & Export | 4 | P2 |
| Bills & Subscriptions | 5 | P2 |
| **TOTAL** | **83** | — |

### 7.2 Complete Screen List

#### MODULE 1: Onboarding & Authentication (12 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 1.1 | Splash Screen | `/` | Animated Nivesh logo + tagline |
| 1.2 | Welcome Carousel | `/welcome` | 3-slide value proposition storytelling |
| 1.3 | Language Selection | `/language` | Hindi/English/Regional language picker |
| 1.4 | Sign Up | `/auth/signup` | Mobile number + OTP (Indian-first) |
| 1.5 | OTP Verification | `/auth/otp` | 6-digit OTP input with timer |
| 1.6 | Create PIN | `/auth/create-pin` | 4-digit app PIN setup |
| 1.7 | Confirm PIN | `/auth/confirm-pin` | PIN confirmation |
| 1.8 | Biometric Setup | `/auth/biometric` | Enable fingerprint/Face ID prompt |
| 1.9 | KYC Lite | `/auth/kyc` | PAN + basic details (name, DOB, email) |
| 1.10 | Bank Linking | `/auth/link-bank` | Select bank → account aggregator consent |
| 1.11 | Financial Profile Setup | `/auth/fin-profile` | Income range, goals quiz, risk appetite |
| 1.12 | Login | `/auth/login` | Phone + OTP / PIN / Biometric login |

#### MODULE 2: Home & Dashboard (5 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 2.1 | Home Dashboard | `/home` | Greeting + balance + AI insight + quick actions + recent txns |
| 2.2 | Financial Health Score | `/home/health` | Overall score + breakdown factors + improvement tips |
| 2.3 | Net Worth Overview | `/home/net-worth` | Assets vs Liabilities visual breakdown |
| 2.4 | Monthly Summary | `/home/summary` | Income, expense, savings, top categories for current month |
| 2.5 | AI Daily Brief | `/home/brief` | "Your money today" — AI-generated daily financial summary |

#### MODULE 3: AI Chat & Assistant (6 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 3.1 | AI Chat Home | `/chat` | Chat interface with suggestion chips + history |
| 3.2 | Chat Conversation | `/chat/:id` | Active conversation with rich media responses |
| 3.3 | AI Insight Detail | `/chat/insight/:id` | Expanded AI insight with full explanation |
| 3.4 | Voice Input | `/chat/voice` | Voice recording with real-time transcription |
| 3.5 | Chat History | `/chat/history` | Past conversations list with search |
| 3.6 | AI Explainability | `/chat/explain/:id` | Detailed view: assumptions, risks, alternatives, data used |

#### MODULE 4: Transactions (8 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 4.1 | All Transactions | `/transactions` | Full transaction list with filters + search |
| 4.2 | Transaction Detail | `/transactions/:id` | Single txn: amount, merchant, category, map, notes |
| 4.3 | Category View | `/transactions/category/:id` | Transactions filtered by category + spending trends |
| 4.4 | Transaction Search | `/transactions/search` | Full text search across transactions |
| 4.5 | Spending Analytics | `/transactions/analytics` | Charts: category breakdown, trends, comparisons |
| 4.6 | Recurring Transactions | `/transactions/recurring` | Auto-detected subscriptions + bills |
| 4.7 | Edit Transaction | `/transactions/:id/edit` | Change category, add notes, split transaction |
| 4.8 | Export Transactions | `/transactions/export` | Export filtered transactions as CSV/PDF |

#### MODULE 5: Goals & Planning (7 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 5.1 | Goals Overview | `/goals` | All goals grid with progress rings |
| 5.2 | Create Goal | `/goals/create` | Goal type picker (Home/Car/Education/Retirement/Travel/Emergency/Custom) |
| 5.3 | Goal Setup Wizard | `/goals/setup` | Multi-step: target amount → timeline → SIP recommendation |
| 5.4 | Goal Detail | `/goals/:id` | Progress, milestones, projected date, AI suggestions |
| 5.5 | Goal Edit | `/goals/:id/edit` | Modify goal parameters |
| 5.6 | Goal Milestones | `/goals/:id/milestones` | Milestone timeline with celebrations |
| 5.7 | Goal Comparison | `/goals/compare` | Side-by-side goal progress comparison |

#### MODULE 6: Investments & Portfolio (8 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 6.1 | Portfolio Overview | `/investments` | Total value, allocation donut, instrument list |
| 6.2 | Portfolio Analytics | `/investments/analytics` | Returns, XIRR, benchmark comparison |
| 6.3 | Instrument Detail | `/investments/:id` | MF/Stock/FD detail: NAV, returns, SIP status |
| 6.4 | SIP Manager | `/investments/sip` | Active SIPs, next dates, amounts, modify |
| 6.5 | Rebalancing Advisor | `/investments/rebalance` | AI-suggested rebalancing with explanation |
| 6.6 | Tax Harvesting | `/investments/tax` | Tax-loss harvesting suggestions |
| 6.7 | New Investment | `/investments/new` | Search + explore funds/instruments |
| 6.8 | Investment History | `/investments/history` | Buy/sell/SIP history timeline |

#### MODULE 7: Simulations (6 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 7.1 | Simulation Hub | `/simulate` | Available simulations: Retirement, Loan, SIP, Life Event |
| 7.2 | Retirement Simulator | `/simulate/retirement` | Sliders: age, corpus, spend, inflation → projection chart |
| 7.3 | Loan Affordability | `/simulate/loan` | Loan amount, tenure, rate → EMI impact on budget |
| 7.4 | SIP Growth Simulator | `/simulate/sip` | Monthly amount, years, return → growth curve |
| 7.5 | Life Event Simulator | `/simulate/life-event` | Marriage/Child/Relocation → financial impact analysis |
| 7.6 | Simulation Result | `/simulate/result/:id` | Detailed result: 3 scenarios, chart, actions, save |

#### MODULE 8: Transfers & Payments (10 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 8.1 | Transfer Home | `/transfer` | Destination selector + recent contacts |
| 8.2 | UPI Transfer | `/transfer/upi` | UPI ID → amount → note → pay |
| 8.3 | Bank Transfer | `/transfer/bank` | IFSC + Account → amount → confirm (NEFT/IMPS) |
| 8.4 | Scan & Pay | `/transfer/scan` | QR scanner → amount → confirm |
| 8.5 | Request Money | `/transfer/request` | Select contact → amount → send request |
| 8.6 | Enter Amount | `/transfer/amount` | Amount keypad + currency conversion display |
| 8.7 | Transfer Confirm | `/transfer/confirm` | Review: from/to/amount → authenticate |
| 8.8 | Transfer Success | `/transfer/success` | Success animation + receipt + share |
| 8.9 | Transfer History | `/transfer/history` | Sent/Received with filters |
| 8.10 | Beneficiary Management | `/transfer/beneficiaries` | Saved contacts + add/edit/remove |

#### MODULE 9: Alerts & Notifications (4 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 9.1 | Notification Center | `/notifications` | Grouped by date (Today, Yesterday, date) |
| 9.2 | Alert Detail | `/notifications/:id` | Full alert with context + recommended action |
| 9.3 | Alert Preferences | `/notifications/preferences` | Toggle notification types + frequency |
| 9.4 | Smart Alerts Dashboard | `/notifications/smart` | AI-generated alerts with severity & action |

#### MODULE 10: Profile & Settings (8 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 10.1 | Profile Home | `/profile` | Avatar, name, email, settings list |
| 10.2 | Edit Profile | `/profile/edit` | Name, email, phone, avatar upload |
| 10.3 | Security Settings | `/profile/security` | PIN change, biometric toggle, 2FA, sessions |
| 10.4 | Language Settings | `/profile/language` | Language switcher (Hindi, English, regional) |
| 10.5 | Notification Settings | `/profile/notifications` | Push, email, SMS notification toggles |
| 10.6 | Linked Accounts | `/profile/accounts` | Connected banks + add/remove |
| 10.7 | Privacy & Data | `/profile/privacy` | Data usage info, export, delete account |
| 10.8 | Help & Support | `/profile/help` | FAQ, contact, report bug |

#### MODULE 11: Reports & Export (4 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 11.1 | Reports Hub | `/reports` | Available reports: Monthly, Annual, Tax, Custom |
| 11.2 | Monthly Report | `/reports/monthly` | Visual monthly financial report |
| 11.3 | Annual Report | `/reports/annual` | Fiscal year (Apr–Mar) comprehensive report |
| 11.4 | Custom Report Builder | `/reports/custom` | Pick date range + categories + format (CSV/PDF) |

#### MODULE 12: Bills & Subscriptions (5 screens)

| # | Screen | Route | Description |
|---|--------|-------|-------------|
| 12.1 | Bills Dashboard | `/bills` | Upcoming + overdue bills list |
| 12.2 | Bill Detail | `/bills/:id` | Bill info, history, pay button |
| 12.3 | Add Bill Reminder | `/bills/add` | Manual bill entry with recurrence |
| 12.4 | Subscription Tracker | `/bills/subscriptions` | Auto-detected subscriptions + cancel suggestions |
| 12.5 | Bill Payment | `/bills/:id/pay` | Pay bill flow (reuse transfer components) |

---

## 8. APPLICATION FLOW & NAVIGATION ARCHITECTURE

### 8.1 Navigation Structure

```
ROOT NAVIGATOR (Stack)
│
├── AUTH FLOW (Stack — no bottom tabs)
│   ├── Splash
│   ├── Welcome Carousel
│   ├── Language Selection
│   ├── Sign Up / Login
│   ├── OTP Verification
│   ├── PIN Setup (Create + Confirm)
│   ├── Biometric Setup
│   ├── KYC Lite
│   ├── Bank Linking
│   └── Financial Profile Setup
│
├── MAIN APP (Bottom Tab Navigator)
│   │
│   ├── TAB 1: Home (Stack)
│   │   ├── Home Dashboard
│   │   ├── Financial Health Score
│   │   ├── Net Worth Overview
│   │   ├── Monthly Summary
│   │   └── AI Daily Brief
│   │
│   ├── TAB 2: Transactions (Stack)
│   │   ├── All Transactions
│   │   ├── Transaction Detail
│   │   ├── Category View
│   │   ├── Spending Analytics
│   │   ├── Recurring Transactions
│   │   └── Export
│   │
│   ├── TAB 3: AI Chat (Stack) — CENTER TAB (Highlighted)
│   │   ├── Chat Home
│   │   ├── Chat Conversation
│   │   ├── AI Insight Detail
│   │   ├── Voice Input (Modal)
│   │   ├── Chat History
│   │   └── Explainability View
│   │
│   ├── TAB 4: Goals (Stack)
│   │   ├── Goals Overview
│   │   ├── Create Goal
│   │   ├── Goal Setup Wizard
│   │   ├── Goal Detail
│   │   ├── Goal Edit
│   │   └── Goal Milestones
│   │
│   └── TAB 5: More (Stack)
│       ├── More Menu (grid: Investments, Simulations, Transfers, Bills, Reports, Profile)
│       ├── Profile → sub-screens
│       ├── Investments → sub-screens
│       ├── Simulations → sub-screens
│       ├── Transfers → sub-screens
│       ├── Bills → sub-screens
│       └── Reports → sub-screens
│
├── MODAL STACK (Presented modally over everything)
│   ├── Transfer Confirm
│   ├── Transfer Success
│   ├── Biometric Prompt
│   ├── PIN Entry
│   ├── QR Scanner
│   └── Amount Keypad (Bottom Sheet)
│
└── NOTIFICATION CENTER (Stack — accessible from any screen via bell icon)
    ├── Notification List
    └── Alert Detail
```

### 8.2 Bottom Tab Bar Design

```
┌──────────────────────────────────────────────────────┐
│                                                       │
│   🏠          📊          ✨          🎯          ⋯   │
│  Home    Transactions    AI Chat     Goals       More  │
│                          (raised)                      │
└──────────────────────────────────────────────────────┘
```

- **AI Chat tab** is the center tab with a **raised circular button** (accent yellow `#F5C518`, 56px)
- Other tabs: 48px icon, 10px label
- Active state: filled icon + accent color
- Inactive state: outline icon + muted gray

### 8.3 Unified Flow — Indian Context Journey

#### New User Flow (First-time Indian user)

```
1. SPLASH → Welcome Carousel (3 slides: "Your AI Money Coach", "See Your Full Picture", "Plan with Confidence")
     ↓
2. LANGUAGE → Select Hindi / English
     ↓
3. SIGN UP → Enter 10-digit mobile number
     ↓
4. OTP → 6-digit OTP (auto-read via SMS permission)
     ↓
5. CREATE PIN → 4-digit numeric PIN
     ↓
6. BIOMETRIC → Enable fingerprint/Face ID (skippable)
     ↓
7. KYC LITE → PAN number + Name + DOB (Indian compliance)
     ↓  
8. BANK LINKING → Select bank from list → Account Aggregator consent flow
     ↓
9. FINANCIAL PROFILE → 
   - Monthly income range (dropdown: ₹10K-25K, ₹25K-50K, ₹50K-1L, ₹1L-3L, ₹3L+)
   - Primary goals (multi-select: Emergency Fund, Home, Car, Retirement, Travel, Education)
   - Risk appetite (slider: Conservative → Moderate → Aggressive)
     ↓
10. HOME DASHBOARD → "Welcome! Let me analyze your finances..."
     ↓
11. AI DAILY BRIEF (auto-shown first time) → "Here's your first financial snapshot"
```

#### Returning User Flow

```
1. SPLASH (< 1 sec) → PIN / Biometric / Face ID
     ↓
2. HOME DASHBOARD (with fresh data)
```

#### Key Interaction Flows

**Flow A: "Can I afford a home loan?" (Chat → Simulation)**

```
HOME → Tap AI Chat → Type "Can I afford ₹50L home loan?"
  → AI asks clarifying questions (tenure, city, down payment)
  → AI runs loan simulation automatically
  → Shows EMI impact card + affordability score
  → "View Full Simulation" → opens Loan Affordability Simulator
  → "Add as Goal" → creates Home Purchase goal
```

**Flow B: Anomaly Alert → Action**

```
PUSH NOTIFICATION → "Unusual spending detected: ₹15,000 at electronics store"
  → Tap → Notification Center → Alert Detail
  → Shows spending context + deviation from normal
  → Recommended actions: "Set budget alert" / "Categorize correctly" / "Ask AI"
  → User taps "Ask AI" → Chat opens with context pre-filled
```

**Flow C: Monthly Review Ritual**

```
HOME → "Your monthly review is ready" card
  → Monthly Summary screen
  → Income vs Expense comparison
  → Top spending categories
  → Goal progress updates
  → AI recommendations
  → "Share Report" / "Export PDF" / "Discuss with AI"
```

**Flow D: Send Money via UPI (Indian Context)**

```
HOME → Quick Action "Transfer" → Transfer Home
  → Choose UPI / Bank Transfer / Scan QR
  → UPI: Enter UPI ID → Amount Keypad → Note
  → Review screen (Transfer Confirm)
  → Biometric/PIN authentication
  → Transfer Success → Receipt + Share
```

**Flow E: SIP Planning Flow**

```
GOALS → Create Goal → "Retirement" 
  → Enter target corpus (₹2Cr)
  → Set timeline (retire at 55, you're 28)
  → AI calculates required monthly SIP
  → Shows 3 scenarios (Conservative/Moderate/Aggressive)
  → "Start SIP" → Investment platform integration → Confirmation
```

---

## 9. SCREEN-BY-SCREEN SPECIFICATION

### 9.1 Splash Screen (1.1)

**Purpose:** Brand impression + auth state check

**Layout:**
```
┌─────────────────────────────┐
│                             │
│                             │
│          [Nivesh Logo]      │
│    "Your AI Financial       │
│        Strategist"          │
│                             │
│       [Loading dot anim]    │
│                             │
│                             │
└─────────────────────────────┘
Background: beige gradient
Duration: 1.5s-2s (auth check happens in parallel)
```

**Animation:** Logo fades in → tagline slides up → loading dots pulse

---

### 9.2 Welcome Carousel (1.2)

**Purpose:** Value proposition storytelling — emotional connection

**Slides:**

| Slide | Headline | Subtext | Illustration |
|-------|----------|---------|-------------|
| 1 | "Your Money, Finally Clear" | "See your complete financial picture in one place" | Person looking at clear dashboard |
| 2 | "AI That Understands Finance" | "Ask anything — get decisions, not just data" | AI chat with financial charts |
| 3 | "Plan Your Future, Your Way" | "Simulate, plan, and track your life goals" | Person on path toward goals |

**Layout:**
```
┌─────────────────────────────┐
│                             │
│       [Illustration]        │
│                             │
│       "Headline"            │
│     "Subtext description"   │
│                             │
│       ● ○ ○                 │
│                             │
│   [Get Started]  (yellow)   │
│   Skip                      │
└─────────────────────────────┘
```

**Interactions:** Swipe between slides; dots indicate progress; "Get Started" on any slide proceeds

---

### 9.3 Home Dashboard (2.1)

**Purpose:** Financial overview + AI nudge + quick actions — THE primary screen

**Layout:**
```
┌─────────────────────────────┐
│ Welcome back,               │
│ Akmal ₿ 🔔                  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Your Balance             │ │
│ │ ₹4,05,000.80  👁        │ │
│ │ ****9934    Exp: 05/28   │ │
│ │ [VISA]                  │ │
│ └───────┬─────────────────┘ │
│         │ (swipeable cards)  │
│         ● ○                  │
├─────────────────────────────┤
│ [Request] [Transfer] [+]    │
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🤖 AI Insight            │ │
│ │ "Your food spending is   │ │
│ │  18% higher this month.  │ │
│ │  Tap to explore."        │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Transaction          View all│
│ TODAY                       │
│ ↗ Transfer to Ravi    -₹20 │
│   04:03 PM                  │
│ ↙ Salary from Co.  +₹1,300 │
│   02:15 PM                  │
├─────────────────────────────┤
│ 🏠  📊  ✨  🎯  ⋯          │
│ Home Trans  AI  Goals More  │
└─────────────────────────────┘
```

**Key Components Used:**
- `AccountCarousel` (balance cards)
- `QuickAction` row (Request, Transfer, +)
- `AIInsightCard` (dismissible, tappable)
- `TransactionList` (recent 5)
- `BottomTabBar`

**Data Requirements:**
- User profile (name, avatar)
- Account balances (aggregated)
- Recent transactions (last 5)
- AI insight (from backend reasoning engine)
- Unread notification count

---

### 9.4 AI Chat Screen (3.1)

**Purpose:** Primary interaction surface — conversational finance

**Layout:**
```
┌─────────────────────────────┐
│  ← AI Assistant        ⋯   │
├─────────────────────────────┤
│                             │
│    [AI Avatar - Concentric  │
│     rings with sparkle]     │
│                             │
│  "Ask Nivesh anything about │
│  your savings and financial │
│  improvement."              │
│                             │
├─────────────────────────────┤
│  [✨ Ask AI anything  📎 ➤] │
├─────────────────────────────┤
│         Suggested           │
│ ┌─────────────────────────┐ │
│ │ How can I build an      │ │
│ │ emergency fund?         │ │
│ ├─────────────────────────┤ │
│ │ What's the best         │ │
│ │ budgeting method?       │ │
│ ├─────────────────────────┤ │
│ │ How do I reduce my      │ │
│ │ spending?               │ │
│ ├─────────────────────────┤ │
│ │ Can I afford ₹50L       │ │
│ │ home loan?              │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

**Chat Conversation Layout:**
```
┌─────────────────────────────┐
│  ← AI Assistant        ⋯   │
├─────────────────────────────┤
│ [User bubble - right]       │
│ "Help me plan savings to    │
│ buy a ₹10L car by           │
│ January next year"          │
│                             │
│ [AI bubble - left]          │
│ "Here's a simplified plan:  │
│  1. Set the Goal            │
│  2. Analyze Your Budget     │
│  3. Cut Costs               │
│  4. Boost Income            │
│  5. Monitor Progress"       │
│                             │
│ [📊 View Simulation]        │
│ [🎯 Create Goal]            │
│ [🔊 Read aloud] [📋 Copy]   │
├─────────────────────────────┤
│  [✨ Ask me  📎 ➤]          │
│   Suggested:                │
│   [How much monthly SIP?]   │
│   [Show me scenarios]       │
└─────────────────────────────┘
```

**Rich Content Types in AI Responses:**
1. **Text** — formatted markdown
2. **Chart** — inline chart (line, bar, donut)
3. **Action Buttons** — "Create Goal", "Start SIP", "Set Budget"
4. **Explainability Panel** — expandable assumptions/risks
5. **Table** — comparison data (scenarios)
6. **Amount Card** — highlighted financial figure
7. **Link** — deep link to relevant screen

---

### 9.5 Transfer Flow (8.1–8.8)

**Transfer Home:**
```
┌─────────────────────────────┐
│  ←       Transfer           │
├─────────────────────────────┤
│  Destination                │
│  ┌───────────────────────┐  │
│  │ 🏦 Bank / UPI / QR    │  │
│  └───────────────────────┘  │
│  Account/UPI ID             │
│  ┌───────────────────────┐  │
│  │ 8009665142887         │  │
│  └───────────────────────┘  │
│                             │
│  [     Continue      ]      │
│                             │
│  Last transfer              │
│  (👤)(👤)(👤)(👤)(👤)         │
│  Amara Ridho Safira Inara   │
│                             │
│  Transfer list              │
│  [All] [Friends] [Fav]     │
│  ┌─────────────────────┐   │
│  │ 🔍 Search            │   │
│  ├─────────────────────┤   │
│  │ Adam S.        BCA  │   │
│  │ 900764...       ⋯   │   │
│  │ Agung H.       BRI  │   │
│  │ ...                 │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**Transfer Confirmation:**
```
┌─────────────────────────────┐
│  ←       Confirm            │
├─────────────────────────────┤
│  Transfer from              │
│  ┌───────────────────────┐  │
│  │ 🏦 ****9934      VISA │  │
│  │ Balance: ₹4,05,000    │  │
│  └───────────────────────┘  │
│                             │
│  Transfer to                │
│  ┌───────────────────────┐  │
│  │ LS  Lanaya Sehrina    │  │
│  │ BCA - 800966...  [Chg]│  │
│  └───────────────────────┘  │
│                             │
│  Amount: ₹1,350.00         │
│                             │
│  [     Continue      ]      │
└─────────────────────────────┘
```

**Authentication Modal (Bottom Sheet):**
```
┌─────────────────────────────┐
│                             │
│  Touch ID sensor to verify  │
│       transaction           │
│                             │
│  "Please confirm your       │
│  identity by using Touch ID │
│  to continue the            │
│  transaction."              │
│                             │
│       [👆 Fingerprint]      │
│                             │
│     Or Use PIN              │
│                             │
│     [Cancel]                │
└─────────────────────────────┘
```

**Success Screen:**
```
┌─────────────────────────────┐
│                             │
│          ✅                  │
│   Successfully Sent!        │
│                             │
│  Send ₹1,350.00 to         │
│  Lanaya Sehrina             │
│                             │
│  [  Back to Home  ]         │
│  [  Share Receipt ]         │
│                             │
└─────────────────────────────┘
```

---

### 9.6 Notification Screen (9.1)

**Layout:**
```
┌─────────────────────────────┐
│  ←     Notification     ⋯  │
├─────────────────────────────┤
│  Today                      │
│  ┌─────────────────────────┐│
│  │ 🟨 You Get Cashback!    ││
│  │ You got ₹10 cashback    ││
│  │ from payment             ││
│  └─────────────────────────┘│
│                             │
│  Yesterday                  │
│  ┌─────────────────────────┐│
│  │ 🟪 New Service Available ││
│  │ Check out NPS tracking   ││
│  ├─────────────────────────┤│
│  │ 🎵 Music Subscription   ││
│  │ ₹99 auto-debit upcoming ││
│  ├─────────────────────────┤│
│  │ 🟢 UPI Linked!          ││
│  │ Your UPI is connected    ││
│  └─────────────────────────┘│
│                             │
│  October 20, 2025           │
│  ┌─────────────────────────┐│
│  │ ...more notifications    ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

---

### 9.7 Profile Screen (10.1)

**Layout:**
```
┌─────────────────────────────┐
│  ←     My Profile           │
├─────────────────────────────┤
│                             │
│    [Avatar]                 │
│    Akmal Nasrulloh          │
│    akmal@gmail.com          │
│    [Edit Profile]           │
│                             │
├─────────────────────────────┤
│  Settings                   │
│  ┌─────────────────────────┐│
│  │ 🔔 Notification    🔵   ││
│  ├─────────────────────────┤│
│  │ 🌐 Language          ›  ││
│  ├─────────────────────────┤│
│  │ 💳 Transactions      ›  ││
│  ├─────────────────────────┤│
│  │ 🔒 Security & PIN    ›  ││
│  ├─────────────────────────┤│
│  │ 📊 Linked Accounts   ›  ││
│  ├─────────────────────────┤│
│  │ 📥 Export & Reports   ›  ││
│  ├─────────────────────────┤│
│  │ 🛡️ Privacy & Data    ›  ││
│  ├─────────────────────────┤│
│  │ ❓ Help & Support     ›  ││
│  ├─────────────────────────┤│
│  │ 🚪 Logout             ›  ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

---

### 9.8 Simulation Screen — Loan Affordability (7.3)

**Layout:**
```
┌─────────────────────────────┐
│  ←  Loan Affordability      │
├─────────────────────────────┤
│                             │
│  Loan Amount                │
│  ₹50,00,000                │
│  ├────────●─────────┤       │
│  ₹5L           ₹2Cr        │
│                             │
│  Tenure                     │
│  20 years                   │
│  ├──────────●───────┤       │
│  5 yrs          30 yrs      │
│                             │
│  Interest Rate              │
│  8.5%                       │
│  ├───●──────────────┤       │
│  6%             15%         │
│                             │
├─────────────────────────────┤
│  Monthly EMI                │
│  ₹43,391                   │
│                             │
│  ┌─────────────────────────┐│
│  │  [Line Chart]           ││
│  │  Principal vs Interest  ││
│  │  over tenure             ││
│  └─────────────────────────┘│
│                             │
│  Affordability Score: 72/100│
│  "You can afford this if    │
│  you reduce dining by 20%"  │
│                             │
│  [Save Simulation]          │
│  [Ask AI for Advice]        │
└─────────────────────────────┘
```

---

### 9.9 Spending Analytics (4.5)

**Layout:**
```
┌─────────────────────────────┐
│  ←      Analytics           │
├─────────────────────────────┤
│  [Week] [Month●] [Quarter] │
├─────────────────────────────┤
│    ↑ Money in    ↓ Money out│
│    ₹14,000        ₹1,996   │
│                             │
│  ┌─────────────────────────┐│
│  │  [Bar Chart]            ││
│  │  Jun Jul Aug Sep Oct Nov││
│  │  Monthly comparison      ││
│  └─────────────────────────┘│
│                             │
│  Top 3 spends Sep           │
│  "Cooking and eating in     │
│  will help you save more    │
│  money 😊"                  │
│                             │
│  🍕 ₹210.57    → Food       │
│  ☕ ₹73.20     → Beverages  │
│  🎬 ₹63.10     → Entertainment│
│                             │
│  [Ask AI about spending]    │
└─────────────────────────────┘
```

---

### 9.10 Goals Detail Screen (5.4)

**Layout:**
```
┌─────────────────────────────┐
│  ←      Car Saving          │
├─────────────────────────────┤
│                             │
│     [Car Illustration]      │
│                             │
│     Car Saving              │
│     ₹2,300 of ₹10,00,000   │
│                             │
│  ┌──────────────────────┐   │
│  │ [Progress Ring 23%]  │   │
│  └──────────────────────┘   │
│                             │
│  [Percents][Withdraw]       │
│  [Analytics][Convert]       │
│  [Receipt]                  │
│                             │
│  Recent Activity            │
│  🏦 Withdraw -₹2,300  14/09│
│  🏦 Top Up   +₹500    14/09│
│                             │
│  AI Recommendation:         │
│  "Increase monthly SIP by   │
│   ₹2,000 to reach goal     │
│   2 months earlier"         │
│                             │
│  [Top Up] [Edit Goal]       │
└─────────────────────────────┘
```

---

## 10. MICRO-INTERACTIONS & ANIMATION GUIDE

### 10.1 Animation Library

Use **`react-native-reanimated`** (v3) + **`react-native-gesture-handler`** for all animations.

### 10.2 Animation Catalog

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Screen transition | Slide from right (push), fade (modal) | 300ms | `Easing.bezier(0.25, 0.1, 0.25, 1)` |
| Card press | Scale down to 0.97 + mild shadow reduce | 100ms | Spring (damping: 15) |
| Card release | Scale back to 1.0 | 200ms | Spring (damping: 12) |
| Pull to refresh | Custom spinner with Nivesh icon rotation | Continuous | Linear |
| Balance reveal | Number count-up animation | 600ms | Decelerate |
| Amount input | Character scale-in + subtle bounce | 150ms | Spring |
| Tab switch | Cross-fade content + icon fill transition | 200ms | Ease-in-out |
| Bottom sheet | Spring-based drag + snap to detents | Dynamic | Spring (damping: 20, stiffness: 300) |
| Success checkmark | Path draw animation (SVG) | 800ms | Ease-in-out |
| Progress ring | Arc draw from 0 to value | 1000ms | Decelerate |
| AI typing | 3-dot pulse animation | Loop (600ms) | Ease-in-out |
| Notification badge | Scale pop + number update | 300ms | Spring (bounce) |
| Chip selection | Background color fade + check icon appear | 200ms | Ease-in |
| Error shake | Horizontal oscillation (3 cycles) | 400ms | Elastic |
| Skeleton loading | Shimmer gradient sweep (left→right) | 1500ms loop | Linear |
| Toast = slide in | Slide from top + auto dismiss | 300ms in, 200ms out | Decelerate / Accelerate |

### 10.3 Gesture Interactions

| Gesture | Where | Action |
|---------|-------|--------|
| Swipe left/right | Account carousel | Switch between accounts |
| Swipe down | Transaction list, Chat | Pull to refresh |
| Swipe left | Transaction item | Quick actions (categorize, hide) |
| Long press | Transaction item | Context menu (copy, share, details) |
| Pinch | Charts | Zoom in/out |
| Pan | Simulation sliders | Adjust values |
| Double tap | Balance | Toggle show/hide balance |
| Bottom sheet drag | Modal sheets | Expand, collapse, dismiss |

---

## 11. ACCESSIBILITY STANDARDS

### 11.1 Requirements

- **WCAG 2.1 Level AA** compliance
- Minimum contrast ratio: 4.5:1 (text), 3:1 (large text)
- All interactive elements: minimum 44x44px touch target
- Screen reader labels for all icons and images
- `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` on all components
- Support for Dynamic Type (iOS) / Font scaling (Android)
- Reduced Motion support: disable animations when system preference is on
- High Contrast mode support

### 11.2 Financial Accessibility

- Amount values always have `accessibilityLabel` with full spoken form: "Rupees forty thousand five hundred and eighty paise"
- Color-coded values (green/red) also have text indicators (+/-)
- Charts provide text alternatives (summary data table)
- Complex flows (transfer, SIP) have step indicators for screen readers

---

## 12. PROJECT STRUCTURE & FILE ORGANIZATION

```
mobile/
├── app.json                          # Expo app configuration
├── babel.config.js
├── tsconfig.json
├── package.json
├── eas.json                          # EAS Build configuration
├── metro.config.js
│
├── assets/
│   ├── fonts/
│   │   ├── Inter-Regular.ttf
│   │   ├── Inter-Medium.ttf
│   │   ├── Inter-SemiBold.ttf
│   │   ├── Inter-Bold.ttf
│   │   ├── Inter-ExtraBold.ttf
│   │   └── NotoSansDevanagari-*.ttf
│   ├── images/
│   │   ├── logo.png
│   │   ├── onboarding/
│   │   ├── illustrations/
│   │   └── flags/
│   ├── icons/
│   │   └── custom-icons/             # Indian financial custom icons
│   └── animations/
│       ├── splash.json               # Lottie splash animation
│       ├── success.json              # Lottie success checkmark
│       └── loading.json              # Lottie loading spinner
│
├── src/
│   ├── app/                          # Expo Router file-based routing
│   │   ├── _layout.tsx               # Root layout (providers, theme)
│   │   ├── index.tsx                 # Splash / entry point
│   │   │
│   │   ├── (auth)/                   # Auth group (no tabs)
│   │   │   ├── _layout.tsx
│   │   │   ├── welcome.tsx
│   │   │   ├── language.tsx
│   │   │   ├── signup.tsx
│   │   │   ├── otp.tsx
│   │   │   ├── create-pin.tsx
│   │   │   ├── confirm-pin.tsx
│   │   │   ├── biometric.tsx
│   │   │   ├── kyc.tsx
│   │   │   ├── link-bank.tsx
│   │   │   ├── fin-profile.tsx
│   │   │   └── login.tsx
│   │   │
│   │   ├── (tabs)/                   # Main tab navigator group
│   │   │   ├── _layout.tsx           # Tab bar configuration
│   │   │   │
│   │   │   ├── home/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx         # Home Dashboard
│   │   │   │   ├── health.tsx
│   │   │   │   ├── net-worth.tsx
│   │   │   │   ├── summary.tsx
│   │   │   │   └── brief.tsx
│   │   │   │
│   │   │   ├── transactions/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx         # All Transactions
│   │   │   │   ├── [id].tsx          # Transaction Detail
│   │   │   │   ├── category/
│   │   │   │   │   └── [id].tsx
│   │   │   │   ├── search.tsx
│   │   │   │   ├── analytics.tsx
│   │   │   │   ├── recurring.tsx
│   │   │   │   └── export.tsx
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx         # AI Chat Home
│   │   │   │   ├── [id].tsx          # Conversation
│   │   │   │   ├── voice.tsx
│   │   │   │   ├── history.tsx
│   │   │   │   └── explain/
│   │   │   │       └── [id].tsx
│   │   │   │
│   │   │   ├── goals/
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx         # Goals Overview
│   │   │   │   ├── create.tsx
│   │   │   │   ├── setup.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── index.tsx     # Goal Detail
│   │   │   │   │   ├── edit.tsx
│   │   │   │   │   └── milestones.tsx
│   │   │   │   └── compare.tsx
│   │   │   │
│   │   │   └── more/
│   │   │       ├── _layout.tsx
│   │   │       ├── index.tsx         # More Menu Grid
│   │   │       │
│   │   │       ├── investments/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── analytics.tsx
│   │   │       │   ├── [id].tsx
│   │   │       │   ├── sip.tsx
│   │   │       │   ├── rebalance.tsx
│   │   │       │   ├── tax.tsx
│   │   │       │   ├── new.tsx
│   │   │       │   └── history.tsx
│   │   │       │
│   │   │       ├── simulate/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── retirement.tsx
│   │   │       │   ├── loan.tsx
│   │   │       │   ├── sip.tsx
│   │   │       │   ├── life-event.tsx
│   │   │       │   └── result/
│   │   │       │       └── [id].tsx
│   │   │       │
│   │   │       ├── transfer/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── upi.tsx
│   │   │       │   ├── bank.tsx
│   │   │       │   ├── scan.tsx
│   │   │       │   ├── request.tsx
│   │   │       │   ├── amount.tsx
│   │   │       │   ├── confirm.tsx
│   │   │       │   ├── success.tsx
│   │   │       │   ├── history.tsx
│   │   │       │   └── beneficiaries.tsx
│   │   │       │
│   │   │       ├── bills/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── [id].tsx
│   │   │       │   ├── add.tsx
│   │   │       │   ├── subscriptions.tsx
│   │   │       │   └── pay/
│   │   │       │       └── [id].tsx
│   │   │       │
│   │   │       ├── reports/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── monthly.tsx
│   │   │       │   ├── annual.tsx
│   │   │       │   └── custom.tsx
│   │   │       │
│   │   │       ├── profile/
│   │   │       │   ├── index.tsx
│   │   │       │   ├── edit.tsx
│   │   │       │   ├── security.tsx
│   │   │       │   ├── language.tsx
│   │   │       │   ├── notifications.tsx
│   │   │       │   ├── accounts.tsx
│   │   │       │   ├── privacy.tsx
│   │   │       │   └── help.tsx
│   │   │       │
│   │   │       └── notifications/
│   │   │           ├── index.tsx
│   │   │           ├── [id].tsx
│   │   │           ├── preferences.tsx
│   │   │           └── smart.tsx
│   │   │
│   │   └── (modals)/                  # Modal group
│   │       ├── biometric-prompt.tsx
│   │       ├── pin-entry.tsx
│   │       └── amount-keypad.tsx
│   │
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── NText.tsx
│   │   │   ├── NButton.tsx
│   │   │   ├── NIcon.tsx
│   │   │   ├── NInput.tsx
│   │   │   ├── NAvatar.tsx
│   │   │   ├── NBadge.tsx
│   │   │   ├── NDivider.tsx
│   │   │   ├── NChip.tsx
│   │   │   ├── NSwitch.tsx
│   │   │   ├── NCheckbox.tsx
│   │   │   ├── NRadio.tsx
│   │   │   ├── NProgressBar.tsx
│   │   │   ├── NProgressRing.tsx
│   │   │   ├── NSkeleton.tsx
│   │   │   ├── NSpinner.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/
│   │   │   ├── AmountDisplay.tsx
│   │   │   ├── BalanceCard.tsx
│   │   │   ├── TransactionItem.tsx
│   │   │   ├── GoalCard.tsx
│   │   │   ├── AlertItem.tsx
│   │   │   ├── QuickAction.tsx
│   │   │   ├── AccountSelector.tsx
│   │   │   ├── CurrencySelector.tsx
│   │   │   ├── ContactAvatar.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── ChipGroup.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── OTPInput.tsx
│   │   │   ├── PINInput.tsx
│   │   │   ├── BiometricPrompt.tsx
│   │   │   ├── DateRangePicker.tsx
│   │   │   ├── AmountKeypad.tsx
│   │   │   ├── SuggestionChip.tsx
│   │   │   ├── InstrumentBadge.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/
│   │   │   ├── AccountCarousel.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   ├── GoalGrid.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   ├── ChatInputBar.tsx
│   │   │   ├── SimulationSlider.tsx
│   │   │   ├── SimulationChart.tsx
│   │   │   ├── NotificationGroup.tsx
│   │   │   ├── SpendingBreakdown.tsx
│   │   │   ├── IncomeExpenseBar.tsx
│   │   │   ├── NetWorthTimeline.tsx
│   │   │   ├── InvestmentPortfolio.tsx
│   │   │   ├── BillReminderCard.tsx
│   │   │   ├── FinancialHealthScore.tsx
│   │   │   ├── AIInsightCard.tsx
│   │   │   ├── ExplainabilityPanel.tsx
│   │   │   ├── QuickTransferBar.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── templates/
│   │   │   ├── AuthScreenTemplate.tsx
│   │   │   ├── DashboardTemplate.tsx
│   │   │   ├── DetailScreenTemplate.tsx
│   │   │   ├── ChatScreenTemplate.tsx
│   │   │   ├── SettingsScreenTemplate.tsx
│   │   │   ├── ModalTemplate.tsx
│   │   │   ├── BottomSheetTemplate.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── navigation/
│   │       ├── BottomTabBar.tsx
│   │       ├── HeaderBar.tsx
│   │       └── index.ts
│   │
│   ├── theme/
│   │   ├── colors.ts                  # Color tokens (light + dark)
│   │   ├── typography.ts              # Type scale definitions
│   │   ├── spacing.ts                 # Spacing scale
│   │   ├── shadows.ts                 # Shadow definitions
│   │   ├── borders.ts                 # Border radius tokens
│   │   ├── gradients.ts              # Gradient definitions
│   │   ├── animations.ts             # Animation presets (spring configs, durations)
│   │   ├── ThemeProvider.tsx          # Theme context + dark mode switching
│   │   ├── useTheme.ts               # Custom hook to consume theme
│   │   └── index.ts                  # Re-export all theme tokens
│   │
│   ├── hooks/
│   │   ├── useAuth.ts                 # Authentication state + actions
│   │   ├── useBalance.ts              # Account balance fetching
│   │   ├── useTransactions.ts         # Transaction list + filtering
│   │   ├── useGoals.ts                # Goals CRUD operations
│   │   ├── useChat.ts                 # Chat messages + WebSocket
│   │   ├── useSimulation.ts           # Simulation calculations
│   │   ├── useNotifications.ts        # Push notification handling
│   │   ├── useBiometric.ts            # Biometric authentication
│   │   ├── useAmountFormatter.ts      # Indian ₹ formatting hook
│   │   ├── useKeyboard.ts             # Keyboard height + visibility
│   │   ├── useRefresh.ts              # Pull-to-refresh logic
│   │   ├── useAnalytics.ts            # Screen tracking, event logging
│   │   └── index.ts
│   │
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance + interceptors
│   │   │   ├── auth.api.ts            # Auth endpoints
│   │   │   ├── user.api.ts            # User profile endpoints
│   │   │   ├── transactions.api.ts    # Transaction endpoints
│   │   │   ├── goals.api.ts           # Goals endpoints
│   │   │   ├── chat.api.ts            # Chat/AI endpoints
│   │   │   ├── investments.api.ts     # Investment endpoints
│   │   │   ├── simulations.api.ts     # Simulation endpoints
│   │   │   ├── transfers.api.ts       # Transfer endpoints
│   │   │   ├── notifications.api.ts   # Notification endpoints
│   │   │   └── index.ts
│   │   ├── websocket/
│   │   │   ├── socket.ts             # WebSocket connection manager
│   │   │   └── events.ts             # Event type definitions
│   │   ├── storage/
│   │   │   ├── secure.ts             # Secure storage (keychain) for tokens/PIN
│   │   │   └── async.ts              # AsyncStorage for preferences
│   │   ├── biometric/
│   │   │   └── biometric.ts          # Fingerprint/FaceID service
│   │   ├── push/
│   │   │   └── notifications.ts      # Push notification registration + handling
│   │   └── analytics/
│   │       └── tracker.ts            # Analytics event tracking
│   │
│   ├── store/                         # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── transactionStore.ts
│   │   ├── goalStore.ts
│   │   ├── chatStore.ts
│   │   ├── investmentStore.ts
│   │   ├── notificationStore.ts
│   │   ├── settingsStore.ts           # Theme, language, preferences
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── formatAmount.ts            # ₹ Indian formatting (lakhs/crores)
│   │   ├── formatDate.ts              # Date formatting (Indian standards)
│   │   ├── validators.ts              # PAN, Aadhaar, IFSC, UPI ID validation
│   │   ├── constants.ts               # App constants
│   │   ├── indianBanks.ts             # Bank list with logos
│   │   ├── investmentTypes.ts         # MF/SIP/FD/PPF/NPS definitions
│   │   ├── categories.ts             # Spending categories with icons
│   │   └── index.ts
│   │
│   ├── i18n/
│   │   ├── index.ts                   # i18n configuration (react-i18next)
│   │   ├── en.json                    # English translations
│   │   ├── hi.json                    # Hindi translations
│   │   ├── ta.json                    # Tamil (future)
│   │   └── te.json                    # Telugu (future)
│   │
│   └── types/
│       ├── user.ts
│       ├── transaction.ts
│       ├── goal.ts
│       ├── chat.ts
│       ├── investment.ts
│       ├── simulation.ts
│       ├── notification.ts
│       ├── navigation.ts
│       └── index.ts
│
├── __tests__/                         # Test files mirror src/ structure
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── screens/
│
└── .storybook/                        # Storybook for component development
    ├── main.ts
    ├── preview.tsx
    └── stories/
        ├── atoms/
        ├── molecules/
        └── organisms/
```

---

## 13. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1–2)

**Goal:** Project setup + design system + core components

| # | Task | Deliverable |
|---|------|-------------|
| 1.1 | Initialize Expo project with TypeScript | Working Expo app with bare workflow |
| 1.2 | Configure Metro, Babel, ESLint, Prettier | Clean dev environment |
| 1.3 | Set up Expo Router file-based routing | Basic navigation working |
| 1.4 | Implement theme system (colors, typography, spacing) | `ThemeProvider` + `useTheme` hook |
| 1.5 | Install and configure fonts (Inter, Noto Sans Devanagari) | Fonts loading correctly |
| 1.6 | Build all Atom components (NText through NSpinner) | 16 atom components |
| 1.7 | Set up Storybook for component development | Storybook running with atom stories |
| 1.8 | Configure i18n (English + Hindi) | Language switching working |
| 1.9 | Set up secure storage + async storage | Token/PIN storage ready |
| 1.10 | Configure API client (Axios + interceptors) | API service layer ready |

### Phase 2: Authentication & Onboarding (Week 3–4)

**Goal:** Complete auth flow + onboarding experience

| # | Task | Deliverable |
|---|------|-------------|
| 2.1 | Build `AuthScreenTemplate` | Reusable auth layout |
| 2.2 | Build Splash screen with Lottie animation | Animated splash |
| 2.3 | Build Welcome Carousel (3 slides) | Smooth swipeable carousel |
| 2.4 | Build Language Selection screen | Working language picker |
| 2.5 | Build Sign Up screen (phone input) | Phone validation + auto-format |
| 2.6 | Build OTP verification (6-digit, auto-read) | OTP with SMS auto-read |
| 2.7 | Build PIN creation + confirmation | Secure PIN flow |
| 2.8 | Build Biometric setup prompt | Fingerprint/FaceID enrollment |
| 2.9 | Build KYC Lite (PAN + details) | PAN validation, Indian format |
| 2.10 | Build Bank Linking flow | Bank selection + consent UI |
| 2.11 | Build Financial Profile wizard | Multi-step form completion |
| 2.12 | Build Login screen (PIN/Biometric/OTP) | Multi-method login |
| 2.13 | Implement auth state management (Zustand) | Persistent auth state |
| 2.14 | Connect to backend auth APIs | End-to-end auth working |

### Phase 3: Home & Core Dashboard (Week 5–6)

**Goal:** Home dashboard + transaction list + bottom navigation

| # | Task | Deliverable |
|---|------|-------------|
| 3.1 | Build custom `BottomTabBar` with raised center | Tab navigation with AI button |
| 3.2 | Build `DashboardTemplate` | Scrollable dashboard layout |
| 3.3 | Build `AccountCarousel` | Swipeable account balance cards |
| 3.4 | Build `QuickAction` row | Request, Transfer, + buttons |
| 3.5 | Build `AIInsightCard` | Tappable AI nudge card |
| 3.6 | Build `TransactionItem` | Single transaction row |
| 3.7 | Build `TransactionList` with date grouping | Grouped list with pull-to-refresh |
| 3.8 | Build Home Dashboard screen | Complete home screen |
| 3.9 | Build Financial Health Score screen | Animated score gauge |
| 3.10 | Build Monthly Summary screen | Income/expense/savings breakdown |
| 3.11 | Build All Transactions screen | Full list + search + filters |
| 3.12 | Build Transaction Detail screen | Single txn view |
| 3.13 | Build Spending Analytics screen | Charts (bar, donut) |
| 3.14 | Implement pull-to-refresh + skeleton loading | Polish loading states |

### Phase 4: AI Chat & Assistant (Week 7–8)

**Goal:** Conversational AI interface — the killer feature

| # | Task | Deliverable |
|---|------|-------------|
| 4.1 | Build `ChatScreenTemplate` | Keyboard-aware chat layout |
| 4.2 | Build `ChatBubble` (user + AI variants) | Rich chat bubbles |
| 4.3 | Build `ChatInputBar` (text + voice + send) | Input with suggestion chips |
| 4.4 | Build `SuggestionChip` component | Tappable quick prompts |
| 4.5 | Build AI typing indicator | 3-dot pulse animation |
| 4.6 | Build rich content rendering (charts, actions, tables) | Inline chart/action support |
| 4.7 | Build `ExplainabilityPanel` | Expandable assumptions/risks |
| 4.8 | Build Chat Home screen | AI avatar + suggestions layout |
| 4.9 | Build Chat Conversation screen | Full conversation with history |
| 4.10 | Build Voice Input screen | Recording + transcription UI |
| 4.11 | Build Chat History screen | Past conversations list |
| 4.12 | Connect WebSocket for real-time chat | Live AI responses |
| 4.13 | Implement chat message persistence | Offline support |

### Phase 5: Goals & Simulations (Week 9–10)

**Goal:** Goal planning + scenario simulations

| # | Task | Deliverable |
|---|------|-------------|
| 5.1 | Build `GoalCard` with progress ring | Animated progress indicator |
| 5.2 | Build `GoalGrid` | Goals overview layout |
| 5.3 | Build Create Goal wizard | Multi-step goal creation |
| 5.4 | Build Goal Detail screen | Full goal view with AI recs |
| 5.5 | Build `SimulationSlider` | Interactive range slider |
| 5.6 | Build `SimulationChart` (react-native-chart-kit or Victory) | Interactive charts |
| 5.7 | Build Simulation Hub screen | Available simulations grid |
| 5.8 | Build Retirement Simulator | Sliders + projection chart |
| 5.9 | Build Loan Affordability Simulator | EMI calculator + impact |
| 5.10 | Build SIP Growth Simulator | Compound growth visualization |
| 5.11 | Build Life Event Simulator | Impact analysis screens |
| 5.12 | Build Simulation Result screen | 3-scenario comparison + save |

### Phase 6: Transfers, Bills & Payments (Week 11–12)

**Goal:** Complete money movement flows

| # | Task | Deliverable |
|---|------|-------------|
| 6.1 | Build Transfer Home screen | Destination + contacts UI |
| 6.2 | Build UPI Transfer flow | UPI ID → Amount → Confirm |
| 6.3 | Build `AmountKeypad` | Custom numeric keypad |
| 6.4 | Build QR Scanner (Scan & Pay) | Camera QR scanning |
| 6.5 | Build Transfer Confirm screen | Review + auth |
| 6.6 | Build `BiometricPrompt` modal | Fingerprint/FaceID prompt |
| 6.7 | Build Transfer Success screen | Animated success |
| 6.8 | Build Beneficiary Management | Add/edit/remove contacts |
| 6.9 | Build Bills Dashboard | Upcoming/overdue bills |
| 6.10 | Build Subscription Tracker | Auto-detected subscriptions |

### Phase 7: Investments, Profile & Polish (Week 13–14)

**Goal:** Portfolio views + settings + production polish

| # | Task | Deliverable |
|---|------|-------------|
| 7.1 | Build Portfolio Overview screen | Allocation donut + list |
| 7.2 | Build `InvestmentPortfolio` organism | Holdings list component |
| 7.3 | Build SIP Manager screen | Active SIPs management |
| 7.4 | Build Rebalancing Advisor | AI suggestions |
| 7.5 | Build Profile Home screen | Settings list |
| 7.6 | Build Security Settings | PIN change, biometric toggle |
| 7.7 | Build Linked Accounts management | Bank add/remove |
| 7.8 | Build Notification Center | Grouped notifications |
| 7.9 | Build Reports Hub + Monthly Report | Report generation |
| 7.10 | Build Privacy & Data screen | Export, delete controls |
| 7.11 | Build Help & Support screen | FAQ, contact |

### Phase 8: Testing, Accessibility & Launch (Week 15–16)

**Goal:** Production readiness

| # | Task | Deliverable |
|---|------|-------------|
| 8.1 | Component unit tests (Jest + React Native Testing Library) | 80% coverage on components |
| 8.2 | Screen integration tests | Key flow coverage |
| 8.3 | E2E tests (Detox) | Auth, transfer, chat flows |
| 8.4 | Accessibility audit (Axe, manual screen reader) | WCAG 2.1 AA pass |
| 8.5 | Performance audit (FlipperHeapInspector, React profiler) | < 100ms interaction delay |
| 8.6 | Dark mode QA | All screens verified in dark |
| 8.7 | Hindi language QA | Full Hindi experience verified |
| 8.8 | EAS Build configuration (iOS + Android) | Production builds |
| 8.9 | App Store / Play Store screenshots + metadata | Store listings ready |
| 8.10 | Beta release (TestFlight / Internal Testing Track) | Beta deployed |

---

## 14. QUALITY CHECKLIST

### Per-Component Checklist

- [ ] Renders correctly in light mode
- [ ] Renders correctly in dark mode
- [ ] Accessibility labels present
- [ ] Touch targets ≥ 44x44px
- [ ] Loading/skeleton state defined
- [ ] Error states handled
- [ ] Empty states designed
- [ ] Storybook story written
- [ ] Unit test written
- [ ] Hindi text doesn't break layout

### Per-Screen Checklist

- [ ] Safe area handling (notch, home indicator)
- [ ] Keyboard avoidance working
- [ ] Pull-to-refresh implemented (data screens)
- [ ] Skeleton loading on initial fetch
- [ ] Error state with retry
- [ ] Empty state with illustration
- [ ] Back navigation works
- [ ] Deep linking configured
- [ ] Analytics screen view event fires
- [ ] Matches approved Figma design

### Pre-Launch Checklist

- [ ] All 83 screens built and tested
- [ ] ₹ Indian number formatting works everywhere
- [ ] PAN/Aadhaar/IFSC/UPI validators work correctly
- [ ] Biometric auth works on iOS + Android
- [ ] Push notifications configured (FCM + APNs)
- [ ] Offline mode graceful (cached data shown, queued actions)
- [ ] App size < 50MB (initial download)
- [ ] Cold start < 2 seconds
- [ ] Memory usage < 200MB in normal use
- [ ] No PII in logs or analytics
- [ ] SSL certificate pinning configured for API
- [ ] App Transport Security configured
- [ ] ProGuard rules configured (Android)
- [ ] App Store / Play Store guidelines met
- [ ] Privacy policy and terms of service linked
- [ ] RBI compliance disclosures present

---

## DEPENDENCY MANIFEST

### Core Dependencies

```json
{
  "expo": "~52.0.0",
  "expo-router": "~4.0.0",
  "react": "18.3.x",
  "react-native": "0.76.x",
  "typescript": "~5.3.0",
  
  "react-native-reanimated": "~3.16.0",
  "react-native-gesture-handler": "~2.20.0",
  "react-native-screens": "~4.4.0",
  "react-native-safe-area-context": "~4.12.0",
  
  "@gorhom/bottom-sheet": "^4",
  "react-native-svg": "~15.8.0",
  "lottie-react-native": "^7.0.0",
  "react-native-chart-kit": "^6.12.0",
  "victory-native": "^41.0.0",
  
  "zustand": "^5.0.0",
  "@tanstack/react-query": "^5.0.0",
  "axios": "^1.7.0",
  "socket.io-client": "^4.8.0",
  
  "react-i18next": "^15.0.0",
  "i18next": "^24.0.0",
  
  "expo-secure-store": "~14.0.0",
  "@react-native-async-storage/async-storage": "~2.1.0",
  "expo-local-authentication": "~15.0.0",
  "expo-camera": "~16.0.0",
  "expo-notifications": "~0.29.0",
  
  "phosphor-react-native": "^2.1.0",
  "expo-font": "~13.0.0",
  "expo-splash-screen": "~0.29.0",
  
  "react-hook-form": "^7.54.0",
  "zod": "^3.23.0",
  "@hookform/resolvers": "^3.9.0",
  
  "date-fns": "^4.1.0"
}
```

### Dev Dependencies

```json
{
  "jest": "^29.7.0",
  "@testing-library/react-native": "^12.8.0",
  "detox": "^20.0.0",
  "@storybook/react-native": "^8.0.0",
  "eslint": "^9.0.0",
  "prettier": "^3.4.0",
  "@typescript-eslint/eslint-plugin": "^8.0.0"
}
```

---

## APPENDIX A: INDIAN FINANCIAL CONTEXT CONSTANTS

### Investment Instruments

| Instrument | Abbreviation | Icon | Color |
|-----------|-------------|------|-------|
| Mutual Fund | MF | 📊 | `#4F46E5` |
| Systematic Investment Plan | SIP | 🔄 | `#059669` |
| Fixed Deposit | FD | 🏦 | `#D97706` |
| Public Provident Fund | PPF | 🏛️ | `#7C3AED` |
| National Pension System | NPS | 🧓 | `#2563EB` |
| Recurring Deposit | RD | 📅 | `#DC2626` |
| Employee Provident Fund | EPF | 🏢 | `#0891B2` |
| Equity (Stocks) | EQ | 📈 | `#16A34A` |
| Gold/SGBs | GOLD | 🥇 | `#CA8A04` |
| Real Estate | RE | 🏠 | `#9333EA` |

### Transaction Categories (Indian Context)

| Category | Icon | Color |
|----------|------|-------|
| Groceries & Kirana | 🛒 | `#059669` |
| Food & Dining | 🍕 | `#EA580C` |
| Transport & Auto | 🚗 | `#4F46E5` |
| Medical & Health | 🏥 | `#DC2626` |
| Education & Tuition | 📚 | `#7C3AED` |
| Rent & Housing | 🏠 | `#0891B2` |
| Utilities (Electricity/Gas/Water) | ⚡ | `#D97706` |
| Mobile & Internet | 📱 | `#2563EB` |
| Entertainment & OTT | 🎬 | `#DB2777` |
| Shopping & Fashion | 🛍️ | `#9333EA` |
| Travel & Holiday | ✈️ | `#0D9488` |
| Insurance Premium | 🛡️ | `#1D4ED8` |
| EMI & Loan Payment | 🏦 | `#B91C1C` |
| Salary | 💰 | `#059669` |
| Freelance/Side Income | 💼 | `#4F46E5` |
| Investment Returns | 📈 | `#16A34A` |
| Gift / Shagun | 🎁 | `#DB2777` |
| Religious / Charity | 🙏 | `#CA8A04` |

### Indian Tax Context

| Item | Value |
|------|-------|
| Fiscal Year | April 1 – March 31 |
| Tax Filing Deadline | July 31 (non-audit) |
| Section 80C Limit | ₹1,50,000 |
| Section 80D Limit | ₹25,000/₹50,000 (senior) |
| NPS Additional Deduction | ₹50,000 (80CCD(1B)) |
| Standard Deduction | ₹50,000 |
| New Tax Regime Default | Yes (from FY 2023-24) |

---

## APPENDIX B: STORYBOOK STORY STRUCTURE

Every component gets a story file:

```
.storybook/stories/
├── atoms/
│   ├── NButton.stories.tsx       # All button variants
│   ├── NText.stories.tsx         # All typography variants
│   ├── NInput.stories.tsx        # Text, password, amount, OTP
│   ├── NProgressRing.stories.tsx # Various progress states
│   └── ...
├── molecules/
│   ├── AmountDisplay.stories.tsx # ₹ format, +/-, abbreviated
│   ├── BalanceCard.stories.tsx   # VISA, Mastercard, hidden balance
│   ├── TransactionItem.stories.tsx # Income, expense, pending
│   └── ...
└── organisms/
    ├── AccountCarousel.stories.tsx # Multi-account, single account
    ├── ChatBubble.stories.tsx     # Text, chart, actions, loading
    ├── TransactionList.stories.tsx # With data, empty, loading
    └── ...
```

---

*This SOP document serves as the single source of truth for the Nivesh mobile app frontend development. All screens, components, flows, and design tokens are defined here. Any deviation requires a design review and SOP update.*

**Document Owner:** UI/UX Lead  
**Review Cycle:** Bi-weekly during active development  
**Approval Required From:** Product Owner + Engineering Lead
