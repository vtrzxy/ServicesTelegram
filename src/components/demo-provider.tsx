"use client";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { createDataService } from "@/services";
import { DataService, DomainError } from "@/services/contract";
import { Action, DemoState, Operation, Scenario, WindowsService } from "@/domain/types";
import { Dialog, Spinner } from "./ui";
import { OperationDialog } from "./operation-dialog";
interface DemoContext {
  state: DemoState;
  api: DataService;
  notify: (message: string, error?: boolean) => void;
  task: (fn: () => Promise<void>, success?: string) => Promise<void>;
  request: (
    service: WindowsService,
    action: Action,
    scenario?: Scenario,
    source?: Operation["source"],
  ) => void;
  openOperation: (id: string) => void;
}
const Context = createContext<DemoContext | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [api] = useState(() => createDataService());
  const state = useSyncExternalStore(api.subscribe, api.getSnapshot, api.getSnapshot);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [offer, setOffer] = useState<{
    service: WindowsService;
    source: Operation["source"];
  } | null>(null);
  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = localStorage;
    } catch {
      /* Navegação privada: somente memória. */
    }
    api.initialize(storage);
    setReady(true);
    const timer = setInterval(() => api.tick(), 1000);
    return () => clearInterval(timer);
  }, [api]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const notify = (message: string, error = false) => setToast({ message, error });
  const task = async (fn: () => Promise<void>, success?: string) => {
    try {
      await fn();
      if (success) notify(success);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Não foi possível concluir a simulação.", true);
    }
  };
  const request: DemoContext["request"] = (
    service,
    action,
    scenario = "success",
    source = "Painel",
  ) => {
    void (async () => {
      try {
        setOperationId(await api.request(service.id, action, scenario, source));
      } catch (e) {
        if (e instanceof DomainError && e.code === "USE_START") setOffer({ service, source });
        else notify(e instanceof Error ? e.message : "Solicitação bloqueada.", true);
      }
    })();
  };
  if (!ready)
    return (
      <div className="boot">
        <div className="brand-mark">N</div>
        <Spinner label="Preparando a demonstração…" />
      </div>
    );
  return (
    <Context.Provider value={{ state, api, notify, task, request, openOperation: setOperationId }}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleAlert size={19} /> : <CheckCircle2 size={19} />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="icon-button" aria-label="Fechar aviso">
            <X size={17} />
          </button>
        </div>
      )}
      {operationId && <OperationDialog id={operationId} onClose={() => setOperationId(null)} />}
      {offer && (
        <Dialog title="O serviço já está parado" onClose={() => setOffer(null)}>
          <div className="dialog-body">
            <p>
              Um reinício não será convertido em início automaticamente. Você pode preparar uma nova
              solicitação para <strong>{offer.service.name}</strong>.
            </p>
            <p className="muted">A ação Iniciar terá sua própria confirmação de 60 segundos.</p>
          </div>
          <div className="dialog-footer">
            <button className="button secondary" onClick={() => setOffer(null)}>
              Voltar
            </button>
            <button
              className="button primary"
              onClick={() => {
                const current = offer;
                setOffer(null);
                request(current.service, "iniciar", "success", current.source);
              }}
            >
              Preparar início
            </button>
          </div>
        </Dialog>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider não encontrado.");
  return context;
}
