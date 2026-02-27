/**
 * Object Handler Registry for abapGit plugin
 *
 * Handlers auto-register themselves when instantiated via BaseHandler constructor.
 * This module just ensures all handlers are loaded and re-exports registry functions.
 */

// Re-export registry functions from base (where the actual registry lives)
export { getHandler, isSupported, getSupportedTypes } from './base';

// Import handlers to trigger auto-registration via their constructors
// The handlers register themselves when `new XxxHandler()` is called
import './objects';
