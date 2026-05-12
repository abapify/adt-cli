/** Concrete connection metadata used to instantiate an ADT client. */
interface ConnectionParams {
  baseUrl: string;
  client?: string;
  username?: string;
  password?: string;
}

/**
 * Inputs accepted by the shared connection resolver.
 *
 * `baseUrl` and `systemId` are mutually exclusive selectors:
 * - `baseUrl` selects explicit connection args
 * - `systemId` selects configured/fallback lookup paths
 */
export interface ConnectionResolveArgs {
  baseUrl?: string;
  client?: string;
  username?: string;
  password?: string;
  systemId?: string;
}

/**
 * Hook points used by the resolver to stay transport/framework agnostic.
 *
 * Resolution chain:
 * 1. `createClient` with explicit args (`baseUrl`)
 * 2. `resolveSystem` + `createClient` (`systemId` from registry)
 * 3. `resolveFromAuthStore` (`systemId` from local auth-store fallback)
 */
export interface ResolveConnectionClientHooks<TClient> {
  createClient: (params: ConnectionParams) => TClient;
  resolveSystem?: (systemId: string) => ConnectionParams | undefined;
  resolveFromAuthStore?: (systemId: string) => Promise<TClient>;
}

/**
 * Final resolved client plus metadata about how it was obtained.
 *
 * `systemId` is present when a logical system was used and may be absent
 * for plain explicit `baseUrl` calls.
 */
export interface ResolvedConnectionClient<TClient> {
  client: TClient;
  systemId?: string;
  source: 'explicit' | 'multi-system' | 'adt-cli-auth-store';
}

export async function resolveConnectionClient<TClient>(
  args: ConnectionResolveArgs,
  hooks: ResolveConnectionClientHooks<TClient>,
): Promise<ResolvedConnectionClient<TClient>> {
  if (args.baseUrl) {
    return {
      client: hooks.createClient({
        baseUrl: args.baseUrl,
        client: args.client,
        username: args.username,
        password: args.password,
      }),
      systemId: args.systemId,
      source: 'explicit',
    };
  }

  if (args.systemId && hooks.resolveSystem) {
    const params = hooks.resolveSystem(args.systemId);
    if (params) {
      return {
        client: hooks.createClient({
          ...params,
          username: args.username,
          password: args.password,
        }),
        systemId: args.systemId,
        source: 'multi-system',
      };
    }
  }

  if (args.systemId && hooks.resolveFromAuthStore) {
    return {
      client: await hooks.resolveFromAuthStore(args.systemId),
      systemId: args.systemId,
      source: 'adt-cli-auth-store',
    };
  }

  throw new Error(
    'No connection could be resolved: provide baseUrl (+ credentials) or systemId resolvable via multi-system config or ~/.adt session store.',
  );
}
