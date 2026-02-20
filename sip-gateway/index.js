const WebSocket = require('ws');
const dgram = require('dgram');
const { Parser, IncomingRequestMessage, IncomingResponseMessage } = require('sip.js/lib/core');
// sip.js exports are typically 'sip.js' but internal modules might not be exposed easily.
// Let's verify how to import Parser from 'sip.js'.
// Usually: const { Parser } = require('sip.js/lib/core/messages/parser');
// But ES Modules vs CommonJS...
// Let's try direct import or fallback.

// To handle parsing correctly, we might need a small helper if sip.js internal access is tricky.
// But based on the grep, it's there.

const uuid = require('uuid');
require('dotenv').config();

const WS_PORT = process.env.SIP_WS_PORT || 8080;
const UDP_PORT = process.env.SIP_UDP_PORT || 5060;
const PUBLIC_IP = process.env.SIP_PUBLIC_IP || '127.0.0.1';

console.log(`Starting SIP Gateway on WS:${WS_PORT} and UDP:${UDP_PORT}`);

const clients = new Map();

// Helper to parse SIP message using sip.js internals or basic regex
// Since requiring internal files from 'sip.js' might break on updates, let's use a robust regex parser for basic routing
// or check if sip.js exports it.
// Actually, `sip.js` package.json `exports` field might prevent deep imports.
// Let's check package.json of sip.js or just try to require it.

let sipParser;
try {
  // Try to load Parser from sip.js internal structure
  sipParser = require('sip.js/lib/core/messages/parser').Parser;
} catch (e) {
  console.warn('Could not load sip.js Parser, falling back to basic parsing.', e);
}

// Basic SIP Parser fallback
function parseSipMessage(msg) {
  if (sipParser) {
    // Parser.parseMessage returns an IncomingRequestMessage or IncomingResponseMessage
    // It requires a logger.
    const logger = { error: () => {}, warn: () => {}, log: () => {} };
    return sipParser.parseMessage(msg, logger);
  }

  // Minimal fallback parser if sip.js fails to load
  const lines = msg.split('\r\n');
  const firstLine = lines[0];
  const headers = {};
  let body = '';
  let inBody = false;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (inBody) {
      body += line + '\r\n';
    } else if (line === '') {
      inBody = true;
    } else {
      const parts = line.split(':');
      const key = parts[0].toLowerCase().trim();
      const value = parts.slice(1).join(':').trim();
      headers[key] = value;
    }
  }

  // Extract Call-ID
  const callId = headers['call-id'];
  const method = firstLine.split(' ')[0];

  return {
    method,
    headers,
    body,
    toString: () => msg // preserve original for forwarding
  };
}

// UDP Socket
const udpSocket = dgram.createSocket('udp4');

udpSocket.on('message', (msg, rinfo) => {
  const msgStr = msg.toString();
  // console.log(`UDP RECV from ${rinfo.address}:${rinfo.port}:\n${msgStr}`);

  try {
    const parsed = parseSipMessage(msgStr);

    if (!parsed) return;

    // Extract Call-ID
    // If using sip.js parser, headers are accessed differently?
    // sip.js IncomingMessage has `getHeader(name)`

    let callId;
    if (parsed.getHeader) {
      callId = parsed.getHeader('call-id');
    } else {
      callId = parsed.headers['call-id'];
    }

    // Find client
    let clientData = clients.get(callId);

    // If INVITE, check registration
    if (!clientData && (parsed.method === 'INVITE' || (parsed.message && parsed.message.method === 'INVITE'))) {
       // Check To header
       let toUri;
       if (parsed.getHeader) {
         toUri = parsed.getHeader('to');
       } else {
         toUri = parsed.headers['to'];
       }
       // Extract user from URI (e.g. <sip:user@domain>)
       const match = toUri.match(/sip:([^@]+)@/);
       if (match) {
         const user = match[1];
         clientData = clients.get('reg:' + user);
       }
    }

    if (clientData && clientData.ws.readyState === WebSocket.OPEN) {
      clientData.ws.send(msgStr);
    } else {
       // console.warn(`No WS client for UDP message: ${callId}`);
    }
  } catch (e) {
    console.error('Error handling UDP:', e);
  }
});

