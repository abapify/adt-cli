/**
 * Speci v0.1 - Basic Usage Example
 *
 * This example demonstrates how to define an API contract using arrow functions
 * and generate a fully-typed client.
 */

import {
  http,
  createClient,
  createFetchAdapter,
  HttpError,
  type RestContract,
} from '../src/rest';

// 1. Define your data schemas (use any schema library)
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface CreateUserInput {
  name: string;
  email: string;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
}

// 2. Define your API contract - both syntaxes work!
const api = {
  users: {
    // GET /users - Shortcut syntax
    list: () => http.get<User[]>('/users'),

    // GET /users/:id - Full syntax with explicit responses
    get: (id: string) =>
      http.get(`/users/${id}`, {
        responses: {
          200: undefined as unknown as User,
          404: undefined as unknown as ErrorResponse,
        },
      }),

    // POST /users - Shortcut: pass body directly
    create: (user: CreateUserInput) => http.post<User>('/users', user),

    // PUT /users/:id - Full syntax with body and responses
    update: (id: string, user: UpdateUserInput) =>
      http.put(`/users/${id}`, {
        body: user,
        responses: {
          200: undefined as unknown as User,
          404: undefined as unknown as ErrorResponse,
        },
      }),

    // DELETE /users/:id - Shortcut (no type needed, defaults to void)
    delete: (id: string) => http.delete(`/users/${id}`),
  },

  posts: {
    // GET /users/:userId/posts - Object-based params
    listByUser: ({ userId }: { userId: string }) =>
      http.get(`/users/${userId}/posts`, {
        responses: {
          200: undefined as unknown as Array<{
            id: string;
            title: string;
            content: string;
          }>,
        },
      }),

    // GET /users/:userId/posts/:postId - Object-based params with shortcut type
    get: ({ userId, postId }: { userId: string; postId: string }) =>
      http.get<Post>(`/users/${userId}/posts/${postId}`),
  },
} satisfies RestContract;

// Alternative: Compose APIs from separate modules using shortcut syntax
const usersApi = {
  list: () => http.get<User[]>('/users'),
  get: (id: string) => http.get<User>(`/users/${id}`),
  create: (user: CreateUserInput) => http.post<User>('/users', user),
} satisfies RestContract;

const postsApi = {
  listByUser: (userId: string) =>
    http.get<Array<{ id: string; title: string }>>(`/users/${userId}/posts`),
} satisfies RestContract;

// Compose into a single API
const composedApi = {
  users: usersApi,
  posts: postsApi,
} satisfies RestContract;

// 3. Create typed clients
// Option A: Using the inline api definition
const client = createClient(api, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),

  // Optional: Add default headers
  headers: {
    'X-API-Version': 'v1',
  },

  // Optional: Add auth token to all requests
  onRequest: async (options) => ({
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${process.env.API_TOKEN || 'demo-token'}`,
    },
  }),

  // Optional: Log responses
  onResponse: async (response) => {
    console.log('✅ Response received:', response);
    return response;
  },

  // Optional: Handle errors
  onError: async (error) => {
    console.error('❌ Request failed:', error);
    throw error;
  },
});

// Option B: Using the composed api
const composedClient = createClient(composedApi, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),
});

// 4. Use the client with full type safety
async function demo() {
  // Wrap everything in try-catch for network errors
  try {
    // List all users - return type is inferred as User[]
    const users = await client.users.list();
    console.log('Users:', users);
    // users is User[] - TypeScript knows this!
    users.forEach((u) => console.log(u.name, u.email));

    // Get a specific user - returns User on success, throws HttpError on error
    try {
      const user = await client.users.get('123');
      // If we get here, it's a successful 200 response
      // user is typed as User
      console.log('User:', user);
      console.log(user.id, user.name, user.email, user.createdAt);
    } catch (error) {
      // Option 1: Use method's isError type guard
      if (client.users.get.isError(error)) {
        // error.payload is typed as ErrorResponse!
        console.error(
          `HTTP ${error.status}:`,
          error.payload.error,
          error.payload.message,
        );
      }
      // Option 2: Use HttpError directly with generic
      else if (error instanceof HttpError) {
        console.error(`HTTP ${error.status}:`, error.payload);
      }
      // Option 3: Network or other errors
      else {
        console.error('Network error:', error);
      }
    }

    // Create a new user - return type is User (only 201 response defined)
    const newUser = await client.users.create({
      name: 'Alice',
      email: 'alice@example.com',
    });
    console.log('Created user:', newUser);
    // newUser is User - TypeScript knows it's always User
    console.log('New user ID:', newUser.id);

    // Update a user
    const updatedUser = await client.users.update('123', {
      name: 'Alice Smith',
    });
    console.log('Updated user:', updatedUser);

    // List posts by user - return type is Array<{ id, title, content }>
    const posts = await client.posts.listByUser({ userId: '123' });
    console.log('Posts:', posts);
    // posts is Array<{ id: string; title: string; content: string }>
    posts.forEach((p) => console.log(p.title));

    // Get a specific post - return type includes author: User
    const post = await client.posts.get({ userId: '123', postId: 'post-456' });
    console.log('Post:', post);
    // post is { id, title, content, author: User }
    console.log('Author:', post.author.name);

    // Delete a user
    await client.users.delete('123');
    console.log('User deleted');

    // Using composedClient (same API, different structure)
    const composedUsers = await composedClient.users.list();
    const composedPosts = await composedClient.posts.listByUser('123');
    console.log('Composed API works the same way!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the demo (commented out - this is just an example)
demo();
