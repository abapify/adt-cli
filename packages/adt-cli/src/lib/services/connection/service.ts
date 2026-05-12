interface ConnectionParams {
  baseUrl: string;
  client?: string;
  username?: string;
  password?: string;
}

export interface ConnectionResolveArgs {
  baseUrl?: string;
  client?: string;
  username?: string;
  password?: string;
  systemId?: string;
}

export interface ResolveConnectionClientHooks<TClient> {
  createClient: (params: ConnectionParams) => TClient;
  resolveSystem?: (systemId: string) => ConnectionParams | undefined;
  resolveFromAuthStore?: (systemId: string) => Promise<TClient>;
}

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
