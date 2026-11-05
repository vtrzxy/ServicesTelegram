"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  LockKeyhole,
  MessageCircle,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { TEMPLATE_FIELDS } from "@/data/seed";
import { permission } from "@/domain/permissions";
import { ACTION_LABELS, Action, STATUS_LABELS, USERS } from "@/domain/types";
import { message } from "@/lib/format";
import { useDemo } from "../demo-provider";
import { Badge, Notice, PageTitle, Panel } from "../ui";
export function Telegram() {
  const { state, api, request, openOperation, notify } = useDemo();
  const [step, setStep] = useState<"server" | "category" | "service" | "action">("server");
  const [category, setCategory] = useState("Protheus");
  const [serviceId, setServiceId] = useState("hml-app");
  const [draft, setDraft] = useState(state.template);
  useEffect(() => setDraft(state.template), [state.template]);
  useEffect(() => {
    setStep("category");
    setServiceId(`${state.selectedServerId}-app`);
    setCategory("Protheus");
  }, [state.selectedServerId]);
  const server = state.servers.find((s) => s.id === state.selectedServerId)!;
  const service = state.services.find((s) => s.id === serviceId)!;
  const categories = [
    ...new Set(state.services.filter((s) => s.serverId === server.id).map((s) => s.category)),
  ];
  const last = state.operations.find(
    (o) => o.source === "Telegram" && o.userId === USERS[state.role].id,
  );
  const preview = message(draft, {
    servidor: `${server.name} · ${server.hostname}`,
    ambiente: server.environment,
    servico: service.name,
    acao: "reiniciar",
    resultado: "Serviço em execução; aplicação não verificada",
  });
  const save = () => {
    try {
      api.saveTemplate(draft);
      notify("Modelo salvo com os campos essenciais preservados.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / TELEGRAM"
        title="Telegram e mensagens"
        description="Explore o fluxo do bot e personalize a comunicação com a equipe."
        actions={<Badge>Integração não conectada</Badge>}
      />
      <div className="telegram-layout">
        <Panel
          title="Prévia interativa do bot"
          subtitle="Menus privados · conversa de demonstração"
        >
          <div className="chat-header">
            <span className="telegram-icon">
              <Send size={19} />
            </span>
            <div>
              <strong>Núcleo · Infraestrutura</strong>
              <small>bot simulado · nenhum token configurado</small>
            </div>
            <Badge>Prévia</Badge>
          </div>
          <div className="chat-body">
            <div className="chat-date">CONVERSA SIMULADA</div>
            <div className="chat-bubble user">
              /servidores
              <CheckCheck size={13} />
            </div>
            <div className="chat-bubble bot">
              <strong>Olá, {USERS[state.role].name.split(" ")[0]}.</strong>
              <p>Selecione o servidor. Toda alteração terá destino e ação explícitos.</p>
              <div className="chat-buttons">
                {state.servers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      api.selectServer(s.id);
                      setStep("category");
                      setServiceId(`${s.id}-app`);
                    }}
                  >
                    {s.name} · {s.environment}
                    <ArrowRight size={13} />
                  </button>
                ))}
              </div>
            </div>
            {step !== "server" && (
              <>
                <div className="chat-bubble user">
                  {server.name} · {server.hostname}
                  <CheckCheck size={13} />
                </div>
                <div className="chat-bubble bot">
                  <strong>
                    {server.hostname} · {server.environment}
                  </strong>
                  <p>Selecione uma categoria.</p>
                  <div className="chat-buttons">
                    {categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setCategory(c);
                          setStep("service");
                        }}
                      >
                        {c}
                        <ArrowRight size={13} />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {["service", "action"].includes(step) && (
              <div className="chat-bubble bot">
                <strong>{category} · serviços</strong>
                <div className="chat-buttons">
                  {state.services
                    .filter((s) => s.serverId === server.id && s.category === category)
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setServiceId(s.id);
                          setStep("action");
                        }}
                      >
                        {s.name}
                        <ArrowRight size={13} />
                      </button>
                    ))}
                </div>
              </div>
            )}
            {step === "action" && service.serverId === server.id && (
              <div className="chat-bubble bot">
                <strong>{service.name}</strong>
                <p className="mono small">{service.internalName}</p>
                <p>
                  {server.hostname} · {server.environment}
                </p>
                <p className="small">{permission(state, service, "reiniciar").reason}</p>
                <div className="chat-buttons">
                  {(["iniciar", "parar", "reiniciar"] as Action[]).map((a) => (
                    <button
                      key={a}
                      disabled={!permission(state, service, a).allowed}
                      onClick={() => request(service, a, "success", "Telegram")}
                    >
                      {ACTION_LABELS[a]}
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {last && (
              <div className="chat-bubble bot">
                <strong>
                  {last.id} · {STATUS_LABELS[last.status]}
                </strong>
                <p>
                  {last.hostname} · {last.environment}
                </p>
                <p>
                  {last.action} · {last.serviceName}
                </p>
                <p>{last.message}</p>
                <button className="chat-open" onClick={() => openOperation(last.id)}>
                  {last.status === "pending"
                    ? "Abrir confirmação vinculada ao solicitante"
                    : "Ver etapas e resultado"}
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="chat-footer">
            <LockKeyhole size={14} />
            Prévia local · nenhuma mensagem é enviada ao Telegram
          </div>
        </Panel>
        <div className="telegram-settings">
          <Panel title="Modelo de resposta" subtitle="Os campos essenciais são obrigatórios.">
            <div className="panel-body">
              <label className="field-label" htmlFor="message-template">
                Texto da mensagem
              </label>
              <textarea
                id="message-template"
                rows={7}
                maxLength={1600}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="template-fields">
                {TEMPLATE_FIELDS.map((f) => (
                  <code key={f}>{`{${f}}`}</code>
                ))}
              </div>
              <div className="message-preview">
                <small>PRÉVIA DO MODELO</small>
                <p>{preview}</p>
              </div>
              <button className="button primary" onClick={save}>
                <Save size={15} />
                Salvar modelo fictício
              </button>
            </div>
          </Panel>
          <Panel title="Nome amigável" subtitle="O nome interno Windows permanece visível.">
            <form
              className="panel-body"
              key={`${service.id}-${service.name}`}
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                try {
                  api.rename(service.id, String(form.get("friendlyName") || ""));
                  notify("Nome amigável atualizado na demonstração.");
                } catch (error) {
                  notify((error as Error).message, true);
                }
              }}
            >
              <label className="field-label" htmlFor="friendly-name">
                Serviço selecionado na conversa
              </label>
              <input
                id="friendly-name"
                name="friendlyName"
                defaultValue={service.name}
                maxLength={70}
                required
              />
              <small className="mono muted block my-3">{service.internalName}</small>
              <button className="button secondary" type="submit">
                <Save size={15} />
                Salvar nome
              </button>
            </form>
          </Panel>
          <Panel title="Atalho cadastrado">
            <div className="panel-body">
              <p className="shortcut">reiniciar protheus homologacao</p>
              <p className="small muted">
                Destino fixo: SRV-HML-01 → AppServer de homologação → reiniciar. Mantém permissões e
                confirmação.
              </p>
              <button
                className="button secondary full"
                onClick={() =>
                  request(
                    state.services.find((s) => s.id === "hml-app")!,
                    "reiniciar",
                    "success",
                    "Telegram",
                  )
                }
              >
                <ArrowRight size={15} />
                Simular atalho
              </button>
            </div>
          </Panel>
        </div>
      </div>
      <Notice>
        Textos personalizados são apenas mensagens. Nunca são interpretados como PowerShell, CMD ou
        script. Tópicos poderão organizar conversas no futuro; não fornecerão isolamento de
        permissões.
      </Notice>
    </>
  );
}
