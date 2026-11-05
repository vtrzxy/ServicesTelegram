"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCheck, Send, MessageCircle, Settings2, RefreshCw } from "lucide-react";
import { ACTION_LABELS, Action, Operation, STATUS_LABELS, USERS } from "@/domain/types";
import { available, fresh, CACHE_MS, SCAN_INTERVAL_MS, permission } from "@/domain/permissions";
import { resolveCommand, serviceCommand } from "@/domain/commands";
import { DomainError } from "@/services/contract";
import { dateTime, tone } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { Badge, Spinner, StepIcon } from "../ui";
type ChatEntry = {
  id: number;
  kind: "user" | "text" | "servers" | "services" | "actions" | "operation" | "updates" | "offer";
  text?: string;
  target?: string;
  page?: number;
};
export function Telegram() {
  const { state, api, notify } = useDemo();
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sequence = useRef(0);
  const box = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const add = (entry: Omit<ChatEntry, "id">) =>
    setEntries((previous) => [...previous, { ...entry, id: ++sequence.current }]);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [entries.length]);
  const actor = USERS[state.role];
  const history = state.operations.filter((o) => o.userId === actor.id);
  const host = (value: string) => {
    const matches = state.servers.filter(
      (s) => s.hostname.toLowerCase() === value.trim().toLowerCase(),
    );
    if (matches.length !== 1)
      throw new Error(
        "Informe um servidor cadastrado e sem ambiguidade. Use /servidores para listar.",
      );
    return matches[0];
  };
  async function send(text: string) {
    if (!text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setInput("");
    add({ kind: "user", text });
    try {
      if (text.trim() === "/servidores") add({ kind: "servers" });
      else if (/^\/servicos\s+/i.test(text)) {
        const server = host(text.replace(/^\/servicos\s+/i, ""));
        api.selectServer(server.id);
        if (available(server, state.now)) await api.refreshServices(server.id);
        add({ kind: "services", target: server.id, page: 0 });
      } else if (/^\/atualizacoes\s+/i.test(text)) {
        const server = host(text.replace(/^\/atualizacoes\s+/i, ""));
        add({ kind: "updates", target: server.id });
      } else {
        const command = resolveCommand(text, state);
        api.selectServer(command.service.serverId);
        try {
          const id = await api.request(command.service.id, command.action, "success", "Telegram");
          add({ kind: "operation", target: id });
        } catch (error) {
          if (error instanceof DomainError && error.code === "USE_START")
            add({ kind: "offer", target: command.service.id });
          else throw error;
        }
      }
    } catch (error) {
      add({ kind: "text", text: (error as Error).message });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  async function act(operation: Operation, action: "confirm" | "cancel" | "reconcile") {
    try {
      if (action === "confirm") await api.confirm(operation.id);
      else if (action === "cancel") await api.cancel(operation.id);
      else await api.reconcile(operation.id);
    } catch (error) {
      add({ kind: "text", text: (error as Error).message });
    }
  }
  return (
    <>
      <div className="telegram-intro">
        <div>
          <div className="eyebrow">PRIMEIRA VERSÃO · OPERAÇÃO PELO TELEGRAM</div>
          <h1>O comando vai pela conversa.</h1>
          <p>Escolha o servidor e o serviço, solicite a ação e confirme no próprio bot.</p>
        </div>
        <Link href="/configuracao" className="button secondary">
          <Settings2 size={16} />
          Configurar serviços
        </Link>
      </div>
      <div className="telegram-first-layout">
        <section className="telegram-conversation" aria-label="Prévia interativa do Telegram">
          <div className="chat-header">
            <span className="telegram-icon">
              <Send size={19} />
            </span>
            <div>
              <strong>ServicesTelegram</strong>
              <small>Prévia local · bot ainda não conectado</small>
            </div>
            <Badge>Simulação</Badge>
          </div>
          <div className="chat-body" ref={box}>
            <div className="chat-bubble bot">
              <strong>Olá, {actor.name.split(" ")[0]}.</strong>
              <p>Consulte os servidores ou informe uma ação com serviço e destino explícitos.</p>
              <div className="chat-buttons">
                <button onClick={() => void send("/servidores")}>Listar servidores</button>
                <button onClick={() => setInput("Restart Service IntegracaoDemo in SRV-HML-01")}>
                  Preencher exemplo de reinício
                </button>
              </div>
            </div>
            {entries.map((entry) => {
              if (entry.kind === "user")
                return (
                  <div className="chat-bubble user" key={entry.id}>
                    {entry.text}
                    <CheckCheck size={13} />
                  </div>
                );
              if (entry.kind === "text")
                return (
                  <div className="chat-bubble bot" key={entry.id}>
                    {entry.text}
                  </div>
                );
              if (entry.kind === "servers")
                return (
                  <div className="chat-bubble bot" key={entry.id}>
                    <strong>Servidores cadastrados</strong>
                    <div className="chat-buttons">
                      {state.servers.map((server) => (
                        <div className="chat-server" key={server.id}>
                          <strong>
                            {server.hostname} · {server.name}
                          </strong>
                          <small>
                            {server.environment} ·{" "}
                            {available(server, state.now) ? "Agente disponível" : "Sem comunicação"}{" "}
                            · último contato {dateTime(server.lastSeen)}
                          </small>
                          <button onClick={() => void send(`/servicos ${server.hostname}`)}>
                            Ver serviços
                          </button>
                          <button onClick={() => void send(`/atualizacoes ${server.hostname}`)}>
                            Ver atualizações
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              if (entry.kind === "services") {
                const server = state.servers.find((s) => s.id === entry.target)!;
                const services = state.services.filter((s) => s.serverId === server.id);
                const page = entry.page || 0;
                return (
                  <div className="chat-bubble bot" key={entry.id}>
                    <strong>Serviços em {server.hostname}</strong>
                    <p>{server.environment} · nomes ilustrativos. Selecione um serviço.</p>
                    <div className="chat-buttons">
                      {services.slice(page * 10, (page + 1) * 10).map((service) => (
                        <button
                          key={service.id}
                          onClick={() => add({ kind: "actions", target: service.id })}
                        >
                          <span>
                            {service.name}
                            <small>
                              {service.internalName} ·{" "}
                              {available(server, state.now) && fresh(service, state.now)
                                ? service.state === "running"
                                  ? "Em execução"
                                  : "Parado"
                                : "Estado desconhecido"}
                            </small>
                          </span>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                    {services.length > 10 && (
                      <div className="chat-pagination">
                        <button
                          disabled={page === 0}
                          onClick={() =>
                            setEntries((old) =>
                              old.map((e) => (e.id === entry.id ? { ...e, page: page - 1 } : e)),
                            )
                          }
                        >
                          Anterior
                        </button>
                        <span>
                          {page + 1} / {Math.ceil(services.length / 10)}
                        </span>
                        <button
                          disabled={(page + 1) * 10 >= services.length}
                          onClick={() =>
                            setEntries((old) =>
                              old.map((e) => (e.id === entry.id ? { ...e, page: page + 1 } : e)),
                            )
                          }
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              if (entry.kind === "actions" || entry.kind === "offer") {
                const service = state.services.find((s) => s.id === entry.target)!;
                const server = state.servers.find((s) => s.id === service.serverId)!;
                const actions: Action[] =
                  entry.kind === "offer" ? ["iniciar"] : service.allowedActions;
                return (
                  <div className="chat-bubble bot" key={entry.id}>
                    <strong>{service.name}</strong>
                    <p className="mono">
                      {service.internalName} in {server.hostname}
                    </p>
                    <p>{server.environment} · aplicação não verificada.</p>
                    {entry.kind === "offer" && (
                      <p>
                        O serviço está parado. Para iniciar, crie uma nova solicitação com sua
                        própria confirmação.
                      </p>
                    )}
                    <div className="chat-buttons">
                      {actions.map((action) => {
                        const access = permission(state, service, action);
                        return (
                          <div key={action}>
                            <button
                              disabled={!access.allowed || sending}
                              title={access.reason}
                              onClick={() =>
                                void send(serviceCommand(action, service, server.hostname))
                              }
                            >
                              {ACTION_LABELS[action]}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {!actions.length && (
                      <p>Somente consulta. Nenhuma ação foi liberada para este serviço.</p>
                    )}
                    {actions.length > 0 &&
                      actions.every((action) => !permission(state, service, action).allowed) && (
                        <small className="blocked-reason">
                          {permission(state, service, actions[0]).reason}
                        </small>
                      )}
                    <button
                      className="text-link mt-3"
                      onClick={() => {
                        void api
                          .refreshServices(server.id)
                          .then(() =>
                            add({
                              kind: "text",
                              text: "Observação atualizada. Serviço em execução não comprova saúde da aplicação.",
                            }),
                          )
                          .catch((error) => add({ kind: "text", text: (error as Error).message }));
                      }}
                    >
                      Consultar estado agora
                    </button>
                  </div>
                );
              }
              if (entry.kind === "operation") {
                const operation = state.operations.find((o) => o.id === entry.target);
                if (!operation || operation.userId !== actor.id) return null;
                const left = Math.max(0, Math.ceil((operation.expiresAt - state.now) / 1000));
                return (
                  <div className="chat-bubble bot operation-bubble" key={entry.id}>
                    <div className="flex flex-wrap justify-between gap-2">
                      <strong>{operation.id}</strong>
                      <Badge tone={tone(operation.status)}>{STATUS_LABELS[operation.status]}</Badge>
                    </div>
                    <code className="command-line">
                      {serviceCommand(
                        operation.action,
                        { internalName: operation.internalName },
                        operation.hostname,
                      )}
                    </code>
                    <p>
                      <strong>Servidor:</strong> {operation.serverName} · {operation.hostname}
                      <br />
                      <strong>Ambiente:</strong> {operation.environment}
                      <br />
                      <strong>Serviço:</strong> {operation.serviceName}
                      <br />
                      <strong>Solicitante:</strong> {operation.userName} · ID {operation.userId}
                    </p>
                    {operation.status === "pending" ? (
                      <>
                        <p>{operation.impact}</p>
                        <p>
                          Confirmação de uso único · expira em <strong>{left}s</strong>.
                        </p>
                        <div className="chat-buttons operation-confirm">
                          <button
                            disabled={left === 0}
                            onClick={() => void act(operation, "confirm")}
                          >
                            Confirmar {ACTION_LABELS[operation.action].toLowerCase()}
                          </button>
                          <button onClick={() => void act(operation, "cancel")}>
                            Cancelar solicitação
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>{operation.message}</p>
                        <ol className="operation-steps">
                          {operation.steps.map((step) => (
                            <li key={step.name} className={`step-${step.status}`}>
                              <span className="step-icon">
                                <StepIcon status={step.status} />
                              </span>
                              <div>
                                <strong>{step.name}</strong>
                                <small>
                                  {step.detail ||
                                    (step.at ? dateTime(step.at) : "Etapa não executada")}
                                </small>
                              </div>
                            </li>
                          ))}
                        </ol>
                        {operation.status === "unknown" && (
                          <button
                            className="chat-open"
                            disabled={state.role !== "operacao"}
                            onClick={() => void act(operation, "reconcile")}
                          >
                            Consultar registro do agente sem reenviar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              }
              if (entry.kind === "updates") {
                const server = state.servers.find((s) => s.id === entry.target)!;
                const online = available(server, state.now);
                const cached = state.now - server.lastScan < CACHE_MS;
                return (
                  <div className="chat-bubble bot" key={entry.id}>
                    <strong>Atualizações · {server.hostname}</strong>
                    <p>
                      {server.source}
                      <br />
                      Consulta em {dateTime(server.lastScan)} ·{" "}
                      {online && cached ? "cache válido" : "dados desatualizados"}
                    </p>
                    {state.updates
                      .filter((u) => u.serverId === server.id)
                      .map((update) => (
                        <div className="chat-package" key={update.id}>
                          <strong>
                            {update.kb || "KB não informada"} · {update.title}
                          </strong>
                          <small>
                            {update.state} · ~{update.sizeMb} MiB · {update.category}
                            <br />
                            Pacote pode exigir reinício: {update.mayReboot ? "sim" : "não indicado"}
                          </small>
                        </div>
                      ))}
                    <p>
                      Reinício já pendente no servidor:{" "}
                      {server.rebootPending ? "sim" : "não indicado"}. Todos os pacotes são
                      fictícios.
                    </p>
                    <button
                      className="chat-open"
                      disabled={
                        !online ||
                        server.scanState === "loading" ||
                        state.now - server.lastScan < SCAN_INTERVAL_MS
                      }
                      onClick={() => {
                        void api
                          .scan(server.id)
                          .then(() =>
                            add({
                              kind: "text",
                              text: `Consulta simulada concluída em ${server.hostname}. Cache atualizado.`,
                            }),
                          )
                          .catch((error) => add({ kind: "text", text: (error as Error).message }));
                      }}
                    >
                      {server.scanState === "loading"
                        ? "Consultando…"
                        : "Consultar agora (mínimo de 30 min)"}
                    </button>
                    <small>
                      Somente consulta nesta etapa. Instalação e reinício do Windows não estão
                      habilitados.
                    </small>
                  </div>
                );
              }
              return null;
            })}
            {sending && (
              <div className="chat-bubble bot">
                <Spinner label="Consultando…" />
              </div>
            )}
          </div>
          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <label className="sr-only" htmlFor="bot-command">
              Mensagem para o bot simulado
            </label>
            <input
              id="bot-command"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Restart Service IntegracaoDemo in SRV-HML-01"
              autoComplete="off"
              maxLength={300}
            />
            <button
              className="button primary"
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Enviar comando simulado"
            >
              <Send size={17} />
            </button>
          </form>
          <div className="chat-footer">
            Prévia local. Nenhuma mensagem é enviada ao Telegram e nenhum servidor real é alterado.
          </div>
        </section>
        <aside className="telegram-guide">
          <h2>Começar com o essencial</h2>
          <ol>
            <li>
              <strong>Configurar uma vez</strong>
              <p>Cadastre o servidor e libere serviços e ações na configuração web.</p>
            </li>
            <li>
              <strong>Operar pelo Telegram</strong>
              <p>Informe a ação, o nome interno do serviço e o servidor.</p>
            </li>
            <li>
              <strong>Confirmar e acompanhar</strong>
              <p>O bot confirma o destino e informa o resultado de cada etapa.</p>
            </li>
          </ol>
          <h3>Comandos desta versão</h3>
          <code>/servidores</code>
          <code>/servicos SRV-HML-01</code>
          <code>/atualizacoes SRV-HML-01</code>
          <code>Restart Service IntegracaoDemo in SRV-HML-01</code>
          <p className="small muted">
            Start e Stop também são ações cadastradas. Comandos livres de PowerShell ou CMD não são
            aceitos.
          </p>
          <Link className="text-link" href="/configuracao">
            Configurar o que pode ser executado ›
          </Link>
        </aside>
      </div>
      <details className="simple-details">
        <summary>Histórico de operações deste usuário ({history.length})</summary>
        {history.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Operação</th>
                  <th>Destino e ação</th>
                  <th>Resultado</th>
                  <th>Horário</th>
                  <th>Acompanhamento</th>
                </tr>
              </thead>
              <tbody>
                {history.map((operation) => (
                  <tr key={operation.id}>
                    <td>{operation.id}</td>
                    <td>
                      {operation.hostname}
                      <small>
                        {operation.serviceName} · {ACTION_LABELS[operation.action]}
                      </small>
                    </td>
                    <td>
                      <Badge tone={tone(operation.status)}>{STATUS_LABELS[operation.status]}</Badge>
                    </td>
                    <td>{dateTime(operation.createdAt)}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => add({ kind: "operation", target: operation.id })}
                      >
                        Ver na conversa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhuma operação solicitada. O histórico aparecerá aqui após o primeiro pedido.</p>
        )}
      </details>
    </>
  );
}
