"use client";
import Link from "next/link";
import { ArrowRight, Clock3, Network, RefreshCw, Server as ServerIcon } from "lucide-react";
import { available } from "@/domain/permissions";
import { dateTime } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { ServerTable } from "../server-table";
import { Badge, Notice, PageTitle, Panel } from "../ui";
export function Servers() {
  const { state, api, task } = useDemo();
  const server = state.servers.find((s) => s.id === state.selectedServerId)!;
  const online = available(server, state.now);
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / SERVIDORES"
        title="Servidores"
        description="Inventário, comunicação e contexto de cada máquina."
      />
      <Panel
        title="Inventário de servidores"
        subtitle="Selecione um servidor no cabeçalho ou clique no nome para consultar seus detalhes."
      >
        <ServerTable />
      </Panel>
      <Panel
        title={`Detalhes · ${server.name}`}
        action={
          <Badge tone={server.environment === "Produção" ? "warn" : "blue"}>
            {server.environment}
          </Badge>
        }
      >
        <div className="server-detail">
          <div className="server-monogram">
            <ServerIcon size={38} />
            <span className="mono">{server.hostname}</span>
            <Badge tone={online ? "good" : "bad"}>
              {online ? "Agente conectado" : "Sem comunicação"}
            </Badge>
          </div>
          <dl className="detail-grid grow">
            <div>
              <dt>Sistema operacional ilustrativo</dt>
              <dd>{server.windows}</dd>
            </div>
            <div>
              <dt>Última comunicação do agente</dt>
              <dd>
                {dateTime(server.lastSeen)}
                <small>Heartbeat de 30s · vencimento em 90s</small>
              </dd>
            </div>
            <div>
              <dt>Situação dos dados</dt>
              <dd>
                {online ? "Comunicação disponível" : "Desatualizados · estado atual desconhecido"}
                <small>Observações dos serviços têm horário próprio.</small>
              </dd>
            </div>
            <div>
              <dt>Saúde da aplicação</dt>
              <dd>
                Não verificada<small>Agente conectado não comprova saúde do Protheus.</small>
              </dd>
            </div>
            <div>
              <dt>Origem de atualizações</dt>
              <dd>{server.source}</dd>
            </div>
            <div>
              <dt>Reinicialização já pendente</dt>
              <dd>
                {server.rebootPending
                  ? "Sim · informação fictícia"
                  : "Não indicada na última observação"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="panel-body pt-0">
          {!online && (
            <Notice tone="bad">
              Nenhuma alteração será aceita ou guardada para executar depois. Os estados exibidos
              são da última observação.
            </Notice>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href="/servicos" className="button primary">
              Consultar serviços
              <ArrowRight size={15} />
            </Link>
            <button
              className="button secondary"
              onClick={() =>
                void task(() => api.refreshServices(server.id), "Observações atualizadas.")
              }
            >
              <RefreshCw size={15} />
              Consultar estado agora
            </button>
          </div>
        </div>
      </Panel>
      <div className="architecture-note">
        <Network size={19} />
        <div>
          <strong>O servidor inicia a comunicação</strong>
          <p>
            O agente consulta a API do controlador por HTTPS e devolve os resultados. Nenhuma porta
            de entrada será aberta nos servidores gerenciados. A central C#/.NET e os agentes
            permanecerão fora da Vercel.
          </p>
        </div>
      </div>
    </>
  );
}
