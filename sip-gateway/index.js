const WebSocket = require('ws');
const dgram = require('dgram');
const { Parser } = require('sip.js/lib/core/messages/parser');
const RtpEngine = require('rtpengine-client').Client;
const sdpTransform = require('sdp-transform');
require('dotenv').config();

const WS_PORT = process.env.SIP_WS_PORT || 8080;
const UDP_PORT = process.env.SIP_UDP_PORT || 5060;
const PUBLIC_IP = process.env.SIP_PUBLIC_IP || '127.0.0.1';
const RTPENGINE_HOST = process.env.RTPENGINE_HOST || '127.0.0.1';
const RTPENGINE_PORT = parseInt(process.env.RTPENGINE_PORT || 2223, 10);

console.log(`Starting SIP/Media Gateway on WS:${WS_PORT} and UDP:${UDP_PORT}`);
console.log(`Using RTPEngine at ${RTPENGINE_HOST}:${RTPENGINE_PORT}`);

const rtpengine = new RtpEngine(); // Client tracks remote in calls
const clients = new Map();

// Helper to parse SIP message
let sipParser;
try {
  sipParser = require('sip.js/lib/core/messages/parser').Parser;
} catch (e) {
  console.warn('Could not load sip.js Parser', e);
}

function parseSipMessage(msg) {
  if (sipParser) {
    const logger = { error: () => {}, warn: () => {}, log: () => {} };
    return sipParser.parseMessage(msg, logger);
  }
  return null; // Simplified parser omitted for brevity in B2BUA mode
}

// UDP Socket
const udpSocket = dgram.createSocket('udp4');

udpSocket.on('message', async (msg, rinfo) => {
  const msgStr = msg.toString();
  try {
    const parsed = parseSipMessage(msgStr);
    if (!parsed) return;

    let callId;
    if (parsed.getHeader) {
      callId = parsed.getHeader('call-id');
    } else {
      callId = parsed.headers['call-id'];
    }

    // Find client
    let clientData = clients.get(callId);

    // Fallback for INVITE (Registrar lookup)
    if (!clientData && (parsed.method === 'INVITE')) {
       let toUri = parsed.getHeader('to');
       const match = toUri.match(/sip:([^@]+)@/);
       if (match) {
         const user = match[1];
         clientData = clients.get('reg:' + user);
       }
    }

    if (clientData && clientData.ws.readyState === WebSocket.OPEN) {
      // Logic for RTP Bridging (Response from Provider)
      // We assume the Client initiated the call (INVITE via WS).
      // So this UDP message is likely 180 Ringing or 200 OK.

      // If 200 OK with SDP, we must answer rtpengine
      if (parsed.body && parsed.getHeader('content-type') === 'application/sdp') {
        const sdp = parsed.body;
        // console.log('Processing UDP Response SDP with RTPEngine...');

        const answerOpts = {
          'sdp': sdp,
          'call-id': callId,
          'from-tag': parsed.getHeader('from').match(/tag=([^;]+)/)[1], // Extract tag
          // 'to-tag': parsed.getHeader('to').match(/tag=([^;]+)/)[1],
          'ICE': 'force', // Client (WebRTC) needs ICE
          'transport-protocol': 'RTP/SAVPF', // Client expects SRTP
          'dtls-fingerprint': 'SHA-256', // Ensure fingerprint is generated
          'rtcp-mux': ['require'],
          'flags': ['trust-address', 'replace-origin', 'replace-session-connection']
        };

        try {
          const res = await rtpengine.answer(RTPENGINE_PORT, RTPENGINE_HOST, answerOpts);
          if (res.result === 'ok') {
            // Replace SDP in message
            let modifiedMsg = msgStr.replace(sdp, res.sdp);
            clientData.ws.send(modifiedMsg);
            return;
          } else {
            console.error('RTPEngine Answer Failed:', res);
          }
        } catch (err) {
          console.error('RTPEngine Error:', err);
        }
      }

      // Forward normally if no SDP or error
      clientData.ws.send(msgStr);
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

// Heartbeat
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

wss.on('connection', (ws) => {
  console.log('WS Client connected');
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  ws.on('message', async (message) => {
    const msgStr = message.toString();

    try {
      const parsed = parseSipMessage(msgStr);
      if (!parsed) return;

      const callId = parsed.getHeader('call-id');
      if (callId) clients.set(callId, { ws });

      if (msgStr.startsWith('REGISTER')) {
        const match = msgStr.match(/^To:.*<sip:([^@]+)@/m);
        if (match) {
          const user = match[1];
          clients.set('reg:' + user, { ws });
          console.log(`Registered user: ${user}`);
        }
      }

      // Modify Contact Header
      let modifiedMsg = msgStr.replace(
        /(Contact:.*<sip:[^@]+@)([^>;]+)(.*>)/i,
        `$1${PUBLIC_IP}:${UDP_PORT}$3`
      ).replace(/;transport=ws/gi, '');

      // Check for INVITE with SDP (Offer)
      if (parsed.method === 'INVITE' && parsed.body && parsed.getHeader('content-type') === 'application/sdp') {
        const sdp = parsed.body;
        // console.log('Processing WS INVITE SDP with RTPEngine...');

        const offerOpts = {
          'sdp': sdp,
          'call-id': callId,
          'from-tag': parsed.getHeader('from').match(/tag=([^;]+)/)[1],
          'ICE': 'remove', // Provider (UDP) hates ICE usually
          'transport-protocol': 'RTP/AVP', // Provider expects plain RTP
          'rtcp-mux': ['demux'], // Provider might need demux
          'flags': ['trust-address', 'replace-origin', 'replace-session-connection']
        };

        try {
          const res = await rtpengine.offer(RTPENGINE_PORT, RTPENGINE_HOST, offerOpts);
          if (res.result === 'ok') {
            modifiedMsg = modifiedMsg.replace(sdp, res.sdp);
          } else {
            console.error('RTPEngine Offer Failed:', res);
          }
        } catch (err) {
          console.error('RTPEngine Error:', err);
        }
      }

      // Cleanup on BYE
      if (parsed.method === 'BYE') {
        const fromTag = parsed.getHeader('from').match(/tag=([^;]+)/)[1];
        rtpengine.delete(RTPENGINE_PORT, RTPENGINE_HOST, { 'call-id': callId, 'from-tag': fromTag });
        clients.delete(callId);
      }

      // Determine Destination
      const reqLine = modifiedMsg.split('\r\n')[0];
      const uriMatch = reqLine.match(/sip:([^@]+)@([^:; ]+)(:(\d+))?/);
      let destHost = '127.0.0.1';
      let destPort = 5060;
      if (uriMatch) {
        destHost = uriMatch[2];
        if (uriMatch[4]) destPort = parseInt(uriMatch[4]);
      }

      const buffer = Buffer.from(modifiedMsg);
      udpSocket.send(buffer, destPort, destHost, (err) => {
        if (err) console.error('UDP Send Error:', err);
      });

    } catch (e) {
      console.error('Error forwarding WS message:', e);
    }
  });

  ws.on('close', () => {
    for (const [key, value] of clients.entries()) {
      if (value.ws === ws) clients.delete(key);
    }
  });
});
