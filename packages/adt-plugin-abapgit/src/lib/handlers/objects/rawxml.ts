/**
 * Raw XML object handlers for abapGit format
 *
 * Upstream serializers for these types call `io_xml->set_raw()`, which
 * replaces the asx:abap envelope with the native SAP XML document:
 * the file is `<abapGit ...><SAP_ROOT>...</SAP_ROOT></abapGit>`.
 * Handlers map the `raw` record (SAP root element name → content)
 * onto the document verbatim via the wildcard schema.
 */

import type { AbapGitSchema } from '../base';
import { createHandler, unwrapData } from '../base';
import { formatAbapGitXml } from '../xml-format';
import {
  ecat,
  ecsd,
  ecsp,
  ectc,
  ectd,
  ecvo,
  fdt0,
  sfpi,
  ssfo,
} from '../../../schemas/generated';

type RawXmlObject = {
  name: string;
  /** SAP XML root element name → parsed content (arbitrary structure) */
  raw?: Record<string, unknown>;
};

function createRawXmlHandler<TSchema extends AbapGitSchema<unknown, unknown>>(
  type: string,
  schema: TSchema,
) {
  return createHandler<RawXmlObject, TSchema>(type, {
    schema,
    version: 'v1.0.0',
    serializer: `LCL_OBJECT_${type}`,
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<RawXmlObject>(raw);
      return { ...(obj.raw ?? {}) };
    },

    fromAbapGit: (values) => ({
      name: '',
      raw: { ...(values as Record<string, unknown>) },
    }),

    serialize: async (obj, ctx) => {
      const xml = schema.build({
        ...(obj.raw ?? {}),
        version: 'v1.0.0',
        serializer: `LCL_OBJECT_${type}`,
        serializer_version: 'v1.0.0',
      } as never);
      return [
        ctx.createFile(
          `${ctx.getObjectName(obj)}.${ctx.fileExtension}.xml`,
          formatAbapGitXml(xml),
        ),
      ];
    },
  });
}

export const ecatHandler = createRawXmlHandler('ECAT', ecat);
export const ecsdHandler = createRawXmlHandler('ECSD', ecsd);
export const ecspHandler = createRawXmlHandler('ECSP', ecsp);
export const ectcHandler = createRawXmlHandler('ECTC', ectc);
export const ectdHandler = createRawXmlHandler('ECTD', ectd);
export const ecvoHandler = createRawXmlHandler('ECVO', ecvo);
export const fdt0Handler = createRawXmlHandler('FDT0', fdt0);
export const sfpiHandler = createRawXmlHandler('SFPI', sfpi);
export const ssfoHandler = createRawXmlHandler('SSFO', ssfo);
