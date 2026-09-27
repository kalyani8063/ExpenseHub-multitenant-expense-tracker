'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/libs/Logger';
import { deleteOrganizationExpense, insertOrganizationExpense } from './ExpenseQueries';
import { getExpenseTenant } from './ExpenseTenant';
import { CreateExpenseValidation, DeleteExpenseValidation } from './ExpenseValidation';
import { saveReceipt } from './ReceiptStorage';

export type CreateExpenseState = {
  status: 'idle' | 'success' | 'error';
};

/**
 * Server Action backing the "add expense" form.
 *
 * Only `amount`, `category`, `description` and `date` are read from the form.
 * `organizationId` and `ownerId` are resolved from the Clerk session inside
 * `insertOrganizationExpense`, so a crafted request cannot write into another
 * organization.
 * @param _prevState The previous form state, unused.
 * @param formData The submitted form fields.
 * @returns The new form state.
 */
export const createExpenseAction = async (
  _prevState: CreateExpenseState,
  formData: FormData,
): Promise<CreateExpenseState> => {
  const parsed = CreateExpenseValidation.safeParse({
    amount: formData.get('amount'),
    category: formData.get('category'),
    description: formData.get('description') ?? undefined,
    date: formData.get('date'),
  });

  if (!parsed.success) {
    return { status: 'error' };
  }

  try {
    const receipt = formData.get('receipt');
    let receiptUrl: string | undefined;

    if (receipt instanceof File && receipt.size > 0) {
      const { organizationId } = await getExpenseTenant();
      receiptUrl = await saveReceipt(receipt, organizationId);
    }

    await insertOrganizationExpense({ ...parsed.data, receiptUrl });
  } catch (error) {
    logger.error(
      `Failed to create expense: ${error instanceof Error ? error.message : String(error)}`,
    );

    return { status: 'error' };
  }

  revalidatePath('/dashboard/expenses');

  return { status: 'success' };
};

/**
 * Server Action backing the admin-only "delete" button.
 *
 * Only the expense `id` comes from the form. The admin check and the
 * organization filter both happen in `deleteOrganizationExpense`, so a member
 * posting this action directly is still refused.
 * @param formData The submitted form fields.
 */
export const deleteExpenseAction = async (formData: FormData) => {
  const parsed = DeleteExpenseValidation.safeParse({ id: formData.get('id') });

  if (!parsed.success) {
    return;
  }

  try {
    await deleteOrganizationExpense(parsed.data.id);
  } catch (error) {
    logger.error(
      `Failed to delete expense: ${error instanceof Error ? error.message : String(error)}`,
    );

    return;
  }

  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard');
};
