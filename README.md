# ServicesTelegram

Controle simples de serviços e consulta de atualizações dos servidores Windows **pelo Telegram**. A aplicação web serve apenas para configurar servidores, serviços e ações permitidas.

O Protheus é apenas um dos serviços possíveis. Impressão, backup, integrações, bancos e outras aplicações usam o mesmo cadastro, sem regras ligadas a um ERP específico.

## Escopo desta versão

Este repositório contém um **protótipo navegável com dados e operações simulados**, não um bot conectado. Nenhum servidor real é consultado ou alterado.

Há duas áreas:

- **Telegram** (`/`): prévia da conversa, consulta de servidores e serviços, pedidos, confirmação, etapas e resultado. O histórico fica recolhido na mesma tela.
- **Configuração** (`/configuracao`): inventário, pesquisa e liberação de ações por serviço e servidor. Esta área não oferece botões para iniciar ou parar serviços.

Telegram e agentes reais, instalação de atualizações, IA, operações em lote e comandos livres ficam fora desta entrega. As antigas rotas do painel redirecionam para as duas áreas atuais.

## Rodar localmente

Requisitos: Node.js 24 LTS e npm.

```bash
npm ci
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). Não é necessário informar token, credencial ou variável de ambiente. Para encerrar, use `Ctrl+C`.

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm run validate` reúne a checagem de tipos, os testes e a compilação. As dependências estão travadas em `package-lock.json`; o CI em `.github/workflows/ci.yml` executa a validação.

## Usar a conversa

```text
/servidores
/servicos SRV-HML-01
/atualizacoes SRV-HML-01
Restart Service IntegracaoDemo in SRV-HML-01
Stop Service IntegracaoDemo in SRV-HML-01
Start Service IntegracaoDemo in SRV-HML-01
```

Use o **nome interno Windows** do catálogo e o identificador do servidor. Nomes com espaços podem ser escritos entre aspas. Os botões da conversa geram esses comandos com o destino completo.

Essas frases são convertidas para ações cadastradas. Nunca viram PowerShell, CMD ou scripts. Formatos inválidos, destinos desconhecidos e ambiguidades são rejeitados.

O pedido abre uma confirmação **na conversa**, válida por 60 segundos, de uso único e vinculada ao solicitante e à operação. Após confirmar, o bot simulado acompanha validação, parada, inicialização e verificação. Serviço rodando não comprova saúde da aplicação.

Solicitações só podem ser canceladas antes de iniciar. Operações conflitantes são bloqueadas. Resultado desconhecido exige reconciliação sem repetição automática. Reiniciar um serviço parado oferece uma nova solicitação de início.

## Configurar quais serviços podem ser controlados

1. Na configuração, selecione o servidor e pesquise o serviço.
2. No seletor de **perfil de demonstração**, escolha Administração.
3. Abra **Configurar** no serviço desejado.
4. Marque somente Iniciar, Parar e/ou Reiniciar e informe o responsável.
5. Em produção, confirme a liberação explícita daquele serviço.
6. Salve e volte ao perfil Operação para usar a conversa.

Não marcar ações deixa o serviço somente para consulta. É possível liberar somente Reiniciar, sem liberar os comandos individuais Start e Stop. Serviços novos entram bloqueados para alteração. Agente, antivírus, firewall e componentes críticos permanecem protegidos.

Administração configura, mas não herda execução. Consulta não altera configurações ou serviços. Alterações de política são registradas e invalidam confirmações pendentes daquele serviço.

Todos os servidores de produção começam somente para consulta. A liberação é individual por serviço e ação, nunca automática por categoria ou por nome.

## Dados fictícios e persistência

São três servidores, com serviços genéricos, incluindo um exemplo de TOTVS AppServer. O servidor da filial está sem comunicação. O conector de integrações de homologação começa com ações autorizadas para facilitar o teste.

Heartbeat de 30 segundos e comunicação vencida após 90 segundos são parâmetros demonstrativos. A observação do serviço tem horário próprio. Use `/servicos <Servidor>` para consultá-la novamente. Não se guardam comandos para quando uma máquina voltar.

As atualizações usam cache de seis horas, intervalo mínimo de 30 minutos e uma busca por máquina. KBs e pacotes são fictícios. A conversa separa a previsão de reinício do pacote da pendência já observada no servidor. Instalação e reinício do Windows estão desabilitados.

A chave `nucleo-control-demo-v2` no `localStorage` contém apenas dados fictícios e preferências. A versão antiga do protótipo não é carregada por este modelo. **Restaurar** volta ao exemplo inicial. Se o navegador bloquear o armazenamento, a simulação funciona em memória. Datas usam `America/Sao_Paulo`.

O seletor de perfis e as permissões no navegador servem à demonstração. Não são autenticação nem autorização de produção. A conversa é uma prévia local, não envia mensagens ao Telegram e não sincroniza abas ou usuários.

## Estrutura

```text
src/app/                         Páginas e estilos
src/components/screens/telegram.tsx   Conversa de operação
src/components/screens/services.tsx   Configuração de serviços
src/components/service-policy-dialog.tsx
src/domain/                      Tipos, comandos e permissões
src/data/seed.ts                 Inventário fictício
src/services/                    Contrato e adaptador simulado
src/lib/format.ts                Datas e mensagens
tests/                          Testes de comandos, políticas e operações
```

O ponto de substituição da simulação por uma API é `src/services/index.ts`. Na integração real, inventário, configuração, solicitação, confirmação e resultado serão fornecidos por uma central autenticada; a execução local do mock não deve ser reproduzida no navegador.

## Próxima entrega operacional

Para um primeiro piloto real, a prioridade é um usuário autorizado, um servidor e o comando de reinício de um serviço aprovado, com confirmação e resultado. Em seguida entram os outros serviços e as consultas de atualização. Não é necessário construir um painel operacional completo.

```text
Operador no Telegram → Bot na central C#/.NET → pedido autorizado
Agente Windows → consulta à API da central → executa ação → envia resultado
Central → resultado ao operador no Telegram
Web → configuração dos destinos e das permissões
```

O agente inicia a conexão por HTTPS; não há abertura de porta de entrada nos servidores gerenciados. A central precisa ter sua API acessível aos agentes. Bot, token, agentes e armazenamento operacional persistente ficam **fora da Vercel**. O navegador não acessa agentes nem recebe credenciais administrativas.

## GitHub e Vercel

Repositório: [vtrzxy/ServicesTelegram](https://github.com/vtrzxy/ServicesTelegram).

Para hospedar esta demonstração na Vercel, importe o repositório, selecione Next.js, Node.js 24, instalação `npm ci` e compilação `npm run build`. Use o diretório de saída padrão. Não há variáveis de ambiente obrigatórias. A publicação não foi realizada por esta entrega.

Inclua o arquivo de dependências travadas nos commits. Não envie `.next`, `node_modules`, `.local`, `.documento_tmp`, `entrega` nem arquivos `.env`.

O documento Word em `documentos` registra o planejamento original. O escopo vigente deste protótipo é o descrito aqui: **Telegram para operar, web enxuta para configurar**, sem especialização em Protheus ou ERP.
