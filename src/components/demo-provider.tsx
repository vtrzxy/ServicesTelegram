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
import { DataService } from "@/services/contract";
import { DemoState } from "@/domain/types";
import { Spinner } from "./ui";
interface DemoContext {
  state: DemoState;
  api: DataService;
  notify: (message: string, error?: boolean) => void;
  task: (fn: () => Promise<void>, success?: string) => Promise<void>;
}
const Context = createContext<DemoContext | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [api] = useState(() => createDataService());
  const state = useSyncExternalStore(api.subscribe, api.getSnapshot, api.getSnapshot);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  useEffect(() => {
    let storage: Storage | undefined;
    try {
      storage = localStorage;
    } catch {
      /* Demonstração apenas em memória. */
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
    } catch (error) {
      notify((error as Error).message, true);
    }
  };
  if (!ready)
    return (
      <div className="boot">
        <Spinner label="Preparando demonstração…" />
      </div>
    );
  return (
    <Context.Provider value={{ state, api, notify, task }}>
      {children}
      {toast && (
        <div
          className={`toast ${toast.error ? "toast-error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button className="icon-button" onClick={() => setToast(null)} aria-label="Fechar aviso">
            <X size={17} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider não encontrado.");
  return value;
}
