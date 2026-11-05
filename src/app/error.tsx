"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty" role="alert">
      <h1>Não foi possível abrir esta área</h1>
      <p>
        Os dados são fictícios. Tente carregar a página novamente ou restaure a demonstração pelo
        menu.
      </p>
      <button className="button primary" onClick={reset}>
        Tentar novamente
      </button>
    </section>
  );
}
