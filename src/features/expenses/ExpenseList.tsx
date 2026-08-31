import { getFormatter, getTranslations } from 'next-intl/server';
import { getOrganizationExpenses } from './ExpenseQueries';

export const ExpenseList = async () => {
  const t = await getTranslations('ExpensesPage');
  const format = await getFormatter();

  // Tenant-scoped by `getExpenseTenant()`, the caller cannot widen the scope.
  const expenses = await getOrganizationExpenses();

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
            <th>Receipt</th>
            <th className="text-right">{t('table_amount')}</th>
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
                  ? <a className="text-primary underline" href={expense.receiptUrl}>View</a>
                  : '—'}
              </td>
              <td className="text-right font-medium whitespace-nowrap">
                {format.number(Number(expense.amount), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
