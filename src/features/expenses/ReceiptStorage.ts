import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Env } from '@/libs/Env';

const allowedReceiptTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const maximumReceiptSize = 10 * 1024 * 1024;

const signedUrlLifetimeSeconds = 15 * 60;

const s3Prefix = 's3://';

// Credentials come from Application Default Credentials: the VM's attached
// service account on Compute Engine, or `gcloud auth application-default login`
// locally. No key file is stored in the app.
let storageClient: S3Client | undefined;

const getStorage = () => {
  storageClient ??= new S3Client({ region: 'ap-south-1' });

  return storageClient;
};

const toSafeOrganizationId = (organizationId: string) =>
  organizationId.replace(/[^\w-]/g, '_');

const validateReceipt = (receipt: File): string => {
  const extension = allowedReceiptTypes[receipt.type];

  if (!extension) {
    throw new Error('Receipts must be a JPG, PNG, or WebP image.');
  }

  if (receipt.size > maximumReceiptSize) {
    throw new Error('Receipts must be 10 MB or smaller.');
  }

  return extension;
};

/**
 * Stores a receipt and returns the value to persist in `expense.receipt_url`.
 *
 * With `GCS_BUCKET_NAME` set, the file goes to a private Cloud Storage bucket
 * under `receipts/<organizationId>/` and a `gs://` reference is returned.
 * Without it (local development), the file is written to `public/uploads`.
 *
 * The organization ID comes from the authenticated server session, never from
 * form input.
 * @param receipt The uploaded image.
 * @param organizationId The active organization from `getExpenseTenant()`.
 * @returns The stored receipt reference.
 */
export const saveReceipt = async (
  receipt: File,
  organizationId: string,
): Promise<string> => {
  const extension = validateReceipt(receipt);
  const safeOrganizationId = toSafeOrganizationId(organizationId);
  const filename = `${randomUUID()}.${extension}`;
  const contents = Buffer.from(await receipt.arrayBuffer());

  if (Env.S3_BUCKET_NAME) {
    const objectName = `receipts/${safeOrganizationId}/${filename}`;

    await getStorage().send(
      new PutObjectCommand({
        Bucket: Env.S3_BUCKET_NAME,
        Key: objectName,
        Body: contents,
        ContentType: receipt.type,
      }),
    );

    return `${s3Prefix}${Env.S3_BUCKET_NAME}/${objectName}`;
  }

  const receiptDirectory = path.join(
    process.cwd(),
    'public',
    'uploads',
    'receipts',
    safeOrganizationId,
  );

  await mkdir(receiptDirectory, { recursive: true });
  await writeFile(path.join(receiptDirectory, filename), contents);

  return `/uploads/receipts/${safeOrganizationId}/${filename}`;
};

/**
 * Turns a stored receipt reference into a URL the browser can open.
 *
 * Cloud Storage receipts live in a private bucket, so a short-lived signed URL
 * is issued. As defense in depth, a `gs://` reference outside the current
 * organization's prefix is refused even though the row was already fetched
 * with a tenant-scoped query.
 * @param receiptUrl The value stored in `expense.receipt_url`.
 * @param organizationId The active organization from `getExpenseTenant()`.
 * @returns A viewable URL, or `null` when the receipt cannot be shown.
 */
export const resolveReceiptUrl = async (
  receiptUrl: string,
  organizationId: string,
): Promise<string | null> => {
  if (!receiptUrl.startsWith(s3Prefix)) {
    return receiptUrl;
  }

  const [bucketName, ...objectParts] = receiptUrl
    .slice(s3Prefix.length)
    .split('/');
  const objectName = objectParts.join('/');
  const tenantPrefix = `receipts/${toSafeOrganizationId(organizationId)}/`;

  if (!bucketName || !objectName.startsWith(tenantPrefix)) {
    return null;
  }

  return getSignedUrl(
    getStorage(),
    new GetObjectCommand({ Bucket: bucketName, Key: objectName }),
    { expiresIn: signedUrlLifetimeSeconds },
  );
};
