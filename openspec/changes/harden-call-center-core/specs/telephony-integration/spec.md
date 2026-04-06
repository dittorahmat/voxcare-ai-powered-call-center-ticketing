## ADDED Requirements

### Requirement: ESL Event Webhook Receiver
The system SHALL expose a webhook endpoint (`POST /api/telephony/events`) that receives FreeSWITCH ESL events as JSON payloads. The system SHALL accept and parse the following event types: `CHANNEL_CREATE`, `CHANNEL_ANSWER`, `CHANNEL_HANGUP`, `DTMF`, `CUSTOM::call_queue`, `HEARTBEAT`.

#### Scenario: Receiving a channel create event
- **WHEN** FreeSWITCH sends a `CHANNEL_CREATE` event to the webhook endpoint
- **THEN** the system logs the event and triggers a `call-incoming` notification for the next available agent

#### Scenario: Receiving a channel hangup event
- **WHEN** FreeSWITCH sends a `CHANNEL_HANGUP` event with call duration and transcript reference
- **THEN** the system finalizes the call record and triggers AI transcription if audio was recorded

### Requirement: Telephony Command API
The system SHALL expose a REST API (`POST /api/telephony/commands`) for sending commands back to FreeSWITCH. Supported commands SHALL include: `originate` (place outbound call), `hangup` (terminate call), `transfer` (transfer to another agent/queue), `playback` (play audio/IVR), and `bridge` (connect two channels).

#### Scenario: Placing an outbound call
- **WHEN** an authenticated supervisor sends an `originate` command with destination number and caller ID
- **THEN** the system forwards the command to the FreeSWITCH bridge and returns the call UUID

#### Scenario: Transferring an active call
- **WHEN** an agent sends a `transfer` command with a target agent ID
- **THEN** the system routes the transfer command to FreeSWITCH and updates the call assignment

### Requirement: Audio Stream Ingestion
The system SHALL accept real-time audio chunks from FreeSWITCH via a streaming endpoint (`POST /api/telephony/audio/:callId/stream`). Audio data SHALL be received as base64-encoded PCM chunks and forwarded to the AI transcription service for real-time speech-to-text processing.

#### Scenario: Receiving audio stream during active call
- **WHEN** FreeSWITCH sends audio chunks for an active call
- **THEN** the system forwards chunks to the AI service and accumulates transcript segments

#### Scenario: Audio stream ends on call hangup
- **WHEN** a `CHANNEL_HANGUP` event is received for a call with an active audio stream
- **THEN** the system finalizes the transcript and attaches it to a new or existing ticket

### Requirement: Call Queue State Management
The system SHALL maintain the state of call queues received from FreeSWITCH events. Queue state SHALL include: queue name, waiting calls, connected agents, hold times, and agent statuses. Queue state SHALL be queryable via `GET /api/telephony/queues`.

#### Scenario: Querying active call queues
- **WHEN** a supervisor requests the current queue state
- **THEN** the system returns all active queues with waiting calls and agent assignments

#### Scenario: Agent logs into queue
- **WHEN** an agent logs into a FreeSWITCH queue (via DTMF or SIP registration)
- **THEN** the system updates the agent's availability and triggers a notification

### Requirement: Telephony Bridge Interface (Abstract)
The system SHALL define a `TelephonyBridge` interface that abstracts all FreeSWITCH interactions. The interface SHALL define methods for: `handleEvent(event)`, `sendCommand(command)`, `streamAudio(callId)`, and `getQueueState()`. This enables future swap to a different PBX backend without changing core logic.

#### Scenario: Swapping PBX backend
- **WHEN** a developer implements an alternative `TelephonyBridge` for a different PBX
- **THEN** the core ticket and notification systems continue to function without modification
