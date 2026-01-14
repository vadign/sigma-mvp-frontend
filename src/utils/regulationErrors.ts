import { AxiosError } from 'axios';

export async function readErrorPayload(resp: Response | AxiosError | any): Promise<{ status?: number; rawText?: string; json?: any }> {
  try {
    if (resp instanceof Response) {
      const status = resp.status;
      try {
        const json = await resp.clone().json();
        return { status, json };
      } catch {
        try {
          const rawText = await resp.clone().text();
          return { status, rawText };
        } catch {
          return { status };
        }
      }
    }

    const axiosLike: AxiosError | undefined = resp?.isAxiosError ? resp : undefined;
    if (axiosLike) {
      const status = axiosLike.response?.status;
      const data = axiosLike.response?.data;
      if (typeof data === 'string') {
        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = undefined;
        }
        return { status, rawText: data, json: parsed };
      }
      if (data !== undefined) {
        return { status, json: data };
      }
      return { status, rawText: axiosLike.message };
    }

    if (resp && typeof resp === 'object' && 'response' in resp) {
      const response: any = (resp as any).response;
      const status = response?.status;
      const data = response?.data;
      if (typeof data === 'string') {
        let parsed: any;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = undefined;
        }
        return { status, rawText: data, json: parsed };
      }
      if (data !== undefined) return { status, json: data };
    }
  } catch (e) {
    return { rawText: (e as Error)?.message };
  }

  return {};
}

export function parseFusekiDescription(desc: string): { line?: number; message: string; caretFragment?: string } {
  let cleaned = desc;
  cleaned = cleaned.replace(/^b['"]/, '').replace(/['"]$/, '');
  cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

  const lineMatch = cleaned.match(/at line\s+(\d+)/i);
  const line = lineMatch ? Number(lineMatch[1]) : undefined;

  let message = cleaned;
  const afterColon = cleaned.split(':\n');
  if (afterColon.length > 1) {
    message = afterColon.slice(1).join(':\n');
  }
  message = message.replace(/\s*at \^.*$/s, '');
  message = message.replace(/\s*in:\s*$/s, '');
  message = message.trim();

  const caretMatch = cleaned.match(/at \^ in:\s*\n([\s\S]+)/i);
  const caretFragment = caretMatch ? caretMatch[1].trim() : undefined;

  return { line, message: message || cleaned.trim(), caretFragment };
}

export function buildCodeFrame(text: string, line: number, contextLines = 3): { startLine: number; lines: string[] } {
  const rows = text.split(/\r?\n/);
  const start = Math.max(1, line - contextLines);
  const end = Math.min(rows.length, line + contextLines);
  return {
    startLine: start,
    lines: rows.slice(start - 1, end),
  };
}

export function tryLocateCaretColumn(desc: string): number | undefined {
  const caretSection = desc.split('at ^ in:')[1];
  if (!caretSection) return undefined;
  const lineWithCaret = caretSection.split(/\r?\n/).find((l) => l.includes('^'));
  if (!lineWithCaret) return undefined;
  const caretIndex = lineWithCaret.indexOf('^');
  return caretIndex >= 0 ? caretIndex + 1 : undefined;
}
