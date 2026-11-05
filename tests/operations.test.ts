import test from "node:test";
import assert from "node:assert/strict";
import { MockDataService } from "../src/services/mock-service";
import { DomainError } from "../src/services/contract";
import { available } from "../src/domain/permissions";
function harness() {
  let now = Date.parse("2026-11-05T18:00:00Z");
  const queue: { at: number; fn: () => void }[] = [];
  const service = new MockDataService(
    () => now,
    (fn, delay) => {
      queue.push({ at: now + delay, fn });
    },
  );
  service.initialize();
  return {
    service,
    advance(ms: number) {
      const end = now + ms;
      while (queue.some((t) => t.at <= end)) {
        queue.sort((a, b) => a.at - b.at);
        const task = queue.shift()!;
        now = task.at;
        task.fn();
      }
      now = end;
      service.tick();
    },
    operation(id: string) {
      return service.getSnapshot().operations.find((o) => o.id === id)!;
    },
  };
}
test("somente Operação recebe concessão operacional; Administração não herda acesso", () => {
  const { service } = harness();
  for (const role of ["consulta", "administracao"] as const) {
    service.setRole(role);
    assert.throws(() => service.request("hml-app", "reiniciar"), DomainError);
  }
  service.setRole("operacao");
  assert.ok(service.request("hml-app", "reiniciar"));
});
test("produção, servidor offline, componente compartilhado, descoberto e protegido são bloqueados", () => {
  const { service } = harness();
  for (const id of ["prd-app", "off-app", "hml-db", "hml-new", "hml-agent", "hml-firewall"])
    assert.throws(() => service.request(id, "reiniciar"), DomainError);
  assert.equal(service.getSnapshot().operations.length, 0);
});
test("confirmação preserva destino explícito mesmo quando o contexto do cabeçalho muda", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  h.service.selectServer("prd");
  h.service.confirm(id);
  h.advance(3300);
  assert.equal(h.operation(id).status, "completed");
  assert.equal(h.operation(id).serverId, "hml");
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "prd-app")?.state, "running");
});
test("reinício acompanha parada e início antes de declarar conclusão", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  h.service.confirm(id);
  h.advance(1100);
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "stopped");
  assert.equal(h.operation(id).status, "running");
  h.advance(1100);
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "running");
  assert.equal(h.operation(id).status, "running");
  h.advance(1100);
  assert.equal(h.operation(id).status, "completed");
  assert.match(h.operation(id).message, /aplicação não verificada/);
  assert.ok(h.operation(id).steps.every((s) => s.status === "done"));
});
test("confirmação de uso único impede repetição e operações concorrentes", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  assert.throws(() => h.service.request("hml-app", "parar"));
  h.service.confirm(id);
  assert.throws(() => h.service.confirm(id));
  assert.throws(() => h.service.request("hml-app", "parar"));
  h.advance(3300);
  assert.equal(h.service.getSnapshot().operations.length, 1);
});
test("expiração real em 60 segundos impede execução", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  h.advance(60_000);
  assert.equal(h.operation(id).status, "expired");
  assert.throws(() => h.service.confirm(id));
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "running");
});
test("expiração acelerada do laboratório não inicia a operação", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar", "expired");
  h.service.expire(id);
  assert.equal(h.operation(id).status, "expired");
  assert.throws(() => h.service.confirm(id));
});
test("outro solicitante não confirma nem cancela a solicitação", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  h.service.setRole("administracao");
  assert.throws(() => h.service.confirm(id));
  assert.throws(() => h.service.cancel(id));
  h.service.setRole("operacao");
  h.service.cancel(id);
  assert.equal(h.operation(id).status, "cancelled");
});
test("cancelamento só é permitido antes de iniciar e não aparece como sucesso", () => {
  const h = harness();
  const id = h.service.request("hml-app", "parar");
  h.service.cancel(id);
  assert.equal(h.operation(id).status, "cancelled");
  assert.throws(() => h.service.confirm(id));
  const next = h.service.request("hml-app", "reiniciar");
  h.service.confirm(next);
  assert.throws(() => h.service.cancel(next));
});
test("iniciar serviço em execução produz resultado sem alteração", () => {
  const h = harness();
  const id = h.service.request("hml-app", "iniciar", "noop");
  h.service.confirm(id);
  assert.equal(h.operation(id).status, "noop");
  assert.match(h.operation(id).message, /Nenhuma alteração/);
  assert.equal(h.operation(id).steps[1].status, "waiting");
});
test("dependência ativa bloqueia a operação antes da parada", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar", "dependency");
  h.service.confirm(id);
  h.advance(5000);
  assert.equal(h.operation(id).status, "blocked");
  assert.equal(h.operation(id).steps[1].status, "waiting");
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "running");
});
test("falha parcial preserva estado parado e não repete a inicialização", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar", "partial");
  h.service.confirm(id);
  h.advance(10_000);
  assert.equal(h.operation(id).status, "partial");
  assert.equal(h.operation(id).steps[1].status, "done");
  assert.equal(h.operation(id).steps[2].status, "failed");
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "stopped");
});
test("perda de comunicação exige reconciliação e não reenvia comandos", async () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar", "unknown");
  h.service.confirm(id);
  h.advance(3300);
  assert.equal(h.operation(id).status, "unknown");
  assert.equal(available(h.service.getSnapshot().servers[0], h.service.getSnapshot().now), false);
  assert.throws(() => h.service.request("hml-app", "iniciar"));
  const result = h.service.reconcile(id);
  h.advance(600);
  await result;
  assert.equal(h.operation(id).status, "partial");
  assert.match(h.operation(id).message, /Nenhum comando reenviado/);
  assert.equal(h.service.getSnapshot().operations.length, 1);
});
test("reiniciar serviço parado exige nova solicitação de início", () => {
  const h = harness();
  const stop = h.service.request("hml-app", "parar");
  h.service.confirm(stop);
  h.advance(2200);
  assert.equal(h.operation(stop).status, "completed");
  assert.throws(
    () => h.service.request("hml-app", "reiniciar"),
    (e: unknown) => e instanceof DomainError && e.code === "USE_START",
  );
  const start = h.service.request("hml-app", "iniciar");
  assert.equal(h.operation(start).status, "pending");
  h.service.confirm(start);
  h.advance(2200);
  assert.equal(h.operation(start).status, "completed");
});
test("estado desatualizado é revalidado antes da alteração", async () => {
  const h = harness();
  h.advance(91_000);
  assert.throws(() => h.service.request("hml-app", "reiniciar"), /desatualizada/);
  const refresh = h.service.refreshServices("hml");
  h.advance(450);
  await refresh;
  assert.ok(h.service.request("hml-app", "reiniciar"));
});
test("confirmação revalida a observação depois da solicitação", () => {
  const h = harness();
  h.advance(70_000);
  const id = h.service.request("hml-app", "reiniciar");
  h.advance(15_000);
  h.service.confirm(id);
  assert.equal(h.operation(id).status, "blocked");
  assert.match(h.operation(id).message, /desatualizada/);
});
test("busca de atualizações tem exclusão mútua e intervalo mínimo de 30 minutos", async () => {
  const h = harness();
  const first = h.service.scan("hml");
  await assert.rejects(h.service.scan("hml"), /busca ativa/);
  h.advance(1400);
  await first;
  await assert.rejects(h.service.scan("hml"), /30 minutos/);
  await assert.rejects(h.service.scan("off"), /sem comunicação/);
});
test("restaurar a demonstração invalida os temporizadores anteriores", () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar");
  h.service.confirm(id);
  h.service.reset();
  h.advance(10_000);
  assert.equal(h.service.getSnapshot().operations.length, 0);
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "running");
});
test("mensagens personalizadas preservam campos essenciais e permanecem texto", () => {
  const h = harness();
  assert.throws(() => h.service.saveTemplate("Executado"), /campos obrigatórios/);
  const text = "<script>alert(1)</script> {servidor} {ambiente} {servico} {acao} {resultado}";
  h.service.saveTemplate(text);
  assert.equal(h.service.getSnapshot().template, text);
});
test("armazenamento inválido restaura um estado seguro e utilizável", () => {
  const storage = {
    getItem: () => '{"version":1,"role":"inexistente"}',
    setItem: () => {},
  } as unknown as Storage;
  const service = new MockDataService();
  service.initialize(storage);
  assert.equal(service.getSnapshot().servers.length, 3);
  assert.equal(service.getSnapshot().operations.length, 0);
});

