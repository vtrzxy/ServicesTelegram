"use client";
import Link from "next/link";
import { ArrowRight, Server as ServerIcon, Wifi, WifiOff } from "lucide-react";
import { available, fresh } from "@/domain/permissions";
import { relative } from "@/lib/format";
import { useDemo } from "./demo-provider";
import { Badge } from "./ui";
export function ServerTable() {
  const { state, api } = useDemo();
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Servidor</th>
            <th>Ambiente</th>
            <th>Comunicação</th>
            <th>Serviços</th>
            <th>Último contato</th>
            <th>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {state.servers.map((server) => {
            const online = available(server, state.now);
            const services = state.services.filter((s) => s.serverId === server.id);
            const current = services.filter((s) => online && fresh(s, state.now));
            return (
              <tr key={server.id}>
                <td>
                  <div className="entity">
                    <span className={`entity-icon ${online ? "" : "entity-offline"}`}>
                      <ServerIcon size={19} />
                    </span>
                    <div>
                      <Link
                        href="/servidores"
                        className="entity-name"
                        onClick={() => api.selectServer(server.id)}
                      >
                        {server.name}
                      </Link>
                      <small className="mono">{server.hostname}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge tone={server.environment === "Produção" ? "warn" : "blue"}>
                    {server.environment}
                  </Badge>
                </td>
                <td>
                  <span className={`inline-state ${online ? "text-good" : "text-muted"}`}>
                    {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                    {online ? "Conectado" : "Sem comunicação"}
                  </span>
                </td>
                <td>
                  {current.length ? (
                    <span>
                      <strong>{current.filter((s) => s.state === "running").length}</strong>
                      <span className="muted"> / {services.length} em execução</span>
                    </span>
                  ) : (
                    <span className="muted">Estado desconhecido</span>
                  )}
                </td>
                <td>
                  <span className="tabular">{relative(server.lastSeen, state.now)}</span>
                  <small>{online ? "Heartbeat de 30s" : "Dados desatualizados"}</small>
                </td>
                <td>
                  <Link
                    className="table-link"
                    href="/servicos"
                    onClick={() => api.selectServer(server.id)}
                  >
                    Ver serviços
                    <ArrowRight size={15} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
