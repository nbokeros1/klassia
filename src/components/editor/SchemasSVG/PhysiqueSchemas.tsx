// ─── KlassIA+ — Schémas SVG Physique ─────────────────────────────────────────
'use client'
import React from 'react'
import type { SchemaItem } from './index'
import type { SchemaProps } from './types'

export const PHYSIQUE_SCHEMAS: SchemaItem[] = [
  {
    id: 'phy-circuit',
    titre: 'Circuit électrique',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { pile: 'Pile', resistance: 'Résistance', interrupteur: 'Interrupteur', ampoule: 'Ampoule', ...opts.labels }
      const C = { wire: '#60A5FA', positive: '#34D399', negative: '#F87171', symbol: '#FBC34A', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" style="font-family:system-ui,sans-serif">
  <!-- Fils (rectangle) -->
  <polyline points="40,60 40,160 280,160 280,60 40,60" fill="none" stroke="${C.wire}" stroke-width="2.5"/>
  <!-- Pile (gauche, vertical) -->
  <line x1="40" y1="88" x2="40" y2="132" stroke="transparent" stroke-width="0"/>
  <line x1="28" y1="95" x2="52" y2="95" stroke="${C.wire}" stroke-width="3.5"/>
  <line x1="33" y1="108" x2="47" y2="108" stroke="${C.wire}" stroke-width="2"/>
  <line x1="28" y1="120" x2="52" y2="120" stroke="${C.wire}" stroke-width="3.5"/>
  <line x1="33" y1="133" x2="47" y2="133" stroke="${C.wire}" stroke-width="2"/>
  <text x="58" y="100" font-size="9" fill="${C.positive}">+</text>
  <text x="58" y="136" font-size="9" fill="${C.negative}">−</text>
  <text x="65" y="116" font-size="8.5" fill="${C.symbol}">${L.pile}</text>
  <!-- Résistance (haut) -->
  <polyline points="90,60 100,45 115,75 130,45 145,75 160,45 175,75 190,60" fill="none" stroke="${C.wire}" stroke-width="2.5"/>
  <text x="140" y="32" text-anchor="middle" font-size="9" fill="${C.symbol}">${L.resistance}</text>
  <!-- Interrupteur (droite) -->
  <circle cx="280" cy="95" r="4" fill="${C.wire}"/>
  <circle cx="280" cy="125" r="4" fill="${C.wire}"/>
  <line x1="280" y1="95" x2="296" y2="108" stroke="${C.wire}" stroke-width="2.5"/>
  <text x="298" y="114" font-size="8.5" fill="${C.symbol}">${L.interrupteur}</text>
  <!-- Ampoule (bas) -->
  <circle cx="160" cy="160" r="18" fill="rgba(251,195,74,0.1)" stroke="${C.wire}" stroke-width="2"/>
  <line x1="152" y1="152" x2="168" y2="168" stroke="${C.symbol}" stroke-width="2"/>
  <line x1="168" y1="152" x2="152" y2="168" stroke="${C.symbol}" stroke-width="2"/>
  <text x="160" y="192" text-anchor="middle" font-size="9" fill="${C.symbol}">${L.ampoule}</text>
  <!-- Flèche courant -->
  <path d="M200,57 L220,57" stroke="${C.positive}" stroke-width="1.5" marker-end="url(#arr)"/>
  <defs><marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.positive}"/></marker></defs>
  <text x="210" y="52" text-anchor="middle" font-size="7.5" fill="${C.positive}">I</text>
</svg>`
    },
  },

  {
    id: 'phy-forces',
    titre: 'Diagramme de forces',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { poids: 'P = mg', normale: 'N', force: 'F', frottement: 'f', objet: 'Objet', ...opts.labels }
      const C = { poids: '#F87171', normale: '#60A5FA', force: '#34D399', frottement: '#FBC34A', box: 'rgba(255,255,255,0.1)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220" style="font-family:system-ui,sans-serif">
  <!-- Sol -->
  <line x1="40" y1="150" x2="260" y2="150" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <line x1="40" y1="152" x2="260" y2="152" stroke="rgba(255,255,255,0.1)" stroke-width="3" stroke-dasharray="5,5"/>
  <!-- Objet (boîte) -->
  <rect x="108" y="104" width="84" height="46" rx="4" fill="${C.box}" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
  <text x="150" y="132" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.7)">${L.objet}</text>
  <!-- Poids ↓ -->
  <line x1="150" y1="150" x2="150" y2="198" stroke="${C.poids}" stroke-width="2.5" marker-end="url(#ap)"/>
  <text x="162" y="185" font-size="9" fill="${C.poids}">${L.poids}</text>
  <!-- Normale ↑ -->
  <line x1="150" y1="104" x2="150" y2="48" stroke="${C.normale}" stroke-width="2.5" marker-end="url(#an)"/>
  <text x="155" y="70" font-size="9" fill="${C.normale}">${L.normale}</text>
  <!-- Force appliquée → -->
  <line x1="192" y1="127" x2="252" y2="127" stroke="${C.force}" stroke-width="2.5" marker-end="url(#af)"/>
  <text x="238" y="120" font-size="9" fill="${C.force}">${L.force}</text>
  <!-- Frottement ← -->
  <line x1="108" y1="127" x2="50" y2="127" stroke="${C.frottement}" stroke-width="2.5" marker-end="url(#afr)"/>
  <text x="56" y="120" font-size="9" fill="${C.frottement}">${L.frottement}</text>
  <!-- Angle droit -->
  <rect x="150" y="143" width="7" height="7" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <defs>
    <marker id="ap" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.poids}"/></marker>
    <marker id="an" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.normale}"/></marker>
    <marker id="af" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.force}"/></marker>
    <marker id="afr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.frottement}"/></marker>
  </defs>
</svg>`
    },
  },

  {
    id: 'phy-spectre',
    titre: 'Spectre électromagnétique',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { titre: 'Spectre électromagnétique', gamma: 'Rayons γ', rx: 'Rayons X', uv: 'UV', visible: 'Visible', ir: 'IR', micro: 'Micro', radio: 'Radio', ...opts.labels }
      const segments = [
        { label: L.gamma,   color: '#C084FC', x: 20  },
        { label: L.rx,      color: '#818CF8', x: 68  },
        { label: L.uv,      color: '#60A5FA', x: 116 },
        { label: L.visible, color: '#34D399', x: 164 },
        { label: L.ir,      color: '#FBC34A', x: 212 },
        { label: L.micro,   color: '#F97316', x: 260 },
        { label: L.radio,   color: '#F87171', x: 308 },
      ]
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 160" style="font-family:system-ui,sans-serif">
  <text x="190" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="rgba(255,255,255,0.85)">${L.titre}</text>
  <defs>
    <linearGradient id="spectrum" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="#C084FC"/>
      <stop offset="17%"  stop-color="#818CF8"/>
      <stop offset="33%"  stop-color="#60A5FA"/>
      <stop offset="48%"  stop-color="#34D399"/>
      <stop offset="65%"  stop-color="#FBC34A"/>
      <stop offset="82%"  stop-color="#F97316"/>
      <stop offset="100%" stop-color="#F87171"/>
    </linearGradient>
  </defs>
  <rect x="10" y="70" width="360" height="28" rx="4" fill="url(#spectrum)"/>
  ${segments.map((s, i) => `<line x1="${s.x + 24}" y1="70" x2="${s.x + 24}" y2="64" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <text x="${s.x + 24}" y="58" text-anchor="middle" font-size="7.5" fill="${s.color}">${s.label}</text>`).join('\n  ')}
  <text x="10" y="118" font-size="8" fill="rgba(255,255,255,0.5)">λ grande (km→m)</text>
  <text x="370" y="118" text-anchor="end" font-size="8" fill="rgba(255,255,255,0.5)">λ petite (pm→fm)</text>
  <text x="10" y="132" font-size="8" fill="rgba(255,255,255,0.35)">ν basse — f croissante →</text>
  <text x="370" y="132" text-anchor="end" font-size="8" fill="rgba(255,255,255,0.35)">ν haute</text>
  <text x="10" y="148" font-size="7.5" fill="rgba(255,255,255,0.25)">E faible</text>
  <text x="370" y="148" text-anchor="end" font-size="7.5" fill="rgba(255,255,255,0.25)">E élevée</text>
</svg>`
    },
  },

  // ── Circuit parallèle ────────────────────────────────────────────────────
  {
    id: 'phy-circuit-parallele',
    titre: 'Circuit parallèle',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { pile: 'Pile', branche1: 'Résistance 1', branche2: 'Résistance 2', noeud: 'Nœud', ...opts.labels }
      const C = { wire: '#60A5FA', node: '#34D399', symbol: '#FBC34A', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" style="font-family:system-ui,sans-serif">
  <!-- Fil principal gauche (pile) -->
  <polyline points="40,40 40,160" fill="none" stroke="${C.wire}" stroke-width="2.5"/>
  <!-- Pile -->
  <line x1="28" y1="85" x2="52" y2="85" stroke="${C.wire}" stroke-width="3.5"/>
  <line x1="33" y1="98" x2="47" y2="98" stroke="${C.wire}" stroke-width="2"/>
  <line x1="28" y1="110" x2="52" y2="110" stroke="${C.wire}" stroke-width="3.5"/>
  <line x1="33" y1="123" x2="47" y2="123" stroke="${C.wire}" stroke-width="2"/>
  <!-- Nœuds gauches -->
  <circle cx="40" cy="40" r="5" fill="${C.node}"/>
  <circle cx="40" cy="160" r="5" fill="${C.node}"/>
  <!-- Rails horizontaux -->
  <line x1="40" y1="40" x2="280" y2="40" stroke="${C.wire}" stroke-width="2.5"/>
  <line x1="40" y1="160" x2="280" y2="160" stroke="${C.wire}" stroke-width="2.5"/>
  <!-- Branche 1 : résistance -->
  <line x1="120" y1="40" x2="120" y2="68" stroke="${C.wire}" stroke-width="2"/>
  <polyline points="120,68 110,80 130,92 110,104 130,116 110,128 120,132" fill="none" stroke="${C.wire}" stroke-width="2.5"/>
  <line x1="120" y1="132" x2="120" y2="160" stroke="${C.wire}" stroke-width="2"/>
  <circle cx="120" cy="40" r="4" fill="${C.node}"/>
  <circle cx="120" cy="160" r="4" fill="${C.node}"/>
  <text x="136" y="102" font-size="8.5" fill="${C.symbol}">${L.branche1}</text>
  <!-- Branche 2 : résistance + ampoule -->
  <line x1="220" y1="40" x2="220" y2="68" stroke="${C.wire}" stroke-width="2"/>
  <circle cx="220" cy="90" r="18" fill="rgba(251,195,74,0.08)" stroke="${C.wire}" stroke-width="2"/>
  <line x1="213" y1="83" x2="227" y2="97" stroke="${C.symbol}" stroke-width="2"/>
  <line x1="227" y1="83" x2="213" y2="97" stroke="${C.symbol}" stroke-width="2"/>
  <line x1="220" y1="108" x2="220" y2="160" stroke="${C.wire}" stroke-width="2"/>
  <circle cx="220" cy="40" r="4" fill="${C.node}"/>
  <circle cx="220" cy="160" r="4" fill="${C.node}"/>
  <text x="236" y="94" font-size="8.5" fill="${C.symbol}">${L.branche2}</text>
  <text x="60" y="105" font-size="8.5" fill="${C.symbol}">${L.pile}</text>
  <text x="120" y="180" text-anchor="middle" font-size="7.5" fill="${C.node}">${L.noeud}</text>
</svg>`
    },
  },

  // ── Onde sinusoïdale ─────────────────────────────────────────────────────
  {
    id: 'phy-onde-sinusoide',
    titre: 'Onde sinusoïdale',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { amplitude: 'A', longueur: 'λ', titre: 'Onde sinusoïdale', ...opts.labels }
      const C = { onde: '#60A5FA', axis: 'rgba(255,255,255,0.4)', annot: '#FBC34A', ...opts.colors }
      const cy = 80, amp = 40, W = 340
      const pts = Array.from({ length: 200 }, (_, i) => {
        const x = 20 + (i / 199) * W
        const y = cy - amp * Math.sin((i / 199) * 4 * Math.PI)
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 160" style="font-family:system-ui,sans-serif">
  <text x="190" y="14" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  <line x1="10" y1="${cy}" x2="${20 + W + 10}" y2="${cy}" stroke="${C.axis}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <path d="${pts}" fill="none" stroke="${C.onde}" stroke-width="2.5"/>
  <line x1="20" y1="${cy - amp - 8}" x2="20" y2="${cy + amp + 8}" stroke="${C.annot}" stroke-width="1" stroke-dasharray="3,2"/>
  <line x1="20" y1="${cy - amp}" x2="105" y2="${cy - amp}" stroke="${C.annot}" stroke-width="1" stroke-dasharray="2,2"/>
  <line x1="105" y1="${cy - amp - 8}" x2="105" y2="${cy + amp + 8}" stroke="${C.annot}" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="20" y="${cy + amp + 20}" font-size="9" fill="${C.annot}">← λ →</text>
  <line x1="360" y1="${cy}" x2="360" y2="${cy - amp}" stroke="${C.annot}" stroke-width="1.5"/>
  <text x="364" y="${cy - amp / 2}" font-size="9" fill="${C.annot}">${L.amplitude}</text>
  <text x="10" y="${cy + 4}" text-anchor="end" font-size="9" fill="${C.axis}">0</text>
</svg>`
    },
  },

  // ── Plan incliné ─────────────────────────────────────────────────────────
  {
    id: 'phy-plan-incline',
    titre: 'Plan incliné + forces',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { poids: 'P', normale: 'N', tang: 'P∥', angle: 'θ = 30°', ...opts.labels }
      const C = { plan: '#60A5FA', poids: '#F87171', normale: '#34D399', tang: '#FBC34A', ...opts.colors }
      const angle = Math.PI / 6
      const ox = 80, oy = 180
      const px = ox + 180 * Math.cos(angle), py = oy - 180 * Math.sin(angle)
      const bx = ox + 100 * Math.cos(angle), by = oy - 100 * Math.sin(angle)
      const normalX = -Math.sin(angle), normalY = -Math.cos(angle)
      const tangX = Math.cos(angle), tangY = -Math.sin(angle)
      const pLen = 60, nLen = 55, tLen = 40
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" style="font-family:system-ui,sans-serif">
  <defs>
    <marker id="mp" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.poids}"/></marker>
    <marker id="mn" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.normale}"/></marker>
    <marker id="mt" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.tang}"/></marker>
  </defs>
  <!-- Sol -->
  <line x1="${ox - 10}" y1="${oy}" x2="${ox + 220}" y2="${oy}" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <!-- Plan incliné -->
  <polygon points="${ox},${oy} ${px.toFixed(0)},${py.toFixed(0)} ${px.toFixed(0)},${oy}" fill="rgba(96,165,250,0.06)" stroke="${C.plan}" stroke-width="2"/>
  <!-- Angle θ -->
  <path d="M${ox + 35},${oy} Q${ox + 30},${oy - 18} ${(ox + 30 * Math.cos(angle)).toFixed(0)},${(oy - 30 * Math.sin(angle)).toFixed(0)}" fill="none" stroke="${C.plan}" stroke-width="1.2"/>
  <text x="${ox + 38}" y="${oy - 10}" font-size="8" fill="${C.plan}">${L.angle}</text>
  <!-- Objet (carré sur le plan) -->
  <rect x="${(bx - 16).toFixed(0)}" y="${(by - 12).toFixed(0)}" width="20" height="16" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" transform="rotate(${(-angle * 180 / Math.PI).toFixed(1)},${bx.toFixed(0)},${by.toFixed(0)})"/>
  <!-- Poids ↓ -->
  <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${(by + pLen).toFixed(1)}" stroke="${C.poids}" stroke-width="2.5" marker-end="url(#mp)"/>
  <text x="${(bx + 4).toFixed(0)}" y="${(by + pLen * 0.6).toFixed(0)}" font-size="9" fill="${C.poids}">${L.poids}</text>
  <!-- Normale ⊥ plan -->
  <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx + normalX * nLen).toFixed(1)}" y2="${(by + normalY * nLen).toFixed(1)}" stroke="${C.normale}" stroke-width="2.5" marker-end="url(#mn)"/>
  <text x="${(bx + normalX * nLen + 4).toFixed(0)}" y="${(by + normalY * nLen + 4).toFixed(0)}" font-size="9" fill="${C.normale}">${L.normale}</text>
  <!-- Tangentielle (descend le plan) -->
  <line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${(bx - tangX * tLen).toFixed(1)}" y2="${(by - tangY * tLen).toFixed(1)}" stroke="${C.tang}" stroke-width="2.5" marker-end="url(#mt)"/>
  <text x="${(bx - tangX * tLen - 20).toFixed(0)}" y="${(by - tangY * tLen - 4).toFixed(0)}" font-size="9" fill="${C.tang}">${L.tang}</text>
</svg>`
    },
  },

  {
    id: 'phy-optique',
    titre: 'Réflexion et réfraction',
    categorie: 'physique',
    toSvg: (opts = {}) => {
      const L = { incident: 'Rayon incident', reflechi: 'Rayon réfléchi', refracte: 'Rayon réfracté', surface: 'Surface / Interface', milieu1: 'Milieu 1 (n₁)', milieu2: 'Milieu 2 (n₂)', ...opts.labels }
      const C = { incident: '#60A5FA', reflechi: '#34D399', refracte: '#F87171', surface: 'rgba(255,255,255,0.4)', normal: 'rgba(255,255,255,0.25)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" style="font-family:system-ui,sans-serif">
  <!-- Surface -->
  <line x1="20" y1="100" x2="280" y2="100" stroke="${C.surface}" stroke-width="2"/>
  <!-- Labels milieux -->
  <text x="14" y="60" font-size="9" fill="rgba(255,255,255,0.5)">${L.milieu1}</text>
  <text x="14" y="160" font-size="9" fill="rgba(255,255,255,0.5)">${L.milieu2}</text>
  <!-- Normale (pointillé vertical) -->
  <line x1="150" y1="20" x2="150" y2="180" stroke="${C.normal}" stroke-width="1.5" stroke-dasharray="5,4"/>
  <!-- Rayon incident (vient de gauche-haut) -->
  <line x1="60" y1="30" x2="150" y2="100" stroke="${C.incident}" stroke-width="2.5" marker-end="url(#ai)"/>
  <text x="80" y="52" font-size="8.5" fill="${C.incident}">${L.incident}</text>
  <!-- Rayon réfléchi (va vers droite-haut) -->
  <line x1="150" y1="100" x2="240" y2="30" stroke="${C.reflechi}" stroke-width="2.5" marker-end="url(#ar)"/>
  <text x="208" y="52" font-size="8.5" fill="${C.reflechi}">${L.reflechi}</text>
  <!-- Rayon réfracté (va vers bas, angle différent) -->
  <line x1="150" y1="100" x2="210" y2="185" stroke="${C.refracte}" stroke-width="2.5" marker-end="url(#afr2)"/>
  <text x="190" y="178" font-size="8.5" fill="${C.refracte}">${L.refracte}</text>
  <!-- Angles -->
  <path d="M150,100 Q130,80 118,80" fill="none" stroke="${C.incident}" stroke-width="1" opacity="0.6"/>
  <text x="113" y="79" font-size="8" fill="${C.incident}">θ₁</text>
  <path d="M150,100 Q170,80 182,80" fill="none" stroke="${C.reflechi}" stroke-width="1" opacity="0.6"/>
  <text x="183" y="79" font-size="8" fill="${C.reflechi}">θᵣ</text>
  <path d="M150,100 Q168,120 175,128" fill="none" stroke="${C.refracte}" stroke-width="1" opacity="0.6"/>
  <text x="176" y="133" font-size="8" fill="${C.refracte}">θ₂</text>
  <!-- Surface label -->
  <text x="150" y="115" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.35)">${L.surface}</text>
  <defs>
    <marker id="ai"   viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.incident}"/></marker>
    <marker id="ar"   viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.reflechi}"/></marker>
    <marker id="afr2" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.refracte}"/></marker>
  </defs>
