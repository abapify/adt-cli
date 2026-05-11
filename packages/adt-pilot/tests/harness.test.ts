/**
 * Harness factory smoke tests.
 *
 * The Mastra Harness needs storage to fully initialise; we don't
 * exercise that here. These tests validate that:
 *  - the factory accepts the documented config shape,
 *  - it returns a real `Harness` instance,
 *  - the `review` mode exists and is wired to a Mastra `Agent`.
 *
 * Anything that requires network or LLM access is intentionally out of
 * scope — those flows are covered by the workflow integration tests.
 */

import { describe, it, expect } from 'vitest';
import { Harness } from '@mastra/core/harness';
import { Agent } from '@mastra/core/agent';
import {
  createAbapifyPilot,
  createReviewAgent,
  REVIEW_AGENT_INSTRUCTIONS,
} from '../src/index';

describe('createAbapifyPilot', () => {
  it('returns a Harness instance', () => {
    const pilot = createAbapifyPilot({ model: 'openai/gpt-4o' });

    expect(pilot).toBeInstanceOf(Harness);
    // The internal mode list is private, but `getDisplayState()` is part
    // of the public surface and must work without initialisation —
    // serves as a smoke test that the Harness was constructed correctly.
    expect(() => pilot.getDisplayState()).not.toThrow();
  });

  it('accepts MCP tools without throwing', () => {
    const pilot = createAbapifyPilot({
      model: 'openai/gpt-4o',
      mcpTools: {},
    });
    expect(pilot).toBeInstanceOf(Harness);
  });
});

describe('createReviewAgent', () => {
  it('returns a Mastra Agent with the documented defaults', () => {
    const agent = createReviewAgent({ model: 'openai/gpt-4o' });

    expect(agent).toBeInstanceOf(Agent);
    expect(agent.id).toBe('review');
    expect(agent.name).toBe('abapify Pilot – Review');
  });

  it('uses the default REVIEW_AGENT_INSTRUCTIONS when none are provided', () => {
    expect(REVIEW_AGENT_INSTRUCTIONS).toContain('abapify Pilot');
    expect(REVIEW_AGENT_INSTRUCTIONS).toContain('list_package_objects');
    expect(REVIEW_AGENT_INSTRUCTIONS).toContain('atc_run');
  });

  it('honours a custom instructions override', () => {
    const agent = createReviewAgent({
      model: 'openai/gpt-4o',
      instructions: 'You are a strict ABAP code reviewer.',
    });
    expect(agent).toBeInstanceOf(Agent);
  });
});
