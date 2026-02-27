/**
 * Example: Using a global error response map with createHttp
 *
 * This shows how to define common error responses once and have them
 * automatically merged with all endpoint responses.
 */

import {
  createHttp,
  createClient,
  createFetchAdapter,
  type RestContract,
} from '../src/rest';

// 1. Define your global error type
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// 2. Define your global error response map
const globalErrors = {
  400: {} as ApiError,
  401: {} as ApiError,
  403: {} as ApiError,
  404: {} as ApiError,
  500: {} as ApiError,
} as const;

// 3. Create http instance with global errors
const api = createHttp(globalErrors);

// 3. Define your success types
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserInput {
  name: string;
  email: string;
}

// 4. Define your API using shortcut syntax!
// Global errors are automatically merged, and you can use generic types
const userApi = {
  // GET /users - shortcut syntax: api.get<Type>('/path')
  // Automatically creates { 200: User[] } + global errors
  list: () => api.get<User[]>('/users'),

  // GET /users/:id - shortcut syntax
  // Automatically creates { 200: User } + global errors
  get: (id: string) => api.get<User>(`/users/${id}`),

  // POST /users - shortcut syntax: api.post<Response>('/path', body)
  // Automatically creates { 201: User } + global errors
  create: (user: CreateUserInput) => api.post<User>('/users', user),

  // PUT /users/:id - shortcut syntax
  // Automatically creates { 200: User } + global errors
  update: (id: string, user: Partial<CreateUserInput>) =>
    api.put<User>(`/users/${id}`, user),

  // DELETE /users/:id - shortcut syntax: api.delete('/path')
  // Automatically creates { 204: undefined } + global errors
  delete: (id: string) => api.delete(`/users/${id}`),
} satisfies RestContract;

// 5. Create client
const client = createClient(userApi, {
  baseUrl: 'https://api.example.com',
  adapter: createFetchAdapter(),
});

// 6. Use with full type safety
async function demo() {
  try {
    const users = await client.list();
    console.log('Users:', users);
  } catch (error) {
    // All error responses are typed as ApiError
    if (client.get.isError(error)) {
      console.error(
        `API Error [${error.status}]:`,
        error.payload.code,
        error.payload.message,
      );
    }
  }
}

export { demo, userApi, client, api, globalErrors };
