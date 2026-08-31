import type { CreateExpenseInput } from './ExpenseValidation';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { expenseSchema } from '@/models/Schema';
import { getExpenseTenant } from './ExpenseTenant';

/**
 * Lists the expenses of the caller's organization, newest first.
 *
 * The `organizationId` filter comes from the Clerk session, so this query can
 * never return rows belonging to another tenant.
 * @returns The expenses owned by the active organization.
 */
export const getOrganizationExpenses = async () => {
  const { organizationId } = await getExpenseTenant();

  return db
    .select()
    .from(expenseSchema)
    .where(eq(expenseSchema.organizationId, organizationId))
    .orderBy(desc(expenseSchema.date), desc(expenseSchema.id));
};

/**
 * Inserts an expense for the caller's organization.
 * @param input The validated, user-supplied fields of the expense.
 * @returns The created expense row.
 */
export const insertOrganizationExpense = async (
  input: CreateExpenseInput & { receiptUrl?: string },
) => {
  const { organizationId, userId } = await getExpenseTenant();

  const [expense] = await db
    .insert(expenseSchema)
    .values({
      // Session-derived, not part of `input`.
      organizationId,
      ownerId: userId,
      amount: input.amount,
      category: input.category,
      description: input.description,
      receiptUrl: input.receiptUrl,
      date: new Date(input.date),
    })
    .returning();

  return expense;
};

type ExpenseCategoryTotal = {
  category: string;
  amount: number;
};

export type ExpenseMonthSummary = {
  totalAmount: number;
  count: number;
  byCategory: ExpenseCategoryTotal[];
};

/**
 * Summarizes the caller's organization expenses for the current calendar month.
 *
 * Scoped the same way as `getOrganizationExpenses`: the `organizationId`
 * filter comes from the Clerk session, so the aggregate can never mix in
 * another tenant's data.
 * @returns The current month's total amount, expense count, and per-category totals.
 */
export const getOrganizationExpenseSummary = async (): Promise<ExpenseMonthSummary> => {
  const { organizationId } = await getExpenseTenant();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthExpenses = await db
    .select()
    .from(expenseSchema)
    .where(
      and(
        eq(expenseSchema.organizationId, organizationId),
        gte(expenseSchema.date, startOfMonth),
        lt(expenseSchema.date, startOfNextMonth),
      ),
    );

  const totalsByCategory = new Map<string, number>();
  let totalAmount = 0;

  for (const expense of monthExpenses) {
    const amount = Number(expense.amount);
    totalAmount += amount;
    totalsByCategory.set(
      expense.category,
      (totalsByCategory.get(expense.category) ?? 0) + amount,
    );
  }

  const byCategory = [...totalsByCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalAmount,
    count: monthExpenses.length,
    byCategory,
  };
};
