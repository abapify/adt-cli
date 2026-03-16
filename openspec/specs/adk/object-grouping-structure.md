# ADK Object Grouping Structure

## Proposed Structure

```
packages/adk/src/objects/
├── base/                    # Base interfaces, registry, factory
├── oo/                      # Object-Oriented objects
│   ├── class/
│   ├── interface/
│   └── index.ts
├── ddic/                    # Data Dictionary objects
│   ├── domain/
│   ├── data-element/
│   ├── table/
│   └── index.ts
├── kind.ts                  # Object kind definitions
└── index.ts                 # Main objects export
```

## Benefits

1. **Logical Grouping**: Related ABAP object types grouped together
2. **Scalability**: Easy to add new object types in appropriate categories
3. **Clear Separation**: OO vs DDIC concerns separated
4. **Future Extensions**: Can add more categories (reports/, forms/, etc.)

## Object Categories

### OO (Object-Oriented)

- Class
- Interface
- (Future: Exception classes, etc.)

### DDIC (Data Dictionary)

- Domain
- Data Element
- Table
- Structure
- (Future: Views, Search Helps, etc.)

## Import Structure

```typescript
// Main objects index
export * from './base';
export * from './oo';
export * from './ddic';
export * from './kind';

// OO index
export * from './class';
export * from './interface';

// DDIC index
export * from './domain';
export * from './data-element';
export * from './table';
```
