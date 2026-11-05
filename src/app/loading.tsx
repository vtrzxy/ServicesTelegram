export default function Loading() {
  return (
    <div className="loading-page" role="status">
      <div className="skeleton" />
      <div className="skeleton tall" />
      <span className="sr-only">Carregando área do painel</span>
    </div>
  );
}
