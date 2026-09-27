import type { ExpenseTenant } from './ExpenseTenant';
import type { CreateExpenseInput } from './ExpenseValidation';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/libs/DB';
import { expenseSchema } from '@/models/Schema';
import { getExpenseTenant } from './ExpenseTenant';

/**
 * Builds the row filter for what the caller is allowed to see.
 *
 * Every tenant is limited to its own organization. On top of that, admins see
 * all of the organization's expenses while members only see the ones they
 * created themselves.
 * @param tenant The session-derived tenant from `getExpenseTenant()`.
 * @returns The Drizzle `where` condition.
 */
const visibleExpenses = (tenant: ExpenseTenant) =>
  tenant.isAdmin
    ? eq(expenseSchema.organizationId, tenant.organizationId)
    : and(
        eq(expenseSchema.organizationId, tenant.organizationId),
        eq(expenseSchema.ownerId, tenant.userId),
      );

/**
 * Lists the expenses visible to the caller, newest first.
 *
 * The `organizationId` filter comes from the Clerk session, so this query can
 * never return rows belonging to another tenant.
 * @returns The organization's expenses for admins, the caller's own for members.
 */
export const getOrganizationExpenses = async () => {
  const tenant = await getExpenseTenant();

  return db
    .select()
    .from(expenseSchema)
    .where(visibleExpenses(tenant))
    .orderBy(desc(expenseSchema.date), desc(expenseSchema.id));
};

/**
 * Deletes one expense of the caller's organization. Admins only.
 *
 * The row is matched on both `id` and `organizationId`, so guessing another
 * organization's expense id deletes nothing (no IDOR).
 * @param id The expense id submitted by the client.
 * @returns Whether a row was deleted.
 * @throws When the caller is not an admin of the active organization.
 */
export const deleteOrganizationExpense = async (id: number) => {
  const { organizationId, isAdmin } = await getExpenseTenant();

  if (!isAdmin) {
    throw new Error('Forbidden: only organization admins can delete expenses.');
  }

  const deleted = await db
    .delete(expenseSchema)
    .where(
      and(
        eq(expenseSchema.id, id),
        eq(expenseSchema.organizationId, organizationId),
      ),
    )
    .returning({ id: expenseSchema.id });

  return deleted.length > 0;
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
 * Summarizes the expenses visible to the caller for the current calendar month.
 *
 * Scoped the same way as `getOrganizationExpenses`: the `organizationId`
 * filter comes from the Clerk session, so the aggregate can never mix in
 * another tenant's data, and members only see their own spending.
 * @returns The current month's total amount, expense count, and per-category totals.
 */
export const getOrganizationExpenseSummary = async (): Promise<ExpenseMonthSummary> => {
  const tenant = await getExpenseTenant();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const monthExpenses = await db
    .select()
    .from(expenseSchema)
    .where(
      and(
        visibleExpenses(tenant),
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
