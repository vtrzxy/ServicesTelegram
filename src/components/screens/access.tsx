"use client";
import { Check, LockKeyhole, Network, ShieldCheck, UserRound } from "lucide-react";
import { ROLE_LABELS, USERS } from "@/domain/types";
import { useDemo } from "../demo-provider";
import { Badge, Notice, PageTitle, Panel } from "../ui";
export function Access() {
  const { state } = useDemo();
  const user = USERS[state.role];
  return (
    <>
      <PageTitle
        eyebrow="ÁREA DE TRABALHO / ACESSOS"
        title="Acessos e políticas"
        description="Permissões explícitas por usuário, servidor, serviço e ação."
        actions={<Badge>Políticas somente para leitura</Badge>}
      />
      <Notice>
        O seletor de perfil é uma simulação. Na integração real, a central e o agente validarão a
        autorização. Os controles do navegador não constituem uma barreira de segurança.
      </Notice>
      <div className="role-grid">
        {Object.values(USERS).map((u) => (
          <Panel key={u.id} className={state.role === u.role ? "selected-role" : ""}>
            <div className="panel-body">
              <div className="flex items-center justify-between">
                <span className="role-icon">
                  <UserRound size={20} />
                </span>
                {state.role === u.role && <Badge tone="blue">Perfil atual</Badge>}
              </div>
              <h2 className="mt-4">{ROLE_LABELS[u.role]}</h2>
              <p className="muted mt-2">{u.name}</p>
              <p className="mono small muted">
                Usuário {u.id} · chat {u.chatId}
              </p>
              <p className="small mt-4">
                {u.role === "consulta"
                  ? "Consulta inventário, estados e histórico próprio."
                  : u.role === "operacao"
                    ? "Opera somente o AppServer de homologação autorizado."
                    : "Consulta exemplos de políticas. Não herda ações operacionais."}
              </p>
            </div>
          </Panel>
        ))}
      </div>
      <Panel
        title="Matriz de concessões demonstrativas"
        subtitle={`Usuário atual: ${user.name} · perfil ${ROLE_LABELS[user.role]}`}
      >
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Usuário / chat</th>
                <th>Servidor</th>
                <th>Serviço</th>
                <th>Ações concedidas</th>
                <th>Política</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(USERS).map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name}</strong>
                    <small className="mono">
                      {u.id} / {u.chatId}
                    </small>
                  </td>
                  <td>
                    Todos os 3 servidores<small>Inventário de demonstração</small>
                  </td>
                  <td>Serviços visíveis</td>
                  <td>
                    <Badge>Consultar</Badge>
                  </td>
                  <td>
                    Consulta explícita<small>Sem alteração de privilégios</small>
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>{USERS.operacao.name}</strong>
                  <small className="mono">
                    {USERS.operacao.id} / {USERS.operacao.chatId}
                  </small>
                </td>
                <td>
                  SRV-HML-01<small>Homologação</small>
                </td>
                <td>
                  {state.services.find((s) => s.id === "hml-app")?.name}
                  <small className="mono">TOTVS_AppServer_ERP_DEMO</small>
                </td>
                <td>
                  <Badge tone="blue">Iniciar · parar · reiniciar</Badge>
                </td>
                <td>
                  POL-HML-001 · v1<small>Responsável: equipe ERP fictícia</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="two-columns">
        <Panel title="Negar por padrão">
          <div className="policy-list">
            {[
              "Serviços novos entram somente para consulta.",
              "Produção permanece sem ações de alteração.",
              "DBAccess e componentes compartilhados não são operáveis.",
              "Agente e serviços de segurança são protegidos.",
              "Administração não herda permissão de operação.",
            ].map((text) => (
              <div key={text}>
                <LockKeyhole size={15} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Administração com controles próprios">
          <div className="panel-body">
            <p className="muted">
              A futura gestão de permissões exigirá canal administrativo protegido, política
              versionada, revisão, responsável e auditoria. Esta tela não concede acesso e não
              permite autoelevação.
            </p>
            <div className="architecture-note compact">
              <ShieldCheck size={18} />
              <p>
                Alterações de política exigirão validação central e confirmação de recebimento pelos
                agentes.
              </p>
            </div>
            <Badge>Sem edição de concessões nesta demonstração</Badge>
          </div>
        </Panel>
      </div>
    </>
  );
}
