// LiveTranscript.jsx — scrolling live transcript panel.
//
// Receives an array of transcript strings from Dashboard and renders
// them as a scrolling log, newest at the bottom.
//
// Each line gets a timestamp (HH:MM:SS) stamped when it first arrives,
// plus a line number, matching the medical monitor aesthetic.
//
// Props:
//   lines        — array of plain strings from Nova Sonic
//   isConnected  — bool, used to show the right idle state

import { useEffect, useRef, useState } from 'react'

// We stamp each line when it is added, not when it is rendered,
// so timestamps survive re-renders.
function useStampedLines(lines) {
  const [stamped, setStamped] = useState([])
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (lines.length > prevLenRef.current) {
      const now = new Date()
      const ts = now.toTimeString().slice(0, 8) // "HH:MM:SS"
      const newEntries = lines.slice(prevLenRef.current).map((text) => ({ text, ts }))
      setStamped((prev) => [...prev, ...newEntries])
      prevLenRef.current = lines.length
    }
    // If lines was cleared (call reset), clear stamped too
    if (lines.length === 0 && prevLenRef.current > 0) {
      setStamped([])
      prevLenRef.current = 0
    }
  }, [lines])

  return stamped
}

function LiveTranscript({ lines = [], isConnected }) {
  const stamped    = useStampedLines(lines)
  const bottomRef  = useRef(null)

  // Auto-scroll to bottom whenever a new line arrives
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [stamped])

  return (
    <div className="border border-[#00ff41] flex flex-col h-72">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#005510]">
        <span className="text-[#00ff41] text-xs tracking-widest font-bold">
          LIVE TRANSCRIPT
        </span>
        {/* Line count badge */}
        {stamped.length > 0 && (
          <span className="text-[#005510] text-xs tracking-wider">
            {stamped.length} LINE{stamped.length !== 1 ? 'S' : ''}
          </span>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {stamped.length === 0 ? (
          // Idle state — different message depending on call status
          <p className="text-[#005510] text-xs tracking-wider mt-2">
            {isConnected
              ? '▸ LISTENING... AWAITING VOICE INPUT'
              : '▸ AWAITING TRANSMISSION...'}
          </p>
        ) : (
          stamped.map((entry, i) => (
            <div key={i} className="flex gap-3 text-xs leading-relaxed">
              {/* Line number */}
              <span className="text-[#005510] select-none w-6 shrink-0 text-right">
                {String(i + 1).padStart(2, '0')}
              </span>
              {/* Timestamp */}
              <span className="text-[#005510] shrink-0 tracking-wider">
                [{entry.ts}]
              </span>
              {/* Transcript text */}
              <span className="text-[#00ff41] tracking-wide break-words min-w-0">
                {entry.text}
              </span>
            </div>
          ))
        )}
        {/* Invisible anchor — scrolled into view when new lines arrive */}
        <div ref={bottomRef} />
      </div>

      {/* ── Footer: blinking cursor while connected ── */}
      {isConnected && (
        <div className="px-3 py-1 border-t border-[#005510]">
          <span className="text-[#00ff41] text-xs animate-pulse">█</span>
        </div>
      )}
    </div>
  )
}

export default LiveTranscript
