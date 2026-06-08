// ─── KlassIA+ — Schémas SVG Géographie ───────────────────────────────────────
import type { SchemaItem } from './index'

export const GEOGRAPHIE_SCHEMAS: SchemaItem[] = [
  {
    id: 'geo-rose-vents',
    titre: 'Rose des vents',
    categorie: 'geographie',
    toSvg: (opts = {}) => {
      const L = { N: 'N', S: 'S', E: 'E', O: 'O', NE: 'NE', NO: 'NO', SE: 'SE', SO: 'SO', ...opts.labels }
      const C = { primary: '#60A5FA', secondary: 'rgba(96,165,250,0.6)', ring: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.9)', textSecond: 'rgba(255,255,255,0.55)', ...opts.colors }
      const cx = 110, cy = 110, r = 90
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" style="font-family:system-ui,sans-serif">
  <!-- Cercles de référence -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ring}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="none" stroke="${C.ring}" stroke-width="1"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="rgba(96,165,250,0.1)" stroke="${C.primary}" stroke-width="1.5"/>
  <!-- Axes cardinaux -->
  <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${C.ring}" stroke-width="1"/>
  <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.ring}" stroke-width="1"/>
  <!-- Diagonales -->
  <line x1="${cx - r * 0.707}" y1="${cy - r * 0.707}" x2="${cx + r * 0.707}" y2="${cy + r * 0.707}" stroke="${C.ring}" stroke-width="0.8" stroke-dasharray="3,3"/>
  <line x1="${cx + r * 0.707}" y1="${cy - r * 0.707}" x2="${cx - r * 0.707}" y2="${cy + r * 0.707}" stroke="${C.ring}" stroke-width="0.8" stroke-dasharray="3,3"/>
  <!-- Flèche Nord (principale) -->
  <polygon points="${cx},${cy - r + 10} ${cx - 12},${cy} ${cx},${cy - 18} ${cx + 12},${cy}" fill="${C.primary}"/>
  <polygon points="${cx},${cy + 18} ${cx - 12},${cy} ${cx},${cy + r - 10} ${cx + 12},${cy}" fill="${C.secondary}"/>
  <polygon points="${cx - 18},${cy} ${cx},${cy - 12} ${cx},${cy + 12} ${cx - r + 10},${cy}" fill="${C.secondary}"/>
  <polygon points="${cx + 18},${cy} ${cx},${cy - 12} ${cx},${cy + 12} ${cx + r - 10},${cy}" fill="${C.secondary}"/>
  <!-- Flèches intercardinalles (petites) -->
  <polygon points="${cx},${cy - 14} ${cx - 7},${cy} ${cx + 7},${cy}" fill="${C.primary}" transform="rotate(45,${cx},${cy})"/>
  <polygon points="${cx},${cy - 14} ${cx - 7},${cy} ${cx + 7},${cy}" fill="${C.primary}" transform="rotate(-45,${cx},${cy})"/>
  <polygon points="${cx},${cy - 14} ${cx - 7},${cy} ${cx + 7},${cy}" fill="${C.primary}" transform="rotate(135,${cx},${cy})"/>
  <polygon points="${cx},${cy - 14} ${cx - 7},${cy} ${cx + 7},${cy}" fill="${C.primary}" transform="rotate(-135,${cx},${cy})"/>
  <!-- Labels cardinaux -->
  <text x="${cx}" y="${cy - r + 4}" text-anchor="middle" font-size="14" font-weight="bold" fill="${C.primary}">${L.N}</text>
  <text x="${cx}" y="${cy + r + 14}" text-anchor="middle" font-size="12" fill="${C.text}">${L.S}</text>
  <text x="${cx + r + 12}" y="${cy + 4}" text-anchor="start" font-size="12" fill="${C.text}">${L.E}</text>
  <text x="${cx - r - 12}" y="${cy + 4}" text-anchor="end" font-size="12" fill="${C.text}">${L.O}</text>
  <!-- Labels intercardinalles -->
  <text x="${cx + 60}" y="${cy - 58}" font-size="9" fill="${C.textSecond}">${L.NE}</text>
  <text x="${cx - 72}" y="${cy - 58}" font-size="9" fill="${C.textSecond}">${L.NO}</text>
  <text x="${cx + 60}" y="${cy + 66}" font-size="9" fill="${C.textSecond}">${L.SE}</text>
  <text x="${cx - 72}" y="${cy + 66}" font-size="9" fill="${C.textSecond}">${L.SO}</text>
</svg>`
    },
  },

  {
    id: 'geo-cycle-eau',
    titre: "Cycle de l'eau",
    categorie: 'geographie',
    toSvg: (opts = {}) => {
      const L = { evaporation: 'Évaporation', condensation: 'Condensation', precipitation: 'Précipitation', ruissellement: 'Ruissellement', infiltration: 'Infiltration', transpiration: 'Transpiration', ...opts.labels }
      const C = { water: '#60A5FA', cloud: 'rgba(255,255,255,0.6)', sun: '#FBC34A', mountain: 'rgba(255,255,255,0.25)', arrow: '#34D399', text: 'rgba(255,255,255,0.8)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220" style="font-family:system-ui,sans-serif">
  <!-- Ciel -->
  <rect x="0" y="0" width="360" height="220" fill="rgba(15,25,50,0)" rx="0"/>
  <!-- Mer/Lac (bas) -->
  <path d="M0,170 Q45,160 90,170 Q135,180 180,170 Q225,160 270,170 Q315,180 360,170 L360,220 L0,220 Z" fill="rgba(96,165,250,0.25)" stroke="${C.water}" stroke-width="1.5"/>
  <text x="180" y="200" text-anchor="middle" font-size="9" fill="${C.water}">Océan / Lac / Rivière</text>
  <!-- Montagne (gauche) -->
  <polygon points="20,165 70,80 120,165" fill="${C.mountain}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
  <polygon points="35,165 75,90 80,100 60,130 80,165" fill="rgba(255,255,255,0.08)"/>
  <!-- Sol (vert) -->
  <rect x="0" y="163" width="360" height="8" fill="rgba(52,211,153,0.12)" stroke="none"/>
  <!-- Soleil -->
  <circle cx="320" cy="35" r="22" fill="rgba(251,195,74,0.2)" stroke="${C.sun}" stroke-width="2"/>
  <text x="320" y="40" text-anchor="middle" font-size="14" fill="${C.sun}">☀</text>
  <!-- Nuage -->
  <ellipse cx="190" cy="55" rx="50" ry="26" fill="rgba(255,255,255,0.12)" stroke="${C.cloud}" stroke-width="1.5"/>
  <ellipse cx="165" cy="62" rx="36" ry="20" fill="rgba(255,255,255,0.1)" stroke="${C.cloud}" stroke-width="1.5"/>
  <ellipse cx="218" cy="62" rx="38" ry="20" fill="rgba(255,255,255,0.1)" stroke="${C.cloud}" stroke-width="1.5"/>
  <text x="190" y="50" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.7)">${L.condensation}</text>
  <!-- Flèches évaporation (monte) -->
  <path d="M150,160 Q145,120 155,80" fill="none" stroke="${C.arrow}" stroke-width="1.8" stroke-dasharray="4,3" marker-end="url(#ae)"/>
  <text x="118" y="130" font-size="8" fill="${C.arrow}">${L.evaporation}</text>
  <!-- Flèches précipitation (descend) -->
  <path d="M175,82 L165,140" fill="none" stroke="${C.water}" stroke-width="1.5" marker-end="url(#ap2)"/>
  <path d="M192,82 L192,140" fill="none" stroke="${C.water}" stroke-width="1.5" marker-end="url(#ap2)"/>
  <path d="M209,82 L219,140" fill="none" stroke="${C.water}" stroke-width="1.5" marker-end="url(#ap2)"/>
  <text x="240" y="120" font-size="8" fill="${C.water}">${L.precipitation}</text>
  <!-- Ruissellement -->
  <path d="M110,162 Q140,158 160,163" fill="none" stroke="${C.water}" stroke-width="1.8" marker-end="url(#ap2)"/>
  <text x="112" y="155" font-size="8" fill="${C.water}">${L.ruissellement}</text>
  <!-- Infiltration -->
  <path d="M240,162 L238,178" fill="none" stroke="${C.arrow}" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#ae)"/>
  <text x="245" y="175" font-size="8" fill="${C.arrow}">${L.infiltration}</text>
  <!-- Transpiration -->
  <path d="M80,155 Q78,120 100,85" fill="none" stroke="${C.arrow}" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#ae)"/>
  <text x="50" y="120" font-size="7.5" fill="${C.arrow}">${L.transpiration}</text>
  <defs>
    <marker id="ae"  viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.arrow}"/></marker>
    <marker id="ap2" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.water}"/></marker>
  </defs>
</svg>`
    },
  },

  {
    id: 'geo-coupe-geologique',
    titre: 'Coupe géologique',
    categorie: 'geographie',
    toSvg: (opts = {}) => {
      const L = { sol: 'Sol (humus)', calcaire: 'Calcaire', argile: 'Argile', gres: 'Grès', granite: 'Granite', faille: 'Faille', fossil: 'Fossile', ...opts.labels }
      const C = { sol: '#92400E', calcaire: '#94A3B8', argile: '#6B7280', gres: '#D97706', granite: '#374151', fault: '#F87171', text: 'rgba(255,255,255,0.85)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" style="font-family:system-ui,sans-serif">
  <!-- Couches géologiques -->
  <rect x="10" y="20" width="270" height="24" rx="2" fill="rgba(146,64,14,0.35)" stroke="${C.sol}" stroke-width="1.5"/>
  <rect x="10" y="44" width="270" height="32" rx="1" fill="rgba(148,163,184,0.20)" stroke="${C.calcaire}" stroke-width="1.5"/>
  <rect x="10" y="76" width="270" height="28" rx="1" fill="rgba(107,114,128,0.30)" stroke="${C.argile}" stroke-width="1.5"/>
  <rect x="10" y="104" width="270" height="34" rx="1" fill="rgba(217,119,6,0.20)" stroke="${C.gres}" stroke-width="1.5"/>
  <rect x="10" y="138" width="270" height="40" rx="1" fill="rgba(55,65,81,0.50)" stroke="${C.granite}" stroke-width="1.5"/>
  <!-- Hachures texture granite -->
  <line x1="20" y1="148" x2="40" y2="168" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="50" y1="148" x2="70" y2="168" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="100" y1="148" x2="120" y2="168" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="150" y1="148" x2="170" y2="168" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <line x1="200" y1="148" x2="220" y2="168" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
  <!-- Faille (diagonale) -->
  <line x1="155" y1="10" x2="145" y2="185" stroke="${C.fault}" stroke-width="2.5" stroke-dasharray="6,3"/>
  <!-- Décalage des couches à la faille -->
  <line x1="155" y1="44" x2="280" y2="44" stroke="rgba(255,255,255,0.05)" stroke-width="12"/>
  <!-- Fossile (ammonite schématique) -->
  <circle cx="110" cy="60" r="7" fill="none" stroke="${C.calcaire}" stroke-width="1.5" opacity="0.7"/>
  <path d="M110,60 Q115,53 110,53 Q103,53 103,60 Q103,67 110,67" fill="none" stroke="${C.calcaire}" stroke-width="1" opacity="0.7"/>
  <!-- Labels -->
  <text x="295" y="35" font-size="8.5" fill="${C.sol}">${L.sol}</text>
  <text x="295" y="64" font-size="8.5" fill="${C.calcaire}">${L.calcaire}</text>
  <text x="295" y="95" font-size="8.5" fill="${C.argile}">${L.argile}</text>
  <text x="295" y="126" font-size="8.5" fill="${C.gres}">${L.gres}</text>
  <text x="295" y="162" font-size="8.5" fill="rgba(255,255,255,0.5)">${L.granite}</text>
  <text x="160" y="12" font-size="7.5" fill="${C.fault}">${L.faille}</text>
  <text x="90" y="78" font-size="7.5" fill="${C.calcaire}">${L.fossil}</text>
</svg>`
    },
  },
]
