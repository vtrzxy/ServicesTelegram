"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { MessageCircle, Settings2, RotateCcw } from "lucide-react";
import { ROLE_LABELS, Role, USERS } from "@/domain/types";
import { useDemo } from "./demo-provider";
import { Dialog } from "./ui";
export function AppShell({ children }: { children: ReactNode }) {
  const { state, api } = useDemo();
  const path = usePathname();
  const [reset, setReset] = useState(false);
  return (
    <div className="simple-app">
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <header className="simple-header">
        <Link href="/" className="simple-brand">
          <MessageCircle size={25} />
          <div>
            <strong>ServicesTelegram</strong>
            <small>Serviços e atualizações dos servidores</small>
          </div>
        </Link>
        <nav aria-label="Navegação principal" className="simple-nav">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            <MessageCircle size={16} />
            Telegram <small>prévia</small>
          </Link>
          <Link href="/configuracao" aria-current={path === "/configuracao" ? "page" : undefined}>
            <Settings2 size={16} />
            Configuração
          </Link>
        </nav>
        <label className="profile-picker">
          <span>{USERS[state.role].name} · demonstração</span>
          <select
            aria-label="Simular perfil"
            value={state.role}
            onChange={(e) => api.setRole(e.target.value as Role)}
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="simple-demo">
        <span>Demonstração · dados e operações simulados · bot ainda não conectado</span>
        <button onClick={() => setReset(true)}>
          <RotateCcw size={13} />
          Restaurar
        </button>
      </div>
      <main id="conteudo" className="simple-content">
        {children}
      </main>
      <footer className="simple-footer">
        A operação será pelo Telegram. A web serve para configurar serviços e ações. Agentes
        consultam a API da central por conexão de saída.
      </footer>
      {reset && (
        <Dialog title="Restaurar demonstração" onClose={() => setReset(false)}>
          <div className="dialog-body">
            <p>
              Limpar configurações e histórico fictícios deste navegador e voltar ao exemplo
              inicial?
            </p>
          </div>
          <div className="dialog-footer">
            <button className="button secondary" onClick={() => setReset(false)}>
              Manter dados
            </button>
            <button
              className="button danger"
              onClick={() => {
                api.reset();
                window.location.reload();
              }}
            >
              Restaurar dados fictícios
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
