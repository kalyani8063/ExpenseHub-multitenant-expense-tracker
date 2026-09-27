import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { TitleBar } from '@/features/dashboard/TitleBar';
import { getOrganizationExpenseSummary } from '@/features/expenses/ExpenseQueries';
import { getExpenseTenant } from '@/features/expenses/ExpenseTenant';
import { Link } from '@/libs/I18nNavigation';

export default async function DashboardIndexPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: 'DashboardIndexPage',
  });
  const format = await getFormatter();

  // Tenant-scoped by `getExpenseTenant()`, the caller cannot widen the scope.
  const [summary, { isAdmin }] = await Promise.all([
    getOrganizationExpenseSummary(),
    getExpenseTenant(),
  ]);
  const topCategory = summary.byCategory[0];

  return (
    <>
      <TitleBar
        title={t('title_bar')}
        description={isAdmin ? t('title_bar_description') : t('title_bar_description_member')}
      />

      <div className="
        grid grid-cols-1 gap-4
        sm:grid-cols-3
      "
      >
        <div className="rounded-md bg-card p-5">
          <div className="text-sm font-medium text-muted-foreground">
            {t('stat_total_label')}
          </div>
          <div className="mt-1 text-3xl font-bold">
            {format.number(summary.totalAmount, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="rounded-md bg-card p-5">
          <div className="text-sm font-medium text-muted-foreground">
            {t('stat_count_label')}
          </div>
          <div className="mt-1 text-3xl font-bold">{summary.count}</div>
        </div>

        <div className="rounded-md bg-card p-5">
          <div className="text-sm font-medium text-muted-foreground">
            {t('stat_top_category_label')}
          </div>
          <div className="mt-1 text-3xl font-bold">
            {topCategory ? topCategory.category : '—'}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md bg-card p-5">
        <div className="text-lg font-semibold">{t('breakdown_title')}</div>

        {summary.byCategory.length === 0
          ? (
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                {t('empty_state')}
              </p>
            )
          : (
              <ul className="mt-4 flex flex-col gap-y-3">
                {summary.byCategory.map(entry => (
                  <li
                    key={entry.category}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{entry.category}</span>
                    <span className="text-muted-foreground">
                      {format.number(entry.amount, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}

        <Link
          href="/dashboard/expenses"
          className="
            mt-5 inline-block text-sm font-semibold text-primary
            hover:underline
          "
        >
          {t('cta_view_expenses')}
        </Link>
      </div>
    </>
  );
};
