// ProtocolChecklist.jsx — EMS protocol step tracker.
//
// Displays the active protocol checklist Nova Pro populates during a call.
// Each step can also be manually toggled by the paramedic — useful when
// a step is done verbally but not yet detected by the AI.
//
// Clicking a step:
//   1. Immediately flips the UI (optimistic update — no lag)
//   2. Persists to the backend via complete_step / uncomplete_step
//   3. Syncs state with the backend's authoritative response
//   4. On error, rolls back the optimistic flip
//
// Props:
//   checklist         — ProtocolChecklist object or null
//                       { incident_id, protocol_name, items: [{ step, completed, completed_at }] }
//   incidentId        — string, needed to call the toggle endpoints
//   onChecklistUpdate — (newChecklist) => void, called after a successful toggle

import { useState } from 'react'
import { completeStep, uncompleteStep } from '../services/api.js'

function ProtocolChecklist({ checklist, incidentId, onChecklistUpdate }) {
  // Track which steps are mid-flight so we can disable them during the request
  const [pending, setPending] = useState(new Set())

  async function handleToggle(item) {
    if (!incidentId) return
    if (pending.has(item.step)) return   // already in-flight

    const wasCompleted = item.completed

    // ── Optimistic update ──────────────────────────────────────────
    // Flip locally right away so the UI feels instant
    const optimistic = {
      ...checklist,
      items: checklist.items.map((i) =>
        i.step === item.step ? { ...i, completed: !wasCompleted } : i
      ),
    }
    onChecklistUpdate(optimistic)
    setPending((prev) => new Set(prev).add(item.step))

    // ── Backend call ───────────────────────────────────────────────
    try {
      const updated = wasCompleted
        ? await uncompleteStep(incidentId, item.step)
        : await completeStep(incidentId, item.step)
      // Replace optimistic state with backend's authoritative response
      onChecklistUpdate(updated)
    } catch {
      // Roll back on failure
      onChecklistUpdate(checklist)
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(item.step)
        return next
      })
    }
  }

  // ── Completion summary ─────────────────────────────────────────────────────
  const total     = checklist?.items?.length ?? 0
  const done      = checklist?.items?.filter((i) => i.completed).length ?? 0
  const allDone   = total > 0 && done === total

  return (
    <div className="border border-[#00ff41] flex flex-col h-72">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#005510]">
        <span className="text-[#00ff41] text-xs tracking-widest font-bold">
          PROTOCOL CHECKLIST
        </span>
        {checklist && (
          <span className={`text-xs tracking-wider ${allDone ? 'text-[#00ff41]' : 'text-[#005510]'}`}>
            {done}/{total} COMPLETE
          </span>
        )}
      </div>

      {/* ── Protocol name sub-header ── */}
      {checklist && (
        <div className="px-3 py-1 border-b border-[#005510]">
          <span className="text-amber-400 text-xs tracking-widest uppercase">
            ▸ {checklist.protocol_name}
          </span>
        </div>
      )}

      {/* ── Step list ── */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {!checklist ? (
          <p className="text-[#005510] text-xs tracking-wider mt-2 px-1">
            ▸ NO PROTOCOL ACTIVE
          </p>
        ) : (
          checklist.items.map((item, i) => {
            const inFlight = pending.has(item.step)
            return (
              <button
                key={i}
                onClick={() => handleToggle(item)}
                disabled={inFlight}
                className={`
                  w-full flex items-start gap-3 px-2 py-2 text-left
                  border-b border-[#005510] last:border-b-0
                  transition-colors
                  ${inFlight ? 'opacity-50 cursor-wait' : 'hover:bg-[#0d1a0d] cursor-pointer'}
                `}
              >
                {/* Status icon */}
                <span className={`
                  shrink-0 text-sm font-bold leading-none mt-px w-4 text-center
                  ${item.completed ? 'text-[#00ff41]' : 'text-red-900'}
                `}>
                  {inFlight ? '…' : item.completed ? '✓' : '✗'}
                </span>

                {/* Step text */}
                <span className={`
                  text-xs tracking-wide leading-relaxed
                  ${item.completed ? 'text-[#005510] line-through' : 'text-[#00ff41]'}
                `}>
                  {item.step}
                </span>
              </button>
            )
          })
        )}
      </div>

      {/* ── Footer: all done banner ── */}
      {allDone && (
        <div className="px-3 py-1 border-t border-[#00ff41]">
          <span className="text-[#00ff41] text-xs tracking-widest font-bold">
            ✓ ALL STEPS COMPLETE
          </span>
        </div>
      )}
    </div>
  )
}

export default ProtocolChecklist
