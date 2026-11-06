/**
 * Example: Inferrable Schemas
 *
 * Shows how schema libraries can implement Inferrable to provide
 * automatic type inference in Speci.
 *
 * This demonstrates how Zod, ts-xsd, or any schema library can
 * add one property (_infer) to enable automatic type inference.
 */

import {
  http,
  createClient,
  createFetchAdapter,
  type Inferrable,
  type RestContract,
} from '../src/rest';

// ============================================================================
// Example 1: Zod-like schema library
// ============================================================================

/**
 * This is how a schema library (like Zod) would implement Inferrable
 *
 * The library provides:
 * 1. Schema definition methods
 * 2. Type inference via _infer property
 * 3. Runtime validation/parsing
 */

// Simulated Zod-like schema factory
function object<T>(shape: any) {
  return {
    // Schema definition (used by adapters at runtime)
    type: 'object' as const,
    shape,

    // Validation method (used by adapters)
    parse: (data: unknown) => data as T,

    // Inferrable marker - enables automatic type inference in Speci
    _infer: undefined as unknown as T,
  } as const satisfies Inferrable<T>;
}

function string() {
  return { type: 'string' as const };
}

// ============================================================================
// 2. Define schemas using the library - types inferred automatically!
// ============================================================================

/**
 * User schema - type is inferred from the schema definition
 * No manual interface needed!
 */
const UserSchema = object<{
  id: string;
  name: string;
  email: string;
}>({
  id: string(),
  name: string(),
  email: string(),
});

// Type is automatically inferred from UserSchema._infer
type User = typeof UserSchema._infer;

/**
 * Post schema - type is inferred from the schema definition
 */
const PostSchema = object<{
  id: string;
  title: string;
  content: string;
  authorId: string;
}>({
  id: string(),
  title: string(),
  content: string(),
  authorId: string(),
});

// Type is automatically inferred from PostSchema._infer
type Post = typeof PostSchema._infer;

// ============================================================================
// 3. Use schemas directly in API definition - types inferred automatically!
// ============================================================================

const api = {
  users: {
    // ✅ Just pass the schema - type is inferred as User automatically!
    list: () =>
      http.get('/users', {
        responses: { 200: UserSchema }, // Type: User (inferred from _infer property)
      }),

    get: (id: string) =>
      http.get(`/users/${id}`, {
        responses: { 200: UserSchema }, // Type: User (inferred automatically)
      }),

    create: (user: Omit<User, 'id'>) =>
      http.post('/users', {
        body: user,
        responses: { 201: UserSchema }, // Type: User (inferred automatically)
      }),
  },

  posts: {
    // ✅ Works with any schema that implements Inferrable
    list: () =>
      http.get('/posts', {
        responses: { 200: [PostSchema] }, // Type: Post[] (array inferred)
      }),

    get: (id: string) =>
      http.get(`/posts/${id}`, {
        responses: { 200: PostSchema }, // Type: Post (inferred automatically)
      }),
  },
} satisfies RestContract;

// ============================================================================
// 4. Create client - full type safety with inferred types
// ============================================================================

const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),
});

// ============================================================================
// 5. Use with full type safety
// ============================================================================

async function demo() {
  // Type is User[] - inferred from UserSchema._infer
  const users = await client.users.list();
  console.log('Users:', users);

  // Type is User - inferred from UserSchema._infer
  const user = await client.users.get('123');
  console.log('User:', user.name, user.email);

  // Type is Post[] - inferred from PostSchema._infer
  const posts = await client.posts.list();
  console.log('Posts:', posts);

  // Type is Post - inferred from PostSchema._infer
  const post = await client.posts.get('456');
  console.log('Post:', post.title, post.content);
}

// ============================================================================
// Key Benefits
// ============================================================================

/**
 * ✅ No helper functions needed - just add _infer to your schema
 * ✅ No type assertions - types inferred automatically
 * ✅ Works with any schema format (Zod, JSON Schema, custom)
 * ✅ Runtime schema available for adapters to parse/validate
 * ✅ Compile-time types for full TypeScript safety
 *
 * The _infer property is the bridge between runtime (schema object)
 * and compile-time (TypeScript types).
 */

export { demo, api, UserSchema, PostSchema };
