/**
 * /sap/bc/adt/codeassistance/completion
 */

import { contract, http } from '../../base';
import {
  completionRequestSchema,
  completionResponseSchema,
  type CompletionQuery,
} from './schema';

export const completion = contract({
  post: (query: CompletionQuery) =>
    http.post('/sap/bc/adt/codeassistance/completion', {
      body: completionRequestSchema,
      responses: { 200: completionResponseSchema },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      query,
    }),
});

export type CompletionContract = typeof completion;
