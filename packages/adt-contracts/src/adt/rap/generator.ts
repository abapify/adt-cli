/**
 * RAP Generator Workspace Contract
 *
 * ADT endpoint: /sap/bc/adt/rap/generator
 * Content-Type: application/vnd.sap.adt.rap.generator.v1+xml
 *
 * Supports RAP generator operations for creating new RAP business objects
 * and managing the generator workspace.
 */

import { http } from '../../base';
import { rapgenerator } from '../../schemas';

const basePath = '/sap/bc/adt/rap/generator';
const contentType = 'application/vnd.sap.adt.rap.generator.v1+xml';
const accept = contentType;

export const rapGeneratorContract = {
  getWorkspace: () =>
    http.get(basePath, {
      responses: { 200: rapgenerator },
      headers: {
        Accept: accept,
      },
    }),

  create: (options?: { corrNr?: string }) =>
    http.post(basePath, {
      responses: { 200: rapgenerator },
      headers: {
        Accept: accept,
        'Content-Type': contentType,
      },
      query: options?.corrNr ? { corrNr: options.corrNr } : undefined,
    }),

  delete: (name: string) =>
    http.delete(`${basePath}/${name.toLowerCase()}`, {
      responses: { 204: undefined },
    }),

  getTemplate: (templateId: string) =>
    http.get(`${basePath}/templates/${templateId}`, {
      responses: { 200: rapgenerator },
      headers: { Accept: accept },
    }),

  listTemplates: () =>
    http.get(`${basePath}/templates`, {
      responses: { 200: rapgenerator },
      headers: { Accept: accept },
    }),

  generate: (templateId: string, options?: { corrNr?: string }) =>
    http.post(`${basePath}/templates/${templateId}/generate`, {
      responses: { 200: rapgenerator },
      headers: {
        Accept: accept,
        'Content-Type': contentType,
      },
      query: options?.corrNr ? { corrNr: options.corrNr } : undefined,
    }),
};

export type RapGeneratorContract = typeof rapGeneratorContract;
