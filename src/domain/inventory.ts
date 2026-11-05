export const SERVICE_STATES = [
  "Running",
  "Stopped",
  "Paused",
  "Start Pending",
  "Stop Pending",
  "Continue Pending",
  "Pause Pending",
  "Unknown",
] as const;
export const START_MODES = ["Auto", "Manual", "Disabled", "Boot", "System", "Unknown"] as const;
export interface InventoryService {
  name: string;
  displayName: string;
  state: (typeof SERVICE_STATES)[number];
  startMode: (typeof START_MODES)[number];
}
export interface AgentInventory {
  schemaVersion: 1;
  agentId: string;
  hostname: string;
  os: string;
  agentVersion: string;
  collectedAt: string;
  intervalSeconds: number;
  services: InventoryService[];
}
export interface ReceivedInventory extends AgentInventory {
  receivedAt: string;
}
export interface InventoryServer {
  agentId: string;
  registeredAt: string;
  inventory: ReceivedInventory | null;
}
export interface InventoryResponse {
  serverTime: string;
  servers: InventoryServer[];
}
export const STATE_LABELS: Record<InventoryService["state"], string> = {
  Running: "Em execução",
  Stopped: "Parado",
  Paused: "Pausado",
  "Start Pending": "Iniciando",
  "Stop Pending": "Parando",
  "Continue Pending": "Retomando",
  "Pause Pending": "Pausando",
  Unknown: "Desconhecido",
};
export const START_LABELS: Record<InventoryService["startMode"], string> = {
  Auto: "Automático",
  Manual: "Manual",
  Disabled: "Desabilitado",
  Boot: "Boot",
  System: "Sistema",
  Unknown: "Desconhecido",
};
export function inventoryFresh(inventory: ReceivedInventory, now: number) {
  return (
    now - Date.parse(inventory.receivedAt) <= Math.max(90, inventory.intervalSeconds * 3) * 1000
  );
}
