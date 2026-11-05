import Link from "next/link";
export default function NotFound() {
  return (
    <section className="empty">
      <h1>Página não encontrada</h1>
      <p>Esse endereço não faz parte da demonstração.</p>
      <Link className="button primary" href="/">
        Voltar à prévia do Telegram
      </Link>
    </section>
  );
}
