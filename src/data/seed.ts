import { DemoState, WindowsService } from "../domain/types";
export const DEFAULT_TEMPLATE =
  "{acao} · {servico}\nServidor: {servidor}\nAmbiente: {ambiente}\nResultado: {resultado}";
export const TEMPLATE_FIELDS = ["servidor", "ambiente", "servico", "acao", "resultado"] as const;
export function createSeed(now: number): DemoState {
  const services: WindowsService[] = [];
  const definitions = [
    ["app", "Conector de integrações", "IntegracaoDemo", "Aplicações", "running"],
    ["db", "Banco de dados da aplicação", "PostgreSQLDemo", "Banco de dados", "running"],
    ["broker", "Gateway de aplicações", "GatewayDemo", "Web", "running"],
    ["license", "Compartilhamento de arquivos", "ArquivosDemo", "Arquivos", "running"],
    ["tss", "Fila de impressão", "SpoolerDemo", "Impressão", "stopped"],
    ["schedule", "Agendador de rotinas", "AgendadorDemo", "Rotinas", "running"],
    ["rest", "Servidor web", "WebServiceDemo", "Web", "running"],
    ["job", "Sincronização de arquivos", "SincronizacaoDemo", "Arquivos", "stopped"],
    ["new", "Serviço descoberto", "NovoServicoDemo", "Outros", "stopped"],
    ["agent", "Agente de gerenciamento", "ControleAgenteDemo", "Sistema", "running"],
    ["firewall", "Firewall do Windows", "FirewallIlustrativoDemo", "Segurança", "running"],
    ["defender", "Proteção do servidor", "AntivirusIlustrativoDemo", "Segurança", "running"],
    ["event", "Registro de eventos", "EventosIlustrativoDemo", "Sistema", "running"],
    ["backup", "Backup corporativo", "BackupDemo", "Backup", "running"],
    ["protheus", "TOTVS AppServer", "TOTVSAppServerDemo", "Aplicações", "running"],
  ];
  for (const serverId of ["hml", "prd", "off"]) {
    for (const [key, name, internalName, category, serviceState] of definitions) {
      services.push({
        id: `${serverId}-${key}`,
        serverId,
        name,
        internalName,
        category,
        state: serviceState as WindowsService["state"],
        observedAt: now - (serverId === "off" ? 8 * 60_000 : 12_000),
        health: serverId === "off" ? "unknown" : "unverified",
        manageable: serverId === "hml" && key === "app",
        allowedActions:
          serverId === "hml" && key === "app" ? ["iniciar", "parar", "reiniciar"] : [],
        productionAllowed: false,
        policyRevision: 1,
        protected: ["agent", "firewall", "defender", "event"].includes(key),
        discovered: key === "new",
        shared: ["db", "broker", "license"].includes(key),
        dependencies: key === "app" ? [`${serverId}-db`, `${serverId}-license`] : [],
        impact:
          key === "app"
            ? "Interrompe as integrações atendidas por este serviço até a conclusão da operação."
            : "Interrompe os consumidores deste serviço. Avalie dependências e a janela antes de autorizar.",
        owner: "Equipe de infraestrutura · responsável fictício",
        window: "Homologação: janela de demonstração liberada",
        success: "Observar o estado final no Windows. Teste funcional da aplicação não cadastrado.",
      });
    }
  }
  return {
    version: 2,
    now,
    role: "operacao",
    selectedServerId: "hml",
    sequence: 42,
    template: DEFAULT_TEMPLATE,
    services,
    servers: [
      {
        id: "hml",
        name: "Servidor de testes",
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
        name: "Servidor de aplicações",
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
        name: "Servidor da filial",
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
    policyAudit: [],
  };
}
