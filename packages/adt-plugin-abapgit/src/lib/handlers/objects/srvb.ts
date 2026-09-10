/**
 * SRVB (RAP Service Binding) object handler for abapGit format
 *
 * Unlike BDEF/SRVD, SRVB is **metadata-only** — there is no source text.
 * Supports BOTH formats:
 *   - Legacy XML (default): `<name>.srvb.xml` with SKEY + BINDING block
 *   - AFF JSON:             `<name>.srvb.json` with formatVersion + header
 *
 * File layout (legacy):
 *   src/zui_foo.srvb.xml     — metadata only
 *
 * File layout (AFF):
 *   src/zui_foo.srvb.json    — metadata only
 *
 * Mirrors the minimal-block approach used by
 * zcl_abapgit_object_srvb (abapGit upstream serialiser).
 */

import { srvb } from '../../../schemas/generated';
import { createHandler, type SerializedFile } from '../base';
import { buildAffJson } from '../source-resolver';
import type { FormatSerializeOptions } from '@abapify/adt-plugin';

// SRVB is not derived from AdkObject — we cast to the minimal handler shape
// via the string form of createHandler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SrvbLike = any;

export const serviceBindingHandler = createHandler<SrvbLike, typeof srvb>(
  'SRVB',
  {
    schema: srvb,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SRVB',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
      SKEY: {
        TYPE: 'SRVB',
        NAME: String(obj?.name ?? '').toUpperCase(),
      },
      BINDING: {
        TYPE: 'odataV4',
        VERSION: '4',
        CATEGORY: 'odata_v4_ui',
      },
    }),

    fromAbapGit: ({ SKEY }) => ({
      name: String(SKEY?.NAME ?? '').toUpperCase(),
    }),

    fromAffJson: (json) => {
      const header = (
        json as {
          header?: {
            description?: string;
            originalLanguage?: string;
            abapLanguageVersion?: string;
          };
        }
      )?.header;
      const binding = (
        json as {
          binding?: {
            bindingType?: string;
            bindingTypeCategory?: string;
            services?: unknown[];
          };
        }
      )?.binding;
      return {
        // Filename-derived name (injected by deserializer)
        name: '',
        description: header?.description,
        originalLanguage: header?.originalLanguage,
        abapLanguageVersion: header?.abapLanguageVersion,
        // Preserve binding metadata for round-trip
        bindingType: binding?.bindingType,
        bindingTypeCategory: binding?.bindingTypeCategory,
        services: binding?.services,
      };
    },

    // Metadata-only: emit either .xml (legacy) or .json (AFF) depending on format option.
    async serialize(
      object,
      ctx,
      options?: FormatSerializeOptions,
    ): Promise<SerializedFile[]> {
      const objectName = ctx.getObjectName(object);

      // AFF JSON format
      if (options?.format === 'aff') {
        const bindingType = String(
          object?.bindingType ?? object?.data?.bindingType ?? 'odataV4',
        );
        const bindingTypeCategory = String(
          object?.bindingTypeCategory ??
            object?.data?.bindingTypeCategory ??
            'odata_v4_ui',
        );
        const services = object?.services ?? object?.data?.services ?? [];
        const jsonContent = buildAffJson(
          String(object?.description ?? object?.name ?? ''),
          String(object?.originalLanguage ?? 'en'),
          object?.abapLanguageVersion,
          {
            binding: {
              bindingType,
              bindingTypeCategory,
              ...(Array.isArray(services) && services.length > 0
                ? { services }
                : {}),
            },
          },
        );
        return [
          ctx.createFile(
            `${objectName}.${ctx.fileExtension}.json`,
            jsonContent,
          ),
        ];
      }

      // Default: legacy XML format
      const xmlContent = ctx.toAbapGitXml(object);
      return [
        ctx.createFile(`${objectName}.${ctx.fileExtension}.xml`, xmlContent),
      ];
    },
  },
);
