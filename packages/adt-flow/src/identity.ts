import type { ObjectDescriptor } from './schemas';
import { posix } from 'node:path';
import type { TransportSourceManifestObject } from '@abapify/adk';
import { AdtFlowError } from './types';
import type { FlowObjectIdentity } from './types';

function normalized(value: string): string {
  return value.trim().toUpperCase();
}

export function objectIdentity(
  object: TransportSourceManifestObject,
): FlowObjectIdentity {
  const pgmid = normalized(object.pgmid);
  const normalizedType = normalized(object.type);
  const type = normalizedType.split('/')[0];
  const name = normalized(object.name);
  return {
    ...object,
    pgmid,
    type,
    name,
    canonical: `${pgmid}/${type}/${name}`,
  };
}

export function encodeObjectName(name: string): string {
  const normalizedName = normalized(name);
  if (/^[A-Z0-9_$]+$/.test(normalizedName)) {
    return normalizedName.toLowerCase();
  }
  return `~${Buffer.from(normalizedName, 'utf8').toString('base64url')}`;
}

export function objectDescriptorPath(identity: FlowObjectIdentity): string {
  const type = identity.type.toUpperCase();
  return posix.join(
    '.adt',
    'objects',
    type,
    `${encodeObjectName(identity.name)}.${type.toLowerCase()}.adt.json`,
  );
}

export function transportDescriptorPath(transport: string): string {
  const normalizedTransport = normalized(transport);
  if (!/^[A-Z0-9]+$/.test(normalizedTransport)) {
    throw new AdtFlowError(
      'invalid_input',
      'Transport identifier contains invalid characters.',
      { transport: normalizedTransport },
    );
  }
  return posix.join('.adt', 'tr', `${normalizedTransport}.json`);
}

export function createTombstoneDescriptor(
  identity: FlowObjectIdentity,
  previous: ObjectDescriptor | undefined,
  configDigest: string,
  formatDigest: string,
): ObjectDescriptor {
  return {
    schemaVersion: 1,
    formatVersion: 1,
    identity: {
      canonical: identity.canonical,
      pgmid: identity.pgmid,
      type: identity.type,
      name: identity.name,
    },
    state: 'deleted',
    packagePath: previous?.packagePath ?? [],
    selections: [],
    ownedFiles: [],
    configDigest,
    formatDigest,
  };
}
