// Hiérarchie z-index centralisée — modifier ICI, pas en dur dans les composants.
// Ordre croissant = priorité visuelle croissante.

export const Z = {
  contenu_normal:       1,
  sidebar:             10,
  topbar:              20,
  bouton_flottant:     50,   // OutilsFlottant — doit rester SOUS les modals
  panel_flottant:      49,
  dropdown:            60,
  toast:              950,   // toujours au-dessus de tout sauf CadenasForFait
  modal_overlay:      800,
  modal_contenu:      900,
  cadenas_overlay:        1000,
  cadenas_contenu:        1001,
  banniere_impersonation: 1100, // toujours visible, même au-dessus du cadenas
} as const

export type ZKey = keyof typeof Z
