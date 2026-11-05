import { randomBytes } from "node:crypto";
import { copyFile, mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  AGENT_ID,
  atomicJSON,
  dataDirectory,
  Registry,
  tokenHash,
} from "../src/server/inventory-store";

async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(["--agent", "--url", "--allow-http"]);
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error(`Opção desconhecida: ${args[i]}`);
    if (args[i] !== "--allow-http") i++;
  }
  const option = (key: string, fallback: string) => {
    const index = args.indexOf(key);
    if (index < 0) return fallback;
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Informe ${key}.`);
    return args[index + 1];
  };
  const agentId = option("--agent", "srv-windows-01");
  if (!AGENT_ID.test(agentId))
    throw new Error(
      "Use identificador com letras minúsculas, números, hífen ou sublinhado (até 64 caracteres).",
    );
  const url = new URL(option("--url", "http://127.0.0.1:3000"));
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Use a URL base da central, sem credenciais, caminho ou parâmetros.");
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "http:" && !loopback && !args.includes("--allow-http"))
    throw new Error(
      "Para teste HTTP na rede local, acrescente --allow-http. Para outras redes, use HTTPS.",
    );
  const directory = dataDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lockPath = path.join(directory, "setup.lock");
  const lock = await open(lockPath, "wx", 0o600);
  try {
    let registry: Registry;
    try {
      registry = JSON.parse(await readFile(path.join(directory, "registry.json"), "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const dashboardToken = randomBytes(32).toString("base64url");
      registry = { version: 1, dashboardTokenHash: tokenHash(dashboardToken), agents: [] };
      await writeFile(path.join(directory, "dashboard-key.txt"), dashboardToken + "\n", {
        mode: 0o600,
        flag: "wx",
      });
      await atomicJSON(path.join(directory, "registry.json"), registry);
    }
    if (registry.agents.some((agent) => agent.id === agentId))
      throw new Error(
        `Agente ${agentId} já cadastrado. Use a pasta já gerada ou escolha outro identificador.`,
      );
    const token = randomBytes(32).toString("base64url");
    const bundle = path.join(directory, "packages", agentId);
    await mkdir(bundle, { recursive: true, mode: 0o700 });
    for (const file of ["agent.py", "iniciar.cmd", "README.md"]) {
      await copyFile(path.join(process.cwd(), "agent", "windows", file), path.join(bundle, file));
    }
    await atomicJSON(path.join(bundle, "agent.json"), {
      controllerUrl: url.origin,
      agentId,
      token,
      intervalSeconds: 30,
      allowInsecureHttp: url.protocol === "http:" && !loopback && args.includes("--allow-http"),
    });
    registry.agents.push({
      id: agentId,
      tokenHash: tokenHash(token),
      registeredAt: new Date().toISOString(),
    });
    await atomicJSON(path.join(directory, "registry.json"), registry);
    console.log(
      `Central preparada.\nChave para abrir a dashboard: ${path.join(directory, "dashboard-key.txt")}\nCopie esta pasta inteira para o Windows: ${bundle}\nDestino configurado: ${url.origin}\nNenhuma chave foi exibida. Não envie a pasta .local para o GitHub.`,
    );
    if (url.protocol === "http:" && !loopback)
      console.log(
        "HTTP local ativado: use somente em rede de teste confiável; a conexão não é criptografada.",
      );
  } finally {
    await lock.close();
    await rm(lockPath);
  }
}
main().catch((error) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
