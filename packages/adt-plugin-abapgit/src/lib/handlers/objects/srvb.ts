/**
 * SRVB (RAP Service Binding) object handler for abapGit format
 *
 * Unlike BDEF/SRVD, SRVB is **metadata-only** — there is no `.abdl`/
 * `.asrvd`-style source text. The handler writes a single
 * `<name>.srvb.xml` file carrying a minimal SKEY + BINDING block.
 *
 * File layout:
 *   src/zui_foo.srvb.xml     — metadata only
 *
 * Mirrors the minimal-block approach used by
 * zcl_abapgit_object_srvb (abapGit upstream serialiser).
 */

import type { AdkServiceBinding } from '@abapify/adk';
import { srvb } from '../../../schemas/generated';
import { createHandler, type SerializedFile } from '../base';

// SRVB is not derived from AdkObject — we cast to the minimal handler shape
// via the string form of createHandler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SrvbLike = AdkServiceBinding | any;

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

    // Metadata-only: emit just <name>.srvb.xml (no source file).
    async serialize(object, ctx): Promise<SerializedFile[]> {
      const objectName = ctx.getObjectName(object);
      const xmlContent = ctx.toAbapGitXml(object);
      return [
        ctx.createFile(`${objectName}.${ctx.fileExtension}.xml`, xmlContent),
      ];
    },
  },
);
