"use client";
import { useState } from "react";
import { ACTION_LABELS, Action, WindowsService } from "@/domain/types";
import { serviceCommand } from "@/domain/commands";
import { useDemo } from "./demo-provider";
import { Dialog, Notice } from "./ui";
export function ServicePolicyDialog({
  service,
  onClose,
}: {
  service: WindowsService;
  onClose: () => void;
}) {
  const { state, api, notify } = useDemo();
  const server = state.servers.find((s) => s.id === service.serverId)!;
  const [actions, setActions] = useState<Action[]>(service.allowedActions);
  const [production, setProduction] = useState(service.productionAllowed);
  const [responsible, setResponsible] = useState(service.owner);
  const [errorMessage, setErrorMessage] = useState("");
  const canEdit = state.role === "administracao" && !service.protected;
  return (
    <Dialog title="Configurar serviço e comandos" onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            api.configureService(service.id, {
              actions,
              productionAllowed: production,
              responsible,
            });
            notify("Configuração salva. O operador usará as ações permitidas pelo Telegram.");
            onClose();
          } catch (error) {
            setErrorMessage((error as Error).message);
          }
        }}
      >
        <div className="dialog-body">
          <h3>{service.name}</h3>
          <p className="muted mono">
            {service.internalName} · {server.hostname} · {server.environment}
          </p>
          <Notice>
            {service.protected
              ? "Serviço protegido. Alterações não podem ser liberadas."
              : state.role !== "administracao"
                ? "Selecione o perfil Administração para configurar. Ele gerencia permissões, mas não executa comandos."
                : "Marque somente as ações que o perfil Operação poderá solicitar pelo Telegram. Nenhum script livre será executado."}
          </Notice>
          {errorMessage && (
            <div role="alert">
              <Notice tone="bad">{errorMessage}</Notice>
            </div>
          )}
          <fieldset disabled={!canEdit} className="policy-fields">
            <legend>Ações permitidas</legend>
            {(["iniciar", "parar", "reiniciar"] as Action[]).map((action) => (
              <label className="checkbox-row" key={action}>
                <input
                  type="checkbox"
                  checked={actions.includes(action)}
                  onChange={(e) =>
                    setActions(
                      e.target.checked ? [...actions, action] : actions.filter((a) => a !== action),
                    )
                  }
                />
                <span>
                  <strong>{ACTION_LABELS[action]}</strong>
                  <code>{serviceCommand(action, service, server.hostname)}</code>
                </span>
              </label>
            ))}
            {server.environment === "Produção" && (
              <label className="checkbox-row production-confirm">
                <input
                  type="checkbox"
                  checked={production}
                  onChange={(e) => setProduction(e.target.checked)}
                />
                <span>
                  Libero explicitamente este serviço de produção para as ações selecionadas.
                </span>
              </label>
            )}
            <label className="field-label" htmlFor="policy-owner">
              Responsável pela autorização
            </label>
            <input
              id="policy-owner"
              value={responsible}
              maxLength={100}
              required
              onChange={(e) => setResponsible(e.target.value)}
            />
          </fieldset>
          <p className="small muted">
            Nenhuma ação marcada significa somente consulta. A configuração não inicia nem para o
            serviço. Confirmações pendentes deste serviço serão invalidadas.
          </p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Fechar
          </button>
          <button type="submit" className="button primary" disabled={!canEdit}>
            Salvar configuração
          </button>
        </div>
      </form>
    </Dialog>
  );
}
