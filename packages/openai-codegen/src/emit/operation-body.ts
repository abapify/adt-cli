import {
  append,
  assign,
  binOp,
  builtinType,
  call,
  constructorExpr,
  dataDecl,
  identifierExpr,
  ifStmt,
  literal,
  methodCallExpr,
  namedTypeRef,
  raise,
  raw,
  returnStmt,
  stringTemplate,
  type Expression,
  type NamedArg,
  type Statement,
  type StringTemplatePart,
} from '@abapify/abap-ast';
import type {
  NormalizedOperation,
  NormalizedSpec,
  SecurityScheme,
} from '../oas/types';
import { pickRequestMediaType, type ParamTranslation } from './parameters';
import type { ReturnShape } from './responses';

export interface BuildBodyContext {
  readonly op: NormalizedOperation;
  readonly methodName: string;
  readonly params: readonly ParamTranslation[];
  readonly body?: { abapName: string; mediaType: string };
  readonly ret: ReturnShape;
  readonly spec: NormalizedSpec;
  readonly exceptionClassName: string;
}

/** Map an HTTP verb to the corresponding `if_web_http_client=>xxx` constant. */
function httpMethodConstant(method: string): string {
  const m = method.toLowerCase();
  switch (m) {
    case 'get':
    case 'post':
    case 'put':
    case 'delete':
    case 'patch':
    case 'head':
    case 'options':
      return `if_web_http_client=>${m}`;
    default:
      // Fallback: use the uppercase verb as a string literal via identifier.
      return `if_web_http_client=>${m}`;
  }
}

/** Utility: lv_name = <string> */
function declString(name: string): Statement {
  return dataDecl({ name, type: builtinType({ name: 'string' }) });
}

function declInt(name: string): Statement {
  return dataDecl({ name, type: builtinType({ name: 'i' }) });
}

function declRef(name: string, to: string): Statement {
  return dataDecl({ name, type: namedTypeRef({ name: `REF TO ${to}` }) });
}

function id(name: string): Expression {
  return identifierExpr({ name });
}

function str(value: string): Expression {
  return literal({ literalKind: 'string', value });
}

function arg(name: string, value: Expression): NamedArg {
  return { name, value };
}

/** Build an `|{ text }|` string template substituting `{name}` placeholders with
 * `me->_encode_path( iv_xxx )` calls. */
function buildPathTemplate(
  path: string,
  pathParamAbapNames: ReadonlyMap<string, string>,
): Expression {
  const parts: StringTemplatePart[] = [];
  const re = /\{([^}]+)\}/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path)) !== null) {
    if (m.index > lastIndex) {
      parts.push({
        partKind: 'text',
        text: path.slice(lastIndex, m.index),
      });
    }
    const specName = m[1];
    const abapName = pathParamAbapNames.get(specName);
    if (abapName) {
      parts.push({
        partKind: 'expr',
        expr: methodCallExpr({
          receiver: id('me'),
          method: '_encode_path',
          callKind: 'instance',
          args: [arg('iv_value', id(abapName))],
        }),
      });
    } else {
      // Unknown placeholder → leave literal.
      parts.push({ partKind: 'text', text: `{${specName}}` });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < path.length) {
    parts.push({ partKind: 'text', text: path.slice(lastIndex) });
  }
  if (parts.length === 0) {
    parts.push({ partKind: 'text', text: path });
  }
  return stringTemplate({ parts });
}

/** Resolve the security schemes that apply to an operation. */
function resolveSecurity(
  ctx: BuildBodyContext,
): Array<{ name: string; scheme: SecurityScheme }> {
  const reqs = ctx.op.security;
  const out: Array<{ name: string; scheme: SecurityScheme }> = [];
  const seen = new Set<string>();
  for (const req of reqs) {
    for (const name of Object.keys(req)) {
      if (seen.has(name)) continue;
      const scheme = ctx.spec.securitySchemes[name];
      if (!scheme) continue;
      out.push({ name, scheme });
      seen.add(name);
    }
  }
  return out;
}

function securityAttrNameFor(scheme: SecurityScheme, name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  switch (scheme.type) {
    case 'apiKey':
      return `mv_api_key_${safe}`;
    case 'http':
      if (scheme.scheme === 'bearer') return `mv_bearer_${safe}`;
      if (scheme.scheme === 'basic') return `mv_basic_${safe}`;
      return `mv_http_${safe}`;
    default:
      return `mv_sec_${safe}`;
  }
}

