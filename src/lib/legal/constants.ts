// Single source of truth for legal document versions — update here only.

export const LEGAL_VERSIONS = {
  terms:   '1.0',
  privacy: '1.0',
  trust:   '1.0',
} as const

export const LEGAL_DATES = {
  terms:   '2026-08-21',
  privacy: '2026-08-21',
  trust:   '2026-08-21',
} as const

export const LEGAL_LABELS = {
  terms:   'Conditions d\'utilisation — ScorgIA',
  privacy: 'Politique de confidentialité — ScorgIA',
  trust:   'Centre de confiance — ScorgIA',
} as const

export const COMPANY = {
  name:     'Bodingo AI Tech Inc.',
  country:  'Canada',
  product:  'ScorgIA',
  tagline:  'ScorgIA est une plateforme détenue et exploitée par Bodingo AI Tech Inc.',
} as const

// Placeholders — must be resolved before broader public launch (L1)
export const LEGAL_PLACEHOLDERS = {
  privacyEmail:      '[À publier avant l\'ouverture générale — coordonnées du responsable de la protection des renseignements personnels]',
  supportEmail:      '[À publier avant l\'ouverture générale — adresse de support]',
  privacyOfficer:    '[Responsable de la protection des renseignements personnels — titre et coordonnées à publier]',
  governingLaw:      '[Province/territoire à confirmer avec le conseiller juridique]',
  legalAddress:      '[Adresse du siège social à publier]',
} as const
