import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { resolveCommand, serviceCommand } from "../src/domain/commands";
test("Restart Service resolve nome interno e servidor exatos", () => {
  const state = createSeed(Date.now());
  const result = resolveCommand("Restart Service IntegracaoDemo in SRV-HML-01", state);
  assert.equal(result.action, "reiniciar");
  assert.equal(result.service.id, "hml-app");
  assert.equal(
    serviceCommand(result.action, result.service, "SRV-HML-01"),
    "Restart Service IntegracaoDemo in SRV-HML-01",
  );
});
test("comando nunca vira shell e não adivinha um serviço ou servidor", () => {
  const state = createSeed(Date.now());
  for (const text of [
    "powershell Restart-Service x",
    "Restart Service IntegracaoDemo in SRV-HML-01; shutdown",
    "Restart Service Conector in SRV-HML-01",
    "Restart Service IntegracaoDemo in desconhecido",
    "Delete Service IntegracaoDemo in SRV-HML-01",
  ])
    assert.throws(() => resolveCommand(text, state));
});
test("ambiguidade exige seleção explícita", () => {
  const state = createSeed(Date.now());
  state.services.push({ ...state.services[0], id: "duplicado" });
  assert.throws(
    () => resolveCommand("Restart Service IntegracaoDemo in SRV-HML-01", state),
    /ambíguo/,
  );
});
