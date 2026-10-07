#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Context Commander - Windows Local Bridge Server
Permite que a extensão Brave execute comandos e scripts locais do Windows com segurança.
Não requer dependências externas além do Python padrão.
"""

import sys
import os
import time
import json
import subprocess
import urllib.parse
from http.server import ThreadingHTTPServer as HTTPServer, BaseHTTPRequestHandler

# pythonw.exe (modo segundo plano) não tem stdout/stderr
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w")

PORT = int(os.environ.get("BRIDGE_PORT", 27182))
HOST = "127.0.0.1"
START_TIME = time.time()

# Token de autenticação opcional (pode ser definido em variável de ambiente ou arquivo)
CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bridge_config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[!] Erro ao carregar config: {e}")
    return {"token": "", "allowed_origins": ["*"]}

CONFIG = load_config()

class BridgeRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Formato de log limpo
        sys.stdout.write(f"[{time.strftime('%H:%M:%S')}] {self.address_string()} - {format % args}\n")
        sys.stdout.flush()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Bridge-Token, Authorization")
        self.send_header("Content-Type", "application/json; charset=utf-8")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ["/", "/health", "/status"]:
            uptime = round(time.time() - START_TIME, 1)
            response = {
                "status": "ok",
                "name": "Context Commander Bridge",
                "version": "1.0.0",
                "platform": sys.platform,
                "uptimeSeconds": uptime,
                "hasToken": bool(CONFIG.get("token")),
                "defaultShell": "powershell"
            }
            body = json.dumps(response, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_error(404, "Endpoint não encontrado")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/run":
            self.send_error(404, "Endpoint não encontrado")
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_json_response({"success": False, "error": "Corpo da requisição vazio"}, status=400)
            return

        raw_data = self.rfile.read(content_length)
        try:
            data = json.loads(raw_data.decode("utf-8"))
        except Exception as e:
            self.send_json_response({"success": False, "error": f"JSON inválido: {str(e)}"}, status=400)
            return

        # Validação de token de segurança se configurado
        expected_token = CONFIG.get("token")
        if expected_token:
            header_token = self.headers.get("X-Bridge-Token") or self.headers.get("Authorization", "").replace("Bearer ", "")
            body_token = data.get("token")
            if (header_token != expected_token) and (body_token != expected_token):
                self.send_json_response({"success": False, "error": "Token de autenticação inválido ou ausente"}, status=401)
                return

        # Execução do comando
        result = self.execute_command(data)
        self.send_json_response(result)

    def execute_command(self, data):
        cmd_type = data.get("type", "cmd").lower()
        command = data.get("command", "").strip()
        cwd = data.get("cwd") or os.path.expanduser("~")
        interactive = bool(data.get("interactive", False))
        timeout = int(data.get("timeout", 30))

        if not command:
            return {"success": False, "error": "Nenhum comando fornecido"}

        if not os.path.exists(cwd):
            cwd = os.path.expanduser("~")

        # Script: se o texto inteiro é um arquivo existente (ex.: caminho com espaços sem aspas), coloca aspas
        if cmd_type == "script" and not command.startswith('"') and os.path.isfile(command.strip('"')):
            command = f'"{command}"'

        start_exec = time.time()

        try:
            # Caso 1: Abrir programa / arquivo diretamente (sem terminal)
            if cmd_type == "open":
                if sys.platform == "win32":
                    os.startfile(command)
                else:
                    subprocess.Popen(["xdg-open", command])
                return {
                    "success": True,
                    "exitCode": 0,
                    "stdout": f"Aberto com sucesso: {command}",
                    "stderr": "",
                    "durationMs": int((time.time() - start_exec) * 1000)
                }

            # Caso 2: Modo Interativo (abre nova janela visível no Windows)
            if interactive:
                if cmd_type == "powershell":
                    args = ["powershell.exe", "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", command]
                elif cmd_type == "script":
                    script_path = command.split()[0].strip('"')
                    if script_path.lower().endswith(".ps1"):
                        args = f'powershell.exe -NoExit -ExecutionPolicy Bypass -File {command}'
                    elif script_path.lower().endswith(".py"):
                        args = f'cmd.exe /k python {command}'
                    else:
                        args = f'cmd.exe /k {command}'
                else:
                    args = f'cmd.exe /k {command}'

                # Sem shell=True: ele força SW_HIDE e a nova janela ficaria invisível.
                creationflags = subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
                startupinfo = None
                if sys.platform == "win32":
                    startupinfo = subprocess.STARTUPINFO()
                    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                    startupinfo.wShowWindow = 1  # SW_SHOWNORMAL
                subprocess.Popen(args, cwd=cwd, creationflags=creationflags, startupinfo=startupinfo)
                return {
                    "success": True,
                    "exitCode": 0,
                    "stdout": "Comando iniciado em nova janela de console interativa.",
                    "stderr": "",
                    "interactive": True,
                    "durationMs": int((time.time() - start_exec) * 1000)
                }

            # Caso 3: Execução Silenciosa em Background (captura stdout / stderr)
            if cmd_type == "powershell":
                args = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]
                proc = subprocess.run(
                    args,
                    cwd=cwd,
                    capture_output=True,
                    text=True,
                    encoding="cp1252" if sys.platform == "win32" else "utf-8",
                    errors="replace",
                    timeout=timeout,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
            elif cmd_type == "script":
                # Detecta extensão do arquivo ou roda diretamente
                script_path = command.split()[0].strip('"')
                if script_path.endswith(".ps1"):
                    args = f'powershell.exe -ExecutionPolicy Bypass -File {command}'
                elif script_path.endswith(".py"):
                    args = f'python {command}'
                elif script_path.endswith((".bat", ".cmd")):
                    args = f'cmd.exe /c {command}'
                else:
                    args = command
                
                proc = subprocess.run(
                    args,
                    shell=True,
                    cwd=cwd,
                    capture_output=True,
                    text=True,
                    encoding="cp1252" if sys.platform == "win32" else "utf-8",
                    errors="replace",
                    timeout=timeout,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
            else:
                # Padrão: CMD do Windows
                proc = subprocess.run(
                    command,
                    shell=True,
                    cwd=cwd,
                    capture_output=True,
                    text=True,
                    encoding="cp1252" if sys.platform == "win32" else "utf-8",
                    errors="replace",
                    timeout=timeout,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )

            duration_ms = int((time.time() - start_exec) * 1000)
            return {
                "success": proc.returncode == 0,
                "exitCode": proc.returncode,
                "stdout": proc.stdout.strip(),
                "stderr": proc.stderr.strip(),
                "durationMs": duration_ms
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "exitCode": -1,
                "error": f"Tempo limite de execução excedido ({timeout}s)",
                "durationMs": int((time.time() - start_exec) * 1000)
            }
        except Exception as e:
            return {
                "success": False,
                "exitCode": -1,
                "error": str(e),
                "durationMs": int((time.time() - start_exec) * 1000)
            }

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def start_tray(httpd):
    """Ícone na bandeja do sistema. Retorna False se pystray/Pillow não estiverem instalados."""
    try:
        import threading
        import pystray
        from PIL import Image, ImageDraw
    except Exception:
        return False

    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 2, 62, 62), 12, fill=(99, 102, 241, 255))
    d.line((16, 22, 30, 32, 16, 42), fill="white", width=6)
    d.line((34, 44, 50, 44), fill="white", width=6)

    def quit_app(icon, item):
        icon.stop()
        httpd.shutdown()

    icon = pystray.Icon(
        "ContextCommanderBridge", img,
        f"Context Commander Bridge ({HOST}:{PORT})",
        pystray.Menu(
            pystray.MenuItem(f"Bridge rodando em {HOST}:{PORT}", None, enabled=False),
            pystray.MenuItem("Sair", quit_app),
        ),
    )
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    icon.run()
    httpd.server_close()
    return True

def run_server():
    server_address = (HOST, PORT)
    try:
        httpd = HTTPServer(server_address, BridgeRequestHandler)
    except OSError as e:
        print(f"[ERRO] Porta {PORT} já está em uso ou indisponível: {e}")
        print("Tente fechar a instância anterior ou alterar a porta BRIDGE_PORT.")
        sys.exit(1)

    print("=" * 60)
    print("   CONTEXT COMMANDER - LOCAL BRIDGE SERVER")
    print("=" * 60)
    print(f"[*] Servidor iniciado em: http://{HOST}:{PORT}")
    print(f"[*] Rota de integridade:  http://{HOST}:{PORT}/health")
    print(f"[*] Autenticação por token: {'ATIVADA' if CONFIG.get('token') else 'DESATIVADA (Modo Livre Local)'}")
    print(f"[*] Pressione CTRL + C para encerrar a qualquer momento.")
    print("=" * 60)
    sys.stdout.flush()

    try:
        if not start_tray(httpd):
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[!] Encerrando Context Commander Bridge...")
        httpd.server_close()
        sys.exit(0)

if __name__ == "__main__":
    run_server()
