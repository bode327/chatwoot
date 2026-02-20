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
    - Or set `SIP_GATEWAY_URL=ws://your-domain/sip` in environment variables to set a global default.
3.  Set the **Domain** to your SIP Provider's domain.
4.  Set **Username** and **Password** as usual.

Chatwoot will now connect to this Gateway via WebSocket, and the Gateway will proxy SIP messages to the Provider via UDP.

**Conflict Note:** This gateway runs on a separate port (8080) and uses the path `/sip` to avoid conflicts with Chatwoot's main WebSocket service (ActionCable) which uses `/cable`. If running behind Nginx, configure a location block to proxy `/sip` to port 8080.

**Media Note:** This gateway handles SIP Signaling only. For audio (RTP) to work with generic providers, you typically need a Media Relay (like RTPEngine or RTPProxy) to handle the conversion between WebRTC (DTLS-SRTP) and SIP (RTP). This gateway implementation assumes the provider supports ICE/STUN or that a media relay is configured externally.
