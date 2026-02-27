/**
 * CLI Testing Utilities
 * Provides programmatic CLI execution with mock client injection
 */

// Command type imported for type definitions only
import { MockAdtClient } from './mock-adt-client';
import { createCLI } from '../cli';

export interface CliTestOptions {
  mockClient?: MockAdtClient;
  fixturesPath?: string;
  captureOutput?: boolean;
}

export interface CliTestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: Error;
}

/**
 * Execute CLI command programmatically with mock client
 */
export async function executeCli(
  args: string[],
  options: CliTestOptions = {},
): Promise<CliTestResult> {
  const { mockClient, captureOutput = true } = options;

  // Capture console output
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let error: Error | undefined;

  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;

  if (captureOutput) {
    console.log = (...args) => {
      stdout += args.join(' ') + '\n';
    };

    console.error = (...args) => {
      stderr += args.join(' ') + '\n';
    };
  }

  // Mock process.exit to capture exit codes
  process.exit = ((code?: number) => {
    exitCode = code || 0;
    throw new Error(`Process exit with code ${exitCode}`);
  }) as any;

  try {
    // Create CLI program
    const program = await createCLI();

    // Inject mock client if provided
    if (mockClient) {
      // Store mock client globally for commands to use
      (global as any).__mockAdtClient = mockClient;
      process.env.ADT_CLI_TEST_MODE = 'true';
    }

    // Parse arguments
    await program.parseAsync(['node', 'adt', ...args]);
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.startsWith('Process exit with code')
    ) {
      // Expected exit, extract code from message
      const match = err.message.match(/Process exit with code (\d+)/);
      exitCode = match ? parseInt(match[1]) : 1;
    } else {
      error = err instanceof Error ? err : new Error(String(err));
      exitCode = 1;
    }
  } finally {
    // Restore original functions
    if (captureOutput) {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    }
    process.exit = originalProcessExit;

    // Clean up mock client
    delete (global as any).__mockAdtClient;
    delete process.env.ADT_CLI_TEST_MODE;
  }

  return {
    exitCode,
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    error,
  };
}

/**
 * Create a mock ADT client for testing
 */
export function createMockAdtClient(
  options: { fixturesPath?: string } = {},
): MockAdtClient {
  return new MockAdtClient({
    fixturesPath: options.fixturesPath,
    throwErrors: false,
  });
}

/**
 * Helper to check if we're in test mode and should use mock client
 */
export function shouldUseMockClient(): boolean {
  return process.env.ADT_CLI_TEST_MODE === 'true';
}

/**
 * Get the global mock client if available
 */
export function getMockAdtClient(): MockAdtClient | undefined {
  return (global as any).__mockAdtClient;
}
