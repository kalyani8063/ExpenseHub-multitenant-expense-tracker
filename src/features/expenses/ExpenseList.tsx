import { getFormatter, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { deleteExpenseAction } from './ExpenseActions';
import { getOrganizationExpenses } from './ExpenseQueries';
import { getExpenseTenant } from './ExpenseTenant';
import { resolveReceiptUrl } from './ReceiptStorage';

export const ExpenseList = async () => {
  const t = await getTranslations('ExpensesPage');
  const format = await getFormatter();

  // Tenant-scoped by `getExpenseTenant()`, the caller cannot widen the scope.
  const [rows, { organizationId, isAdmin }] = await Promise.all([
    getOrganizationExpenses(),
    getExpenseTenant(),
  ]);

  // Private Cloud Storage receipts need a short-lived signed URL per render.
  const expenses = await Promise.all(rows.map(async expense => ({
    ...expense,
    receiptUrl: expense.receiptUrl
      ? await resolveReceiptUrl(expense.receiptUrl, organizationId)
      : null,
  })));

  if (expenses.length === 0) {
    return (
      <div className="
        rounded-md bg-card p-5 text-sm font-medium text-muted-foreground
      "
      >
        {t('empty_state')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md bg-card p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        {isAdmin ? t('scope_admin') : t('scope_member')}
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="
            border-b text-left text-muted-foreground
            [&_th]:p-2 [&_th]:font-medium
          "
          >
            <th>{t('table_date')}</th>
            <th>{t('table_category')}</th>
            <th>{t('table_description')}</th>
            <th>{t('table_receipt')}</th>
            <th className="text-right">{t('table_amount')}</th>
            {isAdmin && <th className="text-right">{t('table_actions')}</th>}
          </tr>
        </thead>

        <tbody className="
          [&_td]:p-2
          [&_tr]:border-b
          [&_tr:last-child]:border-b-0
        "
        >
          {expenses.map(expense => (
            <tr key={expense.id}>
              <td className="whitespace-nowrap">
                {format.dateTime(expense.date, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </td>
              <td>{expense.category}</td>
              <td className="text-muted-foreground">
                {expense.description ?? '—'}
              </td>
              <td>
                {expense.receiptUrl
                  ? <a className="text-primary underline" href={expense.receiptUrl} target="_blank" rel="noopener noreferrer">{t('receipt_view')}</a>
                  : '—'}
              </td>
              <td className="text-right font-medium whitespace-nowrap">
                {format.number(Number(expense.amount), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              {isAdmin && (
                <td className="text-right">
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="id" value={expense.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {t('delete_button')}
                    </Button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
