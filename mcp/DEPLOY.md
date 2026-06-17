# Deploying the hosted MCP endpoint

The MCP server runs as a pm2 process (`currency-mcp`, defined in the repo-root
`ecosystem.config.js`) in HTTP mode, fronted by nginx at
`https://mcp.cambio-uruguay.com/mcp`. Stateless and read-only.

## 1. Build on the server

```bash
ssh root@104.234.204.107 -p 2223
cd /path/to/cambio-uruguay
git pull
cd mcp && npm ci && npm run build && cd ..
```

## 2. Start / reload pm2

```bash
pm2 start ecosystem.config.js --only currency-mcp   # first time
pm2 reload currency-mcp                              # subsequent deploys
pm2 save
```

Verify locally on the box:

```bash
curl -s http://localhost:8788/health      # → {"status":"ok",...}
```

## 3. DNS

Add an `A` record for `mcp.cambio-uruguay.com` → the server IP (same host as the
API). External — done at the domain registrar / DNS provider.

## 4. nginx reverse proxy

`/etc/nginx/sites-available/mcp.cambio-uruguay.com`:

```nginx
server {
    listen 80;
    server_name mcp.cambio-uruguay.com;

    location / {
        proxy_pass http://127.0.0.1:8788;
        proxy_http_version 1.1;

        # Streamable HTTP uses SSE for responses — do not buffer.
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/mcp.cambio-uruguay.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d mcp.cambio-uruguay.com    # TLS
```

## 5. Smoke test

```bash
curl -s https://mcp.cambio-uruguay.com/health
# MCP initialize:
curl -s -X POST https://mcp.cambio-uruguay.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'
```

Then add it to a client:

```json
{ "mcpServers": { "cambio-uruguay": { "url": "https://mcp.cambio-uruguay.com/mcp" } } }
```
