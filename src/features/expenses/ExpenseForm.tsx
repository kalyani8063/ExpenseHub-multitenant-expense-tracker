'use client';

import type { CreateExpenseState } from './ExpenseActions';
import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createExpenseAction } from './ExpenseActions';

const initialState: CreateExpenseState = { status: 'idle' };

const fieldClassName = `
  h-9 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-xs
  outline-none
  focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50
`;

export const ExpenseForm = () => {
  const t = useTranslations('ExpensesPage');
  const [state, formAction, isPending] = useActionState(
    createExpenseAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-md bg-card p-5">
      <div className="text-lg font-semibold">{t('form_title')}</div>

      <div className="
        mt-4 grid grid-cols-1 gap-4
        sm:grid-cols-2
        lg:grid-cols-4
      "
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('form_amount_label')}
          <input
            className={fieldClassName}
            type="number"
            name="amount"
            min="0"
            step="0.01"
            required
            placeholder={t('form_amount_placeholder')}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('form_category_label')}
          <input
            className={fieldClassName}
            type="text"
            name="category"
            maxLength={64}
            required
            placeholder={t('form_category_placeholder')}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('form_date_label')}
          <input className={fieldClassName} type="date" name="date" required />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t('form_description_label')}
          <input
            className={fieldClassName}
            type="text"
            name="description"
            maxLength={500}
            placeholder={t('form_description_placeholder')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
  Receipt image (optional)
  <input
    className={fieldClassName}
    type="file"
    name="receipt"
    accept="image/*"
  />
</label>
      </div>

      <div className="mt-4 flex items-center gap-x-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? t('form_submitting') : t('form_submit')}
        </Button>

        {state.status === 'error' && (
          <p className="text-sm font-medium text-destructive">
            {t('form_error')}
          </p>
        )}

        {state.status === 'success' && (
          <p className="text-sm font-medium text-muted-foreground">
            {t('form_success')}
          </p>
        )}
      </div>
    </form>
  );
};
