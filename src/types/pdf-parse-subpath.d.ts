// pdf-parse v1.1.1 在子路径 lib/pdf-parse.js 下没有自带类型声明
// 已知签名：default export 是一个函数，接收 Buffer/Uint8Array，返回 { text, numpages, ... }
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }
  const pdfParse: (
    data: Buffer | Uint8Array | string,
    options?: Record<string, unknown>
  ) => Promise<PdfParseResult>;
  export default pdfParse;
}
