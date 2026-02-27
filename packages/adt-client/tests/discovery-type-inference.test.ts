/**
 * Discovery Type Inference Test
 *
 * Verifies that discovery response types are correctly inferred
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { DiscoverySchema } from '../src/adt/discovery/discovery.schema';
import type { InferSchema } from '../src/base/schema';

describe('Discovery Type Inference', () => {
  it('DiscoverySchema should have _infer property for type inference', () => {
    // Check that the schema has the _infer property
    assert.ok(
      '_infer' in DiscoverySchema,
      'Schema should have _infer property',
    );
  });

  it('should infer correct type from DiscoverySchema', () => {
    // Type test: InferSchema should extract the correct type
    type DiscoveryType = InferSchema<typeof DiscoverySchema>;

    // This should compile if type inference works
    const mockDiscovery: DiscoveryType = {
      workspace: [
        {
          title: 'Test Workspace',
          collection: [
            {
              href: '/test',
              title: 'Test Collection',
              accept: 'application/xml',
              category: {
                term: 'test',
                scheme: 'http://example.com/scheme',
              },
              templateLinks: {
                templateLink: [],
              },
            },
          ],
        },
      ],
    };

    assert.strictEqual(mockDiscovery.workspace[0].title, 'Test Workspace');
  });
});
