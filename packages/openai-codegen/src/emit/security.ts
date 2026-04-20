import {
  attributeDef,
  builtinType,
  identifierExpr,
  literal,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  raw,
  type AttributeDef,
  type MethodDef,
  type MethodImpl,
  type MethodParam,
  type Statement,
} from '@abapify/abap-ast';
import type { NormalizedSpec, SecurityScheme } from '../oas/types';

export interface SecuritySupport {
  attributes: AttributeDef[];
  ctorParams: MethodParam[];
  ctorStatements: Statement[];
  publicMethods: MethodDef[];
  publicImpls: MethodImpl[];
  protectedMethods: MethodDef[];
  protectedImpls: MethodImpl[];
}

function safeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
}

/** Collect the names of security schemes actually referenced by any operation
 * or by the top-level security requirement. */
export function collectUsedSchemes(spec: NormalizedSpec): string[] {
  const names = new Set<string>();
  for (const op of spec.operations) {
    for (const req of op.security) {
      for (const k of Object.keys(req)) names.add(k);
    }
  }
  return [...names].filter((n) => spec.securitySchemes[n] !== undefined);
}

function assignMe(target: string, source: string): Statement {
  return raw({ source: `me->${target} = ${source}.` });
}

/** Build security-related declarations + ctor params + ctor statements. */
export function emitSecuritySupport(spec: NormalizedSpec): SecuritySupport {
  const names = collectUsedSchemes(spec);
  const attributes: AttributeDef[] = [];
  const ctorParams: MethodParam[] = [];
  const ctorStatements: Statement[] = [];
  const publicMethods: MethodDef[] = [];
  const publicImpls: MethodImpl[] = [];
  const protectedMethods: MethodDef[] = [];
  const protectedImpls: MethodImpl[] = [];
  let oauthAdded = false;

  for (const name of names) {
    const scheme: SecurityScheme = spec.securitySchemes[name];
    const id = safeId(name);
    switch (scheme.type) {
      case 'apiKey': {
        const attrName = `mv_api_key_${id}`;
        attributes.push(
          attributeDef({
            name: attrName,
            type: builtinType({ name: 'string' }),
            visibility: 'protected',
          }),
        );
        const paramName = `iv_api_key_${id}`;
        ctorParams.push(
          methodParam({
            paramKind: 'importing',
            name: paramName,
            typeRef: builtinType({ name: 'string' }),
            optional: true,
          }),
        );
        ctorStatements.push(assignMe(attrName, paramName));
        break;
      }
      case 'http': {
        if (scheme.scheme === 'bearer') {
          const attrName = `mv_bearer_${id}`;
          attributes.push(
            attributeDef({
              name: attrName,
              type: builtinType({ name: 'string' }),
              visibility: 'protected',
            }),
          );
          const paramName = `iv_bearer_${id}`;
          ctorParams.push(
            methodParam({
              paramKind: 'importing',
              name: paramName,
              typeRef: builtinType({ name: 'string' }),
              optional: true,
            }),
          );
          ctorStatements.push(assignMe(attrName, paramName));
          // Public setter: set_bearer_token (per-scheme suffixed).
          const setter = `set_bearer_token_${id}`;
          publicMethods.push(
            methodDef({
              name: setter,
              visibility: 'public',
              params: [
                methodParam({
                  paramKind: 'importing',
                  name: 'iv_token',
                  typeRef: builtinType({ name: 'string' }),
                }),
              ],
            }),
          );
          publicImpls.push(
            methodImpl({
              name: setter,
              body: [assignMe(attrName, 'iv_token')],
            }),
          );
          // Also emit the generic name once when there's only one bearer.
          if (!publicMethods.some((m) => m.name === 'set_bearer_token')) {
            publicMethods.push(
              methodDef({
                name: 'set_bearer_token',
                visibility: 'public',
                params: [
                  methodParam({
                    paramKind: 'importing',
                    name: 'iv_token',
                    typeRef: builtinType({ name: 'string' }),
                  }),
                ],
              }),
            );
            publicImpls.push(
              methodImpl({
                name: 'set_bearer_token',
                body: [assignMe(attrName, 'iv_token')],
              }),
            );
          }
        } else if (scheme.scheme === 'basic') {
          const userAttr = `mv_basic_${id}_user`;
          const passAttr = `mv_basic_${id}_password`;
          attributes.push(
            attributeDef({
              name: userAttr,
              type: builtinType({ name: 'string' }),
              visibility: 'protected',
            }),
          );
          attributes.push(
            attributeDef({
              name: passAttr,
              type: builtinType({ name: 'string' }),
              visibility: 'protected',
            }),
          );
          publicMethods.push(
            methodDef({
              name: 'set_basic_auth',
              visibility: 'public',
              params: [
                methodParam({
                  paramKind: 'importing',
                  name: 'iv_user',
                  typeRef: builtinType({ name: 'string' }),
                }),
                methodParam({
                  paramKind: 'importing',
                  name: 'iv_password',
                  typeRef: builtinType({ name: 'string' }),
                }),
              ],
            }),
          );
          publicImpls.push(
            methodImpl({
              name: 'set_basic_auth',
              body: [
                assignMe(userAttr, 'iv_user'),
                assignMe(passAttr, 'iv_password'),
              ],
            }),
          );
        }
        break;
      }
      case 'oauth2':
      case 'openIdConnect': {
        if (!oauthAdded) {
          oauthAdded = true;
          protectedMethods.push(
            methodDef({
              name: 'on_authorize',
              visibility: 'protected',
              params: [
                methodParam({
                  paramKind: 'importing',
                  name: 'io_request',
                  typeRef: namedTypeRef({
                    name: 'REF TO if_web_http_request',
                  }),
                }),
              ],
            }),
          );
          protectedImpls.push(
            methodImpl({
              name: 'on_authorize',
              body: [
                raw({ source: `" override me` }),
                raw({ source: `RETURN.` }),
              ],
            }),
          );
        }
        break;
      }
    }
  }

  // Silence unused imports.
  void identifierExpr;
  void literal;

  return {
    attributes,
    ctorParams,
    ctorStatements,
    publicMethods,
    publicImpls,
    protectedMethods,
    protectedImpls,
  };
}
