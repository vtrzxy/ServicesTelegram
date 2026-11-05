import type { Metadata } from "next";
import { WorkspaceShell } from "@/components/workspace-shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "ServicesTelegram · Serviços dos servidores",
    template: "%s · ServicesTelegram",
  },
  description:
    "Inventário de serviços recebido dos agentes Windows na central local. Prévia separada da operação pelo Telegram.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
