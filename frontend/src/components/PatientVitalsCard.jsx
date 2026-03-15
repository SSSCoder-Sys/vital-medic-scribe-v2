// PatientVitalsCard.jsx — real-time patient vitals display.
//
// Renders the five vitals Nova Pro extracts from the transcript:
//   bp_systolic / bp_diastolic, heart_rate, oxygen_saturation, respiratory_rate
//
// Values are colored by clinical severity so abnormal readings stand out
// immediately — the same way a real patient monitor works.
//
// Props:
//   vitals — the vitals object from Dashboard state, or null before any data arrives.
//            Fields match the backend Vitals model (snake_case):
//            { bp_systolic, bp_diastolic, heart_rate, oxygen_saturation,
//              respiratory_rate, timestamp }

// ── Severity colors ──────────────────────────────────────────────────────────
// Returns a Tailwind text color class based on how far a value is from normal.

function bpColor(systolic) {
  if (systolic == null) return 'text-[#005510]'       // no data — muted
  if (systolic >= 180 || systolic < 80) return 'text-red-400'
  if (systolic >= 140 || systolic < 90) return 'text-amber-400'
  return 'text-[#00ff41]'
}

function hrColor(hr) {
  if (hr == null) return 'text-[#005510]'
  if (hr > 150 || hr < 40) return 'text-red-400'
  if (hr > 100 || hr < 60) return 'text-amber-400'
  return 'text-[#00ff41]'
}

function spo2Color(spo2) {
  if (spo2 == null) return 'text-[#005510]'
  if (spo2 < 90) return 'text-red-400'
  if (spo2 < 95) return 'text-amber-400'
  return 'text-[#00ff41]'
}

function rrColor(rr) {
  if (rr == null) return 'text-[#005510]'
  if (rr > 30 || rr < 8) return 'text-red-400'
  if (rr > 20 || rr < 12) return 'text-amber-400'
  return 'text-[#00ff41]'
}

// ── Readout sub-component ────────────────────────────────────────────────────
// One "tile" on the monitor: label at top, big value in the middle, unit below.

function Readout({ label, value, unit, colorClass }) {
  const hasValue = value !== null && value !== undefined

  return (
    <div className="flex flex-col items-center justify-center border border-[#005510] py-3 px-2">
      {/* Label */}
      <span className="text-[#005510] text-xs tracking-widest mb-1 text-center">
        {label}
      </span>

      {/* Big number */}
      <span className={`text-3xl font-bold tracking-tight leading-none ${hasValue ? colorClass : 'text-[#005510]'}`}>
        {hasValue ? value : '---'}
      </span>

      {/* Unit */}
      <span className="text-[#005510] text-xs tracking-wider mt-1">
        {unit}
      </span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

function PatientVitalsCard({ vitals }) {
  // Extract fields — all optional, default to null
  const sys  = vitals?.bp_systolic   ?? null
  const dia  = vitals?.bp_diastolic  ?? null
  const hr   = vitals?.heart_rate    ?? null
  const spo2 = vitals?.oxygen_saturation ?? null
  const rr   = vitals?.respiratory_rate  ?? null

  // Format BP as "120 / 80" or "--- / ---"
  const bpValue = (sys != null && dia != null)
    ? `${sys} / ${dia}`
    : (sys != null ? `${sys} / ---` : null)

  // Format SpO2 to one decimal place
  const spo2Value = spo2 != null ? spo2.toFixed(1) : null

  // Last-updated timestamp (from the vitals object itself)
  const updatedAt = vitals?.timestamp
    ? new Date(vitals.timestamp).toTimeString().slice(0, 8)
    : null

  return (
    <div className="border border-[#00ff41] flex flex-col h-72">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-[#005510]">
        <span className="text-[#00ff41] text-xs tracking-widest font-bold">
          PATIENT VITALS
        </span>
        {updatedAt && (
          <span className="text-[#005510] text-xs tracking-wider">
            UPDATED {updatedAt}
          </span>
        )}
      </div>

      {/* ── Vitals grid ── */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2 p-2">
        {/* Blood Pressure — spans full width of top row conceptually,
            but we split it into its own tile styled to show "SYS / DIA" */}
        <div className="flex flex-col items-center justify-center border border-[#005510] py-3 px-2">
          <span className="text-[#005510] text-xs tracking-widest mb-1">
            BLOOD PRESSURE
          </span>
          <span className={`text-3xl font-bold tracking-tight leading-none ${bpColor(sys)}`}>
            {bpValue ?? '--- / ---'}
          </span>
          <span className="text-[#005510] text-xs tracking-wider mt-1">
            mmHg (SYS / DIA)
          </span>
        </div>

        <Readout
          label="HEART RATE"
          value={hr}
          unit="bpm"
          colorClass={hrColor(hr)}
        />

        <Readout
          label="SpO₂"
          value={spo2Value}
          unit="%"
          colorClass={spo2Color(spo2)}
        />

        <Readout
          label="RESP RATE"
          value={rr}
          unit="br / min"
          colorClass={rrColor(rr)}
        />
      </div>

      {/* ── Footer: no-data hint ── */}
      {!vitals && (
        <div className="px-3 py-1 border-t border-[#005510]">
          <span className="text-[#005510] text-xs tracking-wider">
            ▸ AWAITING VITALS FROM NOVA PRO...
          </span>
        </div>
      )}
    </div>
  )
}

export default PatientVitalsCard
