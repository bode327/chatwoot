# Chatwoot SIP Gateway

This service acts as a Gateway between Chatwoot's frontend (SIP over WebSocket) and generic VoIP Providers (SIP over UDP/TCP).

It enables Chatwoot to connect to providers that do not support WebSockets directly, effectively making Chatwoot the "media server" (signaling gateway).

## Prerequisites

- Node.js (v14+)
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
```

## Running

It is recommended to run this via `docker-compose` or `Procfile` as configured in the main repo.

If running manually:
```bash
node index.js
```
The WebSocket server listens on `ws://localhost:8080/sip` by default.

## Integrating with Chatwoot

1.  In Chatwoot, configure your Inbox.
2.  Set the **Gateway URL** (or WebSocket URL) to `ws://localhost:8080/sip` (or your public IP).
    - Or set `SIP_GATEWAY_URL=ws://your-domain.com/sip` in environment variables to set a global default.
3.  Set the **Domain** to your SIP Provider's domain.
4.  Set **Username** and **Password** as usual.

Chatwoot will now connect to this Gateway via WebSocket, and the Gateway will proxy SIP messages to the Provider via UDP.

### Enabling WSS (Secure WebSocket)

Modern browsers require Secure WebSockets (`wss://`) when the page is loaded via HTTPS. To enable WSS:

1.  **Do not** modify the gateway code to handle certificates directly (unless running standalone).
2.  **Use your Reverse Proxy (Nginx, Traefik, etc.)** to terminate SSL/TLS and proxy the connection to the gateway's internal port (8080).

#### Nginx Example

Add this location block to your Chatwoot Nginx configuration:

```nginx
location /sip {
  proxy_pass http://localhost:8080;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then configure `SIP_GATEWAY_URL` as `wss://your-chatwoot-domain.com/sip`.

**Conflict Note:** This gateway runs on a separate port (8080) and uses the path `/sip` to avoid conflicts with Chatwoot's main WebSocket service (ActionCable) which uses `/cable`.

### Media (Audio/Video) Limitations

**Important:** This gateway handles **Signaling (SIP)** only. It does not transcode media.

-   Browsers use **WebRTC**, which requires encryption (DTLS-SRTP) and ICE for NAT traversal.
-   Generic SIP Providers usually expect standard **RTP** over UDP without encryption or ICE.

If your provider does not support WebRTC/SRTP directly, you will experience **Silence** (Signaling works, Media fails).

**Solution:** You must use a Media Relay (e.g., RTPEngine, RTPProxy, or FreeSWITCH) to bridge the media between the browser and the provider. Integrating a full media relay is outside the scope of this lightweight gateway service.
