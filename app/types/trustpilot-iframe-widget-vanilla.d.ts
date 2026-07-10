// The package's export map declares `types` only for the root entry, and the
// root entry imports React (which we do not depend on). We import the vanilla
// UMD subpath instead, which ships no declarations — hence this shim.
declare module 'trustpilot-iframe-widget/vanilla' {
  import type { TrustpilotWidgetConfig } from '~/utils/trustpilot'

  export interface TrustpilotWidgetHandle {
    updateConfig(config: Partial<TrustpilotWidgetConfig>): void
    destroy(): void
    isWidgetReady(): boolean
  }

  export interface CreateWidgetOptions extends TrustpilotWidgetConfig {
    target: HTMLElement | string
    onReady?: () => void
    onError?: (error: unknown) => void
  }

  export function createTrustpilotWidget(options: CreateWidgetOptions): TrustpilotWidgetHandle
}
