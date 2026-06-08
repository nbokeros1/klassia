// ─── KlassIA+ — Schémas SVG Maths ────────────────────────────────────────────
'use client'
import React from 'react'
import type { SchemaItem } from './index'
import type { SchemaProps } from './types'

export const MATHS_SCHEMAS: SchemaItem[] = [
  {
    id: 'mat-plan-cartesien',
    titre: 'Plan cartésien',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { xLabel: 'x', yLabel: 'y', origin: 'O', q1: 'I', q2: 'II', q3: 'III', q4: 'IV', ...opts.labels }
      const C = { axis: '#60A5FA', grid: 'rgba(255,255,255,0.08)', tick: 'rgba(255,255,255,0.5)', text: 'rgba(255,255,255,0.7)', quad: 'rgba(255,255,255,0.18)', ...opts.colors }
      const cx = 150, cy = 130, step = 22, range = 5
      const gridLines: string[] = []
      const ticks: string[] = []
      for (let i = -range; i <= range; i++) {
        if (i === 0) continue
        const x = cx + i * step, y = cy - i * step
        gridLines.push(`<line x1="${x}" y1="20" x2="${x}" y2="240" stroke="${C.grid}" stroke-width="1"/>`)
        gridLines.push(`<line x1="10" y1="${cy - i * step}" x2="290" y2="${cy - i * step}" stroke="${C.grid}" stroke-width="1"/>`)
        ticks.push(`<line x1="${x}" y1="${cy - 4}" x2="${x}" y2="${cy + 4}" stroke="${C.tick}" stroke-width="1.2"/>`)
        ticks.push(`<line x1="${cx - 4}" y1="${cy - i * step}" x2="${cx + 4}" y2="${cy - i * step}" stroke="${C.tick}" stroke-width="1.2"/>`)
        if (i !== 0) {
          ticks.push(`<text x="${x}" y="${cy + 14}" text-anchor="middle" font-size="8" fill="${C.text}">${i}</text>`)
          ticks.push(`<text x="${cx - 10}" y="${cy - i * step + 4}" text-anchor="middle" font-size="8" fill="${C.text}">${i}</text>`)
        }
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" style="font-family:system-ui,sans-serif">
  ${gridLines.join('\n  ')}
  <!-- Axes -->
  <line x1="10" y1="${cy}" x2="290" y2="${cy}" stroke="${C.axis}" stroke-width="2" marker-end="url(#ax)"/>
  <line x1="${cx}" y1="250" x2="${cx}" y2="20" stroke="${C.axis}" stroke-width="2" marker-end="url(#ay)"/>
  ${ticks.join('\n  ')}
  <!-- Origin -->
  <text x="${cx - 12}" y="${cy + 14}" font-size="9" fill="${C.axis}">${L.origin}</text>
  <!-- Axis labels -->
  <text x="285" y="${cy - 8}" font-size="11" fill="${C.axis}">${L.xLabel}</text>
  <text x="${cx + 6}" y="24" font-size="11" fill="${C.axis}">${L.yLabel}</text>
  <!-- Quadrant labels -->
  <text x="${cx + 50}" y="${cy - 50}" font-size="11" fill="${C.quad}">${L.q1}</text>
  <text x="${cx - 62}" y="${cy - 50}" font-size="11" fill="${C.quad}">${L.q2}</text>
  <text x="${cx - 62}" y="${cy + 62}" font-size="11" fill="${C.quad}">${L.q3}</text>
  <text x="${cx + 50}" y="${cy + 62}" font-size="11" fill="${C.quad}">${L.q4}</text>
  <defs>
    <marker id="ax" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
    <marker id="ay" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
  </defs>
</svg>`
    },
  },

  {
    id: 'mat-droite-numerique',
    titre: 'Droite numérique',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { titre: 'Droite numérique', ...opts.labels }
      const C = { axis: '#60A5FA', tick: 'rgba(255,255,255,0.6)', origin: '#FBC34A', text: 'rgba(255,255,255,0.75)', ...opts.colors }
      const cy = 55, startX = 20, step = 26, range = 6
      const items: string[] = []
      for (let i = -range; i <= range; i++) {
        const x = startX + (i + range) * step
        const isOrigin = i === 0
        items.push(`<line x1="${x}" y1="${cy - (isOrigin ? 12 : 8)}" x2="${x}" y2="${cy + (isOrigin ? 12 : 8)}" stroke="${isOrigin ? C.origin : C.tick}" stroke-width="${isOrigin ? 2 : 1.2}"/>`)
        items.push(`<text x="${x}" y="${cy + 22}" text-anchor="middle" font-size="${isOrigin ? 10 : 8}" font-weight="${isOrigin ? 'bold' : 'normal'}" fill="${isOrigin ? C.origin : C.text}">${i}</text>`)
      }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 90" style="font-family:system-ui,sans-serif">
  <text x="180" y="15" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.7)">${L.titre}</text>
  <line x1="10" y1="${cy}" x2="350" y2="${cy}" stroke="${C.axis}" stroke-width="2.5" marker-end="url(#adn)" marker-start="url(#adnr)"/>
  ${items.join('\n  ')}
  <defs>
    <marker id="adn"  viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
    <marker id="adnr" viewBox="0 0 8 8" refX="2" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
  </defs>
</svg>`
    },
  },

  {
    id: 'mat-figures',
    titre: 'Figures géométriques',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { triangle: 'Triangle', cercle: 'Cercle', rectangle: 'Rectangle', a: 'a', b: 'b', c: 'c', h: 'h', r: 'r', d: 'd', l: 'l', w: 'l\'', ...opts.labels }
      const C = { stroke: '#60A5FA', dim: '#FBC34A', text: 'rgba(255,255,255,0.8)', fill: 'rgba(96,165,250,0.08)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" style="font-family:system-ui,sans-serif">
  <!-- Triangle -->
  <polygon points="50,150 110,40 170,150" fill="${C.fill}" stroke="${C.stroke}" stroke-width="2"/>
  <line x1="110" y1="40" x2="110" y2="150" stroke="${C.dim}" stroke-width="1.5" stroke-dasharray="4,3"/>
  <rect x="110" y="144" width="6" height="6" fill="none" stroke="${C.dim}" stroke-width="1"/>
  <text x="70" y="105" text-anchor="middle" font-size="9" fill="${C.dim}">${L.a}</text>
  <text x="145" y="100" text-anchor="middle" font-size="9" fill="${C.dim}">${L.b}</text>
  <text x="110" y="165" text-anchor="middle" font-size="9" fill="${C.dim}">${L.c}</text>
  <text x="120" y="105" font-size="9" fill="${C.dim}">${L.h}</text>
  <text x="110" y="28" text-anchor="middle" font-size="9" fill="${C.stroke}">${L.triangle}</text>
  <!-- Angle droit triangle -->
  <rect x="50" y="144" width="7" height="7" fill="none" stroke="${C.stroke}" stroke-width="1"/>
  <!-- Cercle -->
  <circle cx="220" cy="100" r="50" fill="${C.fill}" stroke="${C.stroke}" stroke-width="2"/>
  <circle cx="220" cy="100" r="2.5" fill="${C.stroke}"/>
  <line x1="220" y1="100" x2="260" y2="72" stroke="${C.dim}" stroke-width="1.8"/>
  <line x1="170" y1="100" x2="270" y2="100" stroke="${C.dim}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.6"/>
  <text x="242" y="85" font-size="9" fill="${C.dim}">${L.r}</text>
  <text x="220" y="162" text-anchor="middle" font-size="9" fill="${C.dim}">${L.d} = 2${L.r}</text>
  <text x="220" y="38" text-anchor="middle" font-size="9" fill="${C.stroke}">${L.cercle}</text>
  <!-- Rectangle (small, integrated as label) -->
  <text x="305" y="100" text-anchor="end" font-size="8" fill="${C.dim}">${L.l} × ${L.w}</text>
</svg>`
    },
  },

  // ── Triangle rectangle ────────────────────────────────────────────────────
  {
    id: 'mat-triangle-rectangle',
    titre: 'Triangle rectangle',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { adj: 'Adjacent (a)', opp: 'Opposé (b)', hyp: 'Hypoténuse (c)', theta: 'θ', pythagore: 'c² = a² + b²', ...opts.labels }
      const C = { stroke: '#60A5FA', dim: '#FBC34A', text: 'rgba(255,255,255,0.8)', fill: 'rgba(96,165,250,0.07)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" style="font-family:system-ui,sans-serif">
  <polygon points="40,160 260,160 40,50" fill="${C.fill}" stroke="${C.stroke}" stroke-width="2"/>
  <rect x="40" y="152" width="8" height="8" fill="none" stroke="${C.stroke}" stroke-width="1.5"/>
  <text x="150" y="178" text-anchor="middle" font-size="10" fill="${C.dim}" cursor="pointer">${L.adj}</text>
  <text x="28" y="108" text-anchor="middle" font-size="10" fill="${C.dim}" cursor="pointer">${L.opp}</text>
  <text x="168" y="96" text-anchor="middle" font-size="10" fill="${C.dim}" transform="rotate(-27,168,96)" cursor="pointer">${L.hyp}</text>
  <path d="M40,160 Q65,145 65,136" fill="none" stroke="${C.stroke}" stroke-width="1.2" stroke-dasharray="3,2"/>
  <text x="70" y="145" font-size="9" fill="${C.stroke}">${L.theta}</text>
  <text x="150" y="195" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.4)">${L.pythagore}</text>
</svg>`
    },
  },

  // ── Diagramme de Venn ─────────────────────────────────────────────────────
  {
    id: 'mat-diagramme-venn',
    titre: 'Diagramme de Venn',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { A: 'A', B: 'B', inter: 'A ∩ B', union: 'A ∪ B', elemA: 'a, b, c', elemB: 'd, e, f', elemInter: 'x, y', ...opts.labels }
      const C = { a: '#60A5FA', b: '#A78BFA', inter: '#34D399', text: 'rgba(255,255,255,0.85)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.2)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" style="font-family:system-ui,sans-serif">
  <rect x="5" y="10" width="290" height="160" rx="6" fill="${C.bg}" stroke="${C.border}" stroke-width="1"/>
  <circle cx="118" cy="95" r="72" fill="rgba(96,165,250,0.1)" stroke="${C.a}" stroke-width="2" opacity="0.85"/>
  <circle cx="182" cy="95" r="72" fill="rgba(167,139,250,0.1)" stroke="${C.b}" stroke-width="2" opacity="0.85"/>
  <text x="84" y="99" text-anchor="middle" font-size="9" fill="${C.a}">${L.elemA}</text>
  <text x="216" y="99" text-anchor="middle" font-size="9" fill="${C.b}">${L.elemB}</text>
  <text x="150" y="99" text-anchor="middle" font-size="8.5" fill="${C.inter}">${L.elemInter}</text>
  <text x="76" y="30" text-anchor="middle" font-size="12" font-weight="bold" fill="${C.a}">${L.A}</text>
  <text x="224" y="30" text-anchor="middle" font-size="12" font-weight="bold" fill="${C.b}">${L.B}</text>
  <text x="150" y="170" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,0.4)">${L.inter}</text>
</svg>`
    },
  },

  // ── Arbre de probabilité ──────────────────────────────────────────────────
  {
    id: 'mat-arbre-probabilite',
    titre: 'Arbre de probabilité',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { titre: 'Arbre de probabilité', p1: '1/2', p2: '1/2', p3: '2/3', p4: '1/3', p5: '3/4', p6: '1/4', b1: 'A', b2: 'B', b3: 'C', b4: 'D', b5: 'E', b6: 'F', ...opts.labels }
      const C = { line: '#60A5FA', node: '#A78BFA', text: 'rgba(255,255,255,0.85)', prob: '#FBC34A', ...opts.colors }
      const root = { x: 30, y: 110 }
      const mid = [{ x: 140, y: 55 }, { x: 140, y: 165 }]
      const end = [{ x: 250, y: 30 }, { x: 250, y: 80 }, { x: 250, y: 140 }, { x: 250, y: 190 }]
      const probs = [L.p1, L.p2, L.p3, L.p4, L.p5, L.p6]
      const labels = [L.b1, L.b2, L.b3, L.b4, L.b5, L.b6]
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 220" style="font-family:system-ui,sans-serif">
  <text x="155" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  <!-- Racine vers milieux -->
  ${mid.map((m, i) => `<line x1="${root.x + 10}" y1="${root.y}" x2="${m.x - 8}" y2="${m.y}" stroke="${C.line}" stroke-width="1.8"/>
  <text x="${(root.x + m.x) / 2}" y="${(root.y + m.y) / 2 - 4}" text-anchor="middle" font-size="8.5" fill="${C.prob}">${probs[i]}</text>
  <text x="${m.x + 6}" y="${m.y + 4}" font-size="10" font-weight="bold" fill="${C.node}">${labels[i]}</text>`).join('\n  ')}
  <!-- Milieux vers extrémités -->
  ${end.map((e, i) => {
    const mi = mid[Math.floor(i / 2)]
    return `<line x1="${mi.x + 6}" y1="${mi.y}" x2="${e.x - 8}" y2="${e.y}" stroke="${C.line}" stroke-width="1.5"/>
  <text x="${(mi.x + e.x) / 2}" y="${(mi.y + e.y) / 2 - 4}" text-anchor="middle" font-size="8" fill="${C.prob}">${probs[2 + i]}</text>
  <text x="${e.x + 6}" y="${e.y + 4}" font-size="9" fill="${C.node}">${labels[2 + i]}</text>`
  }).join('\n  ')}
  <circle cx="${root.x}" cy="${root.y}" r="10" fill="rgba(167,139,250,0.25)" stroke="${C.node}" stroke-width="1.5"/>
  ${mid.map(m => `<circle cx="${m.x}" cy="${m.y}" r="8" fill="rgba(96,165,250,0.2)" stroke="${C.line}" stroke-width="1.2"/>`).join('\n  ')}
  ${end.map(e => `<circle cx="${e.x}" cy="${e.y}" r="6" fill="rgba(52,211,153,0.2)" stroke="#34D399" stroke-width="1.2"/>`).join('\n  ')}
</svg>`
    },
  },

  // ── Diagramme à barres ────────────────────────────────────────────────────
  {
    id: 'mat-diagramme-barres',
    titre: 'Diagramme à barres',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { titre: 'Diagramme à barres', ...opts.labels }
      const C = { axis: '#60A5FA', bar1: '#60A5FA', bar2: '#A78BFA', bar3: '#34D399', bar4: '#FBC34A', bar5: '#F87171', text: 'rgba(255,255,255,0.7)', ...opts.colors }
      const data = [{ l: 'Lun', v: 65 }, { l: 'Mar', v: 80 }, { l: 'Mer', v: 45 }, { l: 'Jeu', v: 90 }, { l: 'Ven', v: 70 }]
      const colors = [C.bar1, C.bar2, C.bar3, C.bar4, C.bar5]
      const maxV = 100, chartH = 120, barW = 32, gap = 18, baseX = 30, baseY = 155
      const bars = data.map((d, i) => {
        const bh = (d.v / maxV) * chartH
        const x = baseX + i * (barW + gap)
        return `<rect x="${x}" y="${baseY - bh}" width="${barW}" height="${bh}" rx="3" fill="${colors[i]}" opacity="0.85"/>
  <text x="${x + barW / 2}" y="${baseY - bh - 4}" text-anchor="middle" font-size="8" fill="${colors[i]}">${d.v}</text>
  <text x="${x + barW / 2}" y="${baseY + 14}" text-anchor="middle" font-size="8" fill="${C.text}">${d.l}</text>`
      }).join('\n  ')
      const yTicks = [0, 25, 50, 75, 100].map(v => {
        const y = baseY - (v / maxV) * chartH
        return `<line x1="${baseX - 4}" y1="${y}" x2="${baseX + 260}" y2="${y}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <text x="${baseX - 6}" y="${y + 4}" text-anchor="end" font-size="7.5" fill="rgba(255,255,255,0.4)">${v}</text>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 190" style="font-family:system-ui,sans-serif">
  <text x="150" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  ${yTicks}
  <line x1="${baseX}" y1="${baseY - chartH - 10}" x2="${baseX}" y2="${baseY}" stroke="${C.axis}" stroke-width="1.5"/>
  <line x1="${baseX}" y1="${baseY}" x2="${baseX + 260}" y2="${baseY}" stroke="${C.axis}" stroke-width="1.5"/>
  ${bars}
</svg>`
    },
  },

  // ── Diagramme circulaire ──────────────────────────────────────────────────
  {
    id: 'mat-diagramme-circulaire',
    titre: 'Diagramme circulaire',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { titre: 'Diagramme circulaire', ...opts.labels }
      const data = [{ l: 'A', v: 35, c: '#60A5FA' }, { l: 'B', v: 25, c: '#A78BFA' }, { l: 'C', v: 20, c: '#34D399' }, { l: 'D', v: 20, c: '#FBC34A' }]
      const total = data.reduce((s, d) => s + d.v, 0)
      const cx = 100, cy = 100, r = 75
      let cumAngle = -Math.PI / 2
      const sectors = data.map(d => {
        const angle = (d.v / total) * 2 * Math.PI
        const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle)
        cumAngle += angle
        const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle)
        const midA = cumAngle - angle / 2
        const lx = cx + (r * 0.65) * Math.cos(midA), ly = cy + (r * 0.65) * Math.sin(midA)
        const large = angle > Math.PI ? 1 : 0
        return { d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`, c: d.c, l: d.l, v: d.v, lx, ly }
      })
      const sectorsHtml = sectors.map(s => `<path d="${s.d}" fill="${s.c}" opacity="0.85" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
  <text x="${s.lx.toFixed(1)}" y="${s.ly.toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="white">${Math.round(s.v / total * 100)}%</text>`).join('\n  ')
      const legendHtml = data.map((d, i) => `<rect x="195" y="${32 + i * 28}" width="12" height="12" rx="2" fill="${d.c}" opacity="0.85"/>
  <text x="212" y="${32 + i * 28 + 10}" font-size="9" fill="rgba(255,255,255,0.8)">${d.l} — ${d.v}%</text>`).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 210" style="font-family:system-ui,sans-serif">
  <text x="145" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  ${sectorsHtml}
  ${legendHtml}
</svg>`
    },
  },

  {
    id: 'mat-tableau-valeurs',
    titre: 'Tableau de valeurs',
    categorie: 'maths',
    toSvg: (opts = {}) => {
      const L = { titre: 'Tableau de valeurs', xCol: 'x', yCol: 'f(x)', note: 'f(x) = x²', ...opts.labels }
      const C = { header: '#60A5FA', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.85)', bg: 'rgba(255,255,255,0.04)', headerBg: 'rgba(96,165,250,0.15)', ...opts.colors }
      const rows = [[-3, 9], [-2, 4], [-1, 1], [0, 0], [1, 1], [2, 4], [3, 9]]
      const x0 = 80, y0 = 40, w = 60, h = 24
      const cells = rows.map(([x, y], i) => {
        const ry = y0 + 24 + i * h
        return `<rect x="${x0}" y="${ry}" width="${w}" height="${h}" fill="${C.bg}" stroke="${C.border}" stroke-width="0.8"/>
  <rect x="${x0 + w}" y="${ry}" width="${w}" height="${h}" fill="${C.bg}" stroke="${C.border}" stroke-width="0.8"/>
  <text x="${x0 + w / 2}" y="${ry + 15}" text-anchor="middle" font-size="10" fill="${C.text}">${x}</text>
  <text x="${x0 + w + w / 2}" y="${ry + 15}" text-anchor="middle" font-size="10" fill="${C.text}">${y}</text>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 240" style="font-family:system-ui,sans-serif">
  <text x="110" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  <!-- Header -->
  <rect x="${x0}" y="${y0}" width="${w}" height="24" rx="2" fill="${C.headerBg}" stroke="${C.header}" stroke-width="1"/>
  <rect x="${x0 + w}" y="${y0}" width="${w}" height="24" rx="2" fill="${C.headerBg}" stroke="${C.header}" stroke-width="1"/>
  <text x="${x0 + w / 2}" y="${y0 + 15}" text-anchor="middle" font-size="10" font-weight="bold" fill="${C.header}">${L.xCol}</text>
  <text x="${x0 + w + w / 2}" y="${y0 + 15}" text-anchor="middle" font-size="10" font-weight="bold" fill="${C.header}">${L.yCol}</text>
  ${cells}
  <text x="110" y="232" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.35)">${L.note}</text>
</svg>`
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// React component schemas maths (SchemaProps + props spécifiques)
// ═══════════════════════════════════════════════════════════════════════════════

type PtFonction = { x: number; y: number; label: string }
type Donnee = { label: string; valeur: number; couleur?: string }
type BrancheArbre = { label: string; prob: string; enfants?: BrancheArbre[] }

export function PlanCartesienSVG({ width = 300, height = 260, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className,
  xMin = -5, xMax = 5, yMin = -5, yMax = 5, points = [] as PtFonction[]
}: SchemaProps & { xMin?: number; xMax?: number; yMin?: number; yMax?: number; points?: PtFonction[] }) {
  const id = React.useId().replace(/:/g, '')
  const cx = 150, cy = 130, step = 22
  const range = Math.max(xMax, -xMin, yMax, -yMin, 5)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs>
        <marker id={`ax${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={couleurPrimaire}/></marker>
        <marker id={`ay${id}`} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={couleurPrimaire}/></marker>
      </defs>
      {Array.from({ length: range * 2 + 1 }, (_, i) => i - range).filter(i => i !== 0).map(i => (
        <g key={i}>
          <line x1={cx + i * step} y1="20" x2={cx + i * step} y2="240" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          <line x1="10" y1={cy - i * step} x2="290" y2={cy - i * step} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          <line x1={cx + i * step} y1={cy - 4} x2={cx + i * step} y2={cy + 4} stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
          <line x1={cx - 4} y1={cy - i * step} x2={cx + 4} y2={cy - i * step} stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
          {showLabels && <>
            <text x={cx + i * step} y={cy + 14} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.7)">{i}</text>
            <text x={cx - 10} y={cy - i * step + 4} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.7)">{i}</text>
          </>}
        </g>
      ))}
      <line x1="10" y1={cy} x2="290" y2={cy} stroke={couleurPrimaire} strokeWidth="2" markerEnd={`url(#ax${id})`}/>
      <line x1={cx} y1="250" x2={cx} y2="20" stroke={couleurPrimaire} strokeWidth="2" markerEnd={`url(#ay${id})`}/>
      {showLabels && <>
        <text x={cx - 12} y={cy + 14} fontSize={9} fill={couleurPrimaire}>O</text>
        <text x="285" y={cy - 8} fontSize={11} fill={couleurPrimaire}>x</text>
        <text x={cx + 6} y="24" fontSize={11} fill={couleurPrimaire}>y</text>
      </>}
      {points.map(pt => {
        const px = cx + pt.x * step, py = cy - pt.y * step
        return (
          <g key={`${pt.x}-${pt.y}`} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(pt.label, `(${pt.x}, ${pt.y})`)}>
            <line x1={px - 5} y1={py} x2={px + 5} y2={py} stroke="#F87171" strokeWidth="2"/>
            <line x1={px} y1={py - 5} x2={px} y2={py + 5} stroke="#F87171" strokeWidth="2"/>
            {showLabels && <text x={px + 6} y={py - 4} fontSize={8} fill="#F87171">{pt.label}({pt.x},{pt.y})</text>}
          </g>
        )
      })}
    </svg>
  )
}

