import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const allowedReceiptTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const maximumReceiptSize = 10 * 1024 * 1024;

/**
 * Stores a receipt locally during development. The organization ID comes from
 * the authenticated server session, never from form input.
 */
export const saveReceiptLocally = async (
  receipt: File,
  organizationId: string,
): Promise<string> => {
  const extension = allowedReceiptTypes[receipt.type];

  if (!extension) {
    throw new Error('Receipts must be a JPG, PNG, or WebP image.');
  }

  if (receipt.size > maximumReceiptSize) {
    throw new Error('Receipts must be 10 MB or smaller.');
  }

  const safeOrganizationId = organizationId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const receiptDirectory = path.join(
    process.cwd(),
    'public',
    'uploads',
    'receipts',
    safeOrganizationId,
  );
  const filename = `${randomUUID()}.${extension}`;

  await mkdir(receiptDirectory, { recursive: true });
  await writeFile(
    path.join(receiptDirectory, filename),
    Buffer.from(await receipt.arrayBuffer()),
  );

  return `/uploads/receipts/${safeOrganizationId}/${filename}`;
};
