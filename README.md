# ServicesTelegram

Primeiro fluxo operacional: **agente Python no Windows → central no Mac → inventário web**. O agente lista os serviços locais e envia o inventário a cada 30 segundos. A web mostra nome, nome interno, estado, inicialização, sistema e horários da coleta e do recebimento.

Esta etapa é somente leitura. O agente não recebe comandos, não para serviços e não consulta atualizações. A operação pelo Telegram continua como objetivo do projeto; a prévia anterior fica separada em `/telegram` e usa dados fictícios.

## Testar com o Mac e um laptop Windows

Requisitos na central: Node.js 24 e npm. No Windows: Python 3.10+ de 64 bits e Windows PowerShell com `Get-CimInstance` (normalmente PowerShell 5.1). Não há dependências Python para instalar. Use uma versão do Python compatível com seu Windows e com suporte do fornecedor.

1. No Mac, entre nesta pasta e execute `npm ci` se as dependências ainda não estiverem instaladas.
2. Descubra o IP do Mac na mesma rede do Windows, nas configurações de rede do macOS.
3. Gere a central e o pacote do primeiro agente, substituindo o IP:

   ```bash
   npm run central:setup -- --agent srv-windows-01 --url http://192.168.1.10:3000 --allow-http
   ```

   O IP acima é apenas um exemplo: substitua pelo IP do Mac. Cada novo Windows deve ter um identificador próprio. O comando não substitui um agente existente.

4. Inicie a central para os dispositivos da rede:

   ```bash
   npm run build
   npm run start:lan
   ```

   Para desenvolver, use `npm run dev:lan`. Não execute os dois na mesma porta. `npm run dev` e `npm start` aceitam apenas conexões da própria máquina; os comandos com `:lan` escutam na rede.