export function TriangleRectangleSVG({ width = 300, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className,
  coteA = 'a', coteB = 'b', labelC = 'c (hypoténuse)'
}: SchemaProps & { coteA?: string; coteB?: string; labelC?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <polygon points="40,160 260,160 40,50" fill="rgba(96,165,250,0.07)" stroke={couleurPrimaire} strokeWidth="2"/>
      <rect x="40" y="152" width="8" height="8" fill="none" stroke={couleurPrimaire} strokeWidth="1.5"/>
      {showLabels && <>
        <text x="150" y="178" textAnchor="middle" fontSize={10} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('adjacent', coteA)}>{coteA} (adjacent)</text>
        <text x="25" y="108" textAnchor="middle" fontSize={10} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('oppose', coteB)}>{coteB} (opposé)</text>
        <text x="168" y="93" textAnchor="middle" fontSize={9} fill={couleurSecondaire} transform="rotate(-27,168,93)" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('hypotenuse', labelC)}>{labelC}</text>
        <path d="M40,160 Q65,145 65,136" fill="none" stroke={couleurPrimaire} strokeWidth="1.2" strokeDasharray="3,2"/>
        <text x="70" y="145" fontSize={9} fill={couleurPrimaire}>θ</text>
        <text x="150" y="195" textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.4)">c² = a² + b²</text>
      </>}
    </svg>
  )
}

