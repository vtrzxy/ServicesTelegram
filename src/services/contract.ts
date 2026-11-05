import { Action, DemoState, Operation, Role, Scenario, ServicePolicyInput } from "../domain/types";
export interface DataService {
  getSnapshot(): DemoState;
  subscribe(listener: () => void): () => void;
  initialize(storage?: Storage): void;
  tick(): void;
  setRole(role: Role): void;
  selectServer(id: string): void;
  refreshServices(id: string): Promise<void>;
  request(
    serviceId: string,
    action: Action,
    scenario?: Scenario,
    source?: Operation["source"],
  ): string | Promise<string>;
  confirm(id: string): void | Promise<void>;
  cancel(id: string): void | Promise<void>;
  expire(id: string): void;
  reconcile(id: string): Promise<void>;
  scan(serverId: string): Promise<void>;
  rename(serviceId: string, name: string): void;
  saveTemplate(template: string): void;
  configureService(serviceId: string, policy: ServicePolicyInput): void;
  reset(): void;
  prepareScenario(): void;
}
export class DomainError extends Error {
  constructor(
    message: string,
    public code = "BLOCKED",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
