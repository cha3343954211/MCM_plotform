// 通过文件头 magic bytes 判定真实类型，防止扩展名伪装。
// 仅覆盖平台允许上传的文档/压缩/图片类型；未识别返回 null，由调用方决定是否放行。

export type DetectedFileType =
  | 'pdf'
  | 'zip'   // 含 docx/xlsx/pptx（其本质是 zip）
  | 'rar'
  | '7z'
  | 'doc'   // 旧版 OLE 文档（含 doc/xls/ppt）
  | 'png'
  | 'jpg'
  | 'gif'
  | 'webp'
  | 'tex'   // 纯文本，按 ASCII 启发式判断
  | 'txt'
  | null;

function startsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false;
  }
  return true;
}

export function detectFileType(buf: Uint8Array): DetectedFileType {
  if (!buf || buf.length < 4) return null;

  // PDF: %PDF
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return 'pdf';

  // ZIP / docx / xlsx / pptx: PK\x03\x04 或 PK\x05\x06 (空) 或 PK\x07\x08
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  if (startsWith(buf, [0x50, 0x4b, 0x05, 0x06])) return 'zip';
  if (startsWith(buf, [0x50, 0x4b, 0x07, 0x08])) return 'zip';

  // RAR v4: Rar!\x1A\x07\x00 / v5: Rar!\x1A\x07\x01\x00
  if (startsWith(buf, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07])) return 'rar';

  // 7z: 7z\xBC\xAF\x27\x1C
  if (startsWith(buf, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return '7z';

  // OLE2 (旧 doc/xls/ppt): D0 CF 11 E0 A1 B1 1A E1
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';

  // JPG: FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return 'jpg';

  // GIF: GIF87a / GIF89a
  if (startsWith(buf, [0x47, 0x49, 0x46, 0x38])) return 'gif';

  // WEBP: RIFF....WEBP
  if (startsWith(buf, [0x52, 0x49, 0x46, 0x46]) && startsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';

  // 纯文本（用于 .tex/.txt/.md）：检查前 512 字节是否为可打印 ASCII / UTF-8
  const sample = buf.subarray(0, Math.min(buf.length, 512));
  let textLike = true;
  for (let i = 0; i < sample.length; i++) {
    const c = sample[i]!;
    // 允许常见空白与可打印字符 + 任意 >=0x80（UTF-8 多字节序列）
    if (c === 0) { textLike = false; break; }
    if (c < 0x09) { textLike = false; break; }
    if (c > 0x0d && c < 0x20) { textLike = false; break; }
  }
  if (textLike) return 'txt';

  return null;
}

// 扩展名 -> 允许的检测类型集合
const EXT_ALLOW: Record<string, DetectedFileType[]> = {
  '.pdf': ['pdf'],
  '.zip': ['zip'],
  '.rar': ['rar'],
  '.7z': ['7z'],
  '.docx': ['zip'],
  '.xlsx': ['zip'],
  '.pptx': ['zip'],
  '.doc': ['doc'],
  '.xls': ['doc'],
  '.ppt': ['doc'],
  '.png': ['png'],
  '.jpg': ['jpg'],
  '.jpeg': ['jpg'],
  '.gif': ['gif'],
  '.webp': ['webp'],
  '.tex': ['txt'],
  '.txt': ['txt'],
  '.md': ['txt'],
  '.csv': ['txt'],
};

/**
 * 校验扩展名与文件实际内容是否一致。
 * @returns 通过返回 null；否则返回错误信息。
 */
export function validateUpload(fileName: string, buf: Uint8Array): string | null {
  const lower = (fileName || '').toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return null; // 无扩展名，跳过严格校验
  const ext = lower.slice(dot);
  const allow = EXT_ALLOW[ext];
  if (!allow) return null; // 未知扩展名由上层白名单控制；这里不阻止
  const detected = detectFileType(buf);
  if (!detected) return `文件 "${fileName}" 类型未知，可能损坏或被伪装`;
  if (!allow.includes(detected)) {
    return `文件 "${fileName}" 实际类型为 ${detected}，与扩展名 ${ext} 不符`;
  }
  return null;
}
