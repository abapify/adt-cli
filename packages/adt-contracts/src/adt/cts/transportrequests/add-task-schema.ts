import type { Serializable } from '../../../base';
import { transportmanagment, type InferTypedSchema } from '../../../schemas';

export interface AddTaskBody {
  root: {
    targetuser: string;
  };
}

type TransportManagementBody = InferTypedSchema<typeof transportmanagment>;

/** Narrow body used by SAP's hypermedia `newtask` relation. */
export const addTaskBodySchema: Serializable<AddTaskBody> = {
  _infer: undefined as unknown as AddTaskBody,
  parse: (raw: string): AddTaskBody => {
    const parsed = transportmanagment.parse(raw);
    const root = parsed?.root;
    if (!root?.targetuser) {
      throw new Error('Invalid CTS add-task body');
    }
    return { root: { targetuser: root.targetuser } };
  },
  build: (body: AddTaskBody): string =>
    transportmanagment.build(body as unknown as TransportManagementBody),
};
