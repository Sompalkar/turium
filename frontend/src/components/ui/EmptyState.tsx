interface Props {
  title: string;
  hint: string;
}

export function EmptyState({ title, hint }: Props) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  );
}
