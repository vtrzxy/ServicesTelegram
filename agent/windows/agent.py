"""Agente Windows de inventário. Somente leitura, biblioteca padrão do Python."""
import argparse
import base64
from datetime import datetime, timezone
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib import error, parse, request

VERSION = "0.1.0"
STATES = {"Running", "Stopped", "Paused", "Start Pending", "Stop Pending",
          "Continue Pending", "Pause Pending", "Unknown"}
MODES = {"Auto", "Manual", "Disabled", "Boot", "System", "Unknown"}
# Comando fixo e local. Não recebe comandos ou parâmetros da central.
COLLECT_SCRIPT = r"""
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
try {
    $services = @(Get-CimInstance -ClassName Win32_Service |
        Select-Object Name, DisplayName, State, StartMode)
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    [PSCustomObject]@{
        hostname = [System.Environment]::MachineName
        os = "$($os.Caption) ($($os.Version))"
        services = $services
    } | ConvertTo-Json -Depth 4 -Compress
} catch { [Console]::Error.WriteLine('Falha na consulta CIM local.'); exit 1 }
"""


def load_config(file):
    with Path(file).open(encoding="utf-8-sig") as stream:
        config = json.load(stream)
    url = parse.urlsplit(config.get("controllerUrl", ""))
    if (url.scheme not in ("http", "https") or not url.hostname or url.username
            or url.password or url.query or url.fragment or url.path not in ("", "/")):
        raise ValueError("controllerUrl deve ser a URL base HTTP(S) da central.")
    loopback = url.hostname in ("localhost", "127.0.0.1", "::1")
    if url.scheme == "http" and not loopback and config.get("allowInsecureHttp") is not True:
        raise ValueError("HTTP sem criptografia exige allowInsecureHttp no piloto local.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,63}", config.get("agentId", "")):
        raise ValueError("agentId inválido.")
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,128}", config.get("token", "")):
        raise ValueError("Chave do agente inválida.")
    interval = config.get("intervalSeconds", 30)
    if type(interval) is not int or not 15 <= interval <= 3600:
        raise ValueError("intervalSeconds deve estar entre 15 e 3600.")
    config["intervalSeconds"] = interval
    config["controllerUrl"] = config["controllerUrl"].rstrip("/")
    return config


def collect_windows():
    if os.name != "nt":
        raise RuntimeError("Este agente deve ser executado no Windows.")
    powershell = Path(os.environ.get("SystemRoot", r"C:\Windows")) / "System32/WindowsPowerShell/v1.0/powershell.exe"
    encoded = base64.b64encode(COLLECT_SCRIPT.encode("utf-16-le")).decode("ascii")
    result = subprocess.run(
        [str(powershell), "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
        capture_output=True, timeout=60, check=True, creationflags=0x08000000,
    )
    return json.loads(result.stdout.decode("utf-8-sig"))


def build_inventory(config, collected):
    rows = collected["services"]
    # O PowerShell pode retornar objeto único em vez de array em alguns cenários.
    if isinstance(rows, dict):
        rows = [rows]
    if not isinstance(rows, list) or len(rows) > 5000:
        raise ValueError("Resposta inválida da consulta de serviços.")
    services = []
    for row in rows:
        name = row["Name"]
        if not isinstance(name, str) or not name:
            raise ValueError("Nome de serviço inválido.")
        services.append({
            "name": name, "displayName": row.get("DisplayName") or name,
            "state": row.get("State") if row.get("State") in STATES else "Unknown",
            "startMode": row.get("StartMode") if row.get("StartMode") in MODES else "Unknown",
        })
    return {
        "schemaVersion": 1, "agentId": config["agentId"],
        "hostname": collected["hostname"], "os": collected["os"],
        "agentVersion": VERSION,
        "collectedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "intervalSeconds": config["intervalSeconds"], "services": services,
    }


class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise error.HTTPError(req.full_url, code, "Redirecionamento recusado", headers, fp)


def send_inventory(config, payload):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    if len(body) > 2 * 1024 * 1024:
        raise ValueError("Inventário excede 2 MiB.")
    req = request.Request(
        config["controllerUrl"] + "/api/agent/inventory", data=body, method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + config["token"]},
    )
    # Conexão direta, sem proxy de ambiente e sem encaminhar chave em redirects.
    opener = request.build_opener(request.ProxyHandler({}), NoRedirect())
    with opener.open(req, timeout=20) as response:
        result = json.loads(response.read(4096).decode("utf-8"))
        if response.status != 200 or result.get("accepted") is not True:
            raise RuntimeError("Central não confirmou o recebimento.")
    return result


def run_cycle(config):
    payload = build_inventory(config, collect_windows())
    result = send_inventory(config, payload)
    logging.info("Inventário recebido pela central: %s serviços; coleta %s.",
                 result["serviceCount"], payload["collectedAt"])


def main():
    parser = argparse.ArgumentParser(description="Inventário de serviços Windows, somente leitura")
    parser.add_argument("--config", type=Path, default=Path(__file__).resolve().with_name("agent.json"))
    parser.add_argument("--once", action="store_true", help="Coleta e envia uma única vez")
    args = parser.parse_args()
    try:
        config = load_config(args.config)
        if os.name != "nt":
            raise RuntimeError("Execute o agente no servidor Windows; macOS e Linux não são suportados.")
        log_dir = args.config.resolve().parent / "logs"
        log_dir.mkdir(exist_ok=True)
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                            handlers=[logging.StreamHandler(), RotatingFileHandler(
                                log_dir / "agent.log", maxBytes=1024 * 1024, backupCount=3, encoding="utf-8")])
        logging.info("Agente %s iniciado em modo somente leitura; intervalo %ss.",
                     config["agentId"], config["intervalSeconds"])
        while True:
            try:
                run_cycle(config)
            except error.HTTPError as exc:
                logging.error("Envio recusado pela central (HTTP %s). Confira cadastro, chave e URL.", exc.code)
                if args.once:
                    return 1
            except (error.URLError, OSError, ValueError, RuntimeError, subprocess.SubprocessError, KeyError, TypeError) as exc:
                # Nunca registra configuração, cabeçalhos, token ou linha de comando recebida.
                logging.error("Coleta/envio falhou (%s). O próximo ciclo tentará uma coleta nova.", type(exc).__name__)
                if args.once:
                    return 1
            else:
                if args.once:
                    return 0
            time.sleep(config["intervalSeconds"])
    except KeyboardInterrupt:
        logging.info("Agente encerrado.")
        return 0
    except (OSError, ValueError, RuntimeError, TypeError) as exc:
        print("Não foi possível iniciar o agente: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