export function DiagrammeVennSVG({ width = 300, height = 180, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#A78BFA', onLabelClick, className,
  ensembleA = { label: 'A', elements: ['1', '2', '3'] },
  ensembleB = { label: 'B', elements: ['5', '6', '7'] },
  intersection = ['4']
}: SchemaProps & { ensembleA?: { label: string; elements: string[] }; ensembleB?: { label: string; elements: string[] }; intersection?: string[] }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <rect x="5" y="10" width="290" height="160" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <circle cx="118" cy="95" r="72" fill="rgba(96,165,250,0.1)" stroke={couleurPrimaire} strokeWidth="2"/>
      <circle cx="182" cy="95" r="72" fill="rgba(167,139,250,0.1)" stroke={couleurSecondaire} strokeWidth="2"/>
      {showLabels && <>
        <text x="76" y="30" textAnchor="middle" fontSize={13} fontWeight="bold" fill={couleurPrimaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('A', ensembleA.label)}>{ensembleA.label}</text>
        <text x="224" y="30" textAnchor="middle" fontSize={13} fontWeight="bold" fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('B', ensembleB.label)}>{ensembleB.label}</text>
        <text x="84" y="99" textAnchor="middle" fontSize={9} fill={couleurPrimaire}>{ensembleA.elements.join(', ')}</text>
        <text x="216" y="99" textAnchor="middle" fontSize={9} fill={couleurSecondaire}>{ensembleB.elements.join(', ')}</text>
        <text x="150" y="96" textAnchor="middle" fontSize={9} fill="#34D399" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('intersection', 'A ∩ B')}>{intersection.join(', ')}</text>
        <text x="150" y="170" textAnchor="middle" fontSize={8.5} fill="rgba(255,255,255,0.4)">A ∩ B</text>
      </>}
    </svg>
  )
}

