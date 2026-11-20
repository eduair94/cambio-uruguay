/** Share of the "¿Te sirvió?" box that has to be on screen, same bar as `recommendation_view`. */
export const HELPFUL_VIEW_RATIO = 0.5

/**
 * When `helpful_view` counts. It used to be sent on mount, with the box 13-58 phone screens below
 * the reader, which made it read as "reached the end" for about 15 times more views than really
 * got there. Now it needs the box half visible with the tab visible, and the dedupe is the one it
 * already had: once per page, against the last page counted (going back to a page is another view).
 */
export function createHelpfulExposure() {
  let viewed: string | null = null
  return {
    seen(path: string) {
      return viewed === path
    },
    observe(path: string | null | undefined, ratio: number, pageVisible: boolean) {
      if (
        !path ||
        !pageVisible ||
        !Number.isFinite(ratio) ||
        ratio < HELPFUL_VIEW_RATIO ||
        ratio > 1 ||
        viewed === path
      )
        return null
      viewed = path
      return { content_path: path }
    },
  }
}
