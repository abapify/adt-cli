/**
 * /sap/bc/adt/datapreview
 *
 * ADT Data Preview endpoints (ABAP SQL execution, value helps, etc.)
 */

import { freestyle, type FreestyleContract } from './freestyle';

export { freestyle, type FreestyleContract } from './freestyle';
export type {
  DataPreviewFreestyleResponse,
  DataPreviewColumn,
  DataPreviewColumnMetadata,
  DataPreviewPayload,
} from './schema';

export interface DatapreviewContract {
  freestyle: FreestyleContract;
}

export const datapreviewContract: DatapreviewContract = {
  freestyle,
};
