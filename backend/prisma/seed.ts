import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'alice@nivesh.com' },
    update: {},
    create: {
      email: 'alice@nivesh.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      phoneNumber: '+919876543210',
      kycStatus: 'verified',
      riskProfile: 'moderate',
      firebaseUid: 'firebase-alice-123',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'bob@nivesh.com' },
    update: {},
    create: {
      email: 'bob@nivesh.com',
      firstName: 'Bob',
      lastName: 'Smith',
      phoneNumber: '+919876543211',
      kycStatus: 'verified',
      riskProfile: 'aggressive',
      firebaseUid: 'firebase-bob-456',
    },
  });

  console.log('✅ Created users:', { user1: user1.email, user2: user2.email });

  // Create accounts for Alice
  const aliceSavings = await prisma.account.create({
    data: {
      userId: user1.id,
      accountName: 'HDFC Savings',
      accountNumber: 'HDFC1234567890',
      accountType: 'savings',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
      balance: 150000,
      currency: 'INR',
      status: 'ACTIVE',
    },
  });

  const aliceCredit = await prisma.account.create({
    data: {
      userId: user1.id,
      accountName: 'ICICI Credit Card',
      accountNumber: 'ICICI9876543210',
      accountType: 'credit_card',
      bankName: 'ICICI Bank',
      balance: -25000,
      currency: 'INR',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created accounts for Alice');

  // Create transactions for Alice
  const transactions = await prisma.transaction.createMany({
    data: [
      {
        userId: user1.id,
        accountId: aliceSavings.id,
        amount: 75000,
        type: 'CREDIT',
        category: 'SALARY',
        description: 'Monthly salary',
        merchantName: 'TechCorp India',
        transactionDate: new Date('2026-02-01'),
        status: 'COMPLETED',
      },
      {
        userId: user1.id,
        accountId: aliceSavings.id,
        amount: 5000,
        type: 'DEBIT',
        category: 'FOOD',
        description: 'Groceries',
        merchantName: 'Big Bazaar',
        transactionDate: new Date('2026-02-05'),
        status: 'COMPLETED',
      },
      {
        userId: user1.id,
        accountId: aliceCredit.id,
        amount: 2500,
        type: 'DEBIT',
        category: 'ENTERTAINMENT',
        description: 'Movie tickets',
        merchantName: 'PVR Cinemas',
        transactionDate: new Date('2026-02-07'),
        status: 'COMPLETED',
      },
      {
        userId: user1.id,
        accountId: aliceSavings.id,
        amount: 3000,
        type: 'DEBIT',
        category: 'TRANSPORT',
        description: 'Uber rides',
        merchantName: 'Uber India',
        transactionDate: new Date('2026-02-10'),
        status: 'COMPLETED',
      },
    ],
  });

  console.log(`✅ Created ${transactions.count} transactions`);

  // Create goals for Alice
  const retirementGoal = await prisma.goal.create({
    data: {
      userId: user1.id,
      name: 'Retirement Fund',
      description: 'Build a retirement corpus for comfortable retirement',
      category: 'RETIREMENT',
      targetAmount: 10000000,
      currentAmount: 500000,
      currency: 'INR',
      startDate: new Date('2026-01-01'),
      targetDate: new Date('2046-12-31'),
      status: 'ACTIVE',
      priority: 4,
      autoContribute: true,
      contributionAmount: 25000,
      contributionFrequency: 'MONTHLY',
    },
  });

  const vacationGoal = await prisma.goal.create({
    data: {
      userId: user1.id,
      name: 'Europe Trip',
      description: 'Family vacation to Europe',
      category: 'VACATION',
      targetAmount: 500000,
      currentAmount: 100000,
      currency: 'INR',
      startDate: new Date('2026-01-01'),
      targetDate: new Date('2027-06-30'),
      status: 'ACTIVE',
      priority: 2,
    },
  });

  console.log('✅ Created goals for Alice');

  // Create budgets for Alice
  const foodBudget = await prisma.budget.create({
    data: {
      userId: user1.id,
      category: 'FOOD',
      amount: 15000,
      currency: 'INR',
      period: 'MONTHLY',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      alertThreshold: 90,
      isRecurring: true,
      isActive: true,
      currentSpending: 5000,
    },
  });

  const transportBudget = await prisma.budget.create({
    data: {
      userId: user1.id,
      category: 'TRANSPORT',
      amount: 8000,
      currency: 'INR',
      period: 'MONTHLY',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      alertThreshold: 90,
      isRecurring: true,
      isActive: true,
      currentSpending: 3000,
    },
  });

  const entertainmentBudget = await prisma.budget.create({
    data: {
      userId: user1.id,
      category: 'ENTERTAINMENT',
      amount: 5000,
      currency: 'INR',
      period: 'MONTHLY',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      alertThreshold: 80,
      isRecurring: true,
      isActive: true,
      currentSpending: 2500,
    },
  });

  console.log('✅ Created budgets for Alice');

  // Create investments for Alice
  const investment1 = await prisma.investment.create({
    data: {
      userId: user1.id,
      investmentType: 'mutual_fund',
      assetName: 'HDFC Balanced Advantage Fund',
      isinCode: 'INF179K01AV3',
      folioNumber: 'HDFC123456',
      units: 500,
      averageBuyPrice: 180,
      currentPrice: 195,
      currentValue: 97500,
      investedAmount: 90000,
      absoluteReturn: 7500,
      xirr: 12.5,
      purchaseDate: new Date('2025-01-15'),
    },
  });

  console.log('✅ Created investments for Alice');

  // Create goal contributions
  await prisma.goalContribution.create({
    data: {
      goalId: retirementGoal.id,
      userId: user1.id,
      amount: 25000,
      currency: 'INR',
      type: 'AUTOMATIC',
      notes: 'Monthly SIP contribution',
    },
  });

  console.log('✅ Created goal contributions');

  // Create milestones
  await prisma.milestone.createMany({
    data: [
      {
        goalId: retirementGoal.id,
        title: 'First Million',
        targetAmount: 1000000,
        targetDate: new Date('2028-12-31'),
        isCompleted: false,
      },
      {
        goalId: vacationGoal.id,
        title: 'Half Way There',
        targetAmount: 250000,
        targetDate: new Date('2026-12-31'),
        isCompleted: false,
      },
    ],
  });

  console.log('✅ Created milestones');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
