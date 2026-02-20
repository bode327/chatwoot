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
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in this directory or set environment variables:

```bash
SIP_WS_PORT=8080        # Port for WebSocket server (Chatwoot connects here)
SIP_UDP_PORT=5060       # Port for UDP SIP (Provider connects here)
SIP_PUBLIC_IP=127.0.0.1 # Public IP of this machine (reachable by Provider)
```

## Running

```bash
node index.js
```

## Integrating with Chatwoot

1.  In Chatwoot, configure your Inbox.
2.  Set the **Gateway URL** (or WebSocket URL) to `ws://localhost:8080` (or your public IP).
3.  Set the **Domain** to your SIP Provider's domain.
4.  Set **Username** and **Password** as usual.

Chatwoot will now connect to this Gateway via WebSocket, and the Gateway will proxy SIP messages to the Provider via UDP.

**Note:** This gateway handles SIP Signaling only. For audio (RTP) to work with generic providers, you typically need a Media Relay (like RTPEngine or RTPProxy) to handle the conversion between WebRTC (DTLS-SRTP) and SIP (RTP). This gateway implementation assumes the provider supports ICE/STUN or that a media relay is configured externally.
