"use client";
import { useState } from "react";
import { Clock3, ShieldCheck, TerminalSquare } from "lucide-react";
import { ACTION_LABELS, STATUS_LABELS, USERS } from "@/domain/types";
import { dateTime, tone } from "@/lib/format";
import { useDemo } from "./demo-provider";
import { Badge, Dialog, Notice, Spinner, StepIcon } from "./ui";
export function OperationDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, api, notify, task } = useDemo();
  const [busy, setBusy] = useState(false);
  const op = state.operations.find((o) => o.id === id);
  if (!op) return null;
  const left = Math.max(0, Math.ceil((op.expiresAt - state.now) / 1000));
  const own = op.userId === USERS[state.role].id;
  const act = (fn: () => void | Promise<void>) => {
    void Promise.resolve()
      .then(fn)
      .catch((e) => notify((e as Error).message, true));
  };
  return (
    <Dialog
      title={op.status === "pending" ? "Confirmar operação simulada" : `Acompanhamento ${op.id}`}
      onClose={onClose}
      wide
    >
      <div className="dialog-body">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="mono muted">
            {op.id} · {op.source}
          </span>
          <Badge tone={tone(op.status)}>{STATUS_LABELS[op.status]}</Badge>
        </div>
        <div className="operation-target">
          <TerminalSquare size={22} />
          <div>
            <h3>
              {ACTION_LABELS[op.action]} · {op.serviceName}
            </h3>
            <p className="mono">{op.internalName}</p>
          </div>
        </div>
        <dl className="detail-grid">
          <div>
            <dt>Servidor de destino</dt>
            <dd>
              {op.serverName}
              <small className="mono">{op.hostname}</small>
            </dd>
          </div>
          <div>
            <dt>Ambiente</dt>
            <dd>
              <Badge tone={op.environment === "Produção" ? "warn" : "blue"}>{op.environment}</Badge>
            </dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>
              {op.userName}
              <small>
                ID {op.userId} · chat {op.chatId}
              </small>
            </dd>
          </div>
          <div>
            <dt>Política aplicada</dt>
            <dd>
              {op.policyVersion}
              <small>{dateTime(op.createdAt)} · São Paulo</small>
            </dd>
          </div>
        </dl>
        <Notice tone={op.status === "partial" || op.status === "unknown" ? "bad" : "neutral"}>
          {op.status === "pending" ? op.impact : op.message}
        </Notice>
        {op.status === "pending" ? (
          <>
            <div className="confirmation-clock">
              <Clock3 size={19} />
              <strong>Confirmação válida por {left}s</strong>
              <span>Expira às {dateTime(op.expiresAt)}</span>
            </div>
            <p className="small muted">
              Uma única utilização, vinculada ao solicitante, destino e ação. As permissões e o
              estado serão revalidados antes de iniciar.
            </p>
            {!own && (
              <Notice tone="warn">
                Esta confirmação pertence a outro usuário de demonstração.
              </Notice>
            )}
            {op.scenario === "expired" && (
              <button className="button secondary" onClick={() => act(() => api.expire(id))}>
                Simular passagem de 61 segundos
              </button>
            )}
          </>
        ) : (
          <ol className="operation-steps">
            {op.steps.map((step) => (
              <li key={step.name} className={`step-${step.status}`}>
                <span className="step-icon">
                  <StepIcon status={step.status} />
                </span>
                <div>
                  <strong>{step.name}</strong>
                  <small>
                    {step.detail ||
                      (step.at
                        ? dateTime(step.at)
                        : step.status === "active"
                          ? "Acompanhando a execução…"
                          : "Etapa não executada")}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        )}
        {op.status === "unknown" && (
          <p className="small muted">
            O servidor está bloqueado para novas alterações. A reconciliação consulta um registro
            simulado do agente; não reenvia a operação.
          </p>
        )}
        <div className="security-caption">
          <ShieldCheck size={15} />
          Demonstração. Nenhum servidor real será alterado.
        </div>
      </div>
      <div className="dialog-footer">
        {op.status === "pending" ? (
          <>
            <button
              className="button secondary"
              disabled={!own}
              onClick={() => act(() => api.cancel(id))}
            >
              Cancelar solicitação
            </button>
            <button
              className="button primary"
              disabled={!own || left === 0}
              onClick={() => act(() => api.confirm(id))}
            >
              Confirmar {op.action}
            </button>
          </>
        ) : (
          <>
            <button className="button secondary" onClick={onClose}>
              Fechar acompanhamento
            </button>
            {op.status === "unknown" && (
              <button
                className="button primary"
                disabled={busy || !own || state.role !== "operacao"}
                onClick={() => {
                  setBusy(true);
                  void task(
                    () => api.reconcile(id),
                    "Registro reconciliado. Nenhuma ação foi repetida.",
                  ).finally(() => setBusy(false));
                }}
              >
                {busy ? <Spinner label="Reconciliando" /> : "Reconciliar registro"}
              </button>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
