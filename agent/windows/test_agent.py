"""Testes sem executar coleta Windows. Rodam também no Mac/Linux."""
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib import error, request
import agent


class AgentTests(unittest.TestCase):
    def config(self, **changes):
        config = {"controllerUrl": "http://127.0.0.1:3000", "agentId": "windows-01",
                  "token": "a" * 43, "intervalSeconds": 30}
        config.update(changes)
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "agent.json"
            file.write_text(json.dumps(config), encoding="utf-8")
            return agent.load_config(file)

    def test_http_lan_exige_opcao_explicita(self):
        with self.assertRaises(ValueError):
            self.config(controllerUrl="http://192.168.1.10:3000")
        self.assertTrue(self.config(controllerUrl="http://192.168.1.10:3000", allowInsecureHttp=True)["allowInsecureHttp"])
        self.config(controllerUrl="https://central.example.com")

    def test_url_nao_aceita_credencial_caminho_ou_parametro(self):
        for url in ("https://user:secret@example.com", "https://example.com/api", "https://example.com/?token=secret", "file:///tmp/test"):
            with self.assertRaises(ValueError):
                self.config(controllerUrl=url)
        with self.assertRaises(ValueError):
            self.config(intervalSeconds=0)

    def test_dados_windows_unicode_e_minimizados(self):
        data = {"hostname": "SRV-01", "os": "Windows Server", "services": [
            {"Name": "Spooler", "DisplayName": "Impressão", "State": "Running",
             "StartMode": "Auto", "StartName": "dominio\\usuario", "PathName": "segredo"}]}
        result = agent.build_inventory(self.config(), data)
        self.assertEqual(result["services"][0]["displayName"], "Impressão")
        self.assertNotIn("segredo", json.dumps(result))
        self.assertNotIn("StartName", json.dumps(result))

    def test_servico_unico_e_estado_desconhecido(self):
        result = agent.build_inventory(self.config(), {"hostname": "SRV", "os": "Windows", "services": {"Name": "Servico", "State": "novo", "StartMode": "novo"}})
        self.assertEqual(result["services"][0]["state"], "Unknown")
        self.assertEqual(result["services"][0]["startMode"], "Unknown")

    def test_falha_de_coleta_nao_envia_inventario_vazio(self):
        with patch.object(agent, "collect_windows", side_effect=RuntimeError("Falha CIM")), patch.object(agent, "send_inventory") as send:
            with self.assertRaises(RuntimeError):
                agent.run_cycle(self.config())
            send.assert_not_called()

    def test_redirecionamento_nao_encaminha_chave(self):
        with self.assertRaises(error.HTTPError):
            agent.NoRedirect().redirect_request(request.Request("http://localhost/api"), None, 302, "Moved", {}, "https://outro.example.com")


if __name__ == "__main__":
    unittest.main()
