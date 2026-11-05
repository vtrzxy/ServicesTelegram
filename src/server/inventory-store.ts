import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AgentInventory,
  InventoryResponse,
  ReceivedInventory,
  SERVICE_STATES,
  START_MODES,
} from "../domain/inventory";

export const MAX_INVENTORY_BYTES = 2 * 1024 * 1024;
export const AGENT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
export interface Registry {
  version: 1;
  dashboardTokenHash: string;
  agents: { id: string; tokenHash: string; registeredAt: string }[];
}
export class InventoryError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function dataDirectory() {
  return path.resolve(
    /* turbopackIgnore: true */
    process.env.INVENTORY_DATA_DIR || path.join(process.cwd(), ".local", "central"),
  );
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function matches(token: string, expected: string) {
  const actual = Buffer.from(tokenHash(token), "hex");
  const stored = Buffer.from(expected, "hex");
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}
export async function readRegistry(directory = dataDirectory()): Promise<Registry> {
  try {
    return JSON.parse(await readFile(path.join(directory, "registry.json"), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new InventoryError(
        "Central ainda não configurada. Execute npm run central:setup.",
        503,
      );
    }
    throw error;
  }
}
export async function atomicJSON(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
  await rename(temp, file);
}
export async function authorize(
  request: Request,
  kind: "dashboard" | "agent",
  directory = dataDirectory(),
) {
  const token = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(
    request.headers.get("authorization") || "",
  )?.[1];
  if (!token) throw new InventoryError("Chave de acesso ausente ou inválida.", 401);
  const registry = await readRegistry(directory);
  if (kind === "dashboard") {
    if (!matches(token, registry.dashboardTokenHash))
      throw new InventoryError("Chave de acesso inválida.", 401);
    return { registry, agentId: null };
  }
  const agent = registry.agents.find((item) => matches(token, item.tokenHash));
  if (!agent) throw new InventoryError("Agente não autorizado.", 401);
  return { registry, agentId: agent.id };
}
function text(value: unknown, max: number, label: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f]/.test(value)
  ) {
    throw new InventoryError(`Campo inválido: ${label}.`);
  }
  return value;
}
export function validateInventory(value: unknown, agentId: string): AgentInventory {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new InventoryError("Inventário inválido.");
  const input = value as Record<string, unknown>;
  if (input.schemaVersion !== 1 || input.agentId !== agentId || !AGENT_ID.test(agentId)) {
    throw new InventoryError("Identificação do agente não corresponde à chave.", 403);
  }
  const collectedAt = text(input.collectedAt, 40, "collectedAt");
  if (
    !/^\d{4}-\d\d-\d\dT.*(?:Z|\+00:00)$/.test(collectedAt) ||
    !Number.isFinite(Date.parse(collectedAt))
  ) {
    throw new InventoryError("Horário de coleta inválido; use UTC.");
  }
  if (
    !Number.isInteger(input.intervalSeconds) ||
    (input.intervalSeconds as number) < 15 ||
    (input.intervalSeconds as number) > 3600
  ) {
    throw new InventoryError("Intervalo deve estar entre 15 e 3600 segundos.");
  }
  if (!Array.isArray(input.services) || input.services.length > 5000)
    throw new InventoryError("Lista de serviços inválida (máximo 5000).");
  const names = new Set<string>();
  const services = input.services.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new InventoryError("Serviço inválido.");
    const service = item as Record<string, unknown>;
    const name = text(service.name, 256, "name");
    if (names.has(name.toLowerCase())) throw new InventoryError("Serviço duplicado no inventário.");
    names.add(name.toLowerCase());
    if (
      !SERVICE_STATES.includes(service.state as never) ||
      !START_MODES.includes(service.startMode as never)
    )
      throw new InventoryError("Estado ou inicialização inválidos.");
    return {
      name,
      displayName: text(service.displayName, 512, "displayName"),
      state: service.state as AgentInventory["services"][number]["state"],
      startMode: service.startMode as AgentInventory["services"][number]["startMode"],
    };
  });
  return {
    schemaVersion: 1,
    agentId,
    hostname: text(input.hostname, 255, "hostname"),
    os: text(input.os, 256, "os"),
    agentVersion: text(input.agentVersion, 32, "agentVersion"),
    collectedAt,
    intervalSeconds: input.intervalSeconds as number,
    services: services.sort((a, b) => a.displayName.localeCompare(b.displayName)),
  };
}
export async function readLimitedJSON(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new InventoryError("Envie application/json.", 415);
  if (Number(request.headers.get("content-length")) > MAX_INVENTORY_BYTES)
    throw new InventoryError("Inventário excede 2 MiB.", 413);
  if (!request.body) throw new InventoryError("Inventário ausente.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_INVENTORY_BYTES) {
      await reader.cancel();
      throw new InventoryError("Inventário excede 2 MiB.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new InventoryError("JSON inválido.");
  }
}
export async function receiveInventory(request: Request, directory = dataDirectory()) {
  const { agentId } = await authorize(request, "agent", directory);
  const inventory = validateInventory(await readLimitedJSON(request), agentId!);
  const receivedAt = new Date().toISOString();
  await atomicJSON(path.join(directory, "inventory", `${agentId}.json`), {
    ...inventory,
    receivedAt,
  });
  return { accepted: true, receivedAt, serviceCount: inventory.services.length };
}
export async function getInventory(
  request: Request,
  directory = dataDirectory(),
): Promise<InventoryResponse> {
  const { registry } = await authorize(request, "dashboard", directory);
  const servers = await Promise.all(
    registry.agents.map(async (agent) => {
      let inventory: ReceivedInventory | null = null;
      try {
        inventory = JSON.parse(
          await readFile(path.join(directory, "inventory", `${agent.id}.json`), "utf8"),
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      return { agentId: agent.id, registeredAt: agent.registeredAt, inventory };
    }),
  );
  return { serverTime: new Date().toISOString(), servers };
}
export function apiError(error: unknown) {
  if (error instanceof InventoryError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error("Falha na central de inventário:", (error as Error).name);
  return Response.json(
    { error: "Não foi possível acessar o armazenamento da central." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
