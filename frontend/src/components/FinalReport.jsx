// FinalReport.jsx — report save panel.
//
// Lets the paramedic trigger the backend to assemble and save the final
// EMS incident report from everything Nova Pro collected during the call.
//
// States this panel cycles through:
//   idle    — waiting for an incident to start
//   ready   — incident is active, SAVE REPORT button enabled
//   saving  — request in-flight, button disabled
//   saved   — success, shows incident ID + file path + timestamp
//   error   — save failed, shows error message + retry button
//
// Props:
//   incidentId  — string (set when call starts) or null before any call

import { useState } from 'react'
import { saveReport } from '../services/api.js'

function FinalReport({ incidentId }) {
  const [status, setStatus]   = useState('idle')   // 'idle' | 'saving' | 'saved' | 'error'
  const [result, setResult]   = useState(null)      // backend response on success
  const [errMsg, setErrMsg]   = useState(null)
  const [savedAt, setSavedAt] = useState(null)      // HH:MM:SS timestamp of last save

  async function handleSave() {
    if (!incidentId) return
    setStatus('saving')
    setErrMsg(null)

    try {
      const data = await saveReport(incidentId)
      setResult(data)
      setSavedAt(new Date().toTimeString().slice(0, 8))
      setStatus('saved')
    } catch (e) {
      setErrMsg(e.message || 'Unknown error.')
      setStatus('error')
    }
  }

  const isReady   = !!incidentId && status !== 'saving'
  const isSaving  = status === 'saving'
  const isSaved   = status === 'saved'
  const isError   = status === 'error'

  return (
    <div className="border border-[#00ff41] flex flex-col h-72">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#005510]">
        <span className="text-[#00ff41] text-xs tracking-widest font-bold">
          FINAL REPORT
        </span>
        {isSaved && savedAt && (
          <span className="text-[#005510] text-xs tracking-wider">
            SAVED {savedAt}
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">

        {/* ── No incident yet ── */}
        {!incidentId && (
          <p className="text-[#005510] text-xs tracking-wider text-center">
            ▸ NO ACTIVE INCIDENT
          </p>
        )}

        {/* ── Success block ── */}
        {isSaved && result && (
          <div className="w-full border border-[#005510] p-3 space-y-1">
            <p className="text-[#00ff41] text-xs tracking-widest font-bold">
              ✓ REPORT SAVED
            </p>
            <p className="text-[#005510] text-xs tracking-wider">
              INCIDENT: <span className="text-[#00ff41]">{result.incident_id ?? incidentId}</span>
            </p>
            {result.pdf_path && (
              <p className="text-[#005510] text-xs tracking-wider break-all">
                FILE: <span className="text-[#00ff41]">{result.pdf_path}</span>
              </p>
            )}
          </div>
        )}

        {/* ── Error block ── */}
        {isError && (
          <div className="w-full border border-red-900 p-3">
            <p className="text-red-400 text-xs tracking-wider">
              ⚠ {errMsg}
            </p>
          </div>
        )}

        {/* ── Save / retry button ── */}
        {incidentId && (
          <button
            onClick={handleSave}
            disabled={!isReady}
            className={`
              w-full py-3 text-sm font-bold tracking-widest transition-colors
              ${isSaving
                ? 'border border-[#005510] text-[#005510] cursor-wait'
                : isSaved
                  ? 'border border-[#005510] text-[#005510] hover:border-[#00ff41] hover:text-[#00ff41]'
                  : isError
                    ? 'border border-red-500 text-red-500 hover:bg-red-500 hover:text-black'
                    : 'bg-[#00ff41] text-black hover:bg-white'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {isSaving ? '… SAVING' : isSaved ? '↺ SAVE AGAIN' : isError ? '↺ RETRY SAVE' : '▼ SAVE REPORT'}
          </button>
        )}

      </div>

      {/* ── Footer hint ── */}
      <div className="px-3 py-1 border-t border-[#005510]">
        <span className="text-[#005510] text-xs tracking-wider">
          {isSaved
            ? '▸ REPORT WRITTEN TO DISK — SAFE TO END CALL'
            : incidentId
              ? '▸ SAVES ALL VITALS, TRANSCRIPT + CHECKLIST'
              : '▸ START A CALL TO ENABLE REPORT SAVING'}
        </span>
      </div>
    </div>
  )
}

export default FinalReport
