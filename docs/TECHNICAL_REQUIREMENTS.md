# Nivesh Technical Requirements

## 1. High-Level Technical Architecture

Nivesh is built on a hybrid architecture that combines deterministic financial calculations with probabilistic AI reasoning.

### 1.1 Frontend

- **Framework:** Flutter or React Native (cross-platform mobile app)

### 1.2 Backend API

- **Language:** Python (FastAPI) or Node.js (Express)
- **Preference:** Python is preferred for financial libraries (Pandas/NumPy) and AI integration

### 1.3 AI Layer

- **Reasoning:** Google Gemini Pro (via Vertex AI)
- **Anomaly Detection:** Custom ML models

### 1.4 Database

- **NoSQL (Firestore):** User profiles, chat history, unstructured logs
- **Relational (PostgreSQL):** Financial transaction records, ledger data

### 1.5 Integration Layer

- **Account Aggregator Framework (India) or Plaid (Global):** Fetch real bank data

### 1.6 Blockchain & Ledger Gateway

- **Purpose:** Immutable audit layer for trust and auditability

---

## 2. Blockchain & Ledger Gateway Implementation

### 2.1 Proof of Advice Log

- **Risk:** AI financial advisor liability
- **Solution:** Ledger Gateway creates a tamper-proof record of every piece of advice
- **How:**
  1.  **Ledger Gateway:** Set up using Hyperledger Fabric (private) or Polygon (public) to receive a hash of the conversation
  2.  **Smart Contract:** Stores `Map<UserID, AdviceHash, Timestamp>`
  3.  **Value Proposition:** If a user disputes advice, retrieve the stored hash to verify the exact data and response

### 2.2 Privacy-Preserving Data Sharing (Zero-Knowledge Proofs)

- **Use Case:** Prove financial status (e.g., "User Balance > ₹X") without revealing actual balance
- **Implementation:** ZK-Rollup; Ledger Gateway verifies the statement and returns a boolean token, keeping data off-chain

---

## 3. AI Model Strategy: Training vs. Reasoning

### 3.1 Financial Reasoning (LLM)

- **Approach:** Use Retrieval-Augmented Generation (RAG) and Fine-Tuning, not base model training
- **Platform:** Google Vertex AI
- **Implementation:**
  - **Context Injection (RAG):** Backend fetches user data (e.g., bank balance, spending)
  - **Prompt Construction:**
    > "You are Nivesh. The user has ₹50k in savings. They want to buy a ₹60k bike. Analyse based on the '50-30-20 rule'. Do not hallucinate numbers."
  - **Fine-Tuning:** If needed, fine-tune Gemini with 500+ Q&A pairs for the "Nivesh" persona

### 3.2 Anomaly Detection Model (Spending Alerts)

- **Goal:** Detect spikes in spending
- **Data:** User transaction history (time series)
- **Algorithm:** Isolation Forest or LSTM Autoencoders
- **Workflow:**
  1.  **Data Prep:** Normalize transaction amounts and categories
  2.  **Training:** Vertex AI AutoML Tabular or custom Python (Scikit-Learn/TensorFlow)
  3.  **Deployment:**
      - Export as TensorFlow Lite for on-device (privacy)
      - Or deploy as microservice on Cloud Run
  4.  **Privacy:** On-device ML ensures user data never leaves the phone

---

## 4. Detailed Technical Requirements (Module-by-Module)

### 4.1 Module 1: Data Ingestion (Fi MCP)

- **Requirement:** Secure APIs to fetch bank data
- **Tech:**
  - Account Aggregator API: Fetch JSON for Savings, Credit Cards, Loans
  - Normalisation Engine: Python service to map bank-specific categories (e.g., "STARBUCKS MUMBAI") to generic tags (e.g., "Dining Out")

### 4.2 Module 2: Simulation Engine (The Core)

- **Requirement:** Deterministic, not AI-generated
- **Tech:** Python (Pandas/NumPy)
- **Input:** Current Savings, Monthly Investment, Expected Rate of Return (e.g., 12%), Inflation (e.g., 6%)
- **Calculation:**
  - `Future Value = PV * (1 + r)^n`
- **Output:** JSON array of year-by-year values for charting

### 4.3 Module 3: Conversational UI (The Interface)

- **Requirement:** Text-first chat with "Suggestion Chips"
- **Tech:**
  - Flutter/React Native chat bubble UI
  - Streaming API: WebSocket or SSE for low-latency, letter-by-letter AI response
  - Tool Rendering: Support non-text widgets (e.g., mini-chart) in chat stream

### 4.4 Module 4: Security & Compliance

- **Encryption:** AES-256 (at rest), TLS 1.3 (in transit)
- **PII Masking:** Mask sensitive identifiers before sending to LLM (e.g., "User has $500" instead of "John Doe has $500")

---

## 5. Implementation Roadmap

### Step 1: The "Skeleton" (Week 1-2)

- Set up Firebase project
- Build Python Simulation Engine (deterministic compound interest/loan EMI)
- **Action:** Verify math accuracy without AI

### Step 2: The "Brain" (Week 3-4)

- Connect Gemini Pro API
- Build system prompt to force AI to use Python Simulation Engine for calculations (function calling)
- **Prompt:** "If the user asks for a calculation, do not guess. Call the calculate_loan_emi tool."

### Step 3: The "Ledger" (Week 5)

- Set up private Hyperledger or mock ledger table
- Hash every interaction and store it

### Step 4: The "App" (Week 6-8)

- Build Flutter frontend
- Visualize JSON data from Step 1 into charts

---

## 6. Key Success Factor

Start with deterministic calculations, then layer AI on top. This ensures accuracy and builds trust from day one.