export function ArbreProbabiliteSVG({ width = 320, height = 220, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#A78BFA', onLabelClick, className,
  branches = [
    { label: 'H', prob: '1/2', enfants: [{ label: 'C', prob: '1/3' }, { label: 'P', prob: '2/3' }] },
    { label: 'P', prob: '1/2', enfants: [{ label: 'C', prob: '2/3' }, { label: 'P', prob: '1/3' }] },
  ] as BrancheArbre[]
}: SchemaProps & { branches?: BrancheArbre[] }) {
  const root = { x: 30, y: 110 }
  const midY = branches.map((_, i) => 30 + i * (180 / Math.max(branches.length - 1, 1)) + 20)
  const endPts: { x: number; y: number; label: string; prob: string; mi: number }[] = []
  branches.forEach((b, bi) => {
    const children = b.enfants || []
    const baseY = midY[bi]
    children.forEach((c, ci) => {
      const spread = 60 / Math.max(children.length, 1)
      const ey = baseY - 30 + ci * spread + 15
      endPts.push({ x: 260, y: ey, label: c.label, prob: c.prob, mi: bi })
    })
  })
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 220" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {showLabels && <text x="155" y="16" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.8)">Arbre de probabilité</text>}
      {branches.map((b, i) => (
        <g key={b.label + i}>
          <line x1={root.x + 10} y1={root.y} x2={132} y2={midY[i]} stroke={couleurPrimaire} strokeWidth="1.8"/>
          <text x={(root.x + 140) / 2} y={(root.y + midY[i]) / 2 - 4} textAnchor="middle" fontSize={8.5} fill="#FBC34A" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(b.label, b.prob)}>{b.prob}</text>
          <circle cx="140" cy={midY[i]} r="8" fill="rgba(96,165,250,0.2)" stroke={couleurPrimaire} strokeWidth="1.2"/>
          {showLabels && <text x="152" y={midY[i] + 4} fontSize={10} fontWeight="bold" fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(b.label, b.label)}>{b.label}</text>}
        </g>
      ))}
      {endPts.map((e, i) => (
        <g key={i}>
          <line x1={152} y1={midY[e.mi]} x2={e.x - 8} y2={e.y} stroke={couleurPrimaire} strokeWidth="1.5"/>
          <text x={(152 + e.x) / 2} y={(midY[e.mi] + e.y) / 2 - 3} textAnchor="middle" fontSize={8} fill="#FBC34A" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(e.label, e.prob)}>{e.prob}</text>
          <circle cx={e.x} cy={e.y} r="6" fill="rgba(52,211,153,0.2)" stroke="#34D399" strokeWidth="1.2"/>
          {showLabels && <text x={e.x + 10} y={e.y + 4} fontSize={9} fill="#34D399">{e.label}</text>}
        </g>
      ))}
      <circle cx={root.x} cy={root.y} r="10" fill="rgba(167,139,250,0.25)" stroke={couleurSecondaire} strokeWidth="1.5"/>
    </svg>
  )
}

