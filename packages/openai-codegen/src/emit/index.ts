/**
 * Barrel for the emitter wave. Wave 1 + Wave 2 modules are re-exported
 * here; the implementation-class emitter is owned by a parallel Wave 2
 * agent and may not exist yet — when absent, `generate.ts` uses an
 * inline placeholder.
 */
export * from './naming';
export * from './types-interface';
export * from './operations-interface';
export * from './exception-class';
export * from './local-classes';
export * from './response-mapper';
