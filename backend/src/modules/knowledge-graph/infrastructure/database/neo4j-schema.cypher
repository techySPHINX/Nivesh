// Neo4j Graph Schema for Nivesh Knowledge Graph
// This file defines the complete graph data model including:
// - Node labels and their properties
// - Relationship types and their properties
// - Constraints for data integrity
// - Indexes for query performance
//
// Execute this schema using Neo4j Browser or Cypher Shell:
// cat neo4j-schema.cypher | cypher-shell -u neo4j -p password

// ============================================================================
// CONSTRAINTS - Ensure data integrity
// ============================================================================

// Node uniqueness constraints (also creates indexes)
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT account_id_unique IF NOT EXISTS
FOR (a:Account) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.id IS UNIQUE;

CREATE CONSTRAINT category_id_unique IF NOT EXISTS
FOR (c:Category) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT budget_id_unique IF NOT EXISTS
FOR (b:Budget) REQUIRE b.id IS UNIQUE;

CREATE CONSTRAINT goal_id_unique IF NOT EXISTS
FOR (g:Goal) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT merchant_id_unique IF NOT EXISTS
FOR (m:Merchant) REQUIRE m.id IS UNIQUE;

CREATE CONSTRAINT location_id_unique IF NOT EXISTS
FOR (l:Location) REQUIRE l.id IS UNIQUE;

CREATE CONSTRAINT tag_id_unique IF NOT EXISTS
FOR (t:Tag) REQUIRE t.id IS UNIQUE;

// ============================================================================
// INDEXES - Optimize query performance
// ============================================================================

// User indexes
CREATE INDEX user_email IF NOT EXISTS
FOR (u:User) ON (u.email);

CREATE INDEX user_created_at IF NOT EXISTS
FOR (u:User) ON (u.createdAt);

// Transaction indexes for time-based queries
CREATE INDEX transaction_date IF NOT EXISTS
FOR (t:Transaction) ON (t.date);

CREATE INDEX transaction_amount IF NOT EXISTS
FOR (t:Transaction) ON (t.amount);

CREATE INDEX transaction_type IF NOT EXISTS
FOR (t:Transaction) ON (t.type);

// Category indexes
CREATE INDEX category_name IF NOT EXISTS
FOR (c:Category) ON (c.name);

// Merchant indexes
CREATE INDEX merchant_name IF NOT EXISTS
FOR (m:Merchant) ON (m.name);

CREATE INDEX merchant_category IF NOT EXISTS
FOR (m:Merchant) ON (m.category);

// Budget indexes
CREATE INDEX budget_period IF NOT EXISTS
FOR (b:Budget) ON (b.period);

CREATE INDEX budget_status IF NOT EXISTS
FOR (b:Budget) ON (b.status);

// Goal indexes
CREATE INDEX goal_target_date IF NOT EXISTS
FOR (g:Goal) ON (g.targetDate);

CREATE INDEX goal_status IF NOT EXISTS
FOR (g:Goal) ON (g.status);

// Location indexes for geographic queries
CREATE INDEX location_city IF NOT EXISTS
FOR (l:Location) ON (l.city);

CREATE INDEX location_coordinates IF NOT EXISTS
FOR (l:Location) ON (l.latitude, l.longitude);

// Relationship indexes for pattern detection
CREATE INDEX owns_created_at IF NOT EXISTS
FOR ()-[r:OWNS]-() ON (r.createdAt);

CREATE INDEX made_transaction_date IF NOT EXISTS
FOR ()-[r:MADE_TRANSACTION]-() ON (r.createdAt);

CREATE INDEX similar_spending_confidence IF NOT EXISTS
FOR ()-[r:SIMILAR_SPENDING]-() ON (r.confidence);

// ============================================================================
// FULL-TEXT SEARCH INDEXES
// ============================================================================

// Full-text search for merchants
CREATE FULLTEXT INDEX merchant_search IF NOT EXISTS
FOR (m:Merchant) ON EACH [m.name, m.description];

// Full-text search for categories
CREATE FULLTEXT INDEX category_search IF NOT EXISTS
FOR (c:Category) ON EACH [c.name, c.description];

// Full-text search for tags
CREATE FULLTEXT INDEX tag_search IF NOT EXISTS
FOR (t:Tag) ON EACH [t.name];

// ============================================================================
// NODE SCHEMAS - Property definitions and validation
// ============================================================================

// User Node
// Represents a user account in the system
// Properties:
//   - id: UUID (required, unique)
//   - email: string (required, indexed)
//   - name: string
//   - riskProfile: enum (conservative, moderate, aggressive)
//   - monthlyIncome: decimal
//   - createdAt: datetime (required, indexed)
//   - updatedAt: datetime (required)

