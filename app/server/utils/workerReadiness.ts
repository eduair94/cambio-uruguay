export const WORKER_READINESS_PATH = '/acerca'
// Stay below PM2's ten-minute listen timeout, including the failure path.
export const WORKER_READINESS_TIMEOUT_MS = 9 * 60 * 1000

interface WarmupResponse {
  status: number
  text(): Promise<string>
}

export function needsWorkerReadiness(dev: boolean, pmId: string | undefined, hasIpc: boolean) {
  return !dev && pmId !== undefined && hasIpc
}

/** Framework-free so failed SSR and an unfinished body can never announce readiness. */
export async function warmWorkerBeforeReady(
  renderPage: () => Promise<WarmupResponse>,
  announceReady: () => void,
  timeoutMs = WORKER_READINESS_TIMEOUT_MS
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const html = await Promise.race([
      (async () => {
        const response = await renderPage()
        if (response.status !== 200) {
          throw new Error(`SSR warmup returned HTTP ${response.status}`)
        }
        return response.text()
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('SSR warmup timed out')), timeoutMs)
      }),
    ])

    const heading = html.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1\s*>/i)?.[1]
    const headingText = heading
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!headingText?.includes('Cambio Uruguay')) {
      throw new Error('SSR warmup did not render the expected page heading')
    }

    announceReady()
  } finally {
    clearTimeout(timeout)
  }
}
