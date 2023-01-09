const serverConfig = {
  port: 3528,
};

export { serverConfig };

// Sleep function with promise receiving ms as parameter, await promise, setTimeout 100
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