</svg>`
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// React component schemas physique (SchemaProps + props spécifiques)
// ═══════════════════════════════════════════════════════════════════════════════

type Force = { nom: string; angle: number; intensite: number; couleur: string }

export function CircuitSerieSVG({ width = 320, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps) {
  const id = React.useId().replace(/:/g, '')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs><marker id={`arr${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34D399"/></marker></defs>
      <polyline points="40,60 40,160 280,160 280,60 40,60" fill="none" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <line x1="28" y1="95" x2="52" y2="95" stroke={couleurPrimaire} strokeWidth="3.5"/>
      <line x1="33" y1="108" x2="47" y2="108" stroke={couleurPrimaire} strokeWidth="2"/>
      <line x1="28" y1="120" x2="52" y2="120" stroke={couleurPrimaire} strokeWidth="3.5"/>
      <line x1="33" y1="133" x2="47" y2="133" stroke={couleurPrimaire} strokeWidth="2"/>
      <polyline points="90,60 100,45 115,75 130,45 145,75 160,45 175,75 190,60" fill="none" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <circle cx="280" cy="95" r="4" fill={couleurPrimaire}/>
      <circle cx="280" cy="125" r="4" fill={couleurPrimaire}/>
      <line x1="280" y1="95" x2="296" y2="108" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <circle cx="160" cy="160" r="18" fill="rgba(251,195,74,0.1)" stroke={couleurPrimaire} strokeWidth="2"/>
      <line x1="152" y1="152" x2="168" y2="168" stroke={couleurSecondaire} strokeWidth="2"/>
      <line x1="168" y1="152" x2="152" y2="168" stroke={couleurSecondaire} strokeWidth="2"/>
      <path d="M200,57 L220,57" stroke="#34D399" strokeWidth="1.5" markerEnd={`url(#arr${id})`}/>
      {showLabels && <>
        <text x="58" y="100" fontSize={9} fill="#34D399">+</text>
        <text x="58" y="136" fontSize={9} fill="#F87171">−</text>
        <text x="65" y="116" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('pile','Pile')}>Pile</text>
        <text x="140" y="32" textAnchor="middle" fontSize={9} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('resistance','Résistance')}>Résistance</text>
        <text x="298" y="114" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('interrupteur','Interrupteur')}>Interrupteur</text>
        <text x="160" y="192" textAnchor="middle" fontSize={9} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('ampoule','Ampoule')}>Ampoule</text>
        <text x="210" y="52" textAnchor="middle" fontSize={7.5} fill="#34D399">I</text>
      </>}
    </svg>
  )
}

