import { Action, OperationStatus } from "../domain/types";
export const dateTime = (time: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);
export const timeOnly = (time: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(time);
export function relative(time: number, now: number) {
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  return seconds < 60
    ? `há ${seconds}s`
    : seconds < 3600
      ? `há ${Math.floor(seconds / 60)} min`
      : `há ${Math.floor(seconds / 3600)}h`;
}
export function tone(status: OperationStatus): "good" | "warn" | "bad" | "neutral" {
  return status === "completed"
    ? "good"
    : ["unknown", "partial", "blocked"].includes(status)
      ? "bad"
      : ["pending", "running", "expired"].includes(status)
        ? "warn"
        : "neutral";
}
export function message(
  template: string,
  values: { servidor: string; ambiente: string; servico: string; acao: Action; resultado: string },
) {
  return template.replace(
    /\{(servidor|ambiente|servico|acao|resultado)\}/g,
    (_, key: keyof typeof values) => values[key],
  );
}