// Account Node
// Represents a financial account (bank, credit card, etc.)
// Properties:
//   - id: UUID (required, unique)
//   - userId: UUID (required)
//   - name: string (required)
//   - type: enum (checking, savings, credit, investment)
//   - balance: decimal (required)
//   - currency: string (default: 'INR')
//   - isActive: boolean (default: true)
//   - createdAt: datetime (required)
//   - updatedAt: datetime (required)

// Transaction Node
// Represents a financial transaction
// Properties:
//   - id: UUID (required, unique)
//   - accountId: UUID (required)
//   - amount: decimal (required, indexed)
//   - type: enum (income, expense, transfer) (required, indexed)
//   - description: string
//   - date: datetime (required, indexed)
//   - merchantId: UUID
//   - categoryId: UUID
//   - locationId: UUID
//   - isRecurring: boolean (default: false)
//   - confidence: decimal (0-1, ML confidence score)
//   - createdAt: datetime (required)
//   - updatedAt: datetime (required)

// Category Node
// Represents spending/income categories
// Properties:
//   - id: UUID (required, unique)
//   - name: string (required, indexed)
//   - type: enum (income, expense)
//   - icon: string
//   - color: string
//   - description: string
//   - parentId: UUID (for subcategories)
//   - createdAt: datetime (required)

// Budget Node
// Represents budget allocations
// Properties:
//   - id: UUID (required, unique)
//   - userId: UUID (required)
//   - categoryId: UUID (required)
//   - amount: decimal (required)
//   - spent: decimal (default: 0)
//   - period: enum (weekly, monthly, yearly) (required, indexed)
//   - startDate: datetime (required)
//   - endDate: datetime (required)
//   - status: enum (active, exceeded, completed) (indexed)
//   - alertThreshold: decimal (0-1, default: 0.8)
//   - createdAt: datetime (required)
//   - updatedAt: datetime (required)

// Goal Node
// Represents financial goals
// Properties:
//   - id: UUID (required, unique)
//   - userId: UUID (required)
//   - name: string (required)
//   - targetAmount: decimal (required)
//   - currentAmount: decimal (default: 0)
//   - targetDate: datetime (required, indexed)
//   - priority: enum (low, medium, high)
//   - status: enum (active, completed, paused) (indexed)
//   - category: string
//   - createdAt: datetime (required)
//   - updatedAt: datetime (required)

// Merchant Node
// Represents merchants/vendors
// Properties:
//   - id: UUID (required, unique)
//   - name: string (required, indexed)
//   - category: string (indexed)
//   - description: string
//   - website: string
//   - logo: string
//   - averageTransactionAmount: decimal
//   - transactionCount: integer (default: 0)
//   - firstSeenAt: datetime
//   - lastSeenAt: datetime
//   - createdAt: datetime (required)

// Location Node
// Represents geographic locations
// Properties:
//   - id: UUID (required, unique)
//   - name: string
//   - address: string
//   - city: string (indexed)
//   - state: string
//   - country: string
//   - postalCode: string
//   - latitude: decimal (indexed)
//   - longitude: decimal (indexed)
//   - createdAt: datetime (required)

// Tag Node
// Represents custom tags for categorization
// Properties:
//   - id: UUID (required, unique)
//   - name: string (required)
//   - color: string
//   - userId: UUID (user-specific tags)
//   - isGlobal: boolean (default: false)
//   - usageCount: integer (default: 0)
//   - createdAt: datetime (required)

// ============================================================================
// RELATIONSHIP SCHEMAS - Defines how nodes connect
// ============================================================================

// User -(OWNS)-> Account
// Properties:
//   - createdAt: datetime
//   - isPrimary: boolean (is this the primary account?)

// Account -(MADE_TRANSACTION)-> Transaction
// Properties:
//   - createdAt: datetime

// Transaction -(BELONGS_TO_CATEGORY)-> Category
// Properties:
//   - confidence: decimal (0-1, categorization confidence)
//   - isAutomatic: boolean (auto-categorized vs manual)
//   - createdAt: datetime

// Transaction -(AT_MERCHANT)-> Merchant
// Properties:
//   - createdAt: datetime
//   - isVerified: boolean

// Transaction -(AT_LOCATION)-> Location
// Properties:
//   - createdAt: datetime
//   - accuracy: decimal (GPS accuracy in meters)

// Transaction -(HAS_TAG)-> Tag
// Properties:
//   - createdAt: datetime