5. No Mac, abra [http://127.0.0.1:3000](http://127.0.0.1:3000). Copie a chave do arquivo `.local/central/dashboard-key.txt` para o acesso da dashboard. Ela fica apenas na memória da aba: ao recarregar, informe novamente.
6. Copie a pasta inteira `.local/central/packages/srv-windows-01` para o Windows, por exemplo `C:\ServicesTelegram`. Ela já contém `agent.py`, `agent.json`, `iniciar.cmd` e instruções.
7. No terminal do Windows, nessa pasta, faça um primeiro envio:

   ```powershell
   py -3 agent.py --once
   ```

8. Para manter os envios, execute `py -3 agent.py` e mantenha o terminal aberto, ou abra `iniciar.cmd`. A dashboard recebe os dados automaticamente. Se não existir o comando `py`, use `python` ou o caminho completo de `python.exe`.

Os dois computadores precisam alcançar a central pela rede. Redes de convidados ou isolamento entre dispositivos podem impedir isso. Se o macOS solicitar acesso de rede ao Node, permita apenas o necessário para esse teste. Não é necessário abrir porta de entrada no laptop Windows. A central precisa ficar ligada, sem suspensão e com a porta 3000 acessível na rede de teste.

HTTP com `--allow-http` é uma opção explícita apenas para piloto em rede confiável: inventário e chave trafegam sem criptografia. Para outras redes, coloque a central atrás de HTTPS com certificado válido e gere o pacote com a URL HTTPS, sem `--allow-http`. O agente valida certificados e recusa redirecionamentos.

## O que aparece na dashboard

- Agentes cadastrados, inclusive os que ainda aguardam o primeiro envio.
- Hostname e sistema informado pelo Windows.
- Lista de todos os serviços retornados por `Win32_Service`, com pesquisa, filtro de estado e paginação de 50 itens.
- Quantidades de serviços, em execução, parados e automáticos parados, conforme a coleta.
- Horário da coleta no Windows e do recebimento na central, apresentados em `America/Sao_Paulo`.
- Último inventário preservado quando o agente deixa de enviar. Após três intervalos, com mínimo de 90 segundos, os estados passam a ser apresentados como históricos.

A web consulta a central a cada 10 segundos. **Atualizar web** consulta o último inventário; não força uma coleta remota. Serviço parado pode ser normal, e serviço em execução não comprova saúde da aplicação. Falha de coleta não é enviada como uma lista vazia.

## Chaves e armazenamento

A preparação cria dados locais ignorados pelo Git:

```text
.local/central/
  registry.json                 Hashes das chaves e agentes cadastrados
  dashboard-key.txt             Chave de leitura da dashboard
  inventory/<agente>.json       Último inventário recebido de cada agente
  packages/<agente>/            Pasta para copiar ao respectivo Windows
```

A central guarda hashes das chaves no cadastro. O pacote contém a chave original do agente, e o arquivo da dashboard contém sua chave de leitura. Restrinja o acesso a essas pastas. Não envie `.local`, `agent.json`, chaves ou pacotes configurados para o GitHub.

Cada agente só pode enviar inventário para seu próprio identificador. A chave da dashboard só consulta; não cadastra agentes nem envia inventário. Não há chave no código ou variável `NEXT_PUBLIC_*`. Para revogar um agente neste piloto, pare a central, remova sua entrada de `registry.json` e inicie novamente; não reutilize o identificador sem tratar também seu último inventário.

Os snapshots são gravados por substituição atômica em disco. Reiniciar a central mantém os inventários. Não há banco externo, histórico de coletas, múltiplas instâncias, edição de servidores pela web ou sincronização de cadastros nesta etapa. Para usar outro diretório persistente, configure `INVENTORY_DATA_DIR` tanto na preparação quanto na execução da central.

Nunca use a mesma configuração em dois computadores. Para outro servidor:

```bash
npm run central:setup -- --agent srv-windows-02 --url http://IP-DO-MAC:3000 --allow-http
```

Para outro endereço/porta da mesma central, atualize `controllerUrl` nos arquivos `agent.json` distribuídos. O cadastro existente e as chaves continuam válidos. A porta pode ser alterada ao iniciar com `npm run start:lan -- --port 3001`.

## Agente Windows

O agente usa a biblioteca padrão do Python e chama um comando fixo de consulta local do PowerShell. Não usa `shell=True`, não muda a política de execução e não instala software. Campos coletados: hostname, sistema, nome do serviço, nome de exibição, estado e modo de inicialização. Conta do serviço, senha, caminho do executável e linha de comando não são coletados.

Não há instalação automática como serviço Windows neste primeiro piloto. As instruções do pacote explicam execução em console e a opção de configurar uma tarefa depois de validar a coleta. Logs locais têm rotação e não registram chaves. Falhas são tentadas novamente no próximo ciclo, sempre com uma coleta nova e sem fila acumulada.

A coleta real precisa ser validada no Windows de destino. Os testes no Mac cobrem validação, transporte, armazenamento, apresentação e comportamento do agente com a coleta substituída por dados de teste; não provam a consulta CIM no Windows.

Referências: [Win32_Service da Microsoft](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-service) e [cliente HTTP da biblioteca padrão do Python](https://docs.python.org/3/library/urllib.request.html).

## API local

- `POST /api/agent/inventory`: chave exclusiva do agente no cabeçalho `Authorization: Bearer ...` e corpo JSON versionado. Aceita até 2 MiB e 5.000 serviços, valida campos e ignora atributos extras. Substitui o snapshot completo.
- `GET /api/inventory`: chave de leitura da dashboard no mesmo cabeçalho. Inclui agentes que ainda não enviaram inventário. Não retorna hashes nem chaves.

Não há endpoint de execução remota. A central usa Node e disco persistente; **este fluxo não é adequado a hospedagem estática ou armazenamento efêmero da Vercel**. Não publique esta central de piloto diretamente na internet.

## Demonstração anterior do Telegram

`/telegram` e `/configuracao` preservam o protótipo de comandos, confirmação e políticas com dados fictícios. O perfil de demonstração não autentica a central real. As configurações simuladas não se aplicam aos agentes Python. Restaurar a demonstração não apaga os inventários reais. O bot ainda não está conectado.

## Validar o projeto

```bash
npm run typecheck
npm test
npm run build
python3 -m unittest discover -s agent/windows -p 'test_*.py' -v
```

No Windows, use `py -3` no lugar de `python3`. O CI executa as verificações de Node e Python sem coletar serviços do computador de teste. `npm run validate` reúne tipos, testes de Node e compilação. Dependências Node estão travadas no `package-lock.json`.

Repositório: [vtrzxy/ServicesTelegram](https://github.com/vtrzxy/ServicesTelegram). O Word em `documentos` registra o planejamento original; este README descreve o piloto atual.
