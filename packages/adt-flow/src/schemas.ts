import { z } from 'zod';
import { safeRelativePath } from './repository';

const positiveBoundedInt = z.number().int().min(1).max(32);

export const flowConfigSchema = z
  .object({
    format: z
      .object({
        id: z.string().trim().min(1),
        options: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
          .optional(),
      })
      .strict(),
    include: z
      .object({
        objectTypes: z.array(z.string().trim().min(1)).optional(),
        packages: z.array(z.string().trim().min(1)).optional(),
        applicationComponents: z.array(z.string().trim().min(1)).optional(),
      })
      .strict()
      .optional(),
    concurrency: z
      .object({
        metadata: positiveBoundedInt.optional(),
        sources: positiveBoundedInt.optional(),
      })
      .strict()
      .optional(),
    maxSourceBytes: z
      .number()
      .int()
      .min(1)
      .max(64 * 1024 * 1024)
      .optional(),
  })
  .strict();

export const ownedSourceFileSchema = z
  .object({
    path: z.string().min(1),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    role: z.literal('source'),
    sourceComponent: z.string().min(1),
  })
  .refine(
    ({ path }) => {
      try {
        safeRelativePath(path);
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        'Owned source file path must be a safe repository-relative path.',
      path: ['path'],
    },
  );

export const ownedMetadataFileSchema = z
  .object({
    path: z.string().min(1),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    role: z.literal('metadata'),
  })
  .refine(
    ({ path }) => {
      try {
        safeRelativePath(path);
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        'Owned metadata file path must be a safe repository-relative path.',
      path: ['path'],
    },
  );

export const ownedFileSchema = z.union([
  ownedSourceFileSchema,
  ownedMetadataFileSchema,
]);

export const sourceSelectionSchema = z.object({
  component: z.string().min(1),
  versionId: z.string().min(1),
  sourceUri: z.string().min(1),
});

export const transportObjectInventoryEntrySchema = z.object({
  pgmid: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  wbtype: z.string().min(1).optional(),
  uri: z.string().startsWith('/sap/bc/adt/').optional(),
  objFunc: z.string(),
  sourceTransport: z.string().min(1),
});

export const objectDescriptorSchema = z
  .object({
    schemaVersion: z.literal(1),
    formatVersion: z.literal(1),
    identity: z.object({
      canonical: z.string().min(1),
      pgmid: z.string().min(1),
      type: z.string().min(1),
      name: z.string().min(1),
    }),
    state: z.enum(['present', 'deleted']),
    packagePath: z.array(z.string()),
    selections: z.array(sourceSelectionSchema),
    ownedFiles: z.array(ownedFileSchema),
    configDigest: z.string().regex(/^[a-f0-9]{64}$/),
    formatDigest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .superRefine((value, ctx) => {
    const { identity } = value;
    const expected = `${identity.pgmid}/${identity.type}/${identity.name}`;
    if (identity.canonical !== expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Descriptor canonical identity does not match pgmid/type/name.',
        path: ['identity', 'canonical'],
      });
    }
    if (
      value.state === 'deleted' &&
      (value.selections.length > 0 || value.ownedFiles.length > 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Deleted descriptors must have empty selections and ownedFiles.',
        path: ['state'],
      });
    }
  });

export const transportDescriptorSchema = z.object({
  schemaVersion: z.literal(1),
  requestedTransports: z.array(z.string().min(1)),
  scopeTransports: z.array(z.string().min(1)),
  inventory: z.array(transportObjectInventoryEntrySchema).optional(),
  objects: z.array(z.string().min(1)),
  configDigest: z.string().regex(/^[a-f0-9]{64}$/),
  formatDigest: z.string().regex(/^[a-f0-9]{64}$/),
  /** Present only when at least one object was deliberately omitted. */
  incomplete: z.literal(true).optional(),
});

export type ObjectDescriptor = z.infer<typeof objectDescriptorSchema>;
export type TransportDescriptor = z.infer<typeof transportDescriptorSchema>;
export type OwnedFile = z.infer<typeof ownedFileSchema>;
