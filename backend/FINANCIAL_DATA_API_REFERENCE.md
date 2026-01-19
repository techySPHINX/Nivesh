# Financial Data Module - API Reference

## 🔐 Authentication

All endpoints require JWT authentication via Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

## 📁 Account Management Endpoints

### 1. Create Account

**POST** `/accounts`

Creates a new financial account for the authenticated user.

**Request Body:**

```json
{
  "accountType": "SAVINGS",
  "bankName": "HDFC Bank",
  "accountNumber": "1234567890123456",
  "ifscCode": "HDFC0001234",
  "initialBalance": 10000.5,
  "currency": "INR"
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountType": "SAVINGS",
  "bankName": "HDFC Bank",
  "accountNumber": "1234567890123456",
  "balance": 10000.5,
  "currency": "INR",
  "status": "ACTIVE",
  "isLinked": false,
  "createdAt": "2024-12-15T10:30:00Z",
  "updatedAt": "2024-12-15T10:30:00Z"
}
```

**Account Types:**

- `SAVINGS` - Savings account
- `CURRENT` - Current/checking account
- `CREDIT_CARD` - Credit card account
- `INVESTMENT` - Investment account
- `LOAN` - Loan account

**Validation:**

- accountType: Required, enum
- bankName: Required, string (3-100 chars)
- accountNumber: Required, string (9-18 digits)
- ifscCode: Optional, string (XXXX0XXXXXX format)
- initialBalance: Required, number (min: 0)
- currency: Optional, enum (default: INR)

---

### 2. Get User Accounts

**GET** `/accounts/me`

Retrieves all accounts for the authenticated user.

**Query Parameters:**

- `activeOnly` (optional): boolean - Filter for active accounts only

**Examples:**

```
GET /accounts/me
GET /accounts/me?activeOnly=true
```

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "accountType": "SAVINGS",
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890123456",
    "balance": 10000.5,
    "currency": "INR",
    "status": "ACTIVE",
    "isLinked": false,
    "createdAt": "2024-12-15T10:30:00Z",
    "updatedAt": "2024-12-15T10:30:00Z"
  }
]
```

---

### 3. Get Account by ID

**GET** `/accounts/:id`

Retrieves a specific account by ID (user must own the account).

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountType": "SAVINGS",
  "bankName": "HDFC Bank",
  "accountNumber": "1234567890123456",
  "balance": 10000.5,
  "currency": "INR",
  "status": "ACTIVE",
  "isLinked": false,
  "createdAt": "2024-12-15T10:30:00Z",
  "updatedAt": "2024-12-15T10:30:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Account not found
- `403 Forbidden` - User doesn't own this account

---

### 4. Update Account

**PATCH** `/accounts/:id`

Updates account information (user must own the account).

**Request Body:** (All fields optional)

```json
{
  "accountName": "My Savings Account",
  "bankName": "State Bank of India",
  "balance": 15000.0,
  "status": "ACTIVE"
}
```

**Account Status Values:**

- `ACTIVE` - Account is active
- `INACTIVE` - Account is inactive
- `FROZEN` - Account is frozen (no transactions)
- `CLOSED` - Account is closed

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountType": "SAVINGS",
  "bankName": "State Bank of India",
  "balance": 15000.0,
  "currency": "INR",
  "status": "ACTIVE",
  "isLinked": false,
  "createdAt": "2024-12-15T10:30:00Z",
  "updatedAt": "2024-12-15T11:00:00Z"
}
```

---

### 5. Link Account

**POST** `/accounts/:id/link`

