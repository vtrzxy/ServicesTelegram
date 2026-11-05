"use client";
import { useState } from "react";
import {
  ArrowRight,
  CheckCheck,
  FlaskConical,
  History,
  Play,
  Search,
  ShieldCheck,
} from "lucide-react";
import { SCENARIOS, Scenario, STATUS_LABELS, USERS } from "@/domain/types";
import { dateTime, tone } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { Badge, Empty, Notice, PageTitle, Panel } from "../ui";
export function Operations() {
  const { state, api, notify, request, openOperation } = useDemo();
  const [scenario, setScenario] = useState<Scenario>("success");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const own = state.operations.filter((o) => o.userId === USERS[state.role].id);
  const operations = own.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      `${o.id} ${o.serviceName} ${o.hostname}`.toLowerCase().includes(search.toLowerCase()),
  );
  const active = state.operations.filter(
    (o) =>
      o.userId === USERS[state.role].id && ["pending", "running", "unknown"].includes(o.status),
  );
  const prepare = () => {
    try {
      api.prepareScenario();
      notify("Homologação pronta para outro cenário. Histórico preservado.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / OPERAÇÕES"
        title="Operações e histórico"
        description="Acompanhe cada etapa. Aceitar um comando não significa concluir uma operação."
        actions={<Badge>Histórico do solicitante atual</Badge>}
      />
      {active.length > 0 && (
        <Panel title="Solicitações que precisam de atenção">
          <div className="activity-list">
            {active.map((o) => (
              <button className="activity-item" key={o.id} onClick={() => openOperation(o.id)}>
                <span className="activity-icon warn">
                  <History size={18} />
                </span>
                <span>
                  <strong>
                    {o.id} · {o.serviceName}
                  </strong>
                  <small>
                    {o.hostname} · {o.message}
                  </small>
                </span>
                <Badge tone={tone(o.status)}>{STATUS_LABELS[o.status]}</Badge>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </Panel>
      )}
      <Panel
        title="Histórico de operações"
        subtitle={`Solicitante: ${USERS[state.role].name} · ID ${USERS[state.role].id}`}
      >
        <div className="filter-bar">
          <label className="search-field">
            <Search size={16} />
            <span className="sr-only">Pesquisar operação</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar operação ou destino…"
            />
          </label>
          <label>
            <span className="sr-only">Filtrar resultado</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">Todos os resultados</option>
              {Object.entries(STATUS_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {operations.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Destino</th>
                  <th>Solicitante / horário</th>
                  <th>Resultado</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong className="mono">{o.id}</strong>
                      <small className="capitalize">
                        {o.action} · {o.source}
                      </small>
                    </td>
                    <td>
                      <strong>{o.serviceName}</strong>
                      <small>
                        {o.hostname} · {o.environment}
                      </small>
                    </td>
                    <td>
                      {o.userName}
                      <small>{dateTime(o.createdAt)}</small>
                    </td>
                    <td>
                      <Badge tone={tone(o.status)}>{STATUS_LABELS[o.status]}</Badge>
                    </td>
                    <td>
                      <button className="text-link" onClick={() => openOperation(o.id)}>
                        Ver etapas
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              own.length
                ? "Nenhuma operação com estes filtros"
                : "Nenhuma operação para este usuário"
            }
          >
            Use os cenários abaixo ou solicite uma ação no catálogo de serviços.
          </Empty>
        )}
        <div className="panel-foot">
          <span>Cancelamentos e expirações nunca aparecem como sucesso.</span>
          <span>{operations.length} registro(s)</span>
        </div>
      </Panel>
      <section id="cenarios">
        <Panel
          title="Laboratório de cenários"
          subtitle="Reproduza os resultados sem acessar servidores reais."
          action={
            <Badge tone="blue">
              <FlaskConical size={12} />
              Simulação
            </Badge>
          }
        >
          <div className="panel-body">
            <div className="scenario-grid">
              {SCENARIOS.map((item) => (
                <label
                  className={`scenario-option ${scenario === item.id ? "selected" : ""}`}
                  key={item.id}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={item.id}
                    checked={scenario === item.id}
                    onChange={() => setScenario(item.id)}
                  />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </label>
              ))}
            </div>
            <Notice>
              Os cenários usam o AppServer de homologação e o perfil <strong>Operação</strong>.
              “Preparar cenário” restaura esse ambiente fictício e preserva o histórico.
            </Notice>
            <div className="flex flex-wrap items-center gap-3">
              <button className="button secondary" onClick={prepare}>
                <CheckCheck size={16} />
                Preparar cenário
              </button>
              <button
                className="button primary"
                disabled={state.role !== "operacao"}
                onClick={() =>
                  request(
                    state.services.find((s) => s.id === "hml-app")!,
                    scenario === "noop" ? "iniciar" : "reiniciar",
                    scenario,
                  )
                }
              >
                <Play size={15} />
                Testar cenário selecionado
              </button>
              {state.role !== "operacao" && (
                <span className="small muted">Troque o perfil no cabeçalho para Operação.</span>
              )}
            </div>
          </div>
        </Panel>
      </section>
      <div className="architecture-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Uma alteração por servidor, sem repetição automática</strong>
          <p>
            Solicitações pendentes, em andamento ou com resultado desconhecido bloqueiam operações
            conflitantes. Apenas solicitações ainda não iniciadas podem ser canceladas.
          </p>
        </div>
      </div>
    </>
  );
}