// Transaction -(AFFECTS_BUDGET)-> Budget
// Properties:
//   - amount: decimal (how much of transaction affected budget)
//   - createdAt: datetime

// User -(HAS_BUDGET)-> Budget
// Properties:
//   - createdAt: datetime

// User -(HAS_GOAL)-> Goal
// Properties:
//   - createdAt: datetime

// Account -(CONTRIBUTES_TO_GOAL)-> Goal
// Properties:
//   - amount: decimal (contribution amount)
//   - date: datetime
//   - createdAt: datetime

// Category -(SUBCATEGORY_OF)-> Category
// Properties:
//   - createdAt: datetime

// Merchant -(SIMILAR_MERCHANT)-> Merchant
// Properties:
//   - similarity: decimal (0-1, similarity score)
//   - confidence: decimal (0-1, confidence in similarity)
//   - sharedCustomers: integer
//   - createdAt: datetime

// Merchant -(MERCHANT_CHAIN)-> Merchant
// Properties:
//   - chainName: string
//   - createdAt: datetime

// User -(SIMILAR_SPENDING)-> User
// Properties:
//   - similarity: decimal (0-1, spending pattern similarity)
//   - confidence: decimal (0-1, confidence score)
//   - sharedCategories: array[string]
//   - sharedMerchants: array[string]
//   - createdAt: datetime
//   - updatedAt: datetime

// User -(SIMILAR_GOALS)-> User
// Properties:
//   - similarity: decimal (0-1, goal similarity)
//   - confidence: decimal (0-1)
//   - sharedGoalTypes: array[string]
//   - createdAt: datetime

// User -(RECOMMENDS)-> (Budget|Goal|Category)
// Properties:
//   - reason: string
//   - confidence: decimal (0-1)
//   - based_on: string (what triggered recommendation)
//   - createdAt: datetime
//   - expiresAt: datetime

// ============================================================================
// SAMPLE QUERIES - Common patterns for reference
// ============================================================================

// Find all transactions for a user in a date range
// MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
// WHERE t.date >= $startDate AND t.date <= $endDate
// RETURN t
// ORDER BY t.date DESC;

// Find spending patterns by category
// MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
//       -[:BELONGS_TO_CATEGORY]->(c:Category)
// WHERE t.date >= $startDate
// RETURN c.name, SUM(t.amount) as total, COUNT(t) as count
// ORDER BY total DESC;

// Find similar users based on spending patterns
// MATCH (u1:User {id: $userId})-[r:SIMILAR_SPENDING]->(u2:User)
// WHERE r.confidence > 0.7
// RETURN u2, r.similarity, r.sharedCategories
// ORDER BY r.similarity DESC
// LIMIT 10;

// Detect merchant networks
// MATCH (m1:Merchant)-[r:SIMILAR_MERCHANT]-(m2:Merchant)
// WHERE r.similarity > 0.8
// RETURN m1.name, COLLECT(m2.name) as similarMerchants
// ORDER BY SIZE(similarMerchants) DESC;

// Find budget performance
// MATCH (u:User {id: $userId})-[:HAS_BUDGET]->(b:Budget)
// WHERE b.status = 'active'
// RETURN b.id, b.amount, b.spent, 
//        (b.spent / b.amount) as utilization,
//        b.category
// ORDER BY utilization DESC;

// Recommendation: Find users with similar goals who achieved them
// MATCH (u1:User {id: $userId})-[:HAS_GOAL]->(g1:Goal)
// MATCH (u2:User)-[:SIMILAR_GOALS]->(u1)
// MATCH (u2)-[:HAS_GOAL]->(g2:Goal {status: 'completed'})
// WHERE g1.category = g2.category
// RETURN u2, g2, 
//        g2.targetAmount, g2.currentAmount,
//        duration.between(g2.createdAt, g2.updatedAt) as timeToComplete
// LIMIT 5;

// Pattern detection: Recurring transactions
// MATCH (u:User {id: $userId})-[:OWNS]->(a:Account)-[:MADE_TRANSACTION]->(t:Transaction)
//       -[:AT_MERCHANT]->(m:Merchant)
// WHERE t.date >= date() - duration('P3M')
// WITH m, COLLECT(t.date) as dates, COLLECT(t.amount) as amounts
// WHERE SIZE(dates) >= 3
// WITH m, dates, amounts,
//      duration.between(dates[0], dates[-1]).days / SIZE(dates) as avgInterval
// WHERE avgInterval >= 25 AND avgInterval <= 35 // ~monthly
// RETURN m.name, dates, amounts, avgInterval;