export function CircuitParalleleSVG({ width = 320, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <line x1="40" y1="40" x2="40" y2="160" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <line x1="28" y1="85" x2="52" y2="85" stroke={couleurPrimaire} strokeWidth="3.5"/>
      <line x1="33" y1="98" x2="47" y2="98" stroke={couleurPrimaire} strokeWidth="2"/>
      <line x1="28" y1="110" x2="52" y2="110" stroke={couleurPrimaire} strokeWidth="3.5"/>
      <line x1="33" y1="123" x2="47" y2="123" stroke={couleurPrimaire} strokeWidth="2"/>
      <circle cx="40" cy="40" r="5" fill="#34D399"/><circle cx="40" cy="160" r="5" fill="#34D399"/>
      <line x1="40" y1="40" x2="280" y2="40" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <line x1="40" y1="160" x2="280" y2="160" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <line x1="120" y1="40" x2="120" y2="68" stroke={couleurPrimaire} strokeWidth="2"/>
      <polyline points="120,68 110,80 130,92 110,104 130,116 110,128 120,132" fill="none" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <line x1="120" y1="132" x2="120" y2="160" stroke={couleurPrimaire} strokeWidth="2"/>
      <circle cx="120" cy="40" r="4" fill="#34D399"/><circle cx="120" cy="160" r="4" fill="#34D399"/>
      <line x1="220" y1="40" x2="220" y2="68" stroke={couleurPrimaire} strokeWidth="2"/>
      <circle cx="220" cy="90" r="18" fill="rgba(251,195,74,0.08)" stroke={couleurPrimaire} strokeWidth="2"/>
      <line x1="213" y1="83" x2="227" y2="97" stroke={couleurSecondaire} strokeWidth="2"/>
      <line x1="227" y1="83" x2="213" y2="97" stroke={couleurSecondaire} strokeWidth="2"/>
      <line x1="220" y1="108" x2="220" y2="160" stroke={couleurPrimaire} strokeWidth="2"/>
      <circle cx="220" cy="40" r="4" fill="#34D399"/><circle cx="220" cy="160" r="4" fill="#34D399"/>
      {showLabels && <>
        <text x="58" y="105" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('pile','Pile')}>Pile</text>
        <text x="136" y="102" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('r1','Résistance 1')}>R₁</text>
        <text x="236" y="94" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('ampoule','Ampoule')}>Ampoule</text>
        <text x="80" y="178" textAnchor="middle" fontSize={7.5} fill="#34D399">Nœud A</text>
        <text x="200" y="178" textAnchor="middle" fontSize={7.5} fill="#34D399">Nœud B</text>
      </>}
    </svg>
  )
}

