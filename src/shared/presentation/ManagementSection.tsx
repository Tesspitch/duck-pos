import { type PropsWithChildren, useId } from 'react'

export function ManagementSection({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  const id = useId()
  return <section aria-labelledby={id} className="management-section"><header><h2 id={id}>{title}</h2><p>{description}</p></header><div className="management-section-body">{children}</div></section>
}
