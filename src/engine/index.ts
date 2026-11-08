/**
 * The shared engine: the part of EconQuest that runs unchanged on the server, in the phone app
 * and in the tests. It talks to the device only through the Platform object it is given (see
 * src/platform/types.ts) and never imports Node, Express or phone-only modules. A test
 * (tests/engineBoundary.test.ts) fails any change that breaks this rule.
 *
 * Code moves in here a piece at a time (stores, feeds, AI, council), each move its own small PR.
 */
export type { Platform } from '../platform/types';

/** Bumped when the engine's stored formats change in a way older app versions cannot read. */
export const ENGINE_FORMAT_VERSION = 1;
