import { Action, DemoState, Permission, Server, WindowsService } from "./types";
export const HEARTBEAT_MS = 30_000;
export const OFFLINE_MS = 90_000;
export const CONFIRMATION_MS = 60_000;
export const CACHE_MS = 6 * 60 * 60_000;
export const SCAN_INTERVAL_MS = 30 * 60_000;
export function available(server: Server, now: number) {
  return server.online && now - server.lastSeen <= OFFLINE_MS;
}
export function fresh(service: WindowsService, now: number) {
  return now - service.observedAt <= OFFLINE_MS;
}
export function permission(
  state: DemoState,
  service: WindowsService,
  action: Action,
  ownOperationId?: string,
): Permission {
  const server = state.servers.find((s) => s.id === service.serverId);
  if (!server || !available(server, state.now))
    return {
      allowed: false,
      reason: "Servidor sem comunicação. Nenhum comando será guardado para depois.",
    };
  if (server.environment === "Produção" && !service.productionAllowed)
    return {
      allowed: false,
      reason: "Este serviço de produção ainda não foi liberado explicitamente.",
    };
  if (service.protected)
    return {
      allowed: false,
      reason: "Componente protegido. Alterações pelo painel são bloqueadas.",
    };
  if (service.discovered)
    return {
      allowed: false,
      reason: "Serviço recém-descoberto. Inventário não concede autorização.",
    };
  if (!service.allowedActions.includes(action))
    return { allowed: false, reason: "Serviço sem concessão operacional. Somente consulta." };
  if (state.role !== "operacao")
    return {
      allowed: false,
      reason:
        state.role === "administracao"
          ? "Administração não herda permissão para operar serviços."
          : "O perfil Consulta não pode alterar serviços.",
    };
  if (
    state.operations.some(
      (op) =>
        op.id !== ownOperationId &&
        op.serverId === server.id &&
        ["pending", "running", "unknown"].includes(op.status),
    )
  )
    return {
      allowed: false,
      reason:
        "Há uma operação pendente, em andamento ou sem resultado reconciliado neste servidor.",
    };
  if (service.state === "pending" || service.state === "unknown")
    return { allowed: false, reason: "Estado incerto. Reconcilie a operação antes de alterar." };
  if (!fresh(service, state.now))
    return {
      allowed: false,
      reason: "Observação desatualizada. Consulte o estado antes de alterar.",
    };
  if (
    (action === "iniciar" || action === "reiniciar") &&
    service.dependencies.some((id) => state.services.find((s) => s.id === id)?.state !== "running")
  )
    return {
      allowed: false,
      reason: "Uma dependência não está disponível. Não haverá início em cascata.",
    };
  return {
    allowed: true,
    reason: "Ação cadastrada e autorizada para o perfil Operação neste serviço e servidor.",
  };
}
export function policyLabel(service: WindowsService) {
  return `POL-${service.id.toUpperCase()} · v${service.policyRevision}`;
}