export function DiagrammeBarresSVG({ width = 300, height = 190, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className,
  donnees = [{ label: 'A', valeur: 65 }, { label: 'B', valeur: 80 }, { label: 'C', valeur: 45 }, { label: 'D', valeur: 90 }] as Donnee[],
  titre = 'Diagramme à barres'
}: SchemaProps & { donnees?: Donnee[]; titre?: string }) {
  const COLS = ['#60A5FA', '#A78BFA', '#34D399', '#FBC34A', '#F87171']
  const maxV = Math.max(...donnees.map(d => d.valeur), 1)
  const chartH = 120, barW = Math.min(40, Math.floor(220 / donnees.length) - 10), gap = Math.floor((220 - donnees.length * barW) / (donnees.length + 1))
  const baseX = 32, baseY = 155
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 190" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {showLabels && <text x="150" y="16" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.8)">{titre}</text>}
      {[0, 25, 50, 75, 100].map(v => {
        const y = baseY - (v / 100) * chartH
        return (
          <g key={v}>
            <line x1={baseX} y1={y} x2={baseX + 250} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            {showLabels && <text x={baseX - 4} y={y + 4} textAnchor="end" fontSize={7} fill="rgba(255,255,255,0.4)">{Math.round(v / 100 * maxV)}</text>}
          </g>
        )
      })}
      <line x1={baseX} y1={baseY - chartH - 5} x2={baseX} y2={baseY} stroke={couleurPrimaire} strokeWidth="1.5"/>
      <line x1={baseX} y1={baseY} x2={baseX + 255} y2={baseY} stroke={couleurPrimaire} strokeWidth="1.5"/>
      {donnees.map((d, i) => {
        const bh = (d.valeur / maxV) * chartH
        const x = baseX + gap + i * (barW + gap)
        const col = d.couleur || COLS[i % COLS.length]
        return (
          <g key={d.label} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(d.label, String(d.valeur))}>
            <rect x={x} y={baseY - bh} width={barW} height={bh} rx={3} fill={col} opacity={0.85}/>
            {showLabels && <>
              <text x={x + barW / 2} y={baseY - bh - 4} textAnchor="middle" fontSize={8} fill={col}>{d.valeur}</text>
              <text x={x + barW / 2} y={baseY + 14} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.7)">{d.label}</text>
            </>}
          </g>
        )
      })}
    </svg>
  )
}