export function buildOperationBody(ctx: BuildBodyContext): Statement[] {
  const stmts: Statement[] = [];

  // Local variable declarations.
  stmts.push(declRef('lo_client', 'if_web_http_client'));
  stmts.push(declRef('lo_req', 'if_web_http_request'));
  stmts.push(declRef('lo_resp', 'if_web_http_response'));
  stmts.push(declString('lv_url'));
  stmts.push(declString('lv_path'));
  stmts.push(declString('lv_body'));
  stmts.push(declInt('lv_status'));
  stmts.push(declString('lv_payload'));
  stmts.push(
    dataDecl({
      name: 'lt_query',
      type: namedTypeRef({ name: 'string_table' }),
    }),
  );

  // lo_client = me->_build_client( iv_destination = mv_destination ).
  stmts.push(
    assign({
      target: id('lo_client'),
      value: methodCallExpr({
        receiver: id('me'),
        method: '_build_client',
        callKind: 'instance',
        args: [arg('iv_destination', id('mv_destination'))],
      }),
    }),
  );

  // lo_req = lo_client->get_http_request( ).
  stmts.push(
    assign({
      target: id('lo_req'),
      value: methodCallExpr({
        receiver: id('lo_client'),
        method: 'get_http_request',
        callKind: 'instance',
      }),
    }),
  );

  // Path parameters → lv_path = |...|.
  const pathParams = ctx.params.filter((p) => p.source.in === 'path');
  const pathMap = new Map<string, string>();
  for (const p of pathParams) pathMap.set(p.source.name, p.abapName);
  stmts.push(
    assign({
      target: id('lv_path'),
      value: buildPathTemplate(ctx.op.path, pathMap),
    }),
  );

  // Query parameters → APPEND ... TO lt_query.
  const queryParams = ctx.params.filter((p) => p.source.in === 'query');
  for (const p of queryParams) {
    const callExpr = methodCallExpr({
      receiver: id('me'),
      method: '_serialize_query_param',
      callKind: 'instance',
      args: [
        arg('iv_name', str(p.source.name)),
        arg(
          'iv_value',
          // Use a string template to coerce arbitrary typed values into a
          // printable string without relying on implicit conversions.
          stringTemplate({
            parts: [{ partKind: 'expr', expr: id(p.abapName) }],
          }),
        ),
        arg('iv_style', str(p.source.style ?? 'form')),
        arg(
          'iv_explode',
          p.source.explode ? id('abap_true') : id('abap_false'),
        ),
      ],
    });
    stmts.push(append({ value: callExpr, table: id('lt_query') }));
  }

  // Header parameters → lo_req->set_header_field.
  const headerParams = ctx.params.filter((p) => p.source.in === 'header');
  for (const p of headerParams) {
    stmts.push(
      call({
        receiver: id('lo_req'),
        method: 'set_header_field',
        callKind: 'instance',
        args: [
          arg('i_name', str(p.source.name)),
          arg(
            'i_value',
            stringTemplate({
              parts: [{ partKind: 'expr', expr: id(p.abapName) }],
            }),
          ),
        ],
      }),
    );
  }

  // Request body.
  if (ctx.body) {
    const mt = ctx.body.mediaType;
    const isJson = mt === 'application/json' || mt.endsWith('+json');
    if (isJson) {
      stmts.push(
        assign({
          target: id('lv_body'),
          value: methodCallExpr({
            receiver: id('me'),
            method: `_ser_${ctx.methodName}`,
            callKind: 'instance',
            args: [arg('is_body', id(ctx.body.abapName))],
          }),
        }),
      );
      stmts.push(
        call({
          receiver: id('lo_req'),
          method: 'set_text',
          callKind: 'instance',
          args: [arg('i_text', id('lv_body'))],
        }),
      );
    } else {
      // Binary body.
      stmts.push(
        call({
          receiver: id('lo_req'),
          method: 'set_binary',
          callKind: 'instance',
          args: [arg('i_data', id(ctx.body.abapName))],
        }),
      );
    }
    stmts.push(
      call({
        receiver: id('lo_req'),
        method: 'set_header_field',
        callKind: 'instance',
        args: [arg('i_name', str('content-type')), arg('i_value', str(mt))],
      }),
    );
  }

  // Security auto-injection.
  for (const { name, scheme } of resolveSecurity(ctx)) {
    const attr = securityAttrNameFor(scheme, name);
    switch (scheme.type) {
      case 'apiKey': {
        if (scheme.in === 'header') {
          stmts.push(
            call({
              receiver: id('lo_req'),
              method: 'set_header_field',
              callKind: 'instance',
              args: [arg('i_name', str(scheme.name)), arg('i_value', id(attr))],
            }),
          );
        } else if (scheme.in === 'query') {
          stmts.push(
            append({
              value: stringTemplate({
                parts: [
                  { partKind: 'text', text: `${scheme.name}=` },
                  { partKind: 'expr', expr: id(attr) },
                ],
              }),
              table: id('lt_query'),
            }),
          );
        }
        break;
      }
      case 'http': {
        if (scheme.scheme === 'bearer') {
          stmts.push(
            call({
              receiver: id('lo_req'),
              method: 'set_header_field',
              callKind: 'instance',
              args: [
                arg('i_name', str('authorization')),
                arg(
                  'i_value',
                  stringTemplate({
                    parts: [
                      { partKind: 'text', text: 'Bearer ' },
                      { partKind: 'expr', expr: id(attr) },
                    ],
                  }),
                ),
              ],
            }),
          );
        } else if (scheme.scheme === 'basic') {
          stmts.push(
            call({
              receiver: id('lo_req'),
              method: 'set_header_field',
              callKind: 'instance',
              args: [
                arg('i_name', str('authorization')),
                arg(
                  'i_value',
                  stringTemplate({
                    parts: [
                      { partKind: 'text', text: 'Basic ' },
                      {
                        partKind: 'expr',
                        expr: methodCallExpr({
                          receiver: id('cl_http_utility'),
                          method: 'encode_base64',
                          callKind: 'static',
                          args: [
                            arg(
                              'unencoded',
                              stringTemplate({
                                parts: [
                                  {
                                    partKind: 'expr',
                                    expr: id(`${attr}_user`),
                                  },
                                  { partKind: 'text', text: ':' },
                                  {
                                    partKind: 'expr',
                                    expr: id(`${attr}_password`),
                                  },
                                ],
                              }),
                            ),
                          ],
                        }),
                      },
                    ],
                  }),
                ),
              ],
            }),
          );
        }
        break;
      }
      case 'oauth2':
      case 'openIdConnect': {
        stmts.push(
          call({
            receiver: id('me'),
            method: 'on_authorize',
            callKind: 'instance',
            args: [arg('io_request', id('lo_req'))],
          }),
        );
        break;
      }
    }
  }

  // lv_url = me->_join_url(...)
  stmts.push(
    assign({
      target: id('lv_url'),
      value: methodCallExpr({
        receiver: id('me'),
        method: '_join_url',
        callKind: 'instance',
        args: [
          arg('iv_server', id('mv_server')),
          arg('iv_path', id('lv_path')),
          arg('it_query', id('lt_query')),
        ],
      }),
    }),
  );

  // lo_req->set_uri( lv_url ).
  stmts.push(
    call({
      receiver: id('lo_req'),
      method: 'set_uri',
      callKind: 'instance',
      args: [arg('i_uri', id('lv_url'))],
    }),
  );

  // lo_resp = me->_send_request(...)
  stmts.push(
    assign({
      target: id('lo_resp'),
      value: methodCallExpr({
        receiver: id('me'),
        method: '_send_request',
        callKind: 'instance',
        args: [
          arg('io_client', id('lo_client')),
          arg('io_request', id('lo_req')),
          arg('iv_method', id(httpMethodConstant(ctx.op.method))),
        ],
      }),
    }),
  );

  // lv_status = lo_resp->get_status( )-code.
  stmts.push(raw({ source: `lv_status = lo_resp->get_status( )-code.` }));

  // lv_payload = lo_resp->get_text( ).
  stmts.push(
    assign({
      target: id('lv_payload'),
      value: methodCallExpr({
        receiver: id('lo_resp'),
        method: 'get_text',
        callKind: 'instance',
      }),
    }),
  );

  // Success branch: IF status >= 200 AND status < 300.
  const successBody: Statement[] = [];
  switch (ctx.ret.kind) {
    case 'json':
      successBody.push(
        assign({
          target: id(ctx.ret.returning!.name),
          value: methodCallExpr({
            receiver: id('me'),
            method: `_des_${ctx.methodName}`,
            callKind: 'instance',
            args: [arg('iv_payload', id('lv_payload'))],
          }),
        }),
      );
      break;
    case 'binary':
      successBody.push(
        assign({
          target: id(ctx.ret.returning!.name),
          value: methodCallExpr({
            receiver: id('lo_resp'),
            method: 'get_binary',
            callKind: 'instance',
          }),
        }),
      );
      break;
    case 'bool':
      successBody.push(
        assign({
          target: id(ctx.ret.returning!.name),
          value: id('abap_true'),
        }),
      );
      break;
  }
  successBody.push(returnStmt());

  stmts.push(
    ifStmt({
      condition: binOp({
        op: 'AND',
        left: binOp({
          op: '>=',
          left: id('lv_status'),
          right: literal({ literalKind: 'int', value: 200 }),
        }),
        right: binOp({
          op: '<',
          left: id('lv_status'),
          right: literal({ literalKind: 'int', value: 300 }),
        }),
      }),
      then: successBody,
    }),
  );

  // RAISE EXCEPTION NEW zcx_..._error( iv_status = lv_status iv_payload = lv_payload ).
  stmts.push(
    raise({
      exceptionType: namedTypeRef({ name: ctx.exceptionClassName }),
      args: [
        arg('iv_status', id('lv_status')),
        arg('iv_payload', id('lv_payload')),
      ],
    }),
  );

  // Silence unused imports.
  void constructorExpr;
  void pickRequestMediaType;

  return stmts;
}
