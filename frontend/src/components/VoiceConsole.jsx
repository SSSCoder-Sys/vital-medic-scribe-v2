// VoiceConsole.jsx — the "control panel" at the top of the screen.
//
// Before a call starts: shows a text box for the incident ID and a
// big START button.
//
// During a call: shows the incident ID, a pulsing red dot to show
// the mic is live, and a STOP button to end the call.
//
// This component does NOT manage the WebSocket itself — it just tells
// the parent (Dashboard) to start or stop via callback functions.
// Dashboard is the one that actually owns the WebSocket connection.

import { useState } from 'react'

// Props this component receives from Dashboard:
//   onStart(incidentId) — called when the paramedic hits START
//   onStop()            — called when the paramedic hits STOP
//   isConnected         — true while the WebSocket is open
//   error               — an error string to display, or null

function VoiceConsole({ onStart, onStop, isConnected, error }) {
  // Local state: whatever the paramedic typed in the incident ID box
  const [incidentInput, setIncidentInput] = useState('')

  function handleStart() {
    // Trim spaces and make it uppercase so "inc001" becomes "INC001"
    const id = incidentInput.trim().toUpperCase()
    if (!id) return // Don't start without an ID
    onStart(id)
  }

  // Allow pressing Enter in the text box to start the call
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !isConnected) handleStart()
  }

  return (
    <div className="border border-[#00ff41] p-4 mb-4">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[#00ff41] text-xl font-bold tracking-widest">
          V.I.T.A.L. — VOICE INTEGRATED TRIAGE &amp; ASSISTANCE LOGIC
        </h1>

        {/* Pulsing dot only shows while a call is active */}
        {isConnected && (
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm tracking-wider">● LIVE</span>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      {!isConnected ? (
        // PRE-CALL: show incident ID input + START button
        <div className="flex items-center gap-3">
          <label className="text-[#00ff41] text-sm tracking-wider">
            INCIDENT ID:
          </label>
          <input
            type="text"
            value={incidentInput}
            onChange={(e) => setIncidentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. INC001"
            className="
              bg-black border border-[#00ff41] text-[#00ff41]
              px-3 py-1 text-sm tracking-wider font-mono
              placeholder-[#005510] outline-none
              focus:border-white
            "
          />
          <button
            onClick={handleStart}
            disabled={!incidentInput.trim()}
            className="
              bg-[#00ff41] text-black font-bold px-6 py-1
              text-sm tracking-widest
              hover:bg-white transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed
            "
          >
            ▶ START CALL
          </button>
        </div>
      ) : (
        // ACTIVE CALL: show current incident ID + STOP button
        <div className="flex items-center gap-4">
          <span className="text-[#00ff41] text-sm tracking-wider">
            INCIDENT: <span className="text-white font-bold">{incidentInput || '—'}</span>
          </span>
          <button
            onClick={onStop}
            className="
              border border-red-500 text-red-500 font-bold px-6 py-1
              text-sm tracking-widest
              hover:bg-red-500 hover:text-black transition-colors
            "
          >
            ■ END CALL
          </button>
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <p className="text-red-400 text-xs mt-2 tracking-wider">
          ⚠ {error}
        </p>
      )}
    </div>
  )
}

export default VoiceConsole
