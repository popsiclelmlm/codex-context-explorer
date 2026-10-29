"""Development preview using the real collector; not part of the MCP host."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import secrets
from urllib.parse import parse_qs, urlsplit
from bridge import Explorer

root = Path(__file__).resolve().parent
explorer = Explorer()
key = secrets.token_urlsafe(20)
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *unused): pass
    def do_GET(self):
        url = urlsplit(self.path)
        q = parse_qs(url.query)
        if q.get('key', [''])[0] != key or self.headers.get('Host') != f'127.0.0.1:{self.server.server_port}':
            self.send_error(403); return
        if url.path == '/':
            html = (root/'dist/report.html').read_text()
            mock = "window.__CONTEXT_EXPLORER_PREVIEW__=async(name,args)=>{const q=new URLSearchParams({key:new URLSearchParams(location.search).get('key'),op:name==='read_context_item'?'item':'report',args:JSON.stringify(args)});const r=await fetch('/data?'+q);if(!r.ok)throw Error('Preview error');const value=await r.json();return {_meta:name==='read_context_item'?{item:value}:{report:value}}};"
            value = html.replace('<script type="module">', '<script>'+mock+'</script><script type="module">').encode()
            kind = 'text/html; charset=utf-8'
        elif url.path == '/data':
            try: value = json.dumps(explorer.request(q.get('op', ['report'])[0], json.loads(q.get('args', ['{}'])[0])),ensure_ascii=False).encode()
            except Exception: self.send_error(400); return
            kind = 'application/json; charset=utf-8'
        else: self.send_error(404); return
        self.send_response(200); self.send_header('Content-Type',kind)
        self.send_header('Cache-Control','no-store'); self.send_header('Referrer-Policy','no-referrer')
        self.end_headers(); self.wfile.write(value)
server = ThreadingHTTPServer(('127.0.0.1',0),Handler)
print(f'http://127.0.0.1:{server.server_port}/?key={key}',flush=True)
try: server.serve_forever()
except KeyboardInterrupt: pass
finally: server.server_close()
