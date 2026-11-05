"use client";
import { useState } from "react";
import { Search, Settings2, RefreshCw } from "lucide-react";
import { available, fresh } from "@/domain/permissions";
import { ACTION_LABELS } from "@/domain/types";
import { dateTime } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { ServicePolicyDialog } from "../service-policy-dialog";
import { Badge, Empty, Notice, PageTitle, Panel, Spinner } from "../ui";
export function Services() {
  const { state, api, task } = useDemo();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const server = state.servers.find((s) => s.id === state.selectedServerId)!;
  const online = available(server, state.now);
  const all = state.services.filter(
    (s) =>
      s.serverId === server.id &&
      `${s.name} ${s.internalName} ${s.category}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
  );
  const pages = Math.max(1, Math.ceil(all.length / 10));
  const current = Math.min(page, pages);
  const service = state.services.find((s) => s.id === editing);
  return (
    <>
      <PageTitle
        eyebrow="APOIO WEB"
        title="Configuração de serviços"
        description="Escolha o servidor e libere, por serviço, o que o operador poderá fazer no Telegram."
      />
      <Notice>
        Esta tela configura permissões. Para consultar atualizações ou solicitar ações, use a prévia
        do Telegram.{" "}
        {state.role !== "administracao" && "Para editar, selecione Administração no cabeçalho."}
      </Notice>
      <Panel
        title="Servidor"
        subtitle="Agente consulta a central por HTTPS; sem porta de entrada no servidor."
      >
        <div className="config-toolbar">
          <label>
            <span className="field-label">Servidor configurado</span>
            <select
              aria-label="Servidor selecionado"
              value={server.id}
              onChange={(e) => {
                api.selectServer(e.target.value);
                setPage(1);
              }}
            >
              {state.servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.hostname} · {s.name}
                </option>
              ))}
            </select>
          </label>
          <Badge tone={server.environment === "Produção" ? "warn" : "blue"}>
            {server.environment}
          </Badge>
          <Badge tone={online ? "good" : "bad"}>
            {online ? "Agente disponível" : "Sem comunicação"}
          </Badge>
          <button
            className="button secondary"
            disabled={busy || !online}
            onClick={() => {
              setBusy(true);
              void task(() => api.refreshServices(server.id), "Inventário consultado.").finally(
                () => setBusy(false),
              );
            }}
          >
            {busy ? (
              <Spinner label="Consultando" />
            ) : (
              <>
                <RefreshCw size={15} />
                Consultar inventário
              </>
            )}
          </button>
        </div>
        <div className="panel-foot">
          <span>{server.windows}</span>
          <span>Último contato: {dateTime(server.lastSeen)}</span>
        </div>
      </Panel>
      <Panel
        title={`Serviços · ${server.hostname}`}
        subtitle="Nomes ilustrativos. Serviços novos entram sem ações liberadas."
      >
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Pesquisar serviço</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar serviço, nome interno ou categoria…"
            />
          </label>
        </div>
        {all.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Categoria</th>
                  <th>Último estado observado</th>
                  <th>Ações no Telegram</th>
                  <th>Configuração</th>
                </tr>
              </thead>
              <tbody>
                {all.slice((current - 1) * 10, current * 10).map((s) => {
                  const known = online && fresh(s, state.now);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <small className="mono">{s.internalName}</small>
                      </td>
                      <td>{s.category}</td>
                      <td>
                        <Badge tone={!known ? "neutral" : s.state === "running" ? "good" : "warn"}>
                          {!known
                            ? "Desatualizado"
                            : s.state === "running"
                              ? "Em execução"
                              : "Parado"}
                        </Badge>
                        <small>{dateTime(s.observedAt)}</small>
                      </td>
                      <td>
                        {s.protected ? (
                          <Badge>Protegido</Badge>
                        ) : s.allowedActions.length ? (
                          <span>{s.allowedActions.map((a) => ACTION_LABELS[a]).join(" · ")}</span>
                        ) : (
                          <span className="muted">Somente consulta</span>
                        )}
                        {server.environment === "Produção" && (
                          <small>
                            {s.productionAllowed
                              ? "Liberação explícita em produção"
                              : "Produção ainda não liberada"}
                          </small>
                        )}
                      </td>
                      <td>
                        <button className="button secondary" onClick={() => setEditing(s.id)}>
                          <Settings2 size={14} />
                          {state.role === "administracao" ? "Configurar" : "Ver configuração"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nenhum serviço encontrado">
            Altere a pesquisa para consultar o inventário.
          </Empty>
        )}
        <div className="pagination">
          <span>{all.length} serviços · 10 por página</span>
          <div>
            <button
              className="button secondary"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Anterior
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              className="button secondary"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </button>
          </div>
        </div>
      </Panel>
      {state.policyAudit.length > 0 && (
        <details className="simple-details">
          <summary>Últimas alterações de configuração ({state.policyAudit.length})</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Destino</th>
                  <th>Permitido após a mudança</th>
                  <th>Responsável e autor</th>
                  <th>Horário</th>
                </tr>
              </thead>
              <tbody>
                {state.policyAudit.slice(0, 10).map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.hostname}
                      <small>
                        {entry.serviceName} · v{entry.revision}
                      </small>
                    </td>
                    <td>
                      {entry.after.map((a) => ACTION_LABELS[a]).join(" · ") || "Somente consulta"}
                    </td>
                    <td>
                      {entry.responsible}
                      <small>Alterado por {entry.userName}</small>
                    </td>
                    <td>{dateTime(entry.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {service && (
        <ServicePolicyDialog key={service.id} service={service} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
