import http.server
import socketserver
import os
import webbrowser
import sys

# Define the port
PORT = 8080

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # Standardize modern JS modules loading
        if self.path.endswith(".js"):
            self.send_response(200)
            self.send_header("Content-type", "application/javascript")
            self.end_headers()
            with open(self.path[1:], 'rb') as f:
                self.wfile.write(f.read())
            return
        return super().do_GET()

def start_server():
    # Ensure current directory is project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    Handler = http.server.SimpleHTTPRequestHandler
    
    # Custom mapping for .js to application/javascript
    # This is critical for ES Modules in browsers
    Handler.extensions_map.update({
        '.js': 'application/javascript',
    })

    print(f"\n" + "="*50)
    print(f"🚀 RPG Maker Cheat UI - WEB PREVIEWER")
    print(f"="*50)
    print(f"1. Serving from: {script_dir}")
    print(f"2. Local URL:    http://localhost:{PORT}/preview/index.html")
    print(f"="*50)
    print(f"Press [CTRL+C] to stop the server.")
    print(f"="*50 + "\n")

    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            # Auto-open browser
            webbrowser.open(f"http://localhost:{PORT}/preview/index.html")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
