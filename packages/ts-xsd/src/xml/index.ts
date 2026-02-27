/**
 * XML Parse/Build functionality
 *
 * Handles XML ↔ JavaScript object transformation using W3C Schema definitions.
 */

export { parse as parseXml } from './parse';
export {
  build as buildXml,
  type BuildOptions as XmlBuildOptions,
} from './build';
export { typedSchema, type TypedSchema, type InferTypedSchema } from './typed';
