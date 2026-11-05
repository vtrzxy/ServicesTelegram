# Validação da central local e do agente

Data: 5 de novembro de 2026.

## Verificações concluídas

- Checagem TypeScript sem erros.
- 38 testes Node aprovados, incluindo as 31 verificações anteriores da demonstração.
- 6 testes Python aprovados, sem executar coleta Windows no Mac.
- Compilação de produção concluída sem avisos.
- Rastreios da compilação inspecionados: arquivos de `.local` não entram no pacote da aplicação.
- Chaves, cadastros, inventários e pacote configurado ignorados pelo Git.

## Fluxo real implementado

O agente Windows consulta o inventário local por um comando fixo de leitura do PowerShell e faz POST autenticado na central. A central valida o payload, grava o último snapshot em disco e o fornece à dashboard por uma chave separada de leitura. O agente não recebe comandos e não altera serviços.

O teste de transporte usou a função HTTP do agente Python com 61 serviços fictícios, uma central Node em porta e diretório separados, gravação em disco e leitura pela API. A chave do agente foi recusada ao tentar ler a dashboard. Nenhum dado de teste foi colocado no inventário principal.

A dashboard foi verificada no navegador em 1.440 px e 390 px, com seleção de servidor, pesquisa por nome interno, filtro de estado, paginação de 50 itens, lista vazia após filtro incompatível e indicação de histórico após mais de 90 segundos sem envio. Não houve transbordamento horizontal da página no celular; a tabela tem rolagem própria.

A central principal contém apenas o agente cadastrado para o Windows e aguarda seu primeiro envio. O pacote local contém a configuração exclusiva desse agente. Não contém dados de inventário fictícios.

## Cobertura e limites

Os testes validam separação de chaves, rejeição de identificação de outro agente, persistência, substituição do snapshot completo, preservação do último inventário válido após payload inválido, limites de corpo e quantidade, duplicidade, validação de campos, ausência de credenciais no retorno, frescor do inventário, URL e configuração Python, Unicode, minimização de dados, falha de coleta sem envio vazio e bloqueio de redirecionamento HTTP.

A consulta CIM real ainda precisa ser executada no laptop Windows. Não houve instalação de Python nesse laptop, teste da permissão de consulta da conta, instalação como serviço Windows ou confirmação da conectividade entre os dois computadores. A central foi executada no Mac; isso não comprova que a rede permite acesso do Windows.

O piloto usa HTTP com liberação explícita em rede confiável. HTTPS, armazenamento multi-instância, autenticação por usuário, histórico de coletas e operação real pelo Telegram ficam fora desta etapa. A demonstração anterior continua separada, sem aplicar permissões ou ações aos agentes reais.
