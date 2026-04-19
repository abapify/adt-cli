/**
 * Re-exports AST types grouped by topic.
 *
 * The canonical definitions live in `src/ast.ts` (single file keeps the
 * compile graph shallow for `chevrotain`). These topic modules exist to
 * make imports inside downstream packages self-documenting:
 *
 *     import type { ViewEntityDefinition } from '@abapify/acds/ast/views';
 */
export type {
  CdsSourceFile,
  CdsDefinition,
  AstNode,
  SourceLocation,
} from '../../ast';
export * from './views';
export * from './types';
export * from './annotations';
export * from './associations';
export {
  walkAnnotations,
  walkAssociations,
  walkDefinitions,
  walkFields,
  walkParameters,
  walkViewElements,
  findAnnotation,
  hasFields,
  hasMembers,
  hasParameters,
  isAssociation,
} from './walker';
