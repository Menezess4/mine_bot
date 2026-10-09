import json
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = "127.0.0.1"
PORT = 8765


def create_plan():
    return {
        "task": "build_platform",
        "material": "oak_planks",
        "width": 3,
        "depth": 3,
        "confirmation_required": True,
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/plan":
            self.send_error(404, "Rota não encontrada")
            return

        data = json.dumps(create_plan()).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), Handler)
    print(f"Servidor rodando em http://{HOST}:{PORT}/plan")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        server.server_close()