Links an account for auto-sync functionality.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountType": "SAVINGS",
  "bankName": "HDFC Bank",
  "accountNumber": "1234567890123456",
  "balance": 10000.5,
  "currency": "INR",
  "status": "ACTIVE",
  "isLinked": true,
  "createdAt": "2024-12-15T10:30:00Z",
  "updatedAt": "2024-12-15T11:00:00Z"
}
```

---

### 6. Delete Account

**DELETE** `/accounts/:id`

Soft deletes an account (user must own the account).

**Response:** `204 No Content`

**Business Rules:**

- Cannot delete account with positive balance
- Account must be in CLOSED status
- Soft delete (data retained for audit)

---

## 💳 Transaction Management Endpoints

### 1. Create Transaction

**POST** `/transactions`

Creates a new transaction for an account.

**Request Body:**

```json
{
  "accountId": "uuid",
  "type": "DEBIT",
  "amount": 500.0,
  "currency": "INR",
  "category": "FOOD",
  "description": "Lunch at restaurant",
  "transactionDate": "2024-12-15T12:00:00Z",
  "merchant": "Pizza Hut"
}
```

**Transaction Types:**

- `DEBIT` - Money out (expense)
- `CREDIT` - Money in (income)

**Transaction Categories:**

```
Income Categories:
- SALARY
- INVESTMENT_RETURN
- REFUND
- GIFT
- OTHER_INCOME

Expense Categories:
- FOOD
- TRANSPORT
- ENTERTAINMENT
- SHOPPING
- BILLS
- HEALTHCARE
- EDUCATION
- RENT
- EMI
- INSURANCE
- INVESTMENT
- OTHER_EXPENSE
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "type": "DEBIT",
  "amount": 500.0,
  "currency": "INR",
  "category": "FOOD",
  "description": "Lunch at restaurant",
  "transactionDate": "2024-12-15T12:00:00Z",
  "status": "COMPLETED",
  "merchant": "Pizza Hut",
  "referenceNumber": null,
  "createdAt": "2024-12-15T12:01:00Z",
  "updatedAt": "2024-12-15T12:01:00Z"
}
```

**Business Rules:**

- Transaction automatically updates account balance
- DEBIT reduces balance, CREDIT increases balance
- Transaction date cannot be in future
- Account must be ACTIVE to create transaction

---

### 2. Get User Transactions

**GET** `/transactions/me`

Retrieves all transactions for the authenticated user.

**Query Parameters:**

- `page` (optional): number - Page number (default: 1)
- `limit` (optional): number - Items per page (default: 50)
- `sortBy` (optional): string - Sort field (default: transactionDate)
- `sortOrder` (optional): ASC | DESC (default: DESC)

**Examples:**

```
GET /transactions/me
GET /transactions/me?page=2&limit=20
GET /transactions/me?sortBy=amount&sortOrder=DESC
```

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "accountId": "uuid",
      "type": "DEBIT",
      "amount": 500.0,
      "currency": "INR",
      "category": "FOOD",
      "description": "Lunch at restaurant",
      "transactionDate": "2024-12-15T12:00:00Z",
      "status": "COMPLETED",
      "merchant": "Pizza Hut",
      "createdAt": "2024-12-15T12:01:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "totalPages": 3
  }
}
```

---

### 3. Get Recent Transactions

**GET** `/transactions/recent`

Retrieves recent transactions for the authenticated user.

**Query Parameters:**

- `days` (optional): number - Number of days to look back (default: 7)

**Examples:**

```
GET /transactions/recent
GET /transactions/recent?days=30
```

**Response:** `200 OK` - Array of transactions

---

### 4. Get Transactions by Account

**GET** `/transactions/account/:accountId`

Retrieves all transactions for a specific account.

**Response:** `200 OK` - Array of transactions

---

### 5. Get Transaction by ID

**GET** `/transactions/:id`