export function DiagrammeForcesSVG({ width = 300, height = 220, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className,
  forces = [{ nom: 'P = mg', angle: 270, intensite: 70, couleur: '#F87171' }, { nom: 'N', angle: 90, intensite: 70, couleur: '#60A5FA' }, { nom: 'f', angle: 180, intensite: 45, couleur: '#FBC34A' }] as Force[]
}: SchemaProps & { forces?: Force[] }) {
  const cx = 150, cy = 127
  const id = React.useId().replace(/:/g, '')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs>{forces.map(f => <marker key={f.nom} id={`m${id}${f.nom.replace(/\s/g,'')}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={f.couleur}/></marker>)}</defs>
      <line x1="40" y1="150" x2="260" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <rect x="108" y="104" width="84" height="46" rx="4" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
      {showLabels && <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.7)">Objet</text>}
      {forces.map(f => {
        const rad = (f.angle * Math.PI) / 180
        const ex = cx + f.intensite * Math.cos(rad), ey = cy + f.intensite * Math.sin(rad)
        const mId = `m${id}${f.nom.replace(/\s/g,'')}`
        return (
          <g key={f.nom}>
            <line x1={cx} y1={cy} x2={ex.toFixed(1)} y2={ey.toFixed(1)} stroke={f.couleur} strokeWidth="2.5" markerEnd={`url(#${mId})`}/>
            {showLabels && <text x={(ex + 8 * Math.cos(rad)).toFixed(1)} y={(ey + 8 * Math.sin(rad) + 4).toFixed(1)} fontSize={9} fill={f.couleur} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(f.nom, f.nom)}>{f.nom}</text>}
          </g>
        )
      })}
      <rect x={cx} y="143" width="7" height="7" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
    </svg>
  )
}

