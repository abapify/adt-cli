# Automatic Body Parameter Inference

## Feature

Speci automatically infers body parameter types from `Inferrable` schemas, eliminating the need to manually type body parameters in contract definitions.

## Problem Solved

**Before:** You had to manually type body parameters AND specify the body in the config:

```typescript
// ❌ Redundant - body type specified twice
updateMainSource: (className: string, source: string) =>
  adtHttp.put(`/classes/${className}/source`, {
    body: source,  // Where does this value come from?
    responses: { 200: undefined as unknown as void },
  }),
```

**After:** Declare the body type once, parameter is inferred automatically:

```typescript
// ✅ Clean - body type declared, parameter inferred
updateMainSource: ((className: string) =>
  adtHttp.put(`/classes/${className}/source`, {
    body: undefined as unknown as string, // Type declaration
    responses: { 200: undefined as unknown as void },
  }),
  // Usage: TypeScript knows the signature is (className: string, body: string)
  await client.updateMainSource('ZCL_TEST', sourceCode));
```

## Supported Patterns

### Pattern 1: No Path Parameters

```typescript
createUser: (() =>
  http.post('/users', {
    body: UserSchema, // Inferrable<User>
    responses: { 201: UserSchema },
  }),
  // Signature: (body: User) => Promise<User>
  await client.createUser(userData));
```

### Pattern 2: With Path Parameters

```typescript
updateUser: ((id: number) =>
  http.put(`/users/${id}`, {
    body: UserSchema, // Inferrable<User>
    responses: { 200: UserSchema },
  }),
  // Signature: (id: number, body: User) => Promise<User>
  await client.updateUser(123, userData));
```

### Pattern 3: Plain Type Assertions

```typescript
updateSource: ((className: string) =>
  http.put(`/classes/${className}/source`, {
    body: undefined as unknown as string, // Plain type
    responses: { 200: undefined as unknown as void },
  }),
  // Signature: (className: string, body: string) => Promise<void>
  await client.updateSource('ZCL_TEST', sourceCode));
```

### Pattern 4: Manual Typing (Still Supported)

```typescript
createUser: ((userData: User) =>
  http.post('/users', {
    body: userData, // Actual value, not schema
    responses: { 201: UserSchema },
  }),
  // Signature: (userData: User) => Promise<User>
  await client.createUser(userData));
```

## Tests

See [`src/rest/body-inference.test.ts`](../src/rest/body-inference.test.ts) for comprehensive test coverage.

## Implementation

- **Runtime**: [`src/rest/client/create-client.ts`](../src/rest/client/create-client.ts) - Body extraction at `args[pathParamNames.length]`
- **Types**: [`src/rest/client/types.ts`](../src/rest/client/types.ts) - Parameter inference via `BuildParams` type
