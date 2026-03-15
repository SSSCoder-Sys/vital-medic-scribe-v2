// api.js — the ONLY file that talks to the backend.
//
// Think of this as the "receptionist" for our app.
// Any time a component needs data from the server,
// it calls a function from here — never fetches directly.
// This keeps all the URLs in one place, easy to change later.

const BASE_URL = 'http://localhost:8000'
const WS_BASE  = 'ws://localhost:8000'

// ─────────────────────────────────────────────
// WEBSOCKET
// ─────────────────────────────────────────────

/**
 * Opens the real-time voice WebSocket for an incident.
 *
 * @param {string}   incidentId   - e.g. "INC001"
 * @param {Function} onTranscript - called with a string each time Nova Sonic
 *                                  finishes recognizing a spoken phrase
 * @param {Function} onStructured - called with a plain object each time
 *                                  Nova Pro extracts vitals / symptoms
 * @param {Function} onError      - called if the connection fails
 * @returns {WebSocket}           - the raw WebSocket so the caller can close it
 */
export function connectVoiceStream(incidentId, onTranscript, onStructured, onError) {
  const ws = new WebSocket(`${WS_BASE}/voice/ws/${incidentId}`)

  // The backend sends JSON objects with a "type" field
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)

    if (message.type === 'transcript') {
      // Nova Sonic heard something — raw text like "Patient is 52 years old"
      onTranscript(message.data)
    } else if (message.type === 'structured') {
      // Nova Pro extracted structured data — { age, vitals, symptoms, ... }
      onStructured(message.data)
    }
  }

  ws.onerror = () => {
    if (onError) onError('WebSocket connection failed.')
  }

  return ws
}

/**
 * Sends one audio chunk to the backend over an open WebSocket.
 * The audio must already be base64-encoded (the browser's MediaRecorder gives us this).
 *
 * @param {WebSocket} ws           - the open connection from connectVoiceStream()
 * @param {string}    audioBase64  - base64-encoded audio bytes
 */
export function sendAudioChunk(ws, audioBase64) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'audio', audio: audioBase64 }))
  }
}

// ─────────────────────────────────────────────
// PROTOCOL / CHECKLIST
// ─────────────────────────────────────────────

/**
 * Tells the backend to create a new EMS protocol checklist.
 * Call this once at the start of an incident.
 *
 * @param {string} incidentId - e.g. "INC001"
 * @param {string} condition  - e.g. "cardiac event"
 * @returns {Promise<object>} - the new checklist object
 */
export async function startProtocol(incidentId, condition) {
  const params = new URLSearchParams({ incident_id: incidentId, condition })
  const res = await fetch(`${BASE_URL}/protocol/start?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not start protocol checklist.')
  return res.json()
}

/**
 * Fetches the current checklist state for an incident.
 * Returns null if no checklist exists yet.
 *
 * @param {string} incidentId
 * @returns {Promise<object|null>}
 */
export async function getChecklist(incidentId) {
  const res = await fetch(`${BASE_URL}/protocol/${incidentId}`)
  if (!res.ok) return null
  return res.json()
}

/**
 * Marks a checklist step as completed.
 * @param {string} incidentId
 * @param {string} step - exact step text, e.g. "Oxygen administered"
 * @returns {Promise<object>} - updated checklist
 */
export async function completeStep(incidentId, step) {
  const params = new URLSearchParams({ step })
  const res = await fetch(`${BASE_URL}/protocol/${incidentId}/complete_step?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to complete step.')
  return res.json()
}

/**
 * Marks a checklist step as incomplete (undo).
 * @param {string} incidentId
 * @param {string} step - exact step text
 * @returns {Promise<object>} - updated checklist
 */
export async function uncompleteStep(incidentId, step) {
  const params = new URLSearchParams({ step })
  const res = await fetch(`${BASE_URL}/protocol/${incidentId}/uncomplete_step?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to uncomplete step.')
  return res.json()
}

// ─────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────

/**
 * Tells the backend to generate and save the final EMS report.
 * The backend reads all the patient data it collected during the call
 * and assembles it into a report file.
 *
 * @param {string} incidentId
 * @returns {Promise<object>} - { status, incident_id, pdf_path }
 */
export async function saveReport(incidentId) {
  const res = await fetch(`${BASE_URL}/logs/save/${incidentId}`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to save report.')
  return res.json()
}