Retrieves a specific transaction by ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "userId": "uuid",
  "accountId": "uuid",
  "type": "DEBIT",
  "amount": 500.0,
  "currency": "INR",
  "category": "FOOD",
  "description": "Lunch at restaurant",
  "transactionDate": "2024-12-15T12:00:00Z",
  "status": "COMPLETED",
  "merchant": "Pizza Hut",
  "referenceNumber": null,
  "metadata": null,
  "createdAt": "2024-12-15T12:01:00Z",
  "updatedAt": "2024-12-15T12:01:00Z"
}
```

---

### 6. List Transactions with Filters

**GET** `/transactions`

Advanced transaction search with multiple filters.

**Query Parameters:**

- `accountId` (optional): string - Filter by account
- `category` (optional): string - Filter by category
- `type` (optional): DEBIT | CREDIT - Filter by type
- `status` (optional): PENDING | COMPLETED | FAILED | REVERSED
- `startDate` (optional): ISO date string - Start date
- `endDate` (optional): ISO date string - End date
- `page` (optional): number - Page number (default: 1)
- `limit` (optional): number - Items per page (default: 50)
- `sortBy` (optional): string - Sort field
- `sortOrder` (optional): ASC | DESC

**Examples:**

```
GET /transactions?category=FOOD&startDate=2024-12-01&endDate=2024-12-31
GET /transactions?type=DEBIT&status=COMPLETED&page=1&limit=20
GET /transactions?accountId=uuid&sortBy=amount&sortOrder=DESC
```

**Response:** `200 OK` - Paginated transaction list

---

### 7. Update Transaction

**PATCH** `/transactions/:id`

Updates a transaction (user must own the transaction).

**Request Body:** (All fields optional)

```json
{
  "category": "ENTERTAINMENT",
  "description": "Updated description",
  "merchant": "Updated merchant"
}
```

**Response:** `200 OK` - Updated transaction

**Business Rules:**

- Can only update PENDING or COMPLETED transactions
- Cannot change amount or type after creation
- Status changes trigger account balance recalculation

---

### 8. Delete Transaction

**DELETE** `/transactions/:id`

Soft deletes a transaction (user must own the transaction).

**Response:** `204 No Content`

**Business Rules:**

- Account balance is automatically adjusted
- Soft delete (data retained for audit)

---

## 📊 Analytics & Aggregation

### Get Spending by Category

Use the list endpoint with grouping:

```
GET /transactions?type=DEBIT&startDate=2024-12-01&endDate=2024-12-31
```

### Get Monthly Spending

Filter by date range:

```
GET /transactions?type=DEBIT&startDate=2024-12-01&endDate=2024-12-31
```

---

## 🚨 Error Responses

### Common HTTP Status Codes

**400 Bad Request**

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "amount",
      "message": "Amount must be a positive number"
    }
  ]
}
```

**401 Unauthorized**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden**

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

**404 Not Found**

```json
{
  "statusCode": 404,
  "message": "Account not found"
}
```

**422 Unprocessable Entity**

```json
{
  "statusCode": 422,
  "message": "Business rule violation",
  "error": "Cannot close account with positive balance"
}
```

**500 Internal Server Error**

```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## 🔄 Transaction Status Flow

```
PENDING → COMPLETED (Success)
       → FAILED (Error)

COMPLETED → REVERSED (Refund/Chargeback)
```

**Status Meanings:**

- `PENDING` - Transaction initiated, not yet processed
- `COMPLETED` - Transaction successfully processed
- `FAILED` - Transaction processing failed
- `REVERSED` - Transaction reversed (refund/chargeback)

---

## 💡 Best Practices

### 1. Pagination

Always use pagination for transaction lists:

```
GET /transactions/me?page=1&limit=50
```

### 2. Date Filters

Use ISO 8601 format for dates:

```
2024-12-15T10:30:00Z
```

### 3. Error Handling

Check HTTP status codes and parse error messages:

```javascript
if (response.status === 422) {
  console.error("Business rule violation:", response.data.error);
}
```

### 4. Idempotency

Use unique reference numbers to prevent duplicate transactions:

```json
{
  "referenceNumber": "TXN-2024-12-15-001",
  ...
}
```

### 5. Currency Consistency

Always specify currency when working with multi-currency:

```json
{
  "amount": 100,
  "currency": "USD"
}
```

---

## 🛠️ Testing with cURL

### Create Account

```bash
curl -X POST http://localhost:3000/accounts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountType": "SAVINGS",
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890123456",
    "initialBalance": 10000
  }'
```

### Create Transaction

```bash
curl -X POST http://localhost:3000/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "uuid",
    "type": "DEBIT",
    "amount": 500,
    "category": "FOOD",
    "description": "Lunch",
    "transactionDate": "2024-12-15T12:00:00Z"
  }'
```

### List Transactions

```bash
curl -X GET "http://localhost:3000/transactions?category=FOOD&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

---

## 📖 Swagger Documentation

Interactive API documentation available at:

```
http://localhost:3000/api
```

Features:

- Try out endpoints directly
- View request/response schemas
- See validation rules
- Download OpenAPI spec

---

**Last Updated**: December 2024  
**API Version**: 1.0.0  
**Module**: Financial Data Module
