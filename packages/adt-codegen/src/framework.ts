/**
 * Hook-based codegen framework
 */

import { XMLParser } from 'fast-xml-parser';
import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type {
  CodegenConfig,
  CodegenPlugin,
  DiscoveryContext,
  WorkspaceContext,
  CollectionContext,
  TemplateLinkContext,
  GlobalContext,
  TemplateLink,
} from './types';
import { ConsoleLogger } from './logger';
import { matchesFilter } from './filters';

export class CodegenFramework {
  private logger = new ConsoleLogger();
  private plugins: CodegenPlugin[] = [];

  constructor(private config: CodegenConfig) {
    this.plugins = config.plugins;
  }

  /**
   * Run the codegen framework
   */
  async run(): Promise<void> {
    this.logger.info('Starting ADT Codegen Framework');

    // Clean output directory if requested
    if (this.config.output.clean) {
      const workspacesDir = join(this.config.output.baseDir, 'workspaces');
      if (existsSync(workspacesDir)) {
        this.logger.info('Cleaning output directory...');
        await rm(workspacesDir, { recursive: true, force: true });
      }
    }

    // Check which hooks are registered
    const hasDiscoveryHook = this.hasHook('discovery');
    const hasWorkspaceHook = this.hasHook('workspace');
    const hasCollectionHook = this.hasHook('collection');
    const hasTemplateLinkHook = this.hasHook('templateLink');
    const hasFinalizeHook = this.hasHook('finalize');

    this.logger.info(`Active hooks: ${this.getActiveHooks().join(', ')}`);
    console.log();

    // Parse discovery XML
    const discoveryXml = await readFile(this.config.discovery.path, 'utf-8');
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
    const parsed = parser.parse(discoveryXml);

    // Extract workspaces
    const service = parsed['app:service'];
    const workspaces = Array.isArray(service['app:workspace'])
      ? service['app:workspace']
      : [service['app:workspace']];

    // Create discovery context
    const discoveryCtx: DiscoveryContext = {
      xml: parsed,
      workspaces,
      data: {},
      logger: this.logger,
    };

    // Call discovery hooks
    if (hasDiscoveryHook) {
      await this.callHook('discovery', discoveryCtx);
    }

    // Process workspaces if workspace hook exists
    const workspaceContexts: WorkspaceContext[] = [];

    if (hasWorkspaceHook || hasCollectionHook || hasTemplateLinkHook) {
      for (const ws of workspaces) {
        // Apply workspace filter
        if (!matchesFilter(ws, this.config.filters, 'workspace')) {
          continue;
        }

        const wsCtx = await this.createWorkspaceContext(ws);
        workspaceContexts.push(wsCtx);

        // Call workspace hooks
        if (hasWorkspaceHook) {
          await this.callHook('workspace', wsCtx);
        }

        // Process collections if collection hook exists
        if (hasCollectionHook || hasTemplateLinkHook) {
          const collections = this.extractCollections(ws);

          for (const coll of collections) {
            // Apply collection filter
            if (!matchesFilter(coll, this.config.filters, 'collection')) {
              continue;
            }

            const collCtx = this.createCollectionContext(coll, wsCtx);

            // Call collection hooks
            if (hasCollectionHook) {
              await this.callHook('collection', collCtx);
            }

            // Process template links if hook exists
            if (hasTemplateLinkHook && collCtx.templateLinks.length > 0) {
              for (const link of collCtx.templateLinks) {
                const linkCtx = this.createTemplateLinkContext(link, collCtx);
                await this.callHook('templateLink', linkCtx);
              }
            }
          }
        }

        // Write accumulated artifacts
        await this.writeArtifacts(wsCtx);
      }
    }

    // Call finalize hooks
    if (hasFinalizeHook) {
      const globalCtx: GlobalContext = {
        discovery: discoveryCtx,
        workspaces: workspaceContexts,
        outputDir: this.config.output.baseDir,
        logger: this.logger,
      };

      await this.callHook('finalize', globalCtx);
    }

    console.log();
    this.logger.success('Codegen completed successfully');
  }

  /**
   * Check if any plugin has a specific hook
   */
  private hasHook(hookName: keyof import('./types').PluginHooks): boolean {
    return this.plugins.some((p) => p.hooks?.[hookName]);
  }

  /**
   * Get list of active hook names
   */
  private getActiveHooks(): string[] {
    const hooks = new Set<string>();
    for (const plugin of this.plugins) {
      if (plugin.hooks) {
        Object.keys(plugin.hooks).forEach((h) => hooks.add(h));
      }
    }
    return Array.from(hooks);
  }

  /**
   * Call a specific hook on all plugins
   */
  private async callHook(
    hookName: keyof import('./types').PluginHooks,
    context: any,
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.[hookName];
      if (hook) {
        await (hook as any)(context);
      }
    }
  }

  /**
   * Create workspace context
   */
  private async createWorkspaceContext(
    workspace: any,
  ): Promise<WorkspaceContext> {
    const title = workspace['atom:title'];
    const folderName = this.sanitizeTitle(title);
    const dir = join(this.config.output.baseDir, 'workspaces', folderName);

    // Create directory
    await mkdir(dir, { recursive: true });

    return {
      title,
      folderName,
      dir,
      xml: workspace,
      data: {},
      artifacts: [],
      logger: this.logger,
      writeFile: async (name: string, content: string) => {
        // If path starts with ./ or ../, resolve relative to CWD (config location)
        // Otherwise, resolve relative to workspace dir
        const filePath =
          name.startsWith('./') || name.startsWith('../')
            ? resolve(name)
            : join(dir, name);

        const fileDir = join(filePath, '..');
        await mkdir(fileDir, { recursive: true });
        await writeFile(filePath, content, 'utf-8');
      },
    };
  }

  /**
   * Extract collections from workspace
   */
  private extractCollections(workspace: any): any[] {
    const collections = workspace['app:collection'];
    if (!collections) return [];
    return Array.isArray(collections) ? collections : [collections];
  }

  /**
   * Create collection context
   */
  private createCollectionContext(
    collection: any,
    workspace: WorkspaceContext,
  ): CollectionContext {
    const accepts = collection['app:accept'];
    const acceptsArray = accepts
      ? Array.isArray(accepts)
        ? accepts
        : [accepts]
      : [];

    const templateLinksXml =
      collection['adtcomp:templateLinks']?.['adtcomp:templateLink'];
    const templateLinks: TemplateLink[] = templateLinksXml
      ? (Array.isArray(templateLinksXml)
          ? templateLinksXml
          : [templateLinksXml]
        ).map((link: any) => ({
          rel: link['@_rel'],
          template: link['@_template'],
        }))
      : [];

    return {
      href: collection['@_href'],
      title: collection['atom:title'],
      accepts: acceptsArray,
      category: {
        term: collection['atom:category']?.['@_term'] || '',
        scheme: collection['atom:category']?.['@_scheme'] || '',
      },
      templateLinks,
      xml: collection,
      workspace,
      data: {},
      logger: this.logger,
    };
  }

  /**
   * Create template link context
   */
  private createTemplateLinkContext(
    link: TemplateLink,
    collection: CollectionContext,
  ): TemplateLinkContext {
    return {
      rel: link.rel,
      template: link.template,
      collection,
      data: {},
      logger: this.logger,
    };
  }

  /**
   * Write accumulated artifacts for a workspace
   */
  private async writeArtifacts(workspace: WorkspaceContext): Promise<void> {
    for (const artifact of workspace.artifacts) {
      await workspace.writeFile(artifact.file, artifact.content);
    }
  }

  /**
   * Sanitize title for folder name
   */
  private sanitizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
