export type SearchObject = {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
};

export type ObjectSearchOptions = {
  objectName: string;
  objectType?: string;
};

type SearchObjectResolutionContext = {
  objects: SearchObject[];
  options: ObjectSearchOptions;
  exactMatches: SearchObject[];
  availableExactTypes: string[];
  requestedObjectType: string | undefined;
};

function normalizeObjectType(type: string): string {
  return type.toUpperCase().split('/')[0] ?? '';
}

function getExactSearchMatches(
  objects: SearchObject[],
  objectName: string,
): SearchObject[] {
  const normalizedName = objectName.toUpperCase();
  return objects.filter(
    (obj) => String(obj.name || '').toUpperCase() === normalizedName,
  );
}

function getSearchObjectTypes(objects: SearchObject[]): string[] {
  return [
    ...new Set(
      objects.map((obj) => normalizeObjectType(String(obj.type || ''))),
    ),
  ].filter(Boolean);
}

function findExactSearchMatch(
  exactMatches: SearchObject[],
  requestedObjectType: string | undefined,
  availableExactTypes: string[],
): SearchObject | undefined {
  if (requestedObjectType) {
    return exactMatches.find(
      (obj) =>
        normalizeObjectType(String(obj.type || '')) === requestedObjectType,
    );
  }

  return availableExactTypes.length <= 1 ? exactMatches[0] : undefined;
}

function createObjectNotFoundError(
  objects: SearchObject[],
  objectName: string,
): Error {
  const similar = objects
    .filter((obj) =>
      String(obj.name || '')
        .toUpperCase()
        .includes(objectName.toUpperCase()),
    )
    .slice(0, 5);
  const similarList = similar
    .map((obj) => `   • ${obj.name} (${obj.type}) – ${obj.packageName}`)
    .join('\n');
  const hint =
    similar.length > 0 ? `\n💡 Similar objects:\n${similarList}` : '';

  return new Error(`Object '${objectName}' not found in the system.${hint}`);
}

function createSearchObjectResolutionError(
  context: SearchObjectResolutionContext,
): Error {
  const {
    objects,
    options,
    exactMatches,
    availableExactTypes,
    requestedObjectType,
  } = context;

  if (requestedObjectType && exactMatches.length > 0) {
    return new Error(
      `Object '${options.objectName}' with type '${requestedObjectType}' was not found. Available types: ${availableExactTypes.join(', ') || 'none'}.`,
    );
  }

  if (!requestedObjectType && availableExactTypes.length > 1) {
    return new Error(
      `Object '${options.objectName}' is ambiguous. Use --object-type to select one of: ${availableExactTypes.join(', ')}.`,
    );
  }

  return createObjectNotFoundError(objects, options.objectName);
}

export function selectSearchObject(
  objects: SearchObject[],
  options: ObjectSearchOptions,
): SearchObject {
  const exactMatches = getExactSearchMatches(objects, options.objectName);
  const availableExactTypes = getSearchObjectTypes(exactMatches);
  const requestedObjectType = options.objectType
    ? normalizeObjectType(options.objectType.trim())
    : undefined;
  const exactMatch = findExactSearchMatch(
    exactMatches,
    requestedObjectType,
    availableExactTypes,
  );

  if (exactMatch) {
    return exactMatch;
  }

  throw createSearchObjectResolutionError({
    objects,
    options,
    exactMatches,
    availableExactTypes,
    requestedObjectType,
  });
}
