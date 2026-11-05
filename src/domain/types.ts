export type Role = "consulta" | "operacao" | "administracao";
export type Environment = "Homologação" | "Produção";
export type Action = "iniciar" | "parar" | "reiniciar";
export type ServiceState = "running" | "stopped" | "pending" | "unknown";
export type Scenario = "success" | "noop" | "dependency" | "expired" | "partial" | "unknown";
export type OperationStatus =
  | "pending"
  | "running"
  | "completed"
  | "noop"
  | "blocked"
  | "expired"
  | "cancelled"
  | "partial"
  | "unknown";
export interface DemoUser {
  id: number;
  chatId: number;
  name: string;
  role: Role;
}
export interface Server {
  id: string;
  name: string;
  hostname: string;
  environment: Environment;
  windows: string;
  online: boolean;
  lastSeen: number;
  rebootPending: boolean;
  source: string;
  lastScan: number;
  scanStarted?: number;
  scanState: "idle" | "loading" | "error";
}
export interface WindowsService {
  id: string;
  serverId: string;
  name: string;
  internalName: string;
  category: string;
  state: ServiceState;
  observedAt: number;
  health: "unverified" | "unknown";
  manageable: boolean;
  allowedActions: Action[];
  productionAllowed: boolean;
  policyRevision: number;
  protected: boolean;
  discovered: boolean;
  shared: boolean;
  dependencies: string[];
  impact: string;
  owner: string;
  window: string;
  success: string;
}
export interface UpdatePackage {
  id: string;
  serverId: string;
  kb?: string;
  title: string;
  category: string;
  sizeMb: number;
  state: "Disponível" | "Instalado";
  source: string;
  mayReboot: boolean;
}
export interface OperationStep {
  name: string;
  status: "waiting" | "active" | "done" | "failed";
  at?: number;
  detail?: string;
}
export interface Operation {
  id: string;
  serverId: string;
  serverName: string;
  hostname: string;
  environment: Environment;
  serviceId: string;
  serviceName: string;
  internalName: string;
  action: Action;
  userId: number;
  userName: string;
  chatId: number;
  role: Role;
  source: "Painel" | "Telegram";
  scenario: Scenario;
  status: OperationStatus;
  createdAt: number;
  expiresAt: number;
  confirmedAt?: number;
  endedAt?: number;
  message: string;
  steps: OperationStep[];
  impact: string;
  policyVersion: string;
}
export interface DemoState {
  version: 2;
  now: number;
  role: Role;
  selectedServerId: string;
  servers: Server[];
  services: WindowsService[];
  updates: UpdatePackage[];
  operations: Operation[];
  template: string;
  sequence: number;
  policyAudit: PolicyChange[];
}
export interface PolicyChange {
  id: string;
  serviceId: string;
  serverId: string;
  serviceName: string;
  hostname: string;
  userId: number;
  userName: string;
  at: number;
  before: Action[];
  after: Action[];
  productionAllowed: boolean;
  responsible: string;
  revision: number;
}
export interface ServicePolicyInput {
  actions: Action[];
  productionAllowed: boolean;
  responsible: string;
}
export interface Permission {
  allowed: boolean;
  reason: string;
}
export const USERS: Record<Role, DemoUser> = {
  consulta: { id: 100101, chatId: 8801001, name: "Ana Costa", role: "consulta" },
  operacao: { id: 100202, chatId: 8801002, name: "Lucas Almeida", role: "operacao" },
  administracao: { id: 100303, chatId: 8801003, name: "Marina Santos", role: "administracao" },
};
export const ROLE_LABELS: Record<Role, string> = {
  consulta: "Consulta",
  operacao: "Operação",
  administracao: "Administração",
};
export const ACTION_LABELS: Record<Action, string> = {
  iniciar: "Iniciar",
  parar: "Parar",
  reiniciar: "Reiniciar",
};
export const STATUS_LABELS: Record<OperationStatus, string> = {
  pending: "Aguardando confirmação",
  running: "Em andamento",
  completed: "Concluída",
  noop: "Sem alteração",
  blocked: "Bloqueada",
  expired: "Expirada",
  cancelled: "Cancelada",
  partial: "Falha parcial",
  unknown: "Resultado desconhecido",
};
export const SCENARIOS: { id: Scenario; label: string; description: string }[] = [
  {
    id: "success",
    label: "Operação concluída",
    description: "Parar, iniciar e verificar o estado do serviço.",
  },
  {
    id: "noop",
    label: "Estado já solicitado",
    description: "Iniciar um serviço que já está em execução.",
  },
  {
    id: "dependency",
    label: "Dependência ativa",
    description: "A pré-validação bloqueia a interrupção.",
  },
  {
    id: "expired",
    label: "Confirmação expirada",
    description: "Antecipar o relógio da confirmação em 61 segundos.",
  },
  {
    id: "partial",
    label: "Falha após a parada",
    description: "A parada conclui, mas a inicialização falha.",
  },
  {
    id: "unknown",
    label: "Perda de comunicação",
    description: "Interromper a comunicação sem repetir o comando.",
  },
];
