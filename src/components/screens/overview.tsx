"use client";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  CircleCheck,
  CircleDot,
  Clock3,
  Layers3,
  RefreshCw,
  Server,
  ShieldCheck,
  WifiOff,
} from "lucide-react";
import { available, fresh } from "@/domain/permissions";
import { STATUS_LABELS, USERS } from "@/domain/types";
import { dateTime, relative, tone } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { ServerTable } from "../server-table";
import { Badge, Empty, Notice, PageTitle, Panel, Spinner } from "../ui";
import { useState } from "react";
export function Overview() {
  const { state, api, task, openOperation } = useDemo();
  const [busy, setBusy] = useState(false);
  const online = state.servers.filter((s) => available(s, state.now));
  const observed = state.services.filter(
    (s) => online.some((server) => server.id === s.serverId) && fresh(s, state.now),
  );
  const pending = state.operations.filter((o) =>
    ["pending", "running", "unknown"].includes(o.status),
  );
  const visibleOperations = state.operations.filter((o) => o.userId === USERS[state.role].id);
  const stats = [
    {
      label: "Servidores conectados",
      value: `${online.length}`,
      suffix: `/ ${state.servers.length}`,
      detail: `${state.servers.length - online.length} servidor(es) sem comunicação`,
      icon: Server,
      color: "blue",
    },
    {
      label: "Serviços em execução",
      value: observed.filter((s) => s.state === "running").length,
      suffix: "",
      detail: `${observed.filter((s) => s.state === "stopped").length} parados · ${state.services.length - observed.length} sem estado atual`,
      icon: Layers3,
      color: "green",
    },
    {
      label: "Operações pendentes",
      value: pending.length,
      suffix: "",
      detail: "Confirmações, execução ou reconciliação",
      icon: Clock3,
      color: "amber",
    },
    {
      label: "Atualizações encontradas",
      value: state.updates.filter(
        (u) => u.state === "Disponível" && online.some((s) => s.id === u.serverId),
      ).length,
      suffix: "",
      detail: "Nos caches dos servidores conectados",
      icon: ArrowDownToLine,
      color: "violet",
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / VISÃO GERAL"
        title="Seu ambiente, em um só lugar"
        description="Acompanhe os servidores, os serviços e as operações do ERP."
        actions={
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void task(async () => {
                for (const s of online) await api.refreshServices(s.id);
              }, "Observações dos servidores disponíveis atualizadas.").finally(() =>
                setBusy(false),
              );
            }}
          >
            {busy ? (
              <Spinner label="Atualizando" />
            ) : (
              <>
                <RefreshCw size={16} />
                Atualizar estados
              </>
            )}
          </button>
        }
      />
      <div className="stats-grid">
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={18} className={`stat-${s.color}`} />
            </div>
            <div className="stat-value">
              {s.value}
              <span>{s.suffix}</span>
            </div>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>
      <Notice tone="warn">
        <strong>ERP Filial está sem comunicação.</strong> O último contato ocorreu{" "}
        {relative(state.servers[2].lastSeen, state.now)}. Alterações estão bloqueadas e nenhum
        comando será enviado quando ele voltar.
      </Notice>
      <Panel
        title="Servidores do ambiente"
        subtitle="A comunicação do agente e a saúde da aplicação são verificações diferentes."
        action={
          <Link href="/servidores" className="text-link">
            Gerenciar servidores
            <ArrowRight size={15} />
          </Link>
        }
      >
        <ServerTable />
        <div className="panel-foot">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck size={14} />
            Produção somente para consulta
          </span>
          <span>3 servidores fictícios</span>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel
          title="Atividade recente"
          subtitle="Histórico compartilhado entre painel e prévia do Telegram."
          action={
            <Link href="/operacoes" className="text-link">
              Ver histórico
              <ArrowRight size={14} />
            </Link>
          }
        >
          {visibleOperations.length ? (
            <div className="activity-list">
              {visibleOperations.slice(0, 4).map((op) => (
                <button className="activity-item" key={op.id} onClick={() => openOperation(op.id)}>
                  <span className={`activity-icon ${tone(op.status)}`}>
                    <CircleDot size={17} />
                  </span>
                  <span>
                    <strong>{op.serviceName}</strong>
                    <small>
                      {op.id} · {op.hostname} · {dateTime(op.createdAt)}
                    </small>
                  </span>
                  <Badge tone={tone(op.status)}>{STATUS_LABELS[op.status]}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="activity-item static">
                <span className="activity-icon bad">
                  <WifiOff size={17} />
                </span>
                <span>
                  <strong>Comunicação vencida com ERP Filial</strong>
                  <small>
                    Evento ilustrativo · {relative(state.servers[2].lastSeen, state.now)}
                  </small>
                </span>
                <Badge tone="warn">Atenção</Badge>
              </div>
              <div className="activity-item static">
                <span className="activity-icon good">
                  <CircleCheck size={17} />
                </span>
                <span>
                  <strong>Política de homologação disponível</strong>
                  <small>1 AppServer com concessão para o perfil Operação</small>
                </span>
                <Badge>Consulta</Badge>
              </div>
              <div className="quiet-note">As próximas operações simuladas aparecerão aqui.</div>
            </>
          )}
        </Panel>
        <Panel title="Operação com destino explícito" subtitle="O piloto começa em homologação.">
          <div className="workflow-compact">
            <span>Selecionar serviço</span>
            <ArrowRight size={14} />
            <span>Confirmar</span>
            <ArrowRight size={14} />
            <span>Acompanhar</span>
          </div>
          <div className="info-rows">
            <div>
              <span>Ambiente liberado</span>
              <Badge tone="blue">Homologação</Badge>
            </div>
            <div>
              <span>Serviço autorizado</span>
              <strong>1 AppServer</strong>
            </div>
            <div>
              <span>Confirmação</span>
              <strong>60 segundos · uso único</strong>
            </div>
            <div>
              <span>Saúde do Protheus</span>
              <span className="muted">Não verificada</span>
            </div>
          </div>
          <Link className="button secondary full" href="/operacoes#cenarios">
            Explorar cenários de operação
            <ArrowRight size={15} />
          </Link>
        </Panel>
      </div>
    </>
  );
}
