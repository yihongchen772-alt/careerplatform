import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Who the current request acts for when it has no session cookie. Only
 * withExtensionUser sets this, so a pairing code works on the extension's
 * routes and nowhere else.
 */
export const requestUser = new AsyncLocalStorage<string>();
