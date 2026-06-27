declare module 'mammoth' {
  interface ConversionResult {
    value:    string
    messages: any[]
  }
  export function extractRawText(options: { buffer: Buffer | ArrayBuffer }): Promise<ConversionResult>
  export function convertToHtml(options: { buffer: Buffer | ArrayBuffer }): Promise<ConversionResult>
}
