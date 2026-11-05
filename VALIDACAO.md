# Validação da entrega

Data: 5 de novembro de 2026.

## Verificações concluídas

- `npm run typecheck`: concluído sem erros.
- `npm test`: 23 testes aprovados, sem falhas.
- `npm run build`: compilação de produção concluída; sete rotas funcionais geradas.
- Dependências instaladas com arquivo de versões travadas.
- Interface revisada em computador com largura de 1.440 px e celular com largura de 390 px.
- Rolagem das tabelas contida no componente, sem ampliar a página no celular.

## Fluxos verificados

- Pesquisa do catálogo por nome, bloqueio do DBAccess e dos componentes protegidos.
- Produção somente para consulta e Administração sem herança de operação.
- Confirmação com solicitante, chat, destino, ambiente, ação e prazo.
- Reinício acompanhado até o estado final, com aplicação não verificada.
- Operação sem alteração, dependência ativa, expiração, cancelamento e falha parcial.
- Perda de comunicação, bloqueio de novas alterações e reconciliação sem reenvio.
- Persistência do histórico após recarregamento.
- Fluxo de seleção no Telegram abrindo a mesma confirmação do painel.
- Rejeição de modelos sem campos essenciais.
- Consulta de atualizações, cache e bloqueio de nova busca pelo intervalo mínimo.
- Navegação pelo menu móvel e leitura das políticas sem controles de autoelevação.

Os testes automatizados também verificam repetição de confirmações, conflitos, troca de solicitante, observação desatualizada, reinício de serviço parado, recarregamento durante execução e recuperação de buscas interrompidas.

## Limites

Esta validação cobre a demonstração local e sua compilação. Não houve implantação na Vercel, teste de API real, autenticação de produção, integração com Telegram ou instalação de agente. Não há certificação de acessibilidade; foram implementados rótulos, foco visível, diálogo nativo, navegação por teclado e adaptação de layout. Sincronização entre abas e usuários não faz parte desta versão.

As prévias na pasta de entrega mostram dados fictícios. As instruções de execução e publicação futura estão no README.
