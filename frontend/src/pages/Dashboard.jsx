// Dashboard.jsx — the main screen paramedics see during a call.
//
// This component owns all live state and the audio pipeline:
//   - WebSocket connection to the backend
//   - Microphone capture → PCM conversion → base64 → backend
//   - Transcript lines (raw text from Nova Sonic)
//   - Patient vitals (structured data from Nova Pro)
//   - Protocol checklist (structured data from Nova Pro)
//
// Audio pipeline explained:
//   Browser mic → Web Audio API (24000 Hz AudioContext)
//   → ScriptProcessorNode (collects float32 samples)
//   → accumulated every 250 ms
//   → converted to 16-bit signed PCM (Int16Array)
//   → base64-encoded string
//   → sent over WebSocket as { type: "audio", audio: "<base64>" }
//
// Why Web Audio API instead of MediaRecorder?
//   MediaRecorder outputs compressed audio (WebM/Opus). Nova Sonic expects
//   raw 16-bit PCM at 24 kHz. The Web Audio API gives us uncompressed
//   float32 samples which we convert to Int16 ourselves.
//
// Note: ScriptProcessorNode is deprecated in the Web Audio spec but is still
//   supported in every browser and is the simplest way to get raw PCM samples
//   without a separate AudioWorklet file.

import { useState, useRef } from 'react'
import { connectVoiceStream, sendAudioChunk, startProtocol } from '../services/api.js'
import VoiceConsole from '../components/VoiceConsole.jsx'
import LiveTranscript from '../components/LiveTranscript.jsx'
import PatientVitalsCard from '../components/PatientVitalsCard.jsx'
import ProtocolChecklist from '../components/ProtocolChecklist.jsx'
import FinalReport from '../components/FinalReport.jsx'

// ── Audio helpers ─────────────────────────────────────────────────────────────

// Convert a Float32Array of audio samples (range -1.0 to 1.0) to a signed
// 16-bit integer PCM Int16Array (range -32768 to 32767).
// This is the format Nova Sonic expects.
function float32ToInt16(float32Array) {
  const int16 = new Int16Array(float32Array.length)
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] first in case of floating-point overshoot
    const sample = Math.max(-1, Math.min(1, float32Array[i]))
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
  }
  return int16
}