export function OndesSinusoideSVG({ width = 380, height = 160, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className,
  amplitude = 40, nbCycles = 2
}: SchemaProps & { amplitude?: number; longueurOnde?: number; nbCycles?: number }) {
  const cy = 80, W = 340
  const pts = Array.from({ length: 300 }, (_, i) => {
    const x = 20 + (i / 299) * W
    const y = cy - amplitude * Math.sin((i / 299) * nbCycles * 2 * Math.PI)
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const lambdaX2 = 20 + W / nbCycles
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 160" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {showLabels && <text x="190" y="14" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.8)">Onde sinusoïdale</text>}
      <line x1="10" y1={cy} x2="370" y2={cy} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4,3"/>
      <path d={pts} fill="none" stroke={couleurPrimaire} strokeWidth="2.5"/>
      {showLabels && <>
        <line x1="20" y1={cy - amplitude - 5} x2={lambdaX2.toFixed(0)} y2={cy - amplitude - 5} stroke={couleurSecondaire} strokeWidth="1" strokeDasharray="3,2"/>
        <text x={((20 + lambdaX2) / 2).toFixed(0)} y={cy - amplitude - 9} textAnchor="middle" fontSize={9} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('lambda', 'Longueur d\'onde λ')}>λ</text>
        <line x1="360" y1={cy} x2="360" y2={cy - amplitude} stroke={couleurSecondaire} strokeWidth="1.5"/>
        <text x="365" y={cy - amplitude / 2 + 4} fontSize={9} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('amplitude', `Amplitude A = ${amplitude}`)}>A</text>
      </>}
    </svg>
  )
}

