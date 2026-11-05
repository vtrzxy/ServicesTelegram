"use client";
import { FormEvent, useEffect, useState } from "react";
import { CircleAlert, KeyRound, RefreshCw, Search, Server, ShieldCheck } from "lucide-react";
import { InventoryResponse, inventoryFresh, STATE_LABELS, START_LABELS } from "@/domain/inventory";

function date(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export function InventoryDashboard() {
  const [key, setKey] = useState("");
  const [input, setInput] = useState("");
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [clockOffset, setClockOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!key) return;
    let disposed = false;
    let pending = false;
    let controller: AbortController | undefined;
    async function load() {
      if (pending) return;
      pending = true;
      setBusy(true);
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/api/inventory", {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Falha ao consultar a central.");
        if (disposed) return;
        setData(result);
        setClockOffset(Date.parse(result.serverTime) - Date.now());
        setError("");
        setSelected((previous) =>
          result.servers.some((server: { agentId: string }) => server.agentId === previous)
            ? previous
            : result.servers.find((server: { inventory: unknown }) => server.inventory)?.agentId ||
              result.servers[0]?.agentId ||
              "",
        );
      } catch (cause) {
        if (!disposed)
          setError(
            (cause as Error).name === "AbortError"
              ? "A central demorou a responder. O último inventário permanece na tela."
              : (cause as Error).message || "Sem conexão com a central.",
          );
      } finally {
        clearTimeout(timeout);
        pending = false;
        if (!disposed) setBusy(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, [key, refresh]);

  function connect(event: FormEvent) {
    event.preventDefault();
    setData(null);
    setError("");
    setSelected("");
    setKey(input.trim());
    setInput("");
    setRefresh((value) => value + 1);
  }
  const server = data?.servers.find((item) => item.agentId === selected);
  const inventory = server?.inventory;
  const currentTime = now + clockOffset;
  const fresh = inventory ? inventoryFresh(inventory, currentTime) : false;
  const services = inventory?.services || [];
  const filtered = services.filter((service) => {
    const term = query.toLocaleLowerCase("pt-BR");
    return (
      (service.name.toLocaleLowerCase("pt-BR").includes(term) ||
        service.displayName.toLocaleLowerCase("pt-BR").includes(term)) &&
      (status === "all" ||
        (status === "other"
          ? !["Running", "Stopped"].includes(service.state)
          : service.state === status))
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const safePage = Math.min(page, pages - 1);
  const online =
    data?.servers.filter((item) => item.inventory && inventoryFresh(item.inventory, currentTime))
      .length || 0;

  return (
    <div className="inventory-dashboard">
      <div className="inventory-title">
        <div>
          <div className="eyebrow">PRIMEIRA ETAPA · AGENTE WINDOWS</div>
          <h1>Serviços dos servidores</h1>
          <p className="muted">
            Inventário recebido dos agentes. Consulta automática da web a cada 10 segundos.
          </p>
        </div>
        {key && (
          <div className="inventory-toolbar">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw size={15} />
              {busy ? "Consultando…" : "Atualizar web"}
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setKey("");
                setData(null);
                setError("");
              }}
            >
              Sair
            </button>
          </div>
        )}
      </div>
      {!data && (
        <section className="inventory-connect panel">
          <div className="inventory-key-icon">
            <KeyRound size={25} />
          </div>
          <h2>Acessar a central local</h2>
          <p className="muted">
            Use a chave da dashboard criada na preparação da central. A chave fica apenas na memória
            desta aba.
          </p>
          <form onSubmit={connect}>
            <label htmlFor="central-key">Chave da dashboard</label>
            <div className="inventory-key-row">
              <input
                id="central-key"
                type="password"
                autoComplete="off"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                required
                minLength={32}
                maxLength={128}
                placeholder="Cole a chave de dashboard-key.txt"
              />
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? "Conectando…" : "Acessar inventário"}
              </button>
            </div>
          </form>
          <p className="small muted">
            A chave de um agente não abre a dashboard. Nenhum dado de demonstração é mostrado aqui.
          </p>
        </section>
      )}
      {error && (
        <div className="inventory-warning" role="alert">
          <CircleAlert size={18} />
          <span>
            {error}
            {data && " As informações abaixo são do último recebimento disponível."}
          </span>
        </div>
      )}
      {data && (
        <>
          <div className="inventory-overview">
            <span>
              <strong>{data.servers.length}</strong> agentes cadastrados
            </span>
            <span>
              <strong>{online}</strong> com inventário recente
            </span>
            <span className="muted">Central consultada em {date(data.serverTime)}</span>
          </div>
          {data.servers.length === 0 ? (
            <div className="panel inventory-empty">
              <Server size={30} />
              <h2>Nenhum agente cadastrado</h2>
              <p>Prepare o primeiro pacote na central e copie para o Windows.</p>
            </div>
          ) : (
            <>
              <section className="inventory-server-grid" aria-label="Servidores cadastrados">
                {data.servers.map((item) => {
                  const received = item.inventory;
                  const recent = received && inventoryFresh(received, currentTime);
                  return (
                    <button
                      key={item.agentId}
                      className={`inventory-server-card ${selected === item.agentId ? "selected" : ""}`}
                      aria-pressed={selected === item.agentId}
                      onClick={() => {
                        setSelected(item.agentId);
                        setPage(0);
                        setQuery("");
                        setStatus("all");
                      }}
                    >
                      <div className="inventory-server-heading">
                        <Server size={19} />
                        <span className={`inventory-dot ${recent ? "recent" : ""}`} />
                        {recent
                          ? "Recebimento recente"
                          : received
                            ? "Sem envio recente"
                            : "Aguardando primeiro envio"}
                      </div>
                      <strong>{received?.hostname || item.agentId}</strong>
                      <span className="small muted">{item.agentId}</span>
                      <span>
                        {received ? `${received.services.length} serviços` : "Ainda sem inventário"}
                      </span>
                      <small className="muted">
                        {received
                          ? `Recebido: ${date(received.receivedAt)}`
                          : `Cadastrado: ${date(item.registeredAt)}`}
                      </small>
                    </button>
                  );
                })}
              </section>
              {!inventory ? (
                <div className="panel inventory-empty">
                  <Server size={30} />
                  <h2>Aguardando o agente {selected}</h2>
                  <p>
                    Execute o agente no Windows. O primeiro inventário aparecerá automaticamente.
                  </p>
                  <code>py -3 agent.py --once</code>
                  <p className="small muted">
                    O agente precisa alcançar o endereço da central configurado em agent.json.
                  </p>
                </div>
              ) : (
                <section className="panel inventory-detail">
                  <div className="inventory-detail-heading">
                    <div>
                      <div className="eyebrow">INVENTÁRIO RECEBIDO</div>
                      <h2>{inventory.hostname}</h2>
                      <p className="muted">{inventory.os}</p>
                    </div>
                    <span className="inventory-readonly">
                      <ShieldCheck size={15} />
                      Somente consulta
                    </span>
                  </div>
                  {!fresh && (
                    <div className="inventory-warning" role="status">
                      <CircleAlert size={18} />
                      <span>
                        Sem inventário recente. Os estados abaixo são históricos; não indicam o
                        estado atual dos serviços.
                      </span>
                    </div>
                  )}
                  {Math.abs(Date.parse(inventory.collectedAt) - Date.parse(inventory.receivedAt)) >
                    300000 && (
                    <div className="inventory-warning">
                      O relógio do Windows ou o horário da coleta difere da central em mais de 5
                      minutos. Confira a sincronização.
                    </div>
                  )}
                  <div className="inventory-metadata">
                    <span>
                      Coleta no Windows: <strong>{date(inventory.collectedAt)}</strong>
                    </span>
                    <span>
                      Recebido na central: <strong>{date(inventory.receivedAt)}</strong>
                    </span>
                    <span>
                      Agente {inventory.agentVersion} · envio a cada {inventory.intervalSeconds}s
                    </span>
                  </div>
                  <div className="inventory-stats">
                    <div>
                      <strong>{services.length}</strong>
                      <span>Serviços</span>
                    </div>
                    <div>
                      <strong>{services.filter((item) => item.state === "Running").length}</strong>
                      <span>Em execução na coleta</span>
                    </div>
                    <div>
                      <strong>{services.filter((item) => item.state === "Stopped").length}</strong>
                      <span>Parados na coleta</span>
                    </div>
                    <div>
                      <strong>
                        {
                          services.filter(
                            (item) => item.startMode === "Auto" && item.state === "Stopped",
                          ).length
                        }
                      </strong>
                      <span>Automáticos parados</span>
                    </div>
                  </div>
                  <div className="inventory-filters">
                    <label>
                      <Search size={16} />
                      <input
                        aria-label="Pesquisar serviços recebidos"
                        placeholder="Pesquisar nome ou nome interno…"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setPage(0);
                        }}
                      />
                    </label>
                    <select
                      aria-label="Filtrar estado dos serviços"
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="all">Todos os estados</option>
                      <option value="Running">Em execução</option>
                      <option value="Stopped">Parados</option>
                      <option value="other">Outros estados</option>
                    </select>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Serviço</th>
                          <th>Nome interno</th>
                          <th>Estado na coleta</th>
                          <th>Inicialização</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(safePage * 50, (safePage + 1) * 50).map((service) => (
                          <tr key={service.name}>
                            <td>
                              <strong>{service.displayName}</strong>
                            </td>
                            <td className="mono">{service.name}</td>
                            <td>
                              <span
                                className={`inventory-state ${fresh && service.state === "Running" ? "running" : ""}`}
                              >
                                {STATE_LABELS[service.state]}
                                {!fresh && " · histórico"}
                              </span>
                            </td>
                            <td>{START_LABELS[service.startMode]}</td>
                          </tr>
                        ))}
                        {!filtered.length && (
                          <tr>
                            <td colSpan={4}>Nenhum serviço corresponde aos filtros.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="inventory-pagination">
                    <span className="muted">
                      {filtered.length} de {services.length} serviços · até 50 por página
                    </span>
                    <div>
                      <button
                        className="button secondary"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                      >
                        Anterior
                      </button>
                      <span>
                        {safePage + 1} / {pages}
                      </span>
                      <button
                        className="button secondary"
                        disabled={safePage >= pages - 1}
                        onClick={() => setPage(safePage + 1)}
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                  <p className="small muted">
                    Serviço parado pode ser normal. O inventário não testa a saúde da aplicação nem
                    executa comandos.
                  </p>
                </section>
              )}
            </>
          )}
        </>
      )}
      <details className="inventory-help">
        <summary>Como conectar o primeiro Windows</summary>
        <ol>
          <li>
            Na central, gere o pacote com{" "}
            <code>
              npm run central:setup -- --agent srv-windows-01 --url http://IP-DA-CENTRAL:3000
              --allow-http
            </code>
            .
          </li>
          <li>
            Inicie a central para a rede com <code>npm run dev:lan</code>. Permita a conexão apenas
            na rede de teste.
          </li>
          <li>
            Copie a pasta gerada para o Windows e execute <code>py -3 agent.py --once</code>. Para
            continuar enviando, use <code>py -3 agent.py</code>.
          </li>
          <li>
            Abra o arquivo local <code>.local/central/dashboard-key.txt</code> e use a chave no
            acesso acima.
          </li>
        </ol>
        <p>
          Não abra porta de entrada no Windows gerenciado. HTTP é somente para o teste em rede
          confiável; para outras redes, use HTTPS. A central precisa estar ligada e acessível.
        </p>
      </details>
    </div>
  );
}
