// Shared step labels for the whole add-website journey — split out so AddWebsiteFlow and
// Wizard can both import them without importing each other (that circular import was
// crashing Turbopack with a TDZ ReferenceError).
export const PHASE_LABELS = ["Website", "Pages", "Crawling"];
export const WIZARD_STEP_LABELS = ["Instructions", "Logo", "Widget", "Guardrails", "Review"];
export const ALL_STEPS = [...PHASE_LABELS, ...WIZARD_STEP_LABELS];
