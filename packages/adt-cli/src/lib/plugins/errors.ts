/**
 * Base plugin error class
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly plugin: string,
    public readonly category:
      | 'config'
      | 'serialization'
      | 'validation'
      | 'filesystem',
    public readonly context?: Record<string, unknown>,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Plugin configuration error
 */
export class PluginConfigError extends PluginError {
  constructor(
    plugin: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, plugin, 'config', context);
    this.name = 'PluginConfigError';
  }
}

/**
 * Plugin serialization error
 */
export class PluginSerializationError extends PluginError {
  constructor(
    plugin: string,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, plugin, 'serialization', context, cause);
    this.name = 'PluginSerializationError';
  }
}

/**
 * Plugin validation error
 */
export class PluginValidationError extends PluginError {
  constructor(
    plugin: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, plugin, 'validation', context);
    this.name = 'PluginValidationError';
  }
}

/**
 * Plugin filesystem error
 */
export class PluginFilesystemError extends PluginError {
  constructor(
    plugin: string,
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super(message, plugin, 'filesystem', context, cause);
    this.name = 'PluginFilesystemError';
  }
}

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends Error {
  constructor(pluginName: string) {
    super(`Plugin not found: ${pluginName}`);
    this.name = 'PluginNotFoundError';
  }
}

/**
 * Plugin loading error
 */
export class PluginLoadError extends Error {
  constructor(pluginName: string, cause?: Error) {
    super(`Failed to load plugin: ${pluginName}`);
    this.name = 'PluginLoadError';
    this.cause = cause;
  }
}
