"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LockKeyhole,
  Play,
  RefreshCw,
  Search,
  Square,
} from "lucide-react";
import { available, fresh, permission } from "@/domain/permissions";
import { Action, WindowsService } from "@/domain/types";
import { dateTime, relative } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { Badge, Dialog, Empty, Notice, PageTitle, Panel, Spinner } from "../ui";
export function Services() {
  const { state, api, request, task } = useDemo();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [management, setManagement] = useState("all");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const server = state.servers.find((s) => s.id === state.selectedServerId)!;
  const all = state.services.filter((s) => s.serverId === server.id);
  const categories = [...new Set(all.map((s) => s.category))];
  const online = available(server, state.now);
  const effectiveState = (s: WindowsService) =>
    online && fresh(s, state.now) ? s.state : "unknown";
  const filtered = all.filter(
    (s) =>
      `${s.name} ${s.internalName}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")) &&
      (category === "all" || s.category === category) &&
      (status === "all" || effectiveState(s) === status) &&
      (management === "all" ||
        (management === "yes"
          ? permission(state, s, "reiniciar").allowed
          : !permission(state, s, "reiniciar").allowed)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  const selected = state.services.find((s) => s.id === detail);
  const resetFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / SERVIÇOS"
        title="Catálogo de serviços"
        description="Inventário e autorização são independentes. Os nomes internos são ilustrativos."
        actions={
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void task(
                () => api.refreshServices(server.id),
                "Estado consultado na simulação.",
              ).finally(() => setBusy(false));
            }}
          >
            {busy ? (
              <Spinner label="Consultando" />
            ) : (
              <>
                <RefreshCw size={16} />
                Consultar estados
              </>
            )}
          </button>
        }
      />
      {server.environment === "Produção" && (
        <Notice tone="warn">
          <strong>
            {server.name} · {server.hostname}
          </strong>{" "}
          — Produção somente para consulta.{" "}
          {online
            ? "Nenhuma ação de alteração está autorizada."
            : "Sem comunicação; os dados abaixo são históricos."}
        </Notice>
      )}
      <Panel
        title={`Serviços · ${server.name}`}
        subtitle={`${all.length} serviços cadastrados · contexto ${server.hostname}`}
        action={
          <Badge tone={online ? "good" : "bad"}>
            {online ? "Agente conectado" : "Sem comunicação"}
          </Badge>
        }
      >
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Pesquisar serviço</span>
            <input
              placeholder="Pesquisar nome ou nome interno…"
              value={search}
              onChange={(e) => resetFilter(() => setSearch(e.target.value))}
            />
          </label>
          <label>
            <span className="sr-only">Filtrar categoria</span>
            <select
              value={category}
              onChange={(e) => resetFilter(() => setCategory(e.target.value))}
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar estado</span>
            <select value={status} onChange={(e) => resetFilter(() => setStatus(e.target.value))}>
              <option value="all">Todos os estados</option>
              <option value="running">Em execução</option>
              <option value="stopped">Parado</option>
              <option value="unknown">Desconhecido</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filtrar gerenciamento</span>
            <select
              value={management}
              onChange={(e) => resetFilter(() => setManagement(e.target.value))}
            >
              <option value="all">Todas as permissões</option>
              <option value="yes">Posso operar</option>
              <option value="no">Somente consulta</option>
            </select>
          </label>
        </div>
        {filtered.length ? (
          <div className="table-scroll">
            <table className="services-table">
              <thead>
                <tr>
                  <th>Serviço / nome interno Windows</th>
                  <th>Categoria</th>
                  <th>Estado observado</th>
                  <th>Permissão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((currentPage - 1) * 10, currentPage * 10).map((s) => {
                  const access = permission(state, s, "reiniciar");
                  const observed = effectiveState(s);
                  return (
                    <tr key={s.id}>
                      <td>
                        <button className="entity-name text-left" onClick={() => setDetail(s.id)}>
                          {s.name}
                        </button>
                        <small className="mono">{s.internalName}</small>
                        <small>{server.hostname}</small>
                      </td>
                      <td>
                        <span className="category-tag">{s.category}</span>
                      </td>
                      <td>
                        <Badge
                          tone={
                            observed === "running"
                              ? "good"
                              : observed === "stopped"
                                ? "warn"
                                : "neutral"
                          }
                        >
                          {observed === "running"
                            ? "Em execução"
                            : observed === "stopped"
                              ? "Parado"
                              : "Desconhecido"}
                        </Badge>
                        <small title={dateTime(s.observedAt)}>
                          {relative(s.observedAt, state.now)}
                          {observed === "unknown" ? " · desatualizado" : ""}
                        </small>
                      </td>
                      <td>
                        <span className={`inline-state ${access.allowed ? "text-blue" : "muted"}`}>
                          <LockKeyhole size={13} />
                          {access.allowed
                            ? "Operação autorizada"
                            : s.manageable && state.role === "operacao"
                              ? "Operação bloqueada"
                              : "Somente consulta"}
                        </span>
                        <small className="permission-reason">
                          {access.allowed
                            ? "Iniciar · parar · reiniciar"
                            : !online
                              ? "Servidor sem comunicação"
                              : s.manageable && !fresh(s, state.now)
                                ? "Observação desatualizada"
                                : s.manageable && state.role === "administracao"
                                  ? "Sem concessão ao administrador"
                                  : s.manageable && state.role === "consulta"
                                    ? "Perfil de consulta"
                                    : s.manageable
                                      ? "Operação conflitante"
                                      : s.discovered
                                        ? "Novo no inventário"
                                        : s.protected
                                          ? "Componente protegido"
                                          : s.shared
                                            ? "Componente compartilhado"
                                            : server.environment === "Produção"
                                              ? "Política de produção"
                                              : "Sem concessão operacional"}
                        </small>
                      </td>
                      <td>
                        <div className="row-actions">
                          {(
                            [
                              { action: "iniciar", icon: Play },
                              { action: "parar", icon: Square },
                              { action: "reiniciar", icon: RefreshCw },
                            ] as const
                          ).map((item) => {
                            const allowed = permission(state, s, item.action);
                            return (
                              <button
                                key={item.action}
                                className="icon-button action-button"
                                disabled={!allowed.allowed}
                                aria-label={`${item.action} ${s.name}`}
                                title={
                                  allowed.allowed ? `${item.action} ${s.name}` : allowed.reason
                                }
                                onClick={() => request(s, item.action)}
                              >
                                <item.icon size={15} />
                              </button>
                            );
                          })}
                          <button
                            className="icon-button"
                            onClick={() => setDetail(s.id)}
                            title="Ver ficha e motivo de bloqueio"
                            aria-label={`Ver ficha de ${s.name}`}
                          >
                            <FileText size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Nenhum serviço encontrado">
            Ajuste a pesquisa e os filtros para consultar o inventário.
          </Empty>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, filtered.length)}`
              : "0"}{" "}
            de {filtered.length} serviços · 10 por página
          </span>
          <div>
            <button
              className="icon-button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Página {currentPage} de {pages}
            </span>
            <button
              className="icon-button"
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </Panel>
      <Notice>
        Estado em execução não comprova saúde do Protheus. Sem teste funcional:{" "}
        <strong>Serviço em execução; aplicação não verificada</strong>.
      </Notice>
      {selected && (
        <Dialog title="Ficha do serviço" onClose={() => setDetail(null)} wide>
          <div className="dialog-body">
            <h3>{selected.name}</h3>
            <p className="mono muted">{selected.internalName} · nome ilustrativo</p>
            <dl className="detail-grid">
              <div>
                <dt>Servidor e ambiente</dt>
                <dd>
                  {state.servers.find((s) => s.id === selected.serverId)?.hostname}
                  <small>
                    {state.servers.find((s) => s.id === selected.serverId)?.environment}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Última observação</dt>
                <dd>{dateTime(selected.observedAt)}</dd>
              </div>
              <div>
                <dt>Categoria</dt>
                <dd>{selected.category}</dd>
              </div>
              <div>
                <dt>Responsável pela autorização</dt>
                <dd>{selected.owner}</dd>
              </div>
              <div>
                <dt>Dependências</dt>
                <dd>
                  {selected.dependencies.length
                    ? selected.dependencies
                        .map((id) => state.services.find((s) => s.id === id)?.name)
                        .join(", ")
                    : "Mapeamento operacional necessário antes de autorizar alterações"}
                </dd>
              </div>
              <div>
                <dt>Janela</dt>
                <dd>
                  {selected.manageable ? selected.window : "Nenhuma janela operacional autorizada"}
                </dd>
              </div>
              <div>
                <dt>Impacto</dt>
                <dd>{selected.impact}</dd>
              </div>
              <div>
                <dt>Critério de sucesso</dt>
                <dd>{selected.success}</dd>
              </div>
              <div>
                <dt>Saúde da aplicação</dt>
                <dd>Não verificada</dd>
              </div>
              <div>
                <dt>Ações disponíveis ao perfil atual</dt>
                <dd>
                  {permission(state, selected, "reiniciar").allowed
                    ? "Iniciar, parar e reiniciar"
                    : "Somente consulta"}
                </dd>
              </div>
            </dl>
            <Notice tone={permission(state, selected, "reiniciar").allowed ? "good" : "warn"}>
              {permission(state, selected, "reiniciar").reason}
            </Notice>
          </div>
          <div className="dialog-footer">
            <button className="button secondary" onClick={() => setDetail(null)}>
              Fechar ficha
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
