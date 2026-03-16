# ABAP CI/CD Specifications

This directory contains specifications for ABAP Continuous Integration and Continuous Delivery (CI/CD) processes and tooling.

## Documents

- **[abap-cicd-pipeline.md](./abap-cicd-pipeline.md)** - Core ABAP CI/CD architecture, principles, and implementation approach

## Purpose

These specifications define the architectural foundation for modern ABAP DevOps practices, ensuring all development follows documented design principles and maintains consistency across the project.

## Requirements

### Requirement: Transport-centric CI/CD pipeline

The CI/CD pipeline SHALL use transport requests as the unit of change for all quality checks and deployment operations.

#### Scenario: Running quality checks on a transport

- **WHEN** a transport request is submitted for review
- **THEN** the pipeline runs ATC checks, unit tests, and delta analysis on the transport's objects

### Requirement: Platform-agnostic execution

The CI/CD pipeline SHALL run on any CI/CD platform (GitHub Actions, GitLab CI, Azure DevOps, etc.) without platform-specific dependencies.

#### Scenario: Running in GitLab CI

- **WHEN** the pipeline is configured in a GitLab CI YAML file
- **THEN** it executes the same ADT CLI commands as on any other platform

## Usage

All development work must align with these specifications. Any changes that conflict with documented architecture require specification updates before implementation.