export function RefractionLumiereSVG({ width = 300, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className }: SchemaProps) {
  const id = React.useId().replace(/:/g, '')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs>
        <marker id={`ai${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={couleurPrimaire}/></marker>
        <marker id={`ar${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34D399"/></marker>
        <marker id={`afr${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F87171"/></marker>
      </defs>
      <line x1="20" y1="100" x2="280" y2="100" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
      <line x1="150" y1="20" x2="150" y2="180" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="5,4"/>
      <line x1="60" y1="30" x2="150" y2="100" stroke={couleurPrimaire} strokeWidth="2.5" markerEnd={`url(#ai${id})`}/>
      <line x1="150" y1="100" x2="240" y2="30" stroke="#34D399" strokeWidth="2.5" markerEnd={`url(#ar${id})`}/>
      <line x1="150" y1="100" x2="210" y2="185" stroke="#F87171" strokeWidth="2.5" markerEnd={`url(#afr${id})`}/>
      <path d="M150,100 Q130,80 118,80" fill="none" stroke={couleurPrimaire} strokeWidth="1" opacity="0.6"/>
      <path d="M150,100 Q170,80 182,80" fill="none" stroke="#34D399" strokeWidth="1" opacity="0.6"/>
      <path d="M150,100 Q168,120 175,128" fill="none" stroke="#F87171" strokeWidth="1" opacity="0.6"/>
      {showLabels && <>
        <text x="14" y="60" fontSize={9} fill="rgba(255,255,255,0.5)">Milieu 1 (n₁)</text>
        <text x="14" y="160" fontSize={9} fill="rgba(255,255,255,0.5)">Milieu 2 (n₂)</text>
        <text x="80" y="52" fontSize={8.5} fill={couleurPrimaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('incident','Rayon incident')}>Rayon incident</text>
        <text x="208" y="52" fontSize={8.5} fill="#34D399" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('reflechi','Rayon réfléchi')}>Réfléchi</text>
        <text x="190" y="178" fontSize={8.5} fill="#F87171" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('refracte','Rayon réfracté')}>Réfracté</text>
        <text x="113" y="79" fontSize={8} fill={couleurPrimaire}>θ₁</text>
        <text x="183" y="79" fontSize={8} fill="#34D399">θᵣ</text>
        <text x="176" y="133" fontSize={8} fill="#F87171">θ₂</text>
      </>}
    </svg>
  )
}

export function PlanInclineSVG({ width = 320, height = 220, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className,
  angle = 30
}: SchemaProps & { angle?: number }) {
  const id = React.useId().replace(/:/g, '')
  const rad = (angle * Math.PI) / 180
  const ox = 80, oy = 180
  const px = ox + 180 * Math.cos(rad), py = oy - 180 * Math.sin(rad)
  const bx = ox + 100 * Math.cos(rad), by = oy - 100 * Math.sin(rad)
  const nX = -Math.sin(rad), nY = -Math.cos(rad)
  const tX = Math.cos(rad), tY = -Math.sin(rad)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs>
        <marker id={`mp${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#F87171"/></marker>
        <marker id={`mn${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#34D399"/></marker>
        <marker id={`mt${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#FBC34A"/></marker>
      </defs>
      <line x1={ox - 10} y1={oy} x2={ox + 220} y2={oy} stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <polygon points={`${ox},${oy} ${px.toFixed(0)},${py.toFixed(0)} ${px.toFixed(0)},${oy}`} fill="rgba(96,165,250,0.06)" stroke={couleurPrimaire} strokeWidth="2"/>
      <path d={`M${ox + 35},${oy} Q${ox + 30},${oy - 18} ${(ox + 30 * Math.cos(rad)).toFixed(0)},${(oy - 30 * Math.sin(rad)).toFixed(0)}`} fill="none" stroke={couleurPrimaire} strokeWidth="1.2"/>
      {showLabels && <text x={ox + 38} y={oy - 10} fontSize={8} fill={couleurPrimaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('angle', `θ = ${angle}°`)}>θ = {angle}°</text>}
      <rect x={bx - 10} y={by - 8} width="20" height="16" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" transform={`rotate(${-angle},${bx.toFixed(0)},${by.toFixed(0)})`}/>
      <line x1={bx} y1={by} x2={bx} y2={by + 60} stroke="#F87171" strokeWidth="2.5" markerEnd={`url(#mp${id})`}/>
      <line x1={bx} y1={by} x2={(bx + nX * 55).toFixed(1)} y2={(by + nY * 55).toFixed(1)} stroke="#34D399" strokeWidth="2.5" markerEnd={`url(#mn${id})`}/>
      <line x1={bx} y1={by} x2={(bx - tX * 40).toFixed(1)} y2={(by - tY * 40).toFixed(1)} stroke="#FBC34A" strokeWidth="2.5" markerEnd={`url(#mt${id})`}/>
      {showLabels && <>
        <text x={bx + 4} y={by + 40} fontSize={9} fill="#F87171" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('poids','Poids P')}>P</text>
        <text x={(bx + nX * 55 + 4).toFixed(0)} y={(by + nY * 55 + 4).toFixed(0)} fontSize={9} fill="#34D399" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('normale','Force normale N')}>N</text>
        <text x={(bx - tX * 40 - 14).toFixed(0)} y={(by - tY * 40 - 4).toFixed(0)} fontSize={9} fill="#FBC34A" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('tang','Composante tangentielle P∥')}>P∥</text>
      </>}
    </svg>
  )
}