// Encode an Int16Array as a base64 string so it can be sent over JSON.
// We read the raw bytes from the underlying ArrayBuffer and use btoa().
function int16ToBase64(int16Array) {
  const bytes = new Uint8Array(int16Array.buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ── Protocol auto-detection ───────────────────────────────────────────────────

// Maps the 4 condition strings the backend protocol engine recognizes to a set
// of symptom keywords. Any symptom in Nova Pro's output that contains one of
// these keywords will trigger that protocol.
//
// Keyword matching is intentionally broad — better to fire a "cardiac event"
// checklist on "chest tightness" than to miss it entirely.
const CONDITION_KEYWORDS = [
  {
    condition: 'cardiac event',
    keywords: ['chest pain', 'chest pressure', 'chest tightness', 'cardiac',
               'heart attack', 'myocardial', 'angina', 'palpitation', 'crushing chest'],
  },
  {
    condition: 'stroke',
    keywords: ['stroke', 'facial droop', 'arm weakness', 'slurred speech',
               'cva', 'facial weakness', 'speech difficulty', 'hemiplegia', 'sudden weakness'],
  },
  {
    condition: 'respiratory distress',
    keywords: ['shortness of breath', 'difficulty breathing', 'dyspnea',
               'wheezing', 'asthma', 'breathless', 'hypoxia', 'respiratory'],
  },
  {
    condition: 'trauma',
    keywords: ['trauma', 'injury', 'accident', 'fall', 'laceration',
               'fracture', 'mva', 'collision', 'gunshot', 'stab', 'hemorrhage'],
  },
]

// Given a symptoms array from Nova Pro (e.g. ["chest pain", "left arm radiation"]),
// return the first matching condition string, or null if nothing matches.
function detectCondition(symptoms) {
  if (!symptoms?.length) return null
  // Lowercase everything once so the inner comparisons are fast
  const lowerSymptoms = symptoms.map((s) => s.toLowerCase())
  for (const { condition, keywords } of CONDITION_KEYWORDS) {
    for (const keyword of keywords) {
      if (lowerSymptoms.some((s) => s.includes(keyword))) {
        return condition
      }
    }
  }
  return null
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [incidentId, setIncidentId]           = useState(null)
  const [isConnected, setIsConnected]         = useState(false)
  const [error, setError]                     = useState(null)
  const [transcriptLines, setTranscriptLines] = useState([])
  const [vitals, setVitals]                   = useState(null)
  const [checklist, setChecklist]             = useState(null)

  // ── Refs: WebSocket ────────────────────────────────────────────────────────
  // useRef keeps these values across renders without triggering re-renders.
  const wsRef = useRef(null)

  // Tracks whether we have already started a protocol for this call.
  // We only want to fire startProtocol() once per incident — the first time
  // Nova Pro finds recognizable symptoms — not on every subsequent transcript.
  const protocolStartedRef = useRef(false)

  // ── Refs: Audio pipeline ───────────────────────────────────────────────────
  // The browser MediaStream (holds the mic track — we must stop() it on end).
  const mediaStreamRef      = useRef(null)
  // The Web Audio context running at exactly 24000 Hz.
  const audioContextRef     = useRef(null)
  // The ScriptProcessorNode that fires onaudioprocess every ~170 ms.
  const scriptProcessorRef  = useRef(null)
  // A growing list of Float32Array chunks collected since the last 250 ms flush.
  const sampleBufferRef     = useRef([])
  // The setInterval ID for our 250 ms flush timer.
  const audioIntervalRef    = useRef(null)

  // ── Audio: start ──────────────────────────────────────────────────────────
  async function startAudio(ws) {
    // Step 1 — ask the browser for microphone access.
    // channelCount: 1 = mono. The browser might not honor sampleRate here,
    // but the AudioContext below will resample to 24000 Hz regardless.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 24000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    mediaStreamRef.current = stream

    // Step 2 — create an AudioContext locked to 24000 Hz.
    // Any audio fed into this context is automatically resampled to 24 kHz,
    // so Nova Sonic receives exactly the sample rate it expects.
    const ctx = new AudioContext({ sampleRate: 24000 })
    audioContextRef.current = ctx

    // Step 3 — wire the mic stream into a ScriptProcessorNode.
    // Buffer size 4096 at 24000 Hz = ~170 ms per onaudioprocess callback.
    // We accumulate those callbacks and flush as one 250 ms chunk below.
    const source    = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    scriptProcessorRef.current = processor

    // Each time the processor fires, grab the raw float32 samples and
    // push a copy into our accumulator. We copy because the underlying
    // buffer is reused by the browser on the next callback.
    processor.onaudioprocess = (event) => {
      const float32 = event.inputBuffer.getChannelData(0)
      sampleBufferRef.current.push(new Float32Array(float32))
    }

    // The processor must be connected to the destination to stay active,
    // even though we're not actually playing mic audio through speakers.
    source.connect(processor)
    processor.connect(ctx.destination)

    // Step 4 — every 250 ms, drain the accumulator, convert to PCM, and send.
    audioIntervalRef.current = setInterval(() => {
      const chunks = sampleBufferRef.current
      if (chunks.length === 0) return

      // Clear the accumulator before doing any async work
      sampleBufferRef.current = []

      // Concatenate all collected Float32 chunks into one flat array
      const totalLen = chunks.reduce((sum, c) => sum + c.length, 0)
      const combined = new Float32Array(totalLen)
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }

      // Convert float samples → 16-bit signed PCM → base64 → send
      const int16  = float32ToInt16(combined)
      const base64 = int16ToBase64(int16)
      sendAudioChunk(ws, base64)
    }, 250)
  }

  // ── Audio: stop ───────────────────────────────────────────────────────────
  function stopAudio() {
    // Cancel the flush timer first so no more sends fire
    clearInterval(audioIntervalRef.current)
    audioIntervalRef.current = null

    // Disconnect and discard the ScriptProcessorNode
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }

    // Close the AudioContext (releases the 24 kHz resampler)
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop the mic track — this turns off the red recording indicator
    // in the browser tab and releases the physical microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // Drop any samples that hadn't been flushed yet
    sampleBufferRef.current = []
  }

  // ── Start the call ────────────────────────────────────────────────────────
  function handleStart(id) {
    setError(null)
    setIncidentId(id)

    // Open the WebSocket first, then start sending audio into it
    const ws = connectVoiceStream(
      id,
      (transcript) => {
        setTranscriptLines((prev) => [...prev, transcript])
      },
      (structured) => {
        // ── Bug 1 fix: merge vitals instead of replacing ──────────────────
        // Nova Pro only includes fields it actually heard in this transcript
        // chunk. Replacing the whole vitals object would wipe out BP if only
        // heart rate was mentioned in the latest phrase. Instead, spread the
        // previous vitals and overlay only the fields that are non-null in the
        // new data — so every reading we've ever heard is preserved.
        if (structured.vitals) {
          const incoming = structured.vitals
          setVitals((prev) => ({
            ...prev,
            // Filter to only keys with actual values so a null heart_rate in
            // this chunk doesn't overwrite a real one we got earlier
            ...Object.fromEntries(
              Object.entries(incoming).filter(([, v]) => v != null && v !== 0)
            ),
          }))
        }

        // ── Bug 2 fix: auto-start a protocol from symptoms ────────────────
        // Nova Pro has no "suspected_condition" field — it only returns a
        // symptoms array. detectCondition() maps those symptoms to one of the
        // 4 condition strings the backend protocol engine recognizes.
        // We call startProtocol() at most once per call (protocolStartedRef
        // guards against re-triggering on every subsequent transcript chunk).
        if (!protocolStartedRef.current && structured.symptoms?.length) {
          const condition = detectCondition(structured.symptoms)
          if (condition) {
            protocolStartedRef.current = true   // lock so we don't fire again
            startProtocol(id, condition)
              .then((newChecklist) => setChecklist(newChecklist))
              .catch((err) => console.warn('Auto-protocol failed:', err))
          }
        }
      },
      (errMsg) => {
        setError(errMsg)
        setIsConnected(false)
        stopAudio()
      }
    )

    wsRef.current = ws
    setIsConnected(true)

    // Kick off mic capture. If the user denies mic permission or any
    // other error occurs, show it in the error bar and stop the call.
    startAudio(ws).catch((err) => {
      setError(`Microphone error: ${err.message}`)
      setIsConnected(false)
      ws.close()
      wsRef.current = null
    })
  }

  // ── Stop the call ─────────────────────────────────────────────────────────
  function handleStop() {
    stopAudio()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    // Reset the protocol guard so the next incident can auto-detect again
    protocolStartedRef.current = false
    setIsConnected(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00ff41] p-4 font-mono">
      <VoiceConsole
        onStart={handleStart}
        onStop={handleStop}
        isConnected={isConnected}
        error={error}
      />

      {/* 2×2 component grid */}
      <div className="grid grid-cols-2 gap-4">
        <LiveTranscript lines={transcriptLines} isConnected={isConnected} />
        <PatientVitalsCard vitals={vitals} />
        <ProtocolChecklist
          checklist={checklist}
          incidentId={incidentId}
          onChecklistUpdate={setChecklist}
        />
        <FinalReport incidentId={incidentId} />
      </div>
    </div>
  )
}

export default Dashboard
