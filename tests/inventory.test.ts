import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  atomicJSON,
  authorize,
  getInventory,
  InventoryError,
  MAX_INVENTORY_BYTES,
  readLimitedJSON,
  receiveInventory,
  tokenHash,
  validateInventory,
} from "../src/server/inventory-store";
import { AgentInventory, inventoryFresh } from "../src/domain/inventory";

const agentToken = "a".repeat(43);
const otherToken = "b".repeat(43);
const dashboardToken = "c".repeat(43);
function payload(): AgentInventory {
  return {
    schemaVersion: 1,
    agentId: "windows-01",
    hostname: "SRV-TESTE",
    os: "Windows Server · teste",
    agentVersion: "0.1.0",
    collectedAt: new Date().toISOString(),
    intervalSeconds: 30,
    services: [
      { name: "Spooler", displayName: "Fila de impressão", state: "Running", startMode: "Auto" },
    ],
  };
}
function request(token: string, body?: unknown) {
  return new Request("http://localhost/api/inventory", {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function fixture(fn: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "services-inventory-"));
  try {
    await atomicJSON(path.join(directory, "registry.json"), {
      version: 1,
      dashboardTokenHash: tokenHash(dashboardToken),
      agents: [
        {
          id: "windows-01",
          tokenHash: tokenHash(agentToken),
          registeredAt: new Date().toISOString(),
        },
        {
          id: "windows-02",
          tokenHash: tokenHash(otherToken),
          registeredAt: new Date().toISOString(),
        },
      ],
    });
    await fn(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("agente envia inventário persistente; dashboard lê sem expor chaves", async () =>
  fixture(async (directory) => {
    const accepted = await receiveInventory(request(agentToken, payload()), directory);
    assert.equal(accepted.serviceCount, 1);
    const disk = JSON.parse(
      await readFile(path.join(directory, "inventory/windows-01.json"), "utf8"),
    );
    assert.equal(disk.services[0].name, "Spooler");
    const response = await getInventory(request(dashboardToken), directory);
    assert.equal(response.servers[0].inventory?.hostname, "SRV-TESTE");
    assert.equal(response.servers[1].inventory, null);
    assert.ok(!JSON.stringify(response).includes("tokenHash"));
    assert.ok(!JSON.stringify(response).includes(agentToken));
    assert.ok(inventoryFresh(response.servers[0].inventory!, Date.now()));
  }));
test("chaves de agentes e de dashboard não herdam permissões", async () =>
  fixture(async (directory) => {
    for (const token of [agentToken, otherToken, "z".repeat(43)]) {
      await assert.rejects(
        getInventory(request(token), directory),
        (error: unknown) => error instanceof InventoryError && error.status === 401,
      );
    }
    await assert.rejects(
      receiveInventory(request(dashboardToken, payload()), directory),
      /não autorizado/,
    );
    await assert.rejects(
      receiveInventory(request(otherToken, payload()), directory),
      /não corresponde/,
    );
    await assert.rejects(authorize(new Request("http://localhost"), "agent", directory), /ausente/);
  }));
test("inventário substitui snapshot completo e mantém serviços removidos fora da lista", async () =>
  fixture(async (directory) => {
    await receiveInventory(request(agentToken, payload()), directory);
    const next = payload();
    next.services = [];
    await receiveInventory(request(agentToken, next), directory);
    assert.deepEqual(
      (await getInventory(request(dashboardToken), directory)).servers[0].inventory?.services,
      [],
    );
  }));
test("payload inválido não apaga o último inventário válido", async () =>
  fixture(async (directory) => {
    await receiveInventory(request(agentToken, payload()), directory);
    await assert.rejects(
      receiveInventory(
        request(agentToken, { ...payload(), services: "erro na consulta" }),
        directory,
      ),
      /Lista/,
    );
    assert.equal(
      (await getInventory(request(dashboardToken), directory)).servers[0].inventory?.services
        .length,
      1,
    );
  }));
test("validação rejeita travessia de caminho, duplicidade, estados inválidos e listas excessivas", () => {
  assert.throws(() => validateInventory({ ...payload(), agentId: "../../bad" }, "../../bad"));
  const duplicate = payload();
  duplicate.services.push({ ...duplicate.services[0], name: "spooler" });
  assert.throws(() => validateInventory(duplicate, "windows-01"), /duplicado/);
  assert.throws(
    () => validateInventory({ ...payload(), intervalSeconds: 0 }, "windows-01"),
    /Intervalo/,
  );
  assert.throws(
    () => validateInventory({ ...payload(), collectedAt: "ontem" }, "windows-01"),
    /Horário/,
  );
  assert.throws(
    () =>
      validateInventory(
        { ...payload(), services: [{ ...payload().services[0], state: "OK" }] },
        "windows-01",
      ),
    /Estado/,
  );
  assert.throws(
    () =>
      validateInventory(
        { ...payload(), services: Array(5001).fill(payload().services[0]) },
        "windows-01",
      ),
    /máximo/,
  );
  const input = {
    ...payload(),
    password: "não persistir",
    services: [{ ...payload().services[0], pathName: "segredo" }],
  };
  assert.ok(!JSON.stringify(validateInventory(input, "windows-01")).includes("segredo"));
  assert.ok(!JSON.stringify(validateInventory(input, "windows-01")).includes("password"));
});
test("limite de corpo funciona sem depender do Content-Length", async () => {
  await assert.rejects(
    readLimitedJSON(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "x".repeat(MAX_INVENTORY_BYTES + 1),
      }),
    ),
    (error: unknown) => error instanceof InventoryError && error.status === 413,
  );
  await assert.rejects(
    readLimitedJSON(new Request("http://localhost", { method: "POST", body: "{}" })),
    (error: unknown) => error instanceof InventoryError && error.status === 415,
  );
  await assert.rejects(
    readLimitedJSON(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    ),
    /JSON inválido/,
  );
});
test("sem novos envios o inventário fica histórico, preservando os estados observados", () => {
  const received = { ...payload(), receivedAt: "2026-11-05T12:00:00.000Z" };
  assert.equal(inventoryFresh(received, Date.parse("2026-11-05T12:01:29Z")), true);
  assert.equal(inventoryFresh(received, Date.parse("2026-11-05T12:01:31Z")), false);
  assert.equal(received.services[0].state, "Running");
});
