type PlaceholderPageProps = {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section aria-labelledby="page-title" className="page">
      <h1 id="page-title">{title}</h1>
      <div className="placeholder-card">
        <p>{description}</p>
        <p className="placeholder-card__hint">此页面将在后续计划中实现。</p>
      </div>
    </section>
  )
}