export function DiagrammeCirculaireSVG({ width = 290, height = 210, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className,
  donnees = [{ label: 'A', valeur: 35 }, { label: 'B', valeur: 25 }, { label: 'C', valeur: 20 }, { label: 'D', valeur: 20 }] as Donnee[],
  titre = 'Diagramme circulaire'
}: SchemaProps & { donnees?: Donnee[]; titre?: string }) {
  const COLS = ['#60A5FA', '#A78BFA', '#34D399', '#FBC34A', '#F87171']
  const cx = 100, cy = 110, r = 80
  const total = donnees.reduce((s, d) => s + d.valeur, 0)
  let cumAngle = -Math.PI / 2
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 290 210" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {showLabels && <text x="145" y="16" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.8)">{titre}</text>}
      {donnees.map((d, i) => {
        const angle = (d.valeur / total) * 2 * Math.PI
        const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle)
        cumAngle += angle
        const x2 = cx + r * Math.cos(cumAngle), y2 = cy + r * Math.sin(cumAngle)
        const midA = cumAngle - angle / 2
        const lx = cx + r * 0.65 * Math.cos(midA), ly = cy + r * 0.65 * Math.sin(midA)
        const large = angle > Math.PI ? 1 : 0
        const col = d.couleur || COLS[i % COLS.length]
        const pct = Math.round(d.valeur / total * 100)
        return (
          <g key={d.label} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(d.label, `${pct}%`)}>
            <path d={`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`} fill={col} opacity={0.85} stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
            {showLabels && <text x={lx.toFixed(1)} y={ly.toFixed(1) + 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="white">{pct}%</text>}
          </g>
        )
      })}
      {showLabels && donnees.map((d, i) => {
        const col = d.couleur || COLS[i % COLS.length]
        return (
          <g key={d.label}>
            <rect x="195" y={32 + i * 28} width="12" height="12" rx="2" fill={col} opacity={0.85}/>
            <text x="212" y={32 + i * 28 + 10} fontSize={9} fill="rgba(255,255,255,0.8)">{d.label} — {d.valeur}%</text>
          </g>
        )
      })}
    </svg>
  )
}
