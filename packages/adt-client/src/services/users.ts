/**
 * User Service - Business logic layer for system user operations
 *
 * Provides user lookup and search by orchestrating:
 * - system.users contract (Atom feed responses)
 * - core.http.systeminformation contract (current user info)
 */

import type { AdtClientType } from '@abapify/adt-contracts';

/** Normalized user info from Atom feed entries */
export interface UserInfo {
  username: string;
  fullName?: string;
  uri?: string;
}

/** Current authenticated user info from systeminformation */
export interface CurrentUserInfo {
  userName: string;
  userFullName?: string;
  systemID: string;
  client: string;
}

/** Extract entry array from atomFeed parsed response */
function extractEntries(
  data: unknown,
): { id?: string; title?: string; link?: { href: string }[] }[] {
  const feed = data as Record<string, unknown>;
  const feedData = feed.feed as Record<string, unknown> | undefined;
  if (!feedData) return [];

  const rawEntries = feedData.entry;
  if (!rawEntries) return [];
  return Array.isArray(rawEntries) ? rawEntries : [rawEntries];
}

/** Map raw Atom entries to normalized UserInfo */
function toUserInfoList(
  entries: { id?: string; title?: string; link?: { href: string }[] }[],
): UserInfo[] {
  return entries.map((e) => ({
    username: e.id ?? '',
    fullName: e.title,
    uri: e.link?.[0]?.href,
  }));
}

/**
 * User Service - orchestrates user lookup operations
 */
export class UserService {
  constructor(private readonly adt: AdtClientType) {}

  /** Get the currently authenticated user via systeminformation */
  async getCurrentUser(): Promise<CurrentUserInfo> {
    const sysInfo = await this.adt.core.http.systeminformation.getSystemInfo();
    return {
      userName: sysInfo.userName ?? '',
      userFullName: sysInfo.userFullName,
      systemID: sysInfo.systemID ?? '',
      client: sysInfo.client ?? '',
    };
  }

  /** Look up a specific user by exact username */
  async getUserByName(username: string): Promise<UserInfo[]> {
    const normalized = username.trim().toUpperCase();
    if (!normalized) {
      throw new Error('username is required');
    }
    const result = await this.adt.system.users.get(normalized);
    return toUserInfoList(extractEntries(result));
  }

  /** Search users by wildcard query */
  async searchUsers(query: string, maxcount = 50): Promise<UserInfo[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      throw new Error('query is required');
    }
    if (!Number.isInteger(maxcount) || maxcount <= 0) {
      throw new Error('maxcount must be a positive integer');
    }
    const result = await this.adt.system.users.search({
      querystring: normalizedQuery,
      maxcount,
    });
    return toUserInfoList(extractEntries(result));
  }
}

export function createUserService(adt: AdtClientType): UserService {
  return new UserService(adt);
}
