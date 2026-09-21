// Uniform tool result for the site-backed tools: readable Spanish text for the
// model to quote, plus a compact structured payload it can reason over.

import { SiteError } from "./site.js";

export interface ToolOutput {
  text: string;
  data: Record<string, unknown>;
}

export function toolResult(out: ToolOutput) {
  return {
    content: [{ type: "text" as const, text: out.text }],
    structuredContent: out.data,
  };
}

export function toolError(error: unknown) {
  const text =
    error instanceof SiteError || error instanceof UserInputError
      ? error.message
      : `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
  return { isError: true as const, content: [{ type: "text" as const, text }] };
}

/** A problem with what the caller asked for (not with the site): the message says how to fix it. */
export class UserInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserInputError";
  }
}

/** Wrap a handler so failures come back as MCP tool errors instead of protocol errors. */
export function safe<I>(fn: (input: I) => Promise<ToolOutput>) {
  return async (input: I) => {
    try {
      return toolResult(await fn(input));
    } catch (error) {
      return toolError(error);
    }
  };
}
