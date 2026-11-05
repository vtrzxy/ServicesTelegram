import { DemoState, WindowsService } from "../domain/types";
export const DEFAULT_TEMPLATE =
  "{acao} · {servico}\nServidor: {servidor}\nAmbiente: {ambiente}\nResultado: {resultado}";
export const TEMPLATE_FIELDS = ["servidor", "ambiente", "servico", "acao", "resultado"] as const;
export function createSeed(now: number): DemoState {
  const services: WindowsService[] = [];
  const definitions = [
    ["app", "AppServer ERP", "TOTVS_AppServer_ERP_DEMO", "Protheus", "running"],
    ["db", "DBAccess compartilhado", "TOTVS_DBAccess_DEMO", "Protheus", "running"],
    ["broker", "Broker de conexões", "TOTVS_Broker_DEMO", "Protheus", "running"],
    ["license", "License Server", "TOTVS_License_DEMO", "Protheus", "running"],
    ["tss", "TSS fiscal", "TOTVS_TSS_DEMO", "Fiscal", "stopped"],
    ["schedule", "Schedule de rotinas", "TOTVS_Schedule_DEMO", "Protheus", "running"],
    ["rest", "Integrações REST", "TOTVS_REST_DEMO", "Integrações", "running"],
    ["job", "Processamento de relatórios", "ERP_Relatorios_DEMO", "Integrações", "stopped"],
    ["new", "Serviço descoberto", "NovoServico_DEMO", "Outros", "stopped"],
    ["agent", "Agente de gerenciamento", "ControleAgente_DEMO", "Sistema", "running"],
    ["firewall", "Firewall do Windows", "FirewallIlustrativo_DEMO", "Segurança", "running"],
    ["defender", "Proteção do servidor", "AntivirusIlustrativo_DEMO", "Segurança", "running"],
    ["event", "Registro de eventos", "EventosIlustrativo_DEMO", "Sistema", "running"],
    ["backup", "Backup corporativo", "BackupIlustrativo_DEMO", "Outros", "running"],
  ];
  for (const [index, serverId] of ["hml", "prd", "off"].entries()) {
    for (const [key, name, internalName, category, serviceState] of definitions.slice(
      0,
      index === 0 ? 14 : 7,
    )) {
      services.push({
        id: `${serverId}-${key}`,
        serverId,
        name:
          key === "app"
            ? `AppServer ${index === 0 ? "Homologação" : index === 1 ? "Produção" : "Filial"}`
            : name,
        internalName,
        category,
        state: serviceState as WindowsService["state"],
        observedAt: now - (serverId === "off" ? 8 * 60_000 : 12_000),
        health: serverId === "off" ? "unknown" : "unverified",
        manageable: serverId === "hml" && key === "app",
        protected: ["agent", "firewall", "defender", "event"].includes(key),
        discovered: key === "new",
        shared: ["db", "broker", "license"].includes(key),
        dependencies: key === "app" ? [`${serverId}-db`, `${serverId}-license`] : [],
        impact:
          key === "app"
            ? "Interrompe as conexões e rotinas atendidas por esta instância do AppServer."
            : "O impacto depende dos consumidores deste componente. Alteração não autorizada.",
        owner: "Equipe de ERP · responsável fictício",
        window: "Homologação: janela de demonstração liberada",
        success: "Observar o estado final no Windows. Teste funcional do ERP não cadastrado.",
      });
    }
  }
  return {
    version: 1,
    now,
    role: "operacao",
    selectedServerId: "hml",
    sequence: 42,
    template: DEFAULT_TEMPLATE,
    services,
    servers: [
      {
        id: "hml",
        name: "ERP Homologação",
        hostname: "SRV-HML-01",
        environment: "Homologação",
        windows: "Windows Server 2022 · build 20348 · fictício",
        online: true,
        lastSeen: now - 8_000,
        rebootPending: false,
        source: "WSUS corporativo · demonstração",
        lastScan: now - 2 * 60 * 60_000,
        scanState: "idle",
      },
      {
        id: "prd",
        name: "ERP Produção",
        hostname: "SRV-PRD-01",
        environment: "Produção",
        windows: "Windows Server 2025 · build 26100 · fictício",
        online: true,
        lastSeen: now - 18_000,
        rebootPending: true,
        source: "WSUS corporativo · demonstração",
        lastScan: now - 10 * 60_000,
        scanState: "idle",
      },
      {
        id: "off",
        name: "ERP Filial",
        hostname: "SRV-FIL-02",
        environment: "Produção",
        windows: "Windows Server 2019 · build 17763 · fictício",
        online: false,
        lastSeen: now - 8 * 60_000,
        rebootPending: false,
        source: "Origem não confirmada",
        lastScan: now - 8 * 60 * 60_000,
        scanState: "idle",
      },
    ],
    updates: ["hml", "prd", "off"].flatMap((serverId) => [
      {
        id: `${serverId}-cu`,
        serverId,
        kb: "KB-DEMO-001",
        title: "Atualização cumulativa do Windows Server",
        category: "Segurança",
        sizeMb: 684,
        state: "Disponível" as const,
        source: "WSUS · fictício",
        mayReboot: true,
      },
      {
        id: `${serverId}-net`,
        serverId,
        kb: "KB-DEMO-002",
        title: "Atualização cumulativa do .NET Framework",
        category: "Qualidade",
        sizeMb: 132,
        state: "Disponível" as const,
        source: "WSUS · fictício",
        mayReboot: true,
      },
      {
        id: `${serverId}-def`,
        serverId,
        title: "Inteligência de segurança para proteção do servidor",
        category: "Definições",
        sizeMb: 18,
        state: "Instalado" as const,
        source: "WSUS · fictício",
        mayReboot: false,
      },
    ]),
    operations: [],
  };
}
