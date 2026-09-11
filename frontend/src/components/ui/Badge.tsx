import type { SourceType } from "../../api/types.js";

export function Badge({ sourceType }: { sourceType: SourceType }) {
  return <span className={`badge badge-${sourceType}`}>{sourceType}</span>;
}
