const serverConfig = {
  // 3528 in production. `API_PORT` exists so a second copy of the API can be run
  // locally while a dev server already holds 3528 — deliberately NOT `PORT`,
  // which half the world's tooling sets for its own reasons.
  port: Number(process.env.API_PORT) || 3528,
};

export { serverConfig };

// Sleep function with promise receiving ms as parameter, await promise, setTimeout 100
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
