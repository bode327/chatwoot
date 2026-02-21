# Chatwoot SIP Gateway

This service acts as a complete Signaling and Media Gateway between Chatwoot's frontend (SIP over WebSocket, WebRTC) and generic VoIP Providers (SIP over UDP, RTP).

It enables Chatwoot to act as a **PBX/Media Server**, allowing calls to generic providers that do not support WebSockets or Encryption (SRTP).

## Architecture

- **Signaling:** `sip-gateway` (Node.js) bridges SIP over WebSocket (Secure) to SIP over UDP. It acts as a B2BUA (Back-to-Back User Agent) to handle transaction routing.
- **Media:** `rtpengine` (Docker service) bridges WebRTC Media (DTLS-SRTP, ICE) to standard RTP (AVP/G.711).

## Prerequisites

- Node.js (v14+)
- Docker (for RTPEngine)
- A SIP Provider account (UDP/TCP)

## Installation

1. Navigate to this directory:
   ```bash
   cd sip-gateway
   ```
2. Install dependencies (from root):
   ```bash
   pnpm install
   ```

## Configuration

Set environment variables (or add to your root `.env`):

```bash
SIP_WS_PORT=8080        # Port for WebSocket server (Chatwoot connects here)
SIP_UDP_PORT=5060       # Port for UDP SIP (Provider connects here)
SIP_PUBLIC_IP=127.0.0.1 # Public IP of this machine (reachable by Provider)
RTPENGINE_HOST=rtpengine # Hostname of rtpengine service
RTPENGINE_PORT=2223      # Port for rtpengine control (NG protocol)
```

## Running

It is recommended to run this via `docker-compose` or `Procfile` as configured in the main repo. The `docker-compose` setup includes `rtpengine`.

## Integrating with Chatwoot

1.  In Chatwoot, configure your Inbox.
2.  Set the **Gateway URL** (or WebSocket URL) to `ws://localhost:8080/sip` (or your public IP/Domain).
    - Or set `SIP_GATEWAY_URL=wss://your-domain.com/sip` in environment variables to set a global default.
3.  Set the **Domain** to your SIP Provider's domain (e.g. `sip.provider.com`). **Do not** set this to your Chatwoot/Gateway domain, or you will cause a routing loop.
4.  Set **Username** and **Password** as usual.

### Enabling WSS (Secure WebSocket)

Modern browsers require Secure WebSockets (`wss://`). Use Nginx to reverse proxy:

```nginx
location /sip {
  proxy_pass http://localhost:8080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
}
```

### Media & Network Tuning

The gateway automatically uses `rtpengine` to transcode media.
-   Ensure your Docker host exposes the RTP port range (default `20000-20050`) via UDP.
-   **Host Mode:** For best performance and to avoid NAT issues, consider running `rtpengine` with `network_mode: host` in `docker-compose.production.yaml`.
-   **Codecs:** The gateway forces G.711 (PCMA/PCMU) for maximum compatibility.
