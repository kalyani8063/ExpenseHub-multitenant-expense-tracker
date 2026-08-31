'use server';

import { revalidatePath } from 'next/cache';
import { logger } from '@/libs/Logger';
import { insertOrganizationExpense } from './ExpenseQueries';
import { getExpenseTenant } from './ExpenseTenant';
import { saveReceiptLocally } from './ReceiptStorage';
import { CreateExpenseValidation } from './ExpenseValidation';

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
      receiptUrl = await saveReceiptLocally(receipt, organizationId);
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
