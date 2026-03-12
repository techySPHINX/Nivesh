/**
 * Nivesh — Indian Spending Categories
 * With icons, colors, and Hindi translations
 */

export interface SpendingCategory {
  id: string;
  name: string;
  nameHi: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'transfer';
}

export const categories: SpendingCategory[] = [
  // === EXPENSES ===
  { id: 'groceries', name: 'Groceries & Kirana', nameHi: 'किराना', icon: 'ShoppingCart', color: '#059669', type: 'expense' },
  { id: 'food', name: 'Food & Dining', nameHi: 'खाना', icon: 'ForkKnife', color: '#EA580C', type: 'expense' },
  { id: 'transport', name: 'Transport & Auto', nameHi: 'यातायात', icon: 'Car', color: '#4F46E5', type: 'expense' },
  { id: 'medical', name: 'Medical & Health', nameHi: 'स्वास्थ्य', icon: 'FirstAidKit', color: '#DC2626', type: 'expense' },
  { id: 'education', name: 'Education & Tuition', nameHi: 'शिक्षा', icon: 'GraduationCap', color: '#7C3AED', type: 'expense' },
  { id: 'rent', name: 'Rent & Housing', nameHi: 'किराया', icon: 'House', color: '#0891B2', type: 'expense' },
  { id: 'utilities', name: 'Utilities', nameHi: 'बिजली/पानी/गैस', icon: 'Lightning', color: '#D97706', type: 'expense' },
  { id: 'mobile', name: 'Mobile & Internet', nameHi: 'मोबाइल/इंटरनेट', icon: 'DeviceMobile', color: '#2563EB', type: 'expense' },
  { id: 'entertainment', name: 'Entertainment & OTT', nameHi: 'मनोरंजन', icon: 'FilmSlate', color: '#DB2777', type: 'expense' },
  { id: 'shopping', name: 'Shopping & Fashion', nameHi: 'खरीदारी', icon: 'Bag', color: '#9333EA', type: 'expense' },
  { id: 'travel', name: 'Travel & Holiday', nameHi: 'यात्रा', icon: 'Airplane', color: '#0D9488', type: 'expense' },
  { id: 'insurance', name: 'Insurance Premium', nameHi: 'बीमा', icon: 'Shield', color: '#1D4ED8', type: 'expense' },
  { id: 'emi', name: 'EMI & Loan Payment', nameHi: 'EMI/लोन', icon: 'Bank', color: '#B91C1C', type: 'expense' },
  { id: 'gift', name: 'Gift / Shagun', nameHi: 'शगुन/उपहार', icon: 'Gift', color: '#DB2777', type: 'expense' },
  { id: 'religious', name: 'Religious / Charity', nameHi: 'धार्मिक/दान', icon: 'HandHeart', color: '#CA8A04', type: 'expense' },
  { id: 'personal', name: 'Personal Care', nameHi: 'व्यक्तिगत', icon: 'User', color: '#6366F1', type: 'expense' },

  // === INCOME ===
  { id: 'salary', name: 'Salary', nameHi: 'वेतन', icon: 'Wallet', color: '#059669', type: 'income' },
  { id: 'freelance', name: 'Freelance / Side Income', nameHi: 'फ्रीलांस', icon: 'Briefcase', color: '#4F46E5', type: 'income' },
  { id: 'investment_return', name: 'Investment Returns', nameHi: 'निवेश लाभ', icon: 'TrendUp', color: '#16A34A', type: 'income' },
  { id: 'rental_income', name: 'Rental Income', nameHi: 'किराये से आय', icon: 'Buildings', color: '#0891B2', type: 'income' },
  { id: 'interest', name: 'Interest Income', nameHi: 'ब्याज आय', icon: 'Percent', color: '#7C3AED', type: 'income' },
  { id: 'refund', name: 'Refund', nameHi: 'वापसी', icon: 'ArrowCounterClockwise', color: '#2563EB', type: 'income' },

  // === TRANSFERS ===
  { id: 'self_transfer', name: 'Self Transfer', nameHi: 'स्वयं ट्रांसफर', icon: 'ArrowsLeftRight', color: '#6B7280', type: 'transfer' },
  { id: 'upi_transfer', name: 'UPI Transfer', nameHi: 'UPI ट्रांसफर', icon: 'QrCode', color: '#4F46E5', type: 'transfer' },
];

export function getCategoryById(id: string): SpendingCategory | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoriesByType(type: SpendingCategory['type']): SpendingCategory[] {
  return categories.filter((c) => c.type === type);
}
