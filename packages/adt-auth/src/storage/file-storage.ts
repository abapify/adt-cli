/**
 * File-based session storage
 *
 * Stores auth sessions in ~/.adt/sessions/
 * Stores config in ~/.adt/config.json
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { AuthSession } from '../types';

interface Config {
  defaultSid?: string;
}

export class FileStorage {
  private readonly baseDir: string;
  private readonly storageDir: string;
  private readonly configPath: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(homedir(), '.adt');
    this.storageDir = join(this.baseDir, 'sessions');
    this.configPath = join(this.baseDir, 'config.json');
    this.ensureStorageDir();
  }

  // ===========================================================================
  // Session Storage
  // ===========================================================================

  /**
   * Save session to file
   */
  save(session: AuthSession): void {
    const filePath = this.getSessionPath(session.sid);
    const data = JSON.stringify(session, null, 2);
    writeFileSync(filePath, data, { mode: 0o600 }); // Owner read/write only
  }

  /**
   * Load session from file
   */
  load(sid: string): AuthSession | null {
    const filePath = this.getSessionPath(sid);
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const data = readFileSync(filePath, 'utf8');
      return JSON.parse(data) as AuthSession;
    } catch (error) {
      throw new Error(
        `Failed to load session ${sid}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete session file
   */
  delete(sid: string): void {
    const filePath = this.getSessionPath(sid);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  /**
   * List all available SIDs
   */
  list(): string[] {
    if (!existsSync(this.storageDir)) {
      return [];
    }

    return readdirSync(this.storageDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', ''));
  }

  /**
   * Check if session exists
   */
  exists(sid: string): boolean {
    return existsSync(this.getSessionPath(sid));
  }

  // ===========================================================================
  // Default SID Management
  // ===========================================================================

  /**
   * Set default SID
   */
  setDefaultSid(sid: string): void {
    const config = this.loadConfig();
    config.defaultSid = sid;
    this.saveConfig(config);
  }

  /**
   * Get default SID
   */
  getDefaultSid(): string | null {
    const config = this.loadConfig();
    return config.defaultSid ?? null;
  }

  /**
   * Clear default SID
   */
  clearDefaultSid(): void {
    const config = this.loadConfig();
    delete config.defaultSid;
    this.saveConfig(config);
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  private getSessionPath(sid: string): string {
    return join(this.storageDir, `${sid}.json`);
  }

  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true, mode: 0o700 }); // Owner only
    }
  }

  private loadConfig(): Config {
    if (!existsSync(this.configPath)) {
      return {};
    }
    try {
      return JSON.parse(readFileSync(this.configPath, 'utf8'));
    } catch {
      return {};
    }
  }

  private saveConfig(config: Config): void {
    mkdirSync(dirname(this.configPath), { recursive: true });
    writeFileSync(this.configPath, JSON.stringify(config, null, 2), {
      mode: 0o600,
    });
  }
}
