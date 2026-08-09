// SPIE — ScorgIA Pedagogical Intelligence Engine
// Root export — import from here in application code.
//
// Architecture: src/lib/spie/docs/Architecture.md
// Blueprint: docs/SPIE/SPIE_Blueprint.md

// Domain types
export type * from './types'

// Engines (all stubs in SPIE-01; implemented in SPIE-02 through SPIE-07)
export * from './engines'

// Pipeline state machine
export * from './pipeline'

// Validators
export * from './validators'

// SPIE-02: Curriculum Intelligence Engine (CKG)
export * from './curriculum'

// SPIE-03: Pedagogical Context Engine (PCE)
// Mandatory entry point for ALL AI generation
export * from './pce'

// SPIE-04: Academic Year Digital Twin Engine (AYDTE)
export * from './aydte'

// SPIE-05: Pedagogical Planning Simulator (PPS)
// Simulates feasibility BEFORE any document generation
export * from './pps'

// SPIE-06: Pedagogical Time Engine (PTE)
// Time is the teacher's primary resource — tracks it at every granularity
export * from './pte'

// SPIE-07: Pedagogical Strategy Engine (PSE)
// Synthesizes all SPIE data into a coherent pedagogical strategy
export * from './pse'

// Engine singletons (lazy init pattern — actual implementation in SPIE-02+)
export { ckg } from './engines/ckg/ckg-engine'
export { ppe } from './engines/ppe/ppe-engine'
export { pge } from './engines/pge/pge-engine'
export { tqe } from './engines/tqe/tqe-engine'
export { lce } from './engines/lce/lce-engine'
export { pae } from './engines/pae/pae-engine'
export { spiePipeline } from './pipeline/spie-pipeline'
