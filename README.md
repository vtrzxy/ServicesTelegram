# Núcleo Control

Protótipo navegável de um painel para servidores Windows e serviços TOTVS Protheus, com futura integração a um único bot do Telegram.

**Esta entrega é uma demonstração.** Os servidores, nomes internos, usuários, pacotes e operações são fictícios. Não há bot conectado, agente Windows, execução remota, autenticação de produção nem acesso a uma API externa. Nenhum segredo é solicitado ou armazenado.

## Executar localmente

Requisitos: Node.js 24 LTS e npm. As dependências estão travadas em `package-lock.json`.

```bash
npm ci
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). O servidor de desenvolvimento escuta apenas no computador local. Para encerrar, use `Ctrl+C` no terminal.

Para executar a compilação de produção:

```bash
npm run build
npm start
```

Não é necessário configurar variáveis de ambiente, token do Telegram ou credenciais. O painel não carrega fontes ou imagens de serviços externos.

## Validar

```bash
npm run typecheck
npm test
npm run build
```

Ou execute `npm run validate`. Os testes usam o executor nativo do Node com TypeScript via `tsx` e relógio controlado. Verificam permissões, expiração real e acelerada, uso único, conflitos, cancelamento, dependências, falha parcial, resultado desconhecido, reconciliação, observação desatualizada e restrições das buscas WUA.

O fluxo de CI em `.github/workflows/ci.yml` executa esses comandos nos envios e nas solicitações de alteração do repositório.

## Navegação

| Área                  | Rota            | Recursos                                                       |
| --------------------- | --------------- | -------------------------------------------------------------- |
| Visão geral           | `/`             | Indicadores derivados do estado, servidores, alertas e eventos |
| Servidores            | `/servidores`   | Inventário, detalhes, comunicação e situação dos dados         |
| Serviços              | `/servicos`     | Pesquisa, filtros, dez itens por página, ficha e ações         |
| Atualizações          | `/atualizacoes` | Cache, consulta simulada e pacotes fictícios                   |
| Operações e histórico | `/operacoes`    | Acompanhamento, cancelamento e laboratório de cenários         |
| Telegram e mensagens  | `/telegram`     | Conversa interativa, modelo, nomes e atalho cadastrado         |
| Acessos e políticas   | `/acessos`      | Perfis e matriz de concessões sem autoelevação                 |

O cabeçalho mostra o contexto do servidor e o usuário de demonstração. O seletor de perfil permite simular Consulta, Operação e Administração. Todos podem consultar o inventário fictício; apenas Operação altera o AppServer de homologação. Administração não herda esse acesso.

## Servidores demonstrativos

- **ERP Homologação / SRV-HML-01:** um AppServer com ações autorizadas.
- **ERP Produção / SRV-PRD-01:** somente consulta, com exemplo de reinicialização já pendente.
- **ERP Filial / SRV-FIL-02:** sem comunicação; estados atuais desconhecidos e alterações bloqueadas.

Os nomes internos terminados em `DEMO`, versões do Windows, IDs e KBs são ilustrativos. Nenhum desses registros é um inventário real. O documento `documentos/Planejamento_Bot_Telegram_Windows_Protheus.docx` é a referência funcional desta implementação.

## Experimentar as operações

1. Selecione o perfil **Operação**.
2. Abra **Operações e histórico** e clique em **Preparar cenário**. A preparação restaura apenas o ambiente fictício de homologação, preservando o histórico e cancelando pedidos ainda não iniciados. Não executa operações reais.
3. Escolha um dos seis cenários e clique em **Testar cenário selecionado**.
4. Confira solicitante, servidor, ambiente, nomes, ação e impacto na confirmação.
5. Confirme ou cancele. No cenário de expiração, use **Simular passagem de 61 segundos**, ou aguarde os 60 segundos reais.
6. Acompanhe validação, parada, inicialização e verificação. A execução dura alguns segundos para permitir observar as etapas.

Resultados reproduzíveis:

| Cenário              | Resultado esperado                                                                 |
| -------------------- | ---------------------------------------------------------------------------------- |
| Operação concluída   | Parada, inicialização e estado final verificados; aplicação não verificada         |
| Estado já solicitado | Iniciar serviço já em execução resulta em **Sem alteração**                        |
| Dependência ativa    | Interrupção bloqueada na validação; serviço continua rodando                       |
| Confirmação expirada | Nenhuma alteração; nova solicitação é necessária                                   |
| Falha após a parada  | **Falha parcial**, com serviço parado e nenhuma nova tentativa                     |
| Perda de comunicação | **Resultado desconhecido**, servidor bloqueado para alterações e nenhuma repetição |

Em resultado desconhecido, **Reconciliar registro** consulta evidências fictícias do agente e informa o desfecho sem reenviar comandos. Uma solicitação pendente, em andamento ou sem resultado reconciliado impede outra alteração no servidor. Reiniciar serviço parado oferece uma nova solicitação de **Iniciar**, com confirmação própria. Cancelamento é permitido somente antes da execução e nunca é tratado como sucesso.

## Dados recentes e estados

- Heartbeat simulado de 30 segundos; comunicação vencida após 90 segundos.
- A última comunicação e a observação do serviço são horários independentes.
- Observações de serviços vencem após 90 segundos neste protótipo. Use **Consultar estados** para atualizá-las. O heartbeat não atualiza implicitamente o estado do serviço.
- Serviço em execução e agente conectado não comprovam saúde do Protheus. Sem teste funcional, a indicação é **Serviço em execução; aplicação não verificada**.
- Datas são formatadas em `America/Sao_Paulo`.

## Windows Update

As KBs `KB-DEMO-001` e `KB-DEMO-002` não são referências reais. A tela diferencia a previsão de reinício do pacote da pendência já observada na máquina.

A busca simulada mantém cache de seis horas, intervalo mínimo de 30 minutos e uma busca ativa por máquina. Em produção, a origem configurada, incluindo WSUS, deverá ser respeitada. Sem comunicação, o resultado atual é desconhecido e os pacotes antigos permanecem identificados como desatualizados.

Instalação, reinicialização do sistema e análise por IA são explicitamente futuras ou bloqueadas. Nenhuma pesquisa ou avaliação por IA é inventada.

## Telegram e personalização

A conversa permite selecionar servidor, categoria, serviço e ação e abrir a mesma confirmação usada no painel. O histórico e os estados são compartilhados, sem uma segunda execução independente.

Modelos são apenas texto. Os campos `{servidor}`, `{ambiente}`, `{servico}`, `{acao}` e `{resultado}` são obrigatórios. Alterar nomes amigáveis mantém o nome interno visível. O atalho **reiniciar protheus homologacao** aponta exclusivamente para o AppServer de homologação e continua sujeito às permissões e à confirmação.

Menus privados são a proposta inicial. Tópicos são uma alternativa futura de organização, sem isolamento de permissões. Não há campo de token real.

## Persistência da demonstração

`localStorage`, chave `protheus-control-demo-v1`, armazena somente preferências e dados fictícios: contexto, perfil, nomes, modelo e histórico. O painel continua em memória se o navegador impedir esse armazenamento. A simulação é individual por navegador; sincronização entre abas ou usuários não é implementada.

**Restaurar demonstração**, no menu, limpa os dados fictícios após confirmação. Recarregar a página durante uma operação transforma o resultado em desconhecido e exige reconciliação; não reinicia a ação. As permissões reais nunca deverão ser confiadas a `localStorage` ou ao código do navegador.

## Organização do código

```text
src/
  app/                  Rotas do App Router, layout e estilos
  components/
    screens/            As sete áreas do painel
    demo-provider.tsx   Estado compartilhado e composição
    operation-dialog.tsx
    server-table.tsx
    ui.tsx              Elementos reutilizáveis e diálogo acessível
  domain/
    types.ts            Modelos e identidades fictícias
    permissions.ts      Regras da demonstração e prazos
  data/seed.ts          Servidores, serviços e pacotes fictícios
  services/
    contract.ts         Contrato de acesso aos dados
    mock-service.ts     Adaptador e máquina de estados simulada
    index.ts            Ponto de substituição do adaptador
  lib/format.ts         Datas, rótulos, mensagens e estados
