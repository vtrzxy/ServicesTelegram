"use client";
import { Bot, Clock3, Download, LockKeyhole, RefreshCw, RotateCcw } from "lucide-react";
import { available, CACHE_MS, SCAN_INTERVAL_MS } from "@/domain/permissions";
import { dateTime, relative } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { Badge, Notice, PageTitle, Panel, Spinner } from "../ui";
export function Updates() {
  const { state, api, task } = useDemo();
  const server = state.servers.find((s) => s.id === state.selectedServerId)!;
  const updates = state.updates.filter((u) => u.serverId === server.id);
  const cacheValid = state.now - server.lastScan < CACHE_MS;
  const scanAllowed = state.now - server.lastScan >= SCAN_INTERVAL_MS;
  const online = available(server, state.now);
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / ATUALIZAÇÕES"
        title="Atualizações do Windows"
        description="Consulta de pacotes separada da administração de serviços. Todos os pacotes são fictícios."
        actions={
          <button
            className="button secondary"
            disabled={server.scanState === "loading" || !online || !scanAllowed}
            title={
              !online
                ? "Servidor sem comunicação"
                : !scanAllowed
                  ? "Aguarde 30 minutos entre buscas novas"
                  : "Consultar a origem configurada"
            }
            onClick={() =>
              void task(() => api.scan(server.id), "Consulta simulada concluída. Cache atualizado.")
            }
          >
            {server.scanState === "loading" ? (
              <Spinner label="Consultando origem" />
            ) : (
              <>
                <RefreshCw size={16} />
                Nova consulta simulada
              </>
            )}
          </button>
        }
      />
      <div className="summary-grid">
        <div className="summary-item">
          <span>Pacotes disponíveis</span>
          <strong>{updates.filter((u) => u.state === "Disponível").length}</strong>
          <small>{server.hostname} · dados fictícios</small>
        </div>
        <div className="summary-item">
          <span>Última consulta</span>
          <strong className="text-base">{relative(server.lastScan, state.now)}</strong>
          <small>{dateTime(server.lastScan)}</small>
        </div>
        <div className="summary-item">
          <span>Reinício já pendente no servidor</span>
          <Badge tone={server.rebootPending ? "warn" : "neutral"}>
            {server.rebootPending ? "Sim · pendência ilustrativa" : "Não indicado"}
          </Badge>
          <small>Não é a previsão de um pacote.</small>
        </div>
      </div>
      {!online ? (
        <Notice tone="bad">
          Servidor sem comunicação. A consulta atual é desconhecida; os pacotes abaixo pertencem à
          última busca e estão desatualizados.
        </Notice>
      ) : (
        <Notice>
          <strong>
            {cacheValid
              ? "Cache disponível por até seis horas."
              : "Cache vencido. Faça uma nova consulta."}
          </strong>{" "}
          {scanAllowed
            ? "Uma nova busca pode ser simulada."
            : `Intervalo mínimo de 30 minutos: próxima busca a partir de ${dateTime(server.lastScan + SCAN_INTERVAL_MS)}.`}
        </Notice>
      )}
      <Panel
        title={`Pacotes · ${server.name}`}
        subtitle={`Origem: ${server.source}`}
        action={
          <Badge tone={online && cacheValid ? "good" : "warn"}>
            {online && cacheValid ? "Cache válido" : "Dados desatualizados"}
          </Badge>
        }
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Pacote / KB</th>
                <th>Categoria</th>
                <th>Tamanho estimado</th>
                <th>Estado</th>
                <th>Pode exigir reinício</th>
              </tr>
            </thead>
            <tbody>
              {updates.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.title}</strong>
                    <small className="mono">{u.kb || "KB não informada"} · pacote fictício</small>
                    <small>
                      {u.source} · {dateTime(server.lastScan)}
                    </small>
                  </td>
                  <td>{u.category}</td>
                  <td className="tabular">~{u.sizeMb} MiB</td>
                  <td>
                    <Badge tone={u.state === "Instalado" ? "good" : "blue"}>{u.state}</Badge>
                  </td>
                  <td>
                    <span className={u.mayReboot ? "text-warn" : "muted"}>
                      {u.mayReboot ? "Sim, possivelmente" : "Não indicado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span>Uma busca ativa por máquina · intervalo mínimo de 30 minutos</span>
          <span>Sem download ou instalação</span>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel title="Instalação controlada" subtitle="Planejada para uma fase posterior.">
          <div className="panel-body">
            <p className="muted">
              Exigirá seleção explícita dos pacotes, autorização, janela, pré-requisitos e
              acompanhamento. Não há “instalar tudo” nem reinicialização automática nesta fase.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="button secondary"
                disabled
                title="Instalação fora do escopo desta fase"
              >
                <LockKeyhole size={15} />
                Instalar pacotes · futuro
              </button>
              <button
                className="button secondary"
                disabled
                title="Reinício do sistema não permitido"
              >
                <RotateCcw size={15} />
                Reiniciar sistema · bloqueado
              </button>
            </div>
          </div>
        </Panel>
        <Panel
          title="Análise de cumulativos por IA"
          subtitle="Recurso planejado, sem análise executada."
        >
          <div className="panel-body">
            <div className="feature-icon">
              <Bot size={24} />
            </div>
            <p className="muted">
              Pesquisa futura por KB e versão/build, com fontes oficiais, datas e incertezas. A IA
              apoiará a decisão humana e não terá autoridade de execução.
            </p>
            <Badge>Disponível em fase futura</Badge>
          </div>
        </Panel>
      </div>
    </>
  );
}
