"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Boxes,
  ChevronDown,
  CircleHelp,
  Download,
  FlaskConical,
  History,
  LayoutDashboard,
  Menu,
  MessageCircle,
  PanelLeftClose,
  RotateCcw,
  Server,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { ROLE_LABELS, Role, USERS } from "@/domain/types";
import { dateTime } from "@/lib/format";
import { useDemo } from "./demo-provider";
import { Badge, Dialog } from "./ui";
const nav = [
  { href: "/", name: "Visão geral", icon: LayoutDashboard },
  { href: "/servidores", name: "Servidores", icon: Server },
  { href: "/servicos", name: "Serviços", icon: Boxes },
  { href: "/atualizacoes", name: "Atualizações", icon: Download },
  { href: "/operacoes", name: "Operações e histórico", icon: History },
  { href: "/telegram", name: "Telegram e mensagens", icon: MessageCircle },
  { href: "/acessos", name: "Acessos e políticas", icon: ShieldCheck },
];
export function AppShell({ children }: { children: ReactNode }) {
  const { state, api, notify } = useDemo();
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mobile)
      document.getElementById("app-navigation")?.querySelector<HTMLAnchorElement>("a")?.focus();
  }, [mobile]);
  const closeMenu = () => {
    setMobile(false);
    menuButton.current?.focus();
  };
  const [reset, setReset] = useState(false);
  const [help, setHelp] = useState(false);
  const selected = state.servers.find((s) => s.id === state.selectedServerId)!;
  const user = USERS[state.role];
  const pending = state.operations.filter((o) =>
    ["pending", "running", "unknown"].includes(o.status),
  ).length;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      {mobile && (
        <button
          className="sidebar-overlay"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        id="app-navigation"
        className={`sidebar ${mobile ? "sidebar-open" : ""}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeMenu();
        }}
      >
        <Link href="/" className="brand" onClick={() => setMobile(false)}>
          <div className="brand-mark">
            <Activity size={23} />
          </div>
          <div>
            <strong>
              núcleo<span>.</span>
            </strong>
            <small>INFRAESTRUTURA & ERP</small>
          </div>
        </Link>
        <button className="mobile-close icon-button" onClick={closeMenu} aria-label="Fechar menu">
          <X size={20} />
        </button>
        <div className="nav-label">ÁREA DE TRABALHO</div>
        <nav aria-label="Navegação principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={path === item.href ? "page" : undefined}
              className={`nav-item ${path === item.href ? "active" : ""}`}
              onClick={() => setMobile(false)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
              {item.href === "/operacoes" && pending > 0 && (
                <span className="nav-count">{pending}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <FlaskConical size={17} />
            <div>
              <strong>Ambiente de demonstração</strong>
              <small>Sem conexão com servidores reais</small>
            </div>
          </div>
          <button className="nav-item" onClick={() => setReset(true)}>
            <RotateCcw size={17} />
            Restaurar demonstração
          </button>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            Sobre este protótipo
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-version">
            <span>Núcleo Control</span>
            <span>v1.0 · protótipo</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="header-context">
            <button
              className="icon-button mobile-menu"
              ref={menuButton}
              aria-expanded={mobile}
              aria-controls="app-navigation"
              onClick={() => setMobile(true)}
              aria-label="Abrir navegação"
            >
              <Menu size={21} />
            </button>
            <span className="context-icon">
              <Server size={18} />
            </span>
            <label className="server-picker">
              <span className="sr-only">Servidor selecionado</span>
              <select value={selected.id} onChange={(e) => api.selectServer(e.target.value)}>
                {state.servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            <span className="header-host mono">{selected.hostname}</span>
            <Badge tone={selected.environment === "Produção" ? "warn" : "blue"}>
              {selected.environment}
            </Badge>
          </div>
          <div className="header-user">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <label className="profile-picker">
              <span>{user.name} · demonstração</span>
              <select
                value={state.role}
                aria-label="Simular perfil"
                onChange={(e) => api.setRole(e.target.value as Role)}
              >
                {Object.entries(ROLE_LABELS).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <div className="demo-strip">
          <span>
            <FlaskConical size={14} />
            Demonstração — dados e operações simulados
          </span>
          <span className="demo-clock">{dateTime(state.now)} · São Paulo</span>
        </div>
        <main id="conteudo" className="main-content" key={path}>
          {children}
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={13} />
            Alterações exigem concessão explícita e confirmação.
          </span>
          <span>America/Sao_Paulo · dados fictícios</span>
        </footer>
      </div>
      {reset && (
        <Dialog title="Restaurar a demonstração" onClose={() => setReset(false)}>
          <div className="dialog-body">
            <p>
              Isso limpa as preferências, os nomes personalizados e o histórico fictício deste
              navegador. Os três servidores voltarão ao estado inicial.
            </p>
            <p className="muted">Nenhum servidor ou dado real é acessado.</p>
          </div>
          <div className="dialog-footer">
            <button className="button secondary" onClick={() => setReset(false)}>
              Manter demonstração
            </button>
            <button
              className="button danger"
              onClick={() => {
                api.reset();
                setReset(false);
                notify("Demonstração restaurada.");
              }}
            >
              Restaurar dados fictícios
            </button>
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog title="Sobre o Núcleo Control" onClose={() => setHelp(false)}>
          <div className="dialog-body">
            <p>
              Protótipo navegável para validar a administração de serviços Windows e TOTVS Protheus.
              Todos os nomes, pacotes e eventos são ilustrativos.
            </p>
            <p>
              A futura central C#/.NET ficará fora da Vercel. Cada agente Windows consultará a API
              da central por conexão de saída, sem portas de entrada abertas no servidor gerenciado.
            </p>
            <p>
              O bot não está conectado. Este painel não contém tokens, credenciais, execução remota
              nem autenticação de produção.
            </p>
          </div>
          <div className="dialog-footer">
            <button className="button primary" onClick={() => setHelp(false)}>
              Entendido
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
