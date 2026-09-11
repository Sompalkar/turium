export type SourceType = "note" | "url";

export interface Item {
  id: string;
  sourceType: SourceType;
  title: string;
  sourceUrl: string | null;
  content: string;
  createdAt: string;
}

// What the list endpoint returns. Metadata plus a preview, not the whole body.
export interface ItemSummary {
  id: string;
  sourceType: SourceType;
  title: string;
  sourceUrl: string | null;
  preview: string;
  contentLength: number;
  createdAt: string;
}

const PREVIEW_LENGTH = 240;

export function toSummary(item: Item): ItemSummary {
  const preview =
    item.content.length > PREVIEW_LENGTH
      ? `${item.content.slice(0, PREVIEW_LENGTH).trimEnd()}…`
      : item.content;

  return {
    id: item.id,
    sourceType: item.sourceType,
    title: item.title,
    sourceUrl: item.sourceUrl,
    preview,
    contentLength: item.content.length,
    createdAt: item.createdAt,
  };
}
