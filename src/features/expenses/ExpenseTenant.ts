import { auth } from '@clerk/nextjs/server';
import { ORG_ROLE } from '@/types/Auth';

export type ExpenseTenant = {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
};

/**
 * Resolves the tenant the current request belongs to.
 *
 * This is the ONLY place where `organizationId`, `ownerId` and the caller's
 * role are allowed to come from: all three are read from the Clerk session on
 * the server and can never be influenced by user input. Every read and write
 * on the `expense` table must go through this helper.
 * @returns The active organization id, the signed-in user id, and whether the
 * user is an admin of that organization.
 * @throws When the request has no signed-in user or no active organization.
 */
export const getExpenseTenant = async (): Promise<ExpenseTenant> => {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    throw new Error('Unauthenticated: no signed-in user for this request.');
  }

  if (!orgId) {
    throw new Error('No active organization: expenses are organization-scoped.');
  }

  return {
    organizationId: orgId,
    userId,
    isAdmin: orgRole === ORG_ROLE.ADMIN,
  };
};
