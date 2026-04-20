export class WhitelistViolationError extends Error {
  readonly className: string;
  readonly profileId: string;

  constructor(className: string, profileId: string) {
    super(
      `Class '${className}' is not in the allow-list for target profile '${profileId}'.`,
    );
    this.name = 'WhitelistViolationError';
    this.className = className;
    this.profileId = profileId;
  }
}
