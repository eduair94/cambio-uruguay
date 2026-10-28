// Every tool in this server only reads public data (rates API, site API, Google News):
// nothing is created, sent, paid or deleted. Clients use these hints to auto-approve
// safe reads, so all four are spelled out instead of leaving the defaults implied
// (the spec defaults destructiveHint to true when it is absent).

export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;
