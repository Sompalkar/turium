export interface TextChunk {
  text: string;
  charStart: number;
  charEnd: number;
}

interface Span {
  text: string;
  start: number;
  end: number;
}

export interface ChunkOptions {
  maxChars: number;
  overlapChars: number;
}

// Split on the biggest natural boundary that fits, then pack pieces back up to maxChars.
export function chunkText(source: string, options: ChunkOptions): TextChunk[] {
  const text = source.trim();
  if (text.length === 0) return [];

  const segments = toSegments({ text, start: 0, end: text.length }, options.maxChars);
  return pack(segments, options);
}

function toSegments(span: Span, maxChars: number): Span[] {
  if (span.text.length <= maxChars) return [span];

  for (const pattern of [/\n{2,}/g, /\n/g, /(?<=[.!?])\s+/g]) {
    const parts = splitSpan(span, pattern);
    if (parts.length > 1) return parts.flatMap((part) => toSegments(part, maxChars));
  }

  return sliceSpan(span, maxChars);
}

function splitSpan(span: Span, pattern: RegExp): Span[] {
  const parts: Span[] = [];
  let cursor = 0;

  for (const match of span.text.matchAll(pattern)) {
    push(parts, span, cursor, match.index);
    cursor = match.index + match[0].length;
  }
  push(parts, span, cursor, span.text.length);

  return parts;
}

// A run of text with no boundary left to split on, so cut it by length.
function sliceSpan(span: Span, maxChars: number): Span[] {
  const parts: Span[] = [];
  for (let cursor = 0; cursor < span.text.length; cursor += maxChars) {
    push(parts, span, cursor, Math.min(cursor + maxChars, span.text.length));
  }
  return parts;
}

function push(parts: Span[], parent: Span, from: number, to: number) {
  const raw = parent.text.slice(from, to);
  const text = raw.trim();
  if (text.length === 0) return;

  const leading = raw.length - raw.trimStart().length;
  parts.push({
    text,
    start: parent.start + from + leading,
    end: parent.start + from + leading + text.length,
  });
}

function pack(segments: Span[], options: ChunkOptions): TextChunk[] {
  const chunks: TextChunk[] = [];
  let current: Span[] = [];

  for (const segment of segments) {
    const wouldOverflow = current.length > 0 && joinedLength(current) + 1 + segment.text.length > options.maxChars;
    if (wouldOverflow) {
      chunks.push(toChunk(current));
      current = overlapTail(current, options.overlapChars);
    }
    current.push(segment);
  }

  if (current.length > 0) chunks.push(toChunk(current));
  return chunks;
}

// Repeat the end of the previous chunk so an answer is not cut in half at the seam.
function overlapTail(segments: Span[], overlapChars: number): Span[] {
  const tail: Span[] = [];
  let length = 0;

  for (let i = segments.length - 1; i > 0; i -= 1) {
    const next = length === 0 ? segments[i]!.text.length : length + 1 + segments[i]!.text.length;
    if (next > overlapChars) break;
    tail.unshift(segments[i]!);
    length = next;
  }

  return tail;
}

function joinedLength(segments: Span[]): number {
  return segments.reduce((total, segment) => total + segment.text.length, 0) + segments.length - 1;
}

function toChunk(segments: Span[]): TextChunk {
  return {
    text: segments.map((segment) => segment.text).join("\n"),
    charStart: segments[0]!.start,
    charEnd: segments[segments.length - 1]!.end,
  };
}
