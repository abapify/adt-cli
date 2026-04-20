// Wave 1/2 will populate this barrel. Emitters:
//   - types-interface.ts       (Layer 1 — ZIF_<name>_TYPES)
//   - operations-interface.ts  (Layer 2 — ZIF_<name>)
//   - exception-class.ts       (ZCX_<name>_ERROR)
//   - implementation-class.ts  (Layer 3 — ZCL_<name>)
//   - local-classes.ts         (locals_def + locals_imp templates)
//   - response-mapper.ts       (OpenAPI responses object → CASE ABAP)
//   - naming.ts                (central name derivation from config)
export {};
