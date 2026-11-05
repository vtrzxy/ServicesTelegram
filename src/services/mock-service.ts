import { createSeed, TEMPLATE_FIELDS } from "../data/seed";
import {
  available,
  CACHE_MS,
  CONFIRMATION_MS,
  HEARTBEAT_MS,
  permission,
  policyLabel,
  SCAN_INTERVAL_MS,
} from "../domain/permissions";
import {
  Action,
  DemoState,
  Operation,
  Role,
  Scenario,
  ServicePolicyInput,
  USERS,
} from "../domain/types";
import { DataService, DomainError } from "./contract";

type Scheduler = (callback: () => void, delay: number) => unknown;
const STORAGE_KEY = "nucleo-control-demo-v2";
export class MockDataService implements DataService {
  private state: DemoState;
  private listeners = new Set<() => void>();
  private storage?: Storage;
  private initialized = false;
  private epoch = 0;
  constructor(
    private clock: () => number = Date.now,
    private scheduler: Scheduler = (cb, ms) => setTimeout(cb, ms),
  ) {
    this.state = createSeed(0);
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: DemoState, persist = true) {
    this.state = next;
    if (persist && this.storage) {
      try {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* A demonstração continua em memória se o armazenamento local estiver indisponível. */
      }
    }
    this.listeners.forEach((listener) => listener());
  }
  initialize(storage?: Storage) {
    if (this.initialized) return;
    this.initialized = true;
    this.storage = storage;
    const now = this.clock();
    let next = createSeed(now);
    try {
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const saved: unknown = JSON.parse(raw);
        // Somente o formato conhecido da demonstração é recuperado. Nenhum segredo ou credencial é armazenado.
        if (validStoredState(saved)) {
          next = saved;
          next.now = now;
          next.operations = next.operations.map((op) =>
            op.status === "running"
              ? {
                  ...op,
                  status: "unknown",
                  message:
                    "A página foi recarregada durante a simulação. Resultado desconhecido; reconcilie sem reenviar.",
                }
              : op.status === "pending" && op.expiresAt <= now
                ? {
                    ...op,
                    status: "expired",
                    endedAt: now,
                    message: "Confirmação expirada. Nenhuma ação executada.",
                  }
                : op,
          );
          next.servers = next.servers.map((server) => ({
            ...server,
            lastSeen: server.online ? now : server.lastSeen,
            scanState: "idle",
          }));
        }
      }
    } catch {
      next = createSeed(now);
    }
    this.publish(next);
  }
  tick() {
    const now = this.clock();
    const heartbeat = this.state.servers.some((s) => s.online && now - s.lastSeen >= HEARTBEAT_MS);
    const expiring = this.state.operations.some(
      (op) => op.status === "pending" && now >= op.expiresAt,
    );
    this.publish(
      {
        ...this.state,
        now,
        servers: this.state.servers.map((s) =>
          s.online && now - s.lastSeen >= HEARTBEAT_MS ? { ...s, lastSeen: now } : s,
        ),
        operations: this.state.operations.map((op) =>
          op.status === "pending" && now >= op.expiresAt
            ? {
                ...op,
                status: "expired",
                endedAt: now,
                message: "Confirmação expirada. Nenhuma ação executada.",
              }
            : op,
        ),
      },
      heartbeat || expiring,
    );
  }
  setRole(role: Role) {
    if (!Object.hasOwn(USERS, role)) throw new DomainError("Perfil desconhecido.");
    this.publish({ ...this.state, role });
  }
  selectServer(id: string) {
    if (!this.state.servers.some((s) => s.id === id))
      throw new DomainError("Servidor não encontrado.");
    this.publish({ ...this.state, selectedServerId: id });
  }
  async refreshServices(id: string) {
    const server = this.state.servers.find((s) => s.id === id);
    if (!server || !available(server, this.clock()))
      throw new DomainError("Sem comunicação. Exibindo a última observação, não o estado atual.");
    if (
      this.state.operations.some(
        (op) => op.serverId === id && ["running", "unknown"].includes(op.status),
      )
    )
      throw new DomainError("Acompanhe ou reconcilie a operação antes de atualizar o estado.");
    const epoch = this.epoch;
    await new Promise<void>((resolve) => this.scheduler(resolve, 450));
    if (epoch !== this.epoch) return;
    this.publish({
      ...this.state,
      now: this.clock(),
      services: this.state.services.map((s) =>
        s.serverId === id ? { ...s, observedAt: this.clock() } : s,
      ),
    });
  }
  request(
    serviceId: string,
    action: Action,
    scenario: Scenario = "success",
    source: Operation["source"] = "Painel",
  ) {
    this.tick();
    const service = this.state.services.find((s) => s.id === serviceId);
    if (!service) throw new DomainError("Serviço não encontrado.");
    const access = permission(this.state, service, action);
    if (!access.allowed) throw new DomainError(access.reason);
    if (action === "reiniciar" && service.state === "stopped")
      throw new DomainError(
        "O serviço está parado. Prepare uma nova solicitação de início.",
        "USE_START",
      );
    if (["partial", "unknown"].includes(scenario) && action !== "reiniciar")
      throw new DomainError("Este cenário exige a ação Reiniciar.");
    const server = this.state.servers.find((s) => s.id === service.serverId)!;
    const user = USERS[this.state.role];
    const now = this.clock();
    const id = `OP-${String(this.state.sequence).padStart(4, "0")}`;
    const steps = [
      "Validação",
      ...(action !== "iniciar" ? ["Parada"] : []),
      ...(action !== "parar" ? ["Inicialização"] : []),
      "Verificação",
    ];
    const op: Operation = {
      id,
      serverId: server.id,
      serverName: server.name,
      hostname: server.hostname,
      environment: server.environment,
      serviceId,
      serviceName: service.name,
      internalName: service.internalName,
      action,
      userId: user.id,
      userName: user.name,
      chatId: user.chatId,
      role: user.role,
      source,
      scenario,
      status: "pending",
      createdAt: now,
      expiresAt: now + CONFIRMATION_MS,
      message: "Aguardando confirmação. Nenhum comando executado.",
      impact: service.impact,
      policyVersion: policyLabel(service),
      steps: steps.map((name) => ({ name, status: "waiting" })),
    };
    this.publish({
      ...this.state,
      sequence: this.state.sequence + 1,
      operations: [op, ...this.state.operations],
    });
    return id;
  }
  private changeOp(id: string, fn: (op: Operation) => Operation) {
    this.publish({
      ...this.state,
      now: this.clock(),
      operations: this.state.operations.map((op) => (op.id === id ? fn(op) : op)),
    });
  }
  confirm(id: string) {
    this.tick();
    const op = this.state.operations.find((op) => op.id === id);
    if (!op || op.status !== "pending")
      throw new DomainError("Esta confirmação já foi usada, cancelada ou expirou.");
    if (op.userId !== USERS[this.state.role].id || op.chatId !== USERS[this.state.role].chatId)
      throw new DomainError("A confirmação pertence a outro solicitante.");
    const service = this.state.services.find((s) => s.id === op.serviceId)!;
    const access = permission(this.state, service, op.action, op.id);
    if (!access.allowed) {
      this.changeOp(id, (current) => ({
        ...current,
        status: "blocked",
        endedAt: this.clock(),
        message: access.reason,
      }));
      return;
    }
    if (op.action === "reiniciar" && service.state === "stopped") {
      this.changeOp(id, (current) => ({
        ...current,
        status: "blocked",
        endedAt: this.clock(),
        message: "O estado mudou para parado. Solicite Iniciar com nova confirmação.",
      }));
      return;
    }
    const now = this.clock();
    if (op.scenario === "dependency") {
      this.changeOp(id, (current) => ({
        ...current,
        confirmedAt: now,
        endedAt: now,
        status: "blocked",
        message:
          "Dependência operacional ativa: rotina fiscal em processamento. Nenhuma parada executada.",
        steps: current.steps.map((s, i) =>
          i === 0
            ? { ...s, status: "failed", at: now, detail: "Interrupção bloqueada na pré-validação." }
            : s,
        ),
      }));
      return;
    }
    if (
      (op.action === "iniciar" && service.state === "running") ||
      (op.action === "parar" && service.state === "stopped")
    ) {
      this.changeOp(id, (current) => ({
        ...current,
        confirmedAt: now,
        endedAt: now,
        status: "noop",
        message: "O serviço já estava no estado solicitado. Nenhuma alteração executada.",
        steps: current.steps.map((s, index) =>
          index === 0
            ? { ...s, status: "done", at: now }
            : { ...s, status: "waiting", detail: "Não executada; o estado já estava atendido." },
        ),
      }));
      return;
    }
    this.changeOp(id, (current) => ({
      ...current,
      confirmedAt: now,
      status: "running",
      message: "Validação concluída. Acompanhando a execução simulada.",
      steps: current.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? "done" : i === 1 ? "active" : "waiting",
        at: i === 0 ? now : undefined,
      })),
    }));
    const epoch = this.epoch;
    op.steps.slice(1).forEach((_, index) =>
      this.scheduler(
        () => {
          if (epoch !== this.epoch) return;
          const current = this.state.operations.find((o) => o.id === id);
          if (!current || current.status !== "running") return;
          const stepIndex = index + 1;
          const step = current.steps[stepIndex];
          const now = this.clock();
          if (step.name === "Inicialização" && ["partial", "unknown"].includes(current.scenario)) {
            const unknown = current.scenario === "unknown";
            this.publish({
              ...this.state,
              now,
              servers: this.state.servers.map((s) =>
                s.id === current.serverId && unknown ? { ...s, online: false } : s,
              ),
              operations: this.state.operations.map((o) =>
                o.id === id
                  ? {
                      ...o,
                      status: unknown ? "unknown" : "partial",
                      endedAt: unknown ? undefined : now,
                      message: unknown
                        ? "Comunicação interrompida após a parada. Resultado desconhecido. Sem repetição automática."
                        : "Parada concluída; falha ao iniciar. Serviço permanece parado. Sem nova tentativa.",
                      steps: o.steps.map((s, i) =>
                        i === stepIndex
                          ? {
                              ...s,
                              status: "failed",
                              at: now,
                              detail: unknown
                                ? "Resposta não recebida."
                                : "Falha de inicialização simulada.",
                            }
                          : s,
                      ),
                    }
                  : o,
              ),
            });
            return;
          }
          const done = stepIndex === current.steps.length - 1;
          this.publish({
            ...this.state,
            now,
            services: this.state.services.map((s) =>
              s.id === current.serviceId && ["Parada", "Inicialização"].includes(step.name)
                ? { ...s, state: step.name === "Parada" ? "stopped" : "running", observedAt: now }
                : s,
            ),
            operations: this.state.operations.map((o) =>
              o.id === id
                ? {
                    ...o,
                    status: done ? "completed" : "running",
                    endedAt: done ? now : undefined,
                    message: done
                      ? o.action === "parar"
                        ? "Serviço parado; estado final observado."
                        : "Serviço em execução; aplicação não verificada"
                      : `${step.name} concluída. Acompanhando próxima etapa.`,
                    steps: o.steps.map((s, i) =>
                      i === stepIndex
                        ? { ...s, status: "done", at: now }
                        : i === stepIndex + 1
                          ? { ...s, status: "active" }
                          : s,
                    ),
                  }
                : o,
            ),
          });
        },
        (index + 1) * 1100,
      ),
    );
  }
  cancel(id: string) {
    const op = this.state.operations.find((op) => op.id === id);
    if (!op || op.status !== "pending")
      throw new DomainError("Somente solicitações ainda não iniciadas podem ser canceladas.");
    if (op.userId !== USERS[this.state.role].id)
      throw new DomainError("Somente o solicitante pode cancelar nesta demonstração.");
    this.changeOp(id, (o) => ({
      ...o,
      status: "cancelled",
      endedAt: this.clock(),
      message: "Solicitação cancelada antes de iniciar. Nenhuma alteração executada.",
    }));
  }
  expire(id: string) {
    const op = this.state.operations.find((op) => op.id === id);
    if (!op || op.status !== "pending" || op.userId !== USERS[this.state.role].id)
      throw new DomainError("Não há confirmação sua aguardando expiração.");
    this.changeOp(id, (o) => ({
      ...o,
      expiresAt: this.clock() - 1,
      endedAt: this.clock(),
      status: "expired",
      message:
        "Relógio da confirmação avançado 61s no cenário de demonstração. Nenhuma ação executada.",
    }));
  }
  async reconcile(id: string) {
    const op = this.state.operations.find((o) => o.id === id);
    if (!op || op.status !== "unknown")
      throw new DomainError("Esta operação não precisa de reconciliação.");
    if (this.state.role !== "operacao" || op.userId !== USERS[this.state.role].id)
      throw new DomainError("Selecione o solicitante de Operação para reconciliar.");
    const epoch = this.epoch;
    await new Promise<void>((resolve) => this.scheduler(resolve, 600));
    if (epoch !== this.epoch) return;
    const stopped = op.steps.some((step) => step.name === "Parada" && step.status === "done");
    const started = op.steps.some(
      (step) => step.name === "Inicialização" && step.status === "done",
    );
    const observedState =
      stopped && !started
        ? ("stopped" as const)
        : this.state.services.find((s) => s.id === op.serviceId)!.state;
    this.publish({
      ...this.state,
      now: this.clock(),
      servers: this.state.servers.map((s) =>
        s.id === op.serverId ? { ...s, online: true, lastSeen: this.clock() } : s,
      ),
      services: this.state.services.map((s) =>
        s.id === op.serviceId ? { ...s, state: observedState, observedAt: this.clock() } : s,
      ),
      operations: this.state.operations.map((o) =>
        o.id === id && o.status === "unknown"
          ? {
              ...o,
              status: "partial",
              endedAt: this.clock(),
              message:
                stopped && !started
                  ? "Registro simulado do agente reconciliado: parada concluída e inicialização não executada. Serviço parado. Nenhum comando reenviado."
                  : "Registro fictício reconciliado até a última etapa persistida. Execução incompleta; estado observado separadamente. Nenhum comando reenviado.",
            }
          : o,
      ),
    });
  }
  async scan(serverId: string) {
    const server = this.state.servers.find((s) => s.id === serverId);
    if (!server || !available(server, this.clock()))
      throw new DomainError("Servidor sem comunicação. Resultado da busca atual desconhecido.");
    if (server.scanState === "loading")
      throw new DomainError("Já existe uma busca ativa nesta máquina.");
    if (this.clock() - server.lastScan < SCAN_INTERVAL_MS)
      throw new DomainError("Intervalo mínimo de 30 minutos. Consulte o cache disponível.");
    const epoch = this.epoch;
    this.publish({
      ...this.state,
      servers: this.state.servers.map((s) =>
        s.id === serverId ? { ...s, scanState: "loading", scanStarted: this.clock() } : s,
      ),
    });
    await new Promise<void>((resolve) => this.scheduler(resolve, 1400));
    if (epoch !== this.epoch) return;
    this.publish({
      ...this.state,
      now: this.clock(),
      servers: this.state.servers.map((s) =>
        s.id === serverId
          ? {
              ...s,
              scanState: available(s, this.clock()) ? "idle" : "error",
              lastScan: available(s, this.clock()) ? this.clock() : s.lastScan,
            }
          : s,
      ),
    });
    if (
      !available(
        this.state.servers.find((s) => s.id === serverId)!,
        this.clock(),
      )
    )
      throw new DomainError(
        "Comunicação perdida durante a busca. O cache anterior foi preservado; resultado atual desconhecido.",
      );
  }
  rename(serviceId: string, name: string) {
    if (!name.trim() || name.trim().length > 70)
      throw new DomainError("Use um nome amigável entre 1 e 70 caracteres.");
    this.publish({
      ...this.state,
      services: this.state.services.map((s) =>
        s.id === serviceId ? { ...s, name: name.trim() } : s,
      ),
    });
  }
  saveTemplate(template: string) {
    if (template.length > 1600 || TEMPLATE_FIELDS.some((field) => !template.includes(`{${field}}`)))
      throw new DomainError(
        "Preserve os campos obrigatórios: servidor, ambiente, servico, acao e resultado. Limite de 1.600 caracteres.",
      );
    this.publish({ ...this.state, template });
  }
  configureService(serviceId: string, policy: ServicePolicyInput) {
    if (this.state.role !== "administracao")
      throw new DomainError(
        "Somente Administração pode configurar as ações permitidas. Isso não concede permissão de execução ao administrador.",
      );
    const service = this.state.services.find((s) => s.id === serviceId);
    if (!service) throw new DomainError("Serviço não encontrado.");
    if (service.protected)
      throw new DomainError("Componente protegido. Não pode ser liberado nesta configuração.");
    if (!policy.responsible?.trim() || policy.responsible.trim().length > 100)
      throw new DomainError("Informe o responsável pela autorização, com até 100 caracteres.");
    if (
      !Array.isArray(policy.actions) ||
      policy.actions.some((a) => !["iniciar", "parar", "reiniciar"].includes(a)) ||
      new Set(policy.actions).size !== policy.actions.length
    )
      throw new DomainError(
        "Somente as ações cadastradas Iniciar, Parar e Reiniciar são permitidas.",
      );
    const server = this.state.servers.find((s) => s.id === service.serverId)!;
    if (server.environment === "Produção" && policy.actions.length > 0 && !policy.productionAllowed)
      throw new DomainError("Confirme a liberação explícita deste serviço de produção.");
    if (
      this.state.operations.some(
        (o) => o.serverId === service.serverId && ["running", "unknown"].includes(o.status),
      )
    )
      throw new DomainError(
        "Aguarde ou reconcilie a operação deste servidor antes de alterar sua política.",
      );
    const now = this.clock();
    const revision = service.policyRevision + 1;
    const actions = [...policy.actions];
    const user = USERS[this.state.role];
    this.publish({
      ...this.state,
      now,
      services: this.state.services.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              allowedActions: actions,
              manageable: actions.length > 0,
              discovered: actions.length > 0 ? false : s.discovered,
              productionAllowed: policy.productionAllowed,
              policyRevision: revision,
              owner: policy.responsible.trim(),
              window:
                actions.length > 0
                  ? "Janela de demonstração liberada pelo responsável"
                  : "Nenhuma ação autorizada",
            }
          : s,
      ),
      operations: this.state.operations.map((o) =>
        o.serviceId === serviceId && o.status === "pending"
          ? {
              ...o,
              status: "blocked",
              endedAt: now,
              message:
                "A política deste serviço foi alterada. A confirmação anterior foi invalidada; prepare uma nova solicitação.",
            }
          : o,
      ),
      policyAudit: [
        {
          id: `POL-${this.state.policyAudit.length + 1}`,
          serviceId,
          serverId: server.id,
          serviceName: service.name,
          hostname: server.hostname,
          userId: user.id,
          userName: user.name,
          at: now,
          before: [...service.allowedActions],
          after: actions,
          productionAllowed: policy.productionAllowed,
          responsible: policy.responsible.trim(),
          revision,
        },
        ...this.state.policyAudit,
      ],
    });
  }
  reset() {
    this.epoch++;
    this.publish(createSeed(this.clock()));
  }
  prepareScenario() {
    if (this.state.operations.some((o) => o.status === "running"))
      throw new DomainError("Aguarde o término da operação antes de preparar outro cenário.");
    const now = this.clock();
    this.publish({
      ...this.state,
      now,
      selectedServerId: "hml",
      services: this.state.services.map((s) =>
        s.serverId === "hml"
          ? { ...s, state: s.id === "hml-app" ? "running" : s.state, observedAt: now }
          : s,
      ),
      servers: this.state.servers.map((s) =>
        s.id === "hml" ? { ...s, online: true, lastSeen: now } : s,
      ),
      operations: this.state.operations.map((o) =>
        o.serverId === "hml" && o.status === "pending"
          ? {
              ...o,
              status: "cancelled",
              endedAt: now,
              message: "Cenário preparado: solicitação não iniciada cancelada.",
            }
          : o.serverId === "hml" && o.status === "unknown"
            ? {
                ...o,
                status: "partial",
                endedAt: now,
                message:
                  "Cenário restaurado manualmente. Histórico preservado; nenhum comando repetido.",
              }
            : o,
      ),
    });
  }
}
function validStoredState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const state = value as DemoState;
  if (
    state.version !== 2 ||
    !Object.hasOwn(USERS, state.role) ||
    !Number.isFinite(state.now) ||
    !Number.isInteger(state.sequence) ||
    state.sequence < 42 ||
    typeof state.template !== "string" ||
    TEMPLATE_FIELDS.some((f) => !state.template.includes(`{${f}}`))
  )
    return false;
  const seed = createSeed(0);
  if (
    !Array.isArray(state.servers) ||
    !Array.isArray(state.services) ||
    !Array.isArray(state.operations) ||
    !Array.isArray(state.updates) ||
    !Array.isArray(state.policyAudit) ||
    state.operations.length > 10000
  )
    return false;
  if (
    state.servers.length !== seed.servers.length ||
    state.services.length !== seed.services.length ||
    !seed.servers.some((s) => s.id === state.selectedServerId)
  )
    return false;
  if (
    !state.servers.every(
      (s) =>
        s &&
        seed.servers.some((x) => x.id === s.id) &&
        typeof s.online === "boolean" &&
        Number.isFinite(s.lastSeen) &&
        Number.isFinite(s.lastScan),
    )
  )
    return false;
  if (
    !state.services.every(
      (s) =>
        s &&
        seed.services.some(
          (x) => x.id === s.id && x.serverId === s.serverId && x.protected === s.protected,
        ) &&
        typeof s.name === "string" &&
        Array.isArray(s.allowedActions) &&
        s.allowedActions.every((a) => ["iniciar", "parar", "reiniciar"].includes(a)) &&
        s.manageable === s.allowedActions.length > 0 &&
        typeof s.productionAllowed === "boolean" &&
        Number.isInteger(s.policyRevision) &&
        s.policyRevision >= 1 &&
        ["running", "stopped", "unknown", "pending"].includes(s.state) &&
        Number.isFinite(s.observedAt) &&
        Array.isArray(s.dependencies),
    )
  )
    return false;
  return state.operations.every(
    (o) =>
      o &&
      typeof o.id === "string" &&
      seed.services.some((s) => s.id === o.serviceId) &&
      [
        "pending",
        "running",
        "completed",
        "noop",
        "blocked",
        "expired",
        "cancelled",
        "partial",
        "unknown",
      ].includes(o.status) &&
      Array.isArray(o.steps) &&
      o.steps.every((s) => s && typeof s.name === "string") &&
      Number.isFinite(o.expiresAt),
  );
}
export { CACHE_MS };
