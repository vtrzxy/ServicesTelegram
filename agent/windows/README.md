# Agente Windows · somente leitura

Esta pasta gerada contém a chave exclusiva deste servidor em `agent.json`. Guarde-a em uma pasta com acesso restrito à conta que executará o agente. Não envie a chave para GitHub ou mensagens.

1. Instale Python 3.10 ou superior, 64 bits, pelo instalador oficial do Python. O agente usa apenas a biblioteca padrão; não há `pip install`.
2. Copie a pasta inteira gerada pela central para, por exemplo, `C:\ServicesTelegram`.
3. Confira `controllerUrl` em `agent.json`. Se a central está no Mac, use o IP dele na rede. `127.0.0.1` no Windows aponta para o próprio Windows.
4. No terminal dessa pasta, teste: `py -3 agent.py --once`.
5. Para manter o envio a cada 30 segundos: `py -3 agent.py` ou abra `iniciar.cmd`. Mantenha o terminal aberto neste primeiro piloto.
6. Abra a dashboard da central. O servidor deve aparecer com nome e todos os serviços do Windows.

Se o comando `py` não existir, use `python` ou o caminho completo do `python.exe`. Windows PowerShell com `Get-CimInstance` precisa estar disponível. O agente foi preparado para Windows Server com PowerShell 5.1; a consulta no seu Windows ainda precisa ser validada.

Não é necessário abrir porta de entrada no servidor. Ele faz uma conexão de saída para a central. A máquina da central precisa estar acessível, ligada e com a porta escolhida permitida para a rede de teste. Use HTTPS para sair dessa rede. HTTP com `allowInsecureHttp: true` é apenas para piloto em rede confiável e envia o inventário e a chave sem criptografia.

O agente consulta apenas `Win32_Service` (nome, nome de exibição, estado e inicialização) e a identificação do sistema. Não coleta senha, conta de execução, caminho de executável ou linha de comando dos serviços. Não inicia, para ou reinicia serviços. Não recebe nem executa comandos da central. Não altera políticas do PowerShell.

Não há instalação automática como serviço Windows nesta etapa. Para uso contínuo, configure uma tarefa no Agendador de Tarefas com o caminho completo do Python, argumentos `"C:\ServicesTelegram\agent.py" --config "C:\ServicesTelegram\agent.json"` e a pasta de início `C:\ServicesTelegram`, usando uma conta com permissão de consulta local. Valide primeiro em console; não é necessário assumir que o agente exige Administrador.

## Diagnóstico

- `logs\agent.log`: coleta/envio, com rotação de arquivos e sem registrar a chave.
- HTTP 401/403: chave ou identificação incorreta, ou agente removido do cadastro.
- Erro de conexão: confira IP, porta da central, firewall e se a central está rodando.
- Erro na coleta: confira Python, disponibilidade do Windows PowerShell/CIM e permissão da conta. Falha não é enviada como lista vazia.
- Sem envio por mais de três intervalos (mínimo 90 segundos): a web marca o último inventário como desatualizado. Isso não significa que os serviços pararam.
- Ctrl+C encerra o agente. Uma falha temporária tenta uma nova coleta no próximo ciclo, sem acumular fila.

Cada servidor deve ter uma pasta/configuração própria. Nunca reutilize o mesmo `agent.json` em duas máquinas.
