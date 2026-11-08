/**
 * Transport Request/Task Loader
 *
 * Uses adt-contracts for type-safe XML parsing.
 */

import {
  transportmanagmentSingle,
  type TransportResponse,
} from '@abapify/adt-contracts';

// Re-export the schema for type inference
export { transportmanagmentSingle as schema };

// Use type from contracts package
type TransportRoot = TransportResponse;

// Extract nested types - TransportResponse has root.request structure
export type Request = NonNullable<
  NonNullable<TransportRoot['root']>['request']
>;
export type Task = NonNullable<Request['task']>[number];
export type AbapObject = NonNullable<Task['abap_object']>[number];

/**
 * Parsed transport data with computed properties
 */
export interface TransportData {
  /** Whether this is a task (vs request) */
  isTask: boolean;
  /** Transport/Task number */
  number: string;
  /** Parent request number (for tasks) */
  parent?: string;
  /** Owner user ID */
  owner: string;
  /** Description */
  desc: string;
  /** Transport type */
  type: string;
  /** Status code (D=Modifiable, R=Released, O=Protected) */
  status: string;
  /** Status text */
  statusText: string;
  /** Target system */
  target: string;
  /** Target description */
  targetDesc: string;
  /** Child tasks (for requests) */
  tasks: TaskInfo[];
  /** Objects (for tasks) */
  objects: ObjectInfo[];
  /** Raw parsed data */
  raw: TransportRoot;
}

export interface TaskInfo {
  number: string;
  owner: string;
  desc: string;
  status: string;
  statusText: string;
  uri: string;
}

export interface ObjectInfo {
  pgmid: string;
  type: string;
  name: string;
  info: string;
  lockStatus: string;
  uri?: string;
}

/**
 * Load and parse transport request/task XML
 */
export function load(xml: string): TransportData {
  const parsed = transportmanagmentSingle.parse(xml);
  return transformToTransportData(parsed);
}

/**
 * Normalize an XSD element that may appear once or many times.
 */
function asArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

/** Child tasks for a request view (always empty for task views). */
function extractTasks(request: Request, isTask: boolean): TaskInfo[] {
  const tasks: TaskInfo[] = [];
  if (request.task && !isTask) {
    for (const task of asArray<Task>(request.task)) {
      tasks.push({
        number: task.number ?? '',
        owner: task.owner ?? '',
        desc: task.desc ?? '',
        status: task.status ?? '',
        statusText: task.status_text ?? '',
        uri: task.uri ?? '',
      });
    }
  }
  return tasks;
}

/** Objects carried by the task element (task views only). */
function extractObjects(request: Request, isTask: boolean): ObjectInfo[] {
  const objects: ObjectInfo[] = [];
  if (!request.task || !isTask) return objects;

  // When viewing a task, the task element contains objects
  for (const task of asArray<Task>(request.task)) {
    if (task.abap_object) {
      for (const obj of asArray<AbapObject>(task.abap_object)) {
        objects.push({
          pgmid: obj.pgmid ?? '',
          type: obj.type ?? '',
          name: obj.name ?? '',
          info: obj.obj_info ?? obj.obj_desc ?? '',
          lockStatus: obj.lock_status ?? '',
          uri: obj.uri,
        });
      }
    }
  }
  return objects;
}

/**
 * Transform parsed XSD data to TransportData
 */
function transformToTransportData(data: TransportRoot): TransportData {
  const request = data.root?.request;

  if (!request) {
    throw new Error('No request element found in transport data');
  }

  // Check if this is a task view (has parent) or request view
  const isTask = !!request.parent;

  return {
    isTask,
    number: request.number ?? '',
    parent: request.parent,
    owner: request.owner ?? '',
    desc: request.desc ?? '',
    type: request.type ?? '',
    status: request.status ?? '',
    statusText: request.status_text ?? '',
    target: request.target ?? '',
    targetDesc: request.target_desc ?? '',
    tasks: extractTasks(request, isTask),
    objects: extractObjects(request, isTask),
    raw: data,
  };
}