udpSocket.bind(UDP_PORT);


// WebSocket Server
const wss = new WebSocket.Server({
  port: WS_PORT,
  path: '/sip',
  handleProtocols: (protocols, req) => {
    if (protocols.has('sip')) return 'sip';
    return false;
  }
});

// Heartbeat implementation to keep connection alive
function heartbeat() {
  this.isAlive = true;
}

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', function close() {
  clearInterval(interval);
});

wss.on('connection', (ws) => {
  console.log('WS Client connected');
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', (message) => {
    const msgStr = message.toString();

    try {
      const parsed = parseSipMessage(msgStr);
      if (!parsed) return;

      let callId, method, requestUri;

      if (parsed.getHeader) {
        callId = parsed.getHeader('call-id');
        // IncomingRequestMessage has method property?
        // Actually Parser.parseMessage returns IncomingRequest or IncomingResponse
        // request.method is defined for requests. response.statusCode for responses.
        // But for parsing, we just need basic info for routing.

        // Let's assume generic access or check instance
      } else {
        callId = parsed.headers['call-id'];
      }

      // Store mapping
      if (callId) {
        clients.set(callId, { ws });
      }

      // Check for REGISTER
      // To properly route, we need to look at the first line.
      // If using sip.js parser, we can check `parsed instanceof IncomingRequestMessage`?
      // Or just check if `method` property exists.

      if (msgStr.startsWith('REGISTER')) {
        // Extract To user
        // Quick regex for robust extraction without relying on complex parser logic
        const match = msgStr.match(/^To:.*<sip:([^@]+)@/m);
        if (match) {
          const user = match[1];
          clients.set('reg:' + user, { ws });
          console.log(`Registered user: ${user}`);
        }
      }

      // Rewrite Contact Header for UDP reachability
      // We need to replace the internal WS IP/Port in Contact with our PUBLIC_IP:UDP_PORT
      // Simple regex replacement to avoid re-serializing issues
      // Replace "Contact: <sip:user@internal-ip;transport=ws>" with "Contact: <sip:user@PUBLIC_IP:UDP_PORT;transport=udp>"
      // Or just remove transport=ws

      let modifiedMsg = msgStr;

      // Basic Contact Rewrite
      // This is a naive implementation. A full B2BUA is complex.
      // We assume one Contact header.
      // Regex to find Contact header and replace host/port.
      // Example: Contact: <sip:agent@192.168.1.5:54321;transport=ws>
      // Target: Contact: <sip:agent@PUBLIC_IP:UDP_PORT>

      // Matches Contact: ... <sip:user@host:port ...>
      // We want to preserve user, but change host:port.

      modifiedMsg = modifiedMsg.replace(
        /(Contact:.*<sip:[^@]+@)([^>;]+)(.*>)/i,
        `$1${PUBLIC_IP}:${UDP_PORT}$3`
      );

      // Remove ;transport=ws if present
      modifiedMsg = modifiedMsg.replace(/;transport=ws/gi, '');

      // Determine Destination (Request-URI or Route)
      // For this gateway, we just send to the domain in the Request-URI?
      // Or we need to use a configured Proxy?
      // Usually, the client sends to the Domain.

      // Extract Request-URI domain
      const reqLine = modifiedMsg.split('\r\n')[0];
      const uriMatch = reqLine.match(/sip:([^@]+)@([^:; ]+)(:(\d+))?/);

      let destHost = '127.0.0.1';
      let destPort = 5060;

      if (uriMatch) {
        destHost = uriMatch[2];
        if (uriMatch[4]) destPort = parseInt(uriMatch[4]);
      }

      // Send UDP
      // console.log(`Forwarding WS->UDP: ${destHost}:${destPort} ${modifiedMsg.split('\r\n')[0]}`);
      const buffer = Buffer.from(modifiedMsg);
      udpSocket.send(buffer, destPort, destHost, (err) => {
        if (err) console.error('UDP Send Error:', err);
      });

    } catch (e) {
      console.error('Error forwarding WS message:', e);
    }
  });

  ws.on('close', () => {
    // Cleanup
    for (const [key, value] of clients.entries()) {
      if (value.ws === ws) {
        clients.delete(key);
      }
    }
  });
});
