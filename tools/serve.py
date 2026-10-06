#!/usr/bin/env python3
"""
Tiny threaded static server for local preview.

`python -m http.server` is single-threaded and serialises every request,
which stalls a page that loads many images at once. This uses
ThreadingHTTPServer so requests are served concurrently, and emulates
Vercel's cleanUrls (so /blinco resolves to /blinco/index.html).

    python tools/serve.py 5173
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Serve from the site root (the folder above /tools).
os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webp": "image/webp",
        ".woff2": "font/woff2",
    }

    def end_headers(self):
        # Local preview only: never cache, so source edits show up on reload.
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def send_head(self):
        # cleanUrls: map /blinco -> /blinco/index.html when no file matches.
        path = self.translate_path(self.path)
        if not os.path.exists(path) and not self.path.endswith("/"):
            candidate = path + "/index.html"
            html = path + ".html"
            if os.path.isfile(candidate):
                self.path = self.path.rstrip("/") + "/"
            elif os.path.isfile(html):
                self.path = self.path + ".html"
        return super().send_head()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Aurus preview on http://localhost:{port}/  (Ctrl+C to stop)")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