tests/                  Testes das regras e dos fluxos
```

## Substituir o adaptador por uma API

O ponto de composição é `src/services/index.ts`. Os componentes consomem o contrato em `services/contract.ts` pelo provedor compartilhado, sem importar os registros fictícios. A exceção são as constantes públicas de apresentação, como os campos obrigatórios dos modelos.

Na integração real, implemente um adaptador HTTP para buscar inventário, solicitar confirmação, confirmar, cancelar, acompanhar e reconciliar operações na API da central. Solicitação, confirmação e cancelamento já aceitam respostas assíncronas no contrato e nos chamadores. O adaptador real deverá aguardar respostas autenticadas da API, em vez de assumir uma alteração local. Não reproduza a execução da máquina de estados do mock no navegador. O estado exibido será derivado das respostas da central, por consultas periódicas ou outro canal autenticado.

A central será responsável por identidade real, concessões, prazos, idempotência, bloqueios, registros persistentes e resultados. O agente repetirá a autorização e as verificações locais. A sessão de demonstração e o seletor de perfis deverão ser substituídos por autenticação de produção. Uma integração por backend intermediário pode proteger a sessão; tokens administrativos e token do bot nunca devem ser enviados ao navegador.

## Arquitetura fora da Vercel

```text
Navegador → painel Next.js na Vercel → API autenticada da central C#/.NET
Agente Windows → consulta à API da central → recebe pedido → envia resultado
Central → Telegram Bot API
```

O agente inicia todas as conexões, sem portas de entrada abertas nos servidores gerenciados. O navegador não acessa agentes diretamente. A API da central precisa estar acessível aos agentes por rede interna, VPN ou HTTPS autorizado.

Permanecem fora deste projeto e da hospedagem do painel na Vercel:

- Agentes Windows executados como serviços.
- Controlador operacional em C#/.NET.
- Consumidor permanente do long polling do Telegram e token do bot.
- Banco operacional persistente, inclusive eventual SQLite local da central.
- Certificados dos agentes, gestão de segredos e infraestrutura real.

## Enviar ao GitHub e importar na Vercel

O repositório deste projeto é [vtrzxy/ServicesTelegram](https://github.com/vtrzxy/ServicesTelegram). A publicação na Vercel é uma etapa separada, a ser realizada pelo responsável.

1. Acesse o repositório `vtrzxy/ServicesTelegram` no GitHub e confirme as permissões de acesso da organização.
2. Para atualizações futuras, revise as alterações, faça o commit e envie à branch correspondente. Inclua `package-lock.json`; não inclua `.next`, `node_modules`, `.local`, `.documento_tmp` ou arquivos `.env`.
3. Na Vercel, escolha **Add New → Project** e importe o repositório pelo GitHub.
4. Selecione **Next.js**, com a raiz na pasta que contém `package.json`.
5. Use Node.js 24, instalação `npm ci` e compilação `npm run build`. Mantenha o diretório de saída padrão do Next.js. A demonstração não exige variáveis de ambiente.
6. Publique a demonstração e valide as sete rotas, incluindo acesso direto e recarregamento. Pushes posteriores poderão gerar novas versões conforme a integração configurada.

Não há necessidade de configurar um servidor Windows, webhook ou banco para hospedar esta demonstração.

## Limites desta entrega

As regras no navegador demonstram o comportamento esperado; não fornecem segurança operacional real. O protótipo não mede consumo do futuro agente, não testa disponibilidade do ERP e não prova compatibilidade com versões reais do Windows ou do Protheus. Sessões, dependências, políticas e falhas são exemplos controlados.

Referências oficiais para manutenção: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind CSS](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).
