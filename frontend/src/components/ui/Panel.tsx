import type { ReactNode } from "react";

interface Props {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Panel({ title, action, children }: Props) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
