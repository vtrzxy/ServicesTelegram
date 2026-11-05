import type { Action, DemoState, WindowsService } from "./types";
export const COMMAND_VERBS: Record<Action, string> = {
  iniciar: "Start",
  parar: "Stop",
  reiniciar: "Restart",
};
function argument(value: string) {
  return /^[A-Za-z0-9_.:-]+$/.test(value) ? value : `"${value}"`;
}
export function serviceCommand(
  action: Action,
  service: Pick<WindowsService, "internalName">,
  hostname: string,
) {
  return `${COMMAND_VERBS[action]} Service ${argument(service.internalName)} in ${argument(hostname)}`;
}
export function resolveCommand(
  text: string,
  state: DemoState,
): { service: WindowsService; action: Action } {
  const match =
    /^(Start|Stop|Restart) Service ("[^"\r\n]+"|[A-Za-z0-9_.:-]+) in ("[^"\r\n]+"|[A-Za-z0-9_.:-]+)$/i.exec(
      text.trim(),
    );
  if (!match)
    throw new Error(
      "Use Restart Service <NomeInterno> in <Servidor>. Para nomes com espaços, use aspas. Somente Start, Stop e Restart são aceitos.",
    );
  const normalize = (value: string) => value.replace(/^"|"$/g, "").toLocaleLowerCase("pt-BR");
  const servers = state.servers.filter((s) => normalize(s.hostname) === normalize(match[3]));
  if (servers.length !== 1)
    throw new Error(
      "Servidor não encontrado ou ambíguo. Selecione explicitamente o destino cadastrado.",
    );
  const services = state.services.filter(
    (s) => s.serverId === servers[0].id && normalize(s.internalName) === normalize(match[2]),
  );
  if (services.length !== 1)
    throw new Error(
      "Serviço não encontrado ou ambíguo neste servidor. Use o nome interno Windows do catálogo.",
    );
  const verbs: Record<string, Action> = { start: "iniciar", stop: "parar", restart: "reiniciar" };
  return { service: services[0], action: verbs[match[1].toLowerCase()] };
}
