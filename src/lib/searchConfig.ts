import type { FilterChip } from '../data/search';

/**
 * A configured search, held outside React for the SPA's lifetime.
 *
 * Every route renders its own AppShell, so moving to Candidates and back
 * unmounts the search screen and mounts a new one. With the flow in local
 * state, a search you had already configured reopened at the cold start with an
 * empty brief — the same remount that used to reset the sidebar's width.
 *
 * It lives in its own module rather than in the store or in the screen: the
 * store resets it and the screen reads and writes it, and having either own it
 * makes those two import each other.
 *
 * `building` is deliberately absent. The parsing pass is a thing you watch
 * once; coming back should land on the configuration it produced, not replay
 * the production of it.
 */
export interface SearchConfig {
  brief: string;
  draft: string;
  answers: Record<string, string>;
  filters: FilterChip[];
}

let configured: SearchConfig | null = null;

export const getSearchConfig = () => configured;
export const setSearchConfig = (c: SearchConfig) => { configured = c; };

/** "Start again" on the search screen, and the demo reset. */
export const clearSearchConfig = () => { configured = null; };
