import http.server
import socketserver
import os
import webbrowser
import sys

# Define the port
PORT = 8080

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for ALL files to ensure dynamic updates work
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        # Allow CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # Standardize modern JS modules loading
        # SimpleHTTPRequestHandler sometimes fails to serve ES modules correctly with the right mime type
        if ".js" in self.path:
            # Normalize path (remove leading slash)
            file_path = self.path[1:] if self.path.startswith('/') else self.path
            # If path has query params like ?v=123, remove them
            file_path = file_path.split('?')[0]
            
            if os.path.exists(file_path):
                self.send_response(200)
                self.send_header("Content-type", "application/javascript")
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
        
        return super().do_GET()

def start_server():
    # Ensure current directory is project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Custom mapping for .js to application/javascript
    # This is critical for ES Modules in browsers
    http.server.SimpleHTTPRequestHandler.extensions_map.update({
        '.js': 'application/javascript',
    })

    print(f"\n" + "="*50)
    print(f"🚀 RPG Maker Cheat UI - WEB PREVIEWER")
    print(f"="*50)
    print(f"1. Serving from: {script_dir}")
    print(f"2. Local URL:    http://localhost:{PORT}/preview/index.html")
    print(f"="*50)
    print(f"3. DYNAMIC SYNC ENABLED (Cache Disabled)")
    print(f"="*50)
    print(f"Press [CTRL+C] to stop the server.")
    print(f"="*50 + "\n")

    try:
        # We MUST use our custom MyHandler for the caching logic to work!
        with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
            # Auto-open browser
            print("Opening browser...")
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
