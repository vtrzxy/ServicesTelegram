"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Server } from "lucide-react";
import { DemoProvider } from "./demo-provider";
import { AppShell } from "./app-shell";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path !== "/")
    return (
      <DemoProvider>
        <AppShell>{children}</AppShell>
      </DemoProvider>
    );
  return (
    <div className="simple-app">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="simple-header inventory-header">
        <Link href="/" className="simple-brand">
          <Server size={25} />
          <div>
            <strong>ServicesTelegram</strong>
            <small>Inventário dos servidores</small>
          </div>
        </Link>
        <nav aria-label="Navegação principal" className="simple-nav">
          <Link href="/" aria-current="page">
            Inventário real
          </Link>
          <Link href="/telegram">
            Telegram <small>demonstração</small>
          </Link>
        </nav>
        <span className="inventory-readonly">Somente leitura</span>
      </header>
      <main id="conteudo" className="simple-content">
        {children}
      </main>
      <footer className="simple-footer">
        Agente Windows → central local → inventário web. Nenhuma ação de controle está habilitada
        nesta etapa.
      </footer>
    </div>
  );
}