test("recarregar uma operação em andamento preserva auditoria e exige reconciliação", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  } as unknown as Storage;
  let now = Date.parse("2026-11-05T18:00:00Z");
  const first = new MockDataService(
    () => now,
    () => {},
  );
  first.initialize(storage);
  const id = first.request("hml-app", "reiniciar");
  first.confirm(id);
  now += 10_000;
  const restored = new MockDataService(
    () => now,
    () => {},
  );
  restored.initialize(storage);
  const op = restored.getSnapshot().operations.find((o) => o.id === id)!;
  assert.equal(op.status, "unknown");
  assert.equal(op.userId, 100202);
  assert.equal(op.serverId, "hml");
  assert.throws(() => restored.request("hml-app", "reiniciar"), /reconciliado/);
});

test("restauração durante reconciliação não reaplica um resultado antigo", async () => {
  const h = harness();
  const id = h.service.request("hml-app", "reiniciar", "unknown");
  h.service.confirm(id);
  h.advance(3300);
  const reconciliation = h.service.reconcile(id);
  h.service.reset();
  h.advance(600);
  await reconciliation;
  assert.equal(h.service.getSnapshot().operations.length, 0);
  assert.equal(h.service.getSnapshot().services.find((s) => s.id === "hml-app")?.state, "running");
});

test("perda de comunicação durante busca preserva cache e não informa sucesso", async () => {
  const h = harness();
  const lastScan = h.service.getSnapshot().servers[0].lastScan;
  const id = h.service.request("hml-app", "reiniciar", "unknown");
  h.service.confirm(id);
  h.advance(1100);
  const scan = h.service.scan("hml");
  const assertion = assert.rejects(scan, /Comunicação perdida/);
  h.advance(1400);
  await assertion;
  assert.equal(h.service.getSnapshot().servers[0].scanState, "error");
  assert.equal(h.service.getSnapshot().servers[0].lastScan, lastScan);
});
