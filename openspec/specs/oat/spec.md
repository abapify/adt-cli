# OAT (Open ABAP Tooling) Format Specification

## Overview

OAT is a Git-friendly serialization format for ABAP objects, designed as part of the ADT CLI tooling. It provides a clean, minimal, and extensible structure for storing ABAP development objects in version control systems.

## Core Principles

### 1. Clean Directory Structure

OAT organizes objects by package and type in a predictable `packages/pkg/objects/type/name/` hierarchy, enabling multi-package projects while maintaining clear separation between different packages.

### 2. Kubernetes-Inspired Metadata

Each object has a YAML metadata file with `kind` and `spec` structure, providing consistent object description and extensibility.

### 3. Separation of Concerns

Source code and metadata are stored separately, enabling clean diffs and independent versioning of object properties vs. implementation.

### 4. Plugin Architecture

OAT is implemented as a format plugin in the ADT CLI, allowing it to coexist with other formats like abapGit through the same import/export toolchain.

## Problems with Existing Solutions

### abapGit Issues

- **Flat serialization**: All objects mixed in `/src` with complex naming schemes
- **Merge conflicts**: Large XML structures create difficult-to-resolve conflicts
- **Limited metadata**: Object descriptions and properties embedded in source files
- **Rigid structure**: Hard to extend with custom metadata or tooling

### gCTS Limitations

- **Transport dependency**: Still requires traditional transport requests
- **No Git integration**: Cannot leverage Git workflows and branching strategies
- **Vendor lock-in**: Tied to SAP's cloud transport service
- **Limited flexibility**: Cannot handle partial imports or custom object filtering

## Why OAT?

OAT was created to provide a clean alternative for Git-based ABAP development that:

- **Improves diff readability**: Separate source and metadata files create cleaner diffs
- **Simplifies navigation**: Type-based directory structure is intuitive for developers
- **Enables extensibility**: YAML metadata can be extended without breaking existing tools
- **Supports tooling**: Predictable structure enables powerful CLI and IDE integrations

## Table of Contents

- [Format Structure](./format-structure.md) - OAT directory layout and file organization
- [Metadata Schema](./metadata-schema.md) - YAML metadata structure specification
- [ADT CLI Integration](./adt-cli-integration.md) - How OAT works with the ADT CLI tool
- [Format Comparison](./format-comparison.md) - OAT vs abapGit vs gCTS
