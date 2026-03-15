// Dashboard.jsx — the main screen paramedics see during a call.
//
// This is the "brain" of the frontend. It owns all the live state:
//   - the WebSocket connection
//   - transcript lines
//   - patient vitals
//   - the protocol checklist
//
// It passes pieces of that state down to each child component as props.
// As we build more components (LiveTranscript, PatientVitalsCard, etc.)
// they will be imported and added here.

import { useState, useRef } from 'react'
import { connectVoiceStream, sendAudioChunk } from '../services/api.js'
import VoiceConsole from '../components/VoiceConsole.jsx'
import LiveTranscript from '../components/LiveTranscript.jsx'
import PatientVitalsCard from '../components/PatientVitalsCard.jsx'
import ProtocolChecklist from '../components/ProtocolChecklist.jsx'
import FinalReport from '../components/FinalReport.jsx'

function Dashboard() {
  // ── State ──────────────────────────────────────────────────────────
  const [incidentId, setIncidentId]     = useState(null)   // set when call starts
  const [isConnected, setIsConnected]   = useState(false)
  const [error, setError]               = useState(null)
  const [transcriptLines, setTranscriptLines] = useState([])
  const [vitals, setVitals]             = useState(null)   // filled in by Nova Pro
  const [checklist, setChecklist]       = useState(null)   // filled in by Nova Pro

  // useRef stores the WebSocket without causing a re-render when it changes
  const wsRef = useRef(null)

  // ── Start the call ─────────────────────────────────────────────────
  function handleStart(id) {
    setError(null)
    setIncidentId(id)

    // Open the WebSocket and give it two callbacks:
    //   onTranscript — fires every time Nova Sonic hears a phrase
    //   onStructured — fires every time Nova Pro extracts medical data
    const ws = connectVoiceStream(
      id,
      (transcript) => {
        // Add the new transcript line to our running list
        setTranscriptLines((prev) => [...prev, transcript])
      },
      (structured) => {
        // Merge the extracted vitals into our vitals state
        if (structured.vitals) {
          setVitals(structured.vitals)
        }
        // If Nova Pro found a checklist update, store it
        if (structured.checklist) {
          setChecklist(structured.checklist)
        }
      },
      (errMsg) => {
        setError(errMsg)
        setIsConnected(false)
      }
    )

    wsRef.current = ws
    setIsConnected(true)
  }

  // ── Stop the call ──────────────────────────────────────────────────
  function handleStop() {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#00ff41] p-4 font-mono">
      {/* Voice control bar — always at the top */}
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
