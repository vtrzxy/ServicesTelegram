# Validação da entrega

Data: 5 de novembro de 2026.

## Verificações concluídas

- `npm run typecheck`: concluído sem erros.
- `npm test`: 31 testes aprovados, sem falhas.
- `npm run build`: compilação de produção concluída.
- Duas áreas visíveis: conversa do Telegram e configuração de serviços. As rotas antigas redirecionam para essas áreas.
- Interface revisada em computador com largura de 1.440 px e celular com largura de 390 px, sem transbordamento horizontal da página.
- Configuração sem botões para executar ações nos serviços.

## Fluxos verificados

- Consulta de serviços pelo chat, comando de reinício, confirmação na própria conversa, etapas e resultado final.
- Comandos com nome interno do serviço e servidor explícitos; rejeição de comandos livres, destinos desconhecidos e ambiguidades.
- Liberação de um serviço genérico somente para Reiniciar, sem liberar Iniciar ou Parar.
- Produção bloqueada inicialmente e liberação explícita por serviço e ação. Tentativa sem confirmação exibe erro no formulário.
- Reinício autorizado de backup em produção concluído na simulação; comando de parada recusado pela política.
- Administração configura sem herdar execução; componentes protegidos permanecem bloqueados.
- Alteração de política registrada, persistência da configuração e invalidação de confirmações pendentes.
- Consulta de atualizações no chat com fonte, horário, cache, pacotes fictícios e indicação de reinício.

Os testes automatizados também cobrem confirmação de uso único, conflito por servidor, troca de solicitante, observação desatualizada, dependências, cancelamento, expiração, falha parcial, perda de comunicação, reconciliação sem reenvio, recarregamento durante execução e recuperação de consultas interrompidas.

## Limites

Esta validação cobre o protótipo local. Não houve implantação na Vercel, integração com Telegram real, autenticação de produção, API operacional ou instalação de agente. O seletor de perfis não representa autorização de produção. Nenhum serviço real foi alterado.

A conversa é uma prévia local. O histórico de operações e as configurações usam armazenamento do navegador; as mensagens da conversa não persistem ao navegar. Não há sincronização entre abas ou usuários. Instalação de atualizações e reinício do Windows ficam fora desta versão.

Não há certificação de acessibilidade. Foram implementados rótulos, foco visível, diálogo nativo e adaptação de layout. As imagens em `entrega` mostram apenas dados fictícios.
