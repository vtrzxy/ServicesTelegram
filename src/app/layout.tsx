import type { Metadata } from "next";
import { DemoProvider } from "@/components/demo-provider";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Núcleo · Controle de infraestrutura", template: "%s · Núcleo" },
  description:
    "Demonstração de gerenciamento de serviços Windows e TOTVS Protheus. Dados e operações simulados.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <DemoProvider>
          <AppShell>{children}</AppShell>
        </DemoProvider>
      </body>
    </html>
  );
}
