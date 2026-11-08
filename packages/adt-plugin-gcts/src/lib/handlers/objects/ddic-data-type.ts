import type { DataType } from '../../../schemas/generated/doma-v1';

const dataTypes = {
  ACCP: true,
  CHAR: true,
  CLNT: true,
  CUKY: true,
  CURR: true,
  DF16_DEC: true,
  DF16_RAW: true,
  DF16_SCL: true,
  DECFLOAT16: true,
  DF34_DEC: true,
  DF34_RAW: true,
  DF34_SCL: true,
  DECFLOAT34: true,
  DATS: true,
  DATN: true,
  DEC: true,
  FLTP: true,
  GEOM_EWKB: true,
  INT1: true,
  INT2: true,
  INT4: true,
  INT8: true,
  LANG: true,
  LCHR: true,
  LRAW: true,
  NUMC: true,
  PREC: true,
  QUAN: true,
  RAW: true,
  RAWSTRING: true,
  SSTRING: true,
  STRING: true,
  TIMS: true,
  TIMN: true,
  UNIT: true,
  UTCLONG: true,
  VARC: true,
} satisfies Record<DataType, true>;

/** Validate the open ADT type code before writing the narrower AFF enum. */
export function affDataType(value: unknown): DataType {
  if (isAffDataType(value)) return value;
  throw new Error(`Unsupported AFF DDIC data type: ${String(value)}`);
}

function isAffDataType(value: unknown): value is DataType {
  return typeof value === 'string' && Object.hasOwn(dataTypes, value);
}
