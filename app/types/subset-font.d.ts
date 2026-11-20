// subset-font ships no types. Only what modules/mdi-subset.ts uses.
declare module 'subset-font' {
  export default function subsetFont(
    font: Buffer | Uint8Array,
    text: string,
    options?: { targetFormat?: 'sfnt' | 'woff' | 'woff2' | 'truetype' }
  ): Promise<Buffer>
}
