# Telephony Readiness — FreeSWITCH Integration Guide

## Overview

This document outlines the prerequisites and architecture for integrating FreeSWITCH (or compatible PBX) with VoxCare. The current codebase has scaffolding in place but no active telephony implementation.

## Current Scaffolding

### Types (`worker/types.ts`)
- `TelephonyEventType` union: `CHANNEL_CREATE`, `CHANNEL_ANSWER`, `CHANNEL_HANGUP`, `DTMF`, `CUSTOM::call_queue`, `HEARTBEAT`
- `TelephonyEvent` interface: `{ type, timestamp, data, callId?, agentId? }`
- `CallRecord` interface: already implemented for call metadata storage

### Planned Endpoints (not implemented)
- `POST /api/telephony/events` — FreeSWITCH ESL event webhook receiver
- `POST /api/telephony/commands` — Call control commands (originate, hangup, transfer)
- `POST /api/telephony/audio/:callId/stream` — Audio streaming for AI transcription

### Interface (planned, not implemented)
```typescript
interface TelephonyBridge {
  originate(callerNumber: string, agentId: string): Promise<string>;
  hangup(callId: string): Promise<void>;
  transfer(callId: string, targetAgentId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  unhold(callId: string): Promise<void>;
  mute(callId: string): Promise<void>;
  unmute(callId: string): Promise<void>;
  sendDTMF(callId: string, digits: string): Promise<void>;
  onEvent(callback: (event: TelephonyEvent) => void): void;
}
```

## Architecture

```
┌──────────────┐     ESL      ┌──────────────┐
│  FreeSWITCH  │◄────────────►│  Telephony   │
│  PBX Server  │   (TCP 8021) │  Bridge Svc  │
│  (VPS)       │              │  (Node.js)   │
└──────┬───────┘              └──────┬───────┘
       │                             │
  SIP  │                      HTTP   │
  trunk│                      webhook│
       │                             │
       ▼                             ▼
┌──────────────┐              ┌──────────────────┐
│  PSTN /      │              │  VoxCare         │
│  SIP Provider│              │  Cloudflare      │
│  (Twilio,    │              │  Workers         │
│  Telnyx)     │              │                  │
└──────────────┘              └──────────────────┘
```

### Call Flow (Inbound)
```
Customer dials DID → SIP trunk → FreeSWITCH → ESL event bridge
→ POST /api/telephony/events (CHANNEL_CREATE)
→ VoxCare creates CallRecord (ringing)
→ Route to available agent (skills-based)
→ CHANNEL_ANSWER → update CallRecord
→ Real-time transcript via AI
→ CHANNEL_HANGUP → finalize CallRecord → create ticket
```

### Call Flow (Outbound)
```
Agent clicks dial in VoxCare → POST /api/telephony/commands
→ Telephony Bridge originates call via FreeSWITCH
→ Bridge agent and customer channels
→ Real-time transcript → ticket creation
```

## Prerequisites

### 1. VPS Server
- **Minimum**: 2 CPU, 4GB RAM, 50GB SSD
- **OS**: Ubuntu 22.04 LTS or Debian 12
- **Network**: Static IP, open ports 5060 (SIP), 8021 (ESL), 16384-32768 (RTP)
- **Provider**: AWS EC2, DigitalOcean, Hetzner, Linode

### 2. FreeSWITCH Installation
```bash
# Install FreeSWITCH
apt-get update && apt-get install -y freeswitch

# Configure ESL
# /etc/freeswitch/autoload_configs/event_socket.conf.xml
<param name="listen-ip" value="0.0.0.0"/>
<param name="listen-port" value="8021"/>
<param name="password" value="<strong-password>"/>
```

### 3. SIP Trunk
Options:
- **Twilio Elastic SIP Trunking** — Pay per minute, global DIDs
- **Telnyx** — Competitive rates, good API
- **Local telecom provider** — For local DIDs
- **Required**: At least 1 DID (phone number), SIP credentials

### 4. ESL Library (Node.js)
- `modesl` — Most popular Node.js ESL client
- Alternative: direct TCP socket to ESL port
- Runs as a separate Node.js service on the VPS

### 5. Audio Streaming Pipeline
For AI transcription during live calls:
- **Option A**: FreeSWITCH `mod_audio_stream` → WebSocket → VoxCare AI
- **Option B**: FreeSWITCH `mod_tts_stream` with external transcription service
- **Option C**: Record audio to file, process in chunks via R2 storage

## Deployment Checklist

- [ ] Provision VPS (Ubuntu 22.04, 2+ cores, 4GB+ RAM)
- [ ] Install and configure FreeSWITCH
- [ ] Configure ESL with strong password
- [ ] Open firewall ports: 5060/UDP (SIP), 8021/TCP (ESL), 16384-32768/UDP (RTP)
- [ ] Purchase SIP trunk and DID(s)
- [ ] Configure SIP trunk registration in FreeSWITCH dialplan
- [ ] Deploy ESL bridge service on VPS
- [ ] Implement `TelephonyBridge` interface in VoxCare worker
- [ ] Add `/api/telephony/*` endpoints to worker
- [ ] Configure webhook from ESL bridge to VoxCare
- [ ] Test inbound call flow (dial DID → route to agent)
- [ ] Test outbound call flow (agent initiates)
- [ ] Test call transfer (warm and cold)
- [ ] Test audio streaming for AI transcription
- [ ] Configure call recording storage (R2 or local)
- [ ] Set up monitoring and alerting for FreeSWITCH
- [ ] Document IVR menu flow (if applicable)

## IVR/Queue Configuration (Future)

```
FreeSWITCH Dialplan:
  - Welcome message
  - "Press 1 for Technical Support"
  - "Press 2 for Billing"
  - "Press 3 for General Inquiry"
  - Queue hold music with position announcement
  - Overflow to voicemail after X minutes
```

## Security Considerations

- **ESL password**: Strong password, restrict to VoxCare VPS IP
- **SIP security**: Use SIP authentication, TLS for SIP signaling
- **RTP encryption**: SRTP for media streams
- **Firewall**: Restrict ESL port to trusted IPs only
- **Rate limiting**: Protect telephony webhook endpoint
- **Call recording consent**: Implement legal consent announcements

## Estimated Effort

| Component | Effort |
|-----------|--------|
| VPS + FreeSWITCH setup | 2-4 hours |
| SIP trunk configuration | 1-2 hours |
| ESL bridge service | 8-16 hours |
| TelephonyBridge interface | 16-24 hours |
| Webhook endpoints | 4-8 hours |
| Audio streaming for AI | 8-16 hours |
| Testing & hardening | 8-16 hours |
| **Total** | **~50-90 hours** |

## References

- [FreeSWITCH Documentation](https://freeswitch.org/confluence/display/FREESWITCH/FreeSWITCH+Explained)
- [ESL Protocol](https://freeswitch.org/confluence/display/FREESWITCH/Event+Socket+Library)
- [modesl npm package](https://www.npmjs.com/package/modesl)
- [Twilio Elastic SIP Trunking](https://www.twilio.com/docs/sip-trunking)
