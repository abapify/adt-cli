/**
 * TRAN (Transaction) object handler for abapGit format
 *
 * Transactions are XML-only (no source code). The abapGit format stores
 * the transaction code in TSTC, GUI attributes in TSTCC and texts in
 * the TSTCT table (wrapped in <item> elements).
 */

import { tran } from '../../../schemas/generated';
import { createHandler } from '../base';
import { isoToSapLang, sapLangToIso } from '../lang';

type TransactionLike = {
  name: string;
  description?: string;
  language?: string;
  masterLanguage?: string;
  programName?: string;
  dynproNumber?: string;
  transactionType?: string;
  guiAttributes?: {
    webGui?: boolean;
    platinumGui?: boolean;
    win32Gui?: boolean;
    macGui?: boolean;
  };
  texts?: Array<{
    language?: string;
    text?: string;
  }>;
};

export const transactionHandler = createHandler<TransactionLike, typeof tran>(
  'TRAN',
  {
    schema: tran,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_TRAN',
    serializer_version: 'v1.0.0',

    toAbapGit: buildTransactionToAbapGit,

    fromAbapGit: parseTransactionFromAbapGit,
  },
);

function normalizeItems<T>(raw: T | T[] | undefined): T[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseGuiAttributes(
  TSTCC:
    | { S_WEBGUI?: string; S_PLATIN?: string; S_WIN32?: string; S_MAC?: string }
    | undefined,
) {
  if (!TSTCC) return undefined;
  return {
    webGui: TSTCC.S_WEBGUI === 'X',
    platinumGui: TSTCC.S_PLATIN === 'X',
    win32Gui: TSTCC.S_WIN32 === 'X',
    macGui: TSTCC.S_MAC === 'X',
  };
}

function parseTransactionFromAbapGit({
  TSTC,
  TSTCC,
  TSTCT,
}: {
  TSTC?: { TCODE?: string; PGMNA?: string; DYPNO?: string; TYPE?: string };
  TSTCC?: {
    S_WEBGUI?: string;
    S_PLATIN?: string;
    S_WIN32?: string;
    S_MAC?: string;
  };
  TSTCT?: {
    item?:
      | Array<{ SPRSL?: string; TTEXT?: string }>
      | { SPRSL?: string; TTEXT?: string };
  };
}): { name: string } & Record<string, unknown> {
  const textItems = normalizeItems(TSTCT?.item);
  const firstText = textItems[0];
  return {
    name: (TSTC?.TCODE ?? '').toUpperCase(),
    type: 'TRAN/ST',
    description: firstText?.TTEXT,
    language: sapLangToIso(firstText?.SPRSL),
    masterLanguage: sapLangToIso(firstText?.SPRSL),
    programName: TSTC?.PGMNA,
    dynproNumber: TSTC?.DYPNO,
    transactionType: TSTC?.TYPE,
    guiAttributes: parseGuiAttributes(TSTCC),
    texts: textItems.map((t) => ({
      language: sapLangToIso(t.SPRSL),
      text: t.TTEXT,
    })),
  };
}

function buildTstc(obj: TransactionLike) {
  return {
    TCODE: String(obj.name ?? '').toUpperCase(),
    PGMNA: obj.programName ?? undefined,
    DYPNO: obj.dynproNumber ?? undefined,
    TYPE: obj.transactionType ?? undefined,
  };
}

function buildTstcc(
  gui: NonNullable<TransactionLike['guiAttributes']>,
  tcode: string,
) {
  return {
    TCODE: tcode,
    S_WEBGUI: gui.webGui ? 'X' : undefined,
    S_PLATIN: gui.platinumGui ? 'X' : undefined,
    S_WIN32: gui.win32Gui ? 'X' : undefined,
    S_MAC: gui.macGui ? 'X' : undefined,
  };
}

function buildTstct(
  texts: NonNullable<TransactionLike['texts']>,
  obj: TransactionLike,
) {
  if (texts.length === 0) return undefined;
  return {
    item: texts.map((t) => ({
      SPRSL: isoToSapLang(t.language || obj.masterLanguage || obj.language),
      TCODE: String(obj.name ?? '').toUpperCase(),
      TTEXT: t.text ?? '',
    })),
  };
}

function buildTransactionToAbapGit(obj: TransactionLike) {
  const texts = obj.texts ?? [];
  const tcode = String(obj.name ?? '').toUpperCase();
  return {
    TSTC: buildTstc(obj),
    TSTCC: obj.guiAttributes ? buildTstcc(obj.guiAttributes, tcode) : undefined,
    TSTCT: buildTstct(texts, obj),
  };
}
