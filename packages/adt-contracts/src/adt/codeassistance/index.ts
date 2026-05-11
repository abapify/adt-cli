import { completion, type CompletionContract } from './completion';

export * from './completion';
export * from './schema';

export interface CodeassistanceContract {
  completion: CompletionContract;
}

export const codeassistanceContract: CodeassistanceContract = {
  completion,
};
