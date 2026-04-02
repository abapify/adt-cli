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
    const info = sysInfo as Record<string, unknown>;
    return {
      userName: String(info.userName ?? ''),
      userFullName: info.userFullName ? String(info.userFullName) : undefined,
      systemID: String(info.systemID ?? ''),
      client: String(info.client ?? ''),
    };
  }

  /** Look up a specific user by exact username */
  async getUserByName(username: string): Promise<UserInfo[]> {
    const result = await this.adt.system.users.get(username.toUpperCase());
    return toUserInfoList(extractEntries(result));
  }

  /** Search users by wildcard query */
  async searchUsers(query: string, maxcount = 50): Promise<UserInfo[]> {
    const result = await this.adt.system.users.search({
      querystring: query,
      maxcount,
    });
    return toUserInfoList(extractEntries(result));
  }
}

export function createUserService(adt: AdtClientType): UserService {
  return new UserService(adt);
}
