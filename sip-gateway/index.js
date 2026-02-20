const WebSocket = require('ws');
const dgram = require('dgram');
const sip = require('sip');
const uuid = require('uuid');
require('dotenv').config();

const WS_PORT = process.env.SIP_WS_PORT || 8080;
const UDP_PORT = process.env.SIP_UDP_PORT || 5060;
const PUBLIC_IP = process.env.SIP_PUBLIC_IP || '127.0.0.1';

console.log(`Starting SIP Gateway on WS:${WS_PORT} and UDP:${UDP_PORT}`);

// Map to store active WebSocket connections
// Key: SIP Call-ID -> { ws } (for active transactions/dialogs)
// Key: SIP User (AOR) -> { ws } (for registrations)
const clients = new Map();

// Helper to get WS from Call-ID or User
function getClient(callId, user) {
  if (clients.has(callId)) return clients.get(callId);
  if (user && clients.has('reg:' + user)) return clients.get('reg:' + user);
  return null;
}

// SIP UDP Stack
sip.start({
  port: UDP_PORT,
  logger: {
    send: (message, address) => {
      // console.log(`UDP SEND to ${address.address}:${address.port}:\n${sip.stringify(message)}`);
    },
    recv: (message, address) => {
      // console.log(`UDP RECV from ${address.address}:${address.port}:\n${sip.stringify(message)}`);
    }
  }
}, (request) => {
  // Callback for incoming UDP requests (from Provider)
  try {
    const callId = request.headers['call-id'];
    console.log(`UDP Request ${request.method} Call-ID: ${callId}`);

    // Logic to find the correct WebSocket client
    let clientData = clients.get(callId);

    // If not found, and it's an INVITE/BYE, look up by To/From header (Registration)
    if (!clientData) {
      const toUri = sip.parseUri(request.headers.to.uri);
      const toUser = toUri.user;
      clientData = clients.get('reg:' + toUser);
    }

    if (clientData && clientData.ws.readyState === WebSocket.OPEN) {
      // Forward to WS
      // We must serialize the SIP message to a string.
      const msgStr = sip.stringify(request);
      clientData.ws.send(msgStr);
    } else {
      console.warn(`No active WS client found for UDP request ${callId}`);
      // Send 404 Not Found or 480 Temporarily Unavailable?
      // udpStack.send(sip.makeResponse(request, 480, 'Temporarily Unavailable'));
    }
  } catch (e) {
    console.error('Error handling UDP request:', e);
  }
});

// WebSocket Server
const wss = new WebSocket.Server({
  port: WS_PORT,
  handleProtocols: (protocols, req) => {
    // Negotiate 'sip' subprotocol
    if (protocols.has('sip')) {
      return 'sip';
    }
    return false;
  }
});

wss.on('connection', (ws) => {
  console.log('WS Client connected');

  ws.on('message', (message) => {
    const msgStr = message.toString();
    // console.log('WS RECV:\n', msgStr);

    try {
      const parsed = sip.parse(msgStr);

      if (!parsed) {
        console.error('Failed to parse SIP message from WS');
        return;
      }

      const callId = parsed.headers['call-id'];

      // Store transaction mapping
      if (callId) {
        clients.set(callId, { ws });
      }

      // Handle REGISTER specifically to store user mapping
      if (parsed.method === 'REGISTER') {
        const toUri = sip.parseUri(parsed.headers.to.uri);
        const toUser = toUri.user;
        clients.set('reg:' + toUser, { ws });
        console.log(`Registered user: ${toUser}`);
      }

      // Rewrite Contact Header
      if (parsed.headers.contact && parsed.headers.contact.length > 0) {
        const contact = parsed.headers.contact[0];
        if (contact.uri) {
           // Parse the contact URI to preserve user part
           const contactUri = sip.parseUri(contact.uri);
           // Rewrite host and port to our Gateway
           contactUri.host = PUBLIC_IP;
           contactUri.port = UDP_PORT;
           // Update the contact header
           // Note: sip library contact objects have 'uri' as string usually.
           // We reconstruct it.
           parsed.headers.contact[0].uri = `sip:${contactUri.user}@${PUBLIC_IP}:${UDP_PORT}`;
        }
      }

      // Rewrite Via Header?
      // SIP.js sends its own Via.
      // We should probably add our own Via on top (record-route style) or replace it.
      // Replacing it is simpler for a B2BUA-like behavior but tricky for transaction matching.
      // Ideally, we add our Via.
      // parsed.headers.via.unshift({ protocol: 'SIP/2.0/UDP', host: PUBLIC_IP, port: UDP_PORT });

      // Determine destination from Request-URI
      let destHost, destPort;
      const uri = sip.parseUri(parsed.uri);

      // If REGISTER, use the domain in the URI
      destHost = uri.host;
      destPort = uri.port || 5060;

      // Send via UDP
      sip.send(parsed, { address: destHost, port: destPort, protocol: 'UDP' });

    } catch (e) {
      console.error('Error processing WS message:', e);
    }
  });

  ws.on('close', () => {
    console.log('WS Client disconnected');
    // Cleanup
    for (const [key, value] of clients.entries()) {
      if (value.ws === ws) {
        clients.delete(key);
      }
    }
  });
});
