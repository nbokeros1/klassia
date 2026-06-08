// ─── KlassIA+ — Schémas SVG Chimie ───────────────────────────────────────────
'use client'
import React from 'react'
import type { SchemaItem } from './index'
import type { SchemaProps } from './types'

export const CHIMIE_SCHEMAS: SchemaItem[] = [
  {
    id: 'chi-bohr',
    titre: 'Atome de Bohr',
    categorie: 'chimie',
    toSvg: (opts = {}) => {
      const L = { noyau: 'Noyau', protons: '6p⁺', neutrons: '6n', kshell: 'K (2e⁻)', lshell: 'L (4e⁻)', electron: 'Électron', ...opts.labels }
      const C = { noyau: '#F87171', electron: '#60A5FA', orbit: 'rgba(255,255,255,0.18)', kcolor: '#34D399', lcolor: '#FBC34A', ...opts.colors }
      const electrons = [
        // K shell (r=52): 2 électrons
        { r: 52, angle: 90, color: C.kcolor }, { r: 52, angle: 270, color: C.kcolor },
        // L shell (r=92): 4 électrons
        { r: 92, angle: 30,  color: C.lcolor }, { r: 92, angle: 120, color: C.lcolor },
        { r: 92, angle: 210, color: C.lcolor }, { r: 92, angle: 300, color: C.lcolor },
      ]
      const cx = 150, cy = 120
      const eDots = electrons.map(e => {
        const x = cx + e.r * Math.cos((e.angle * Math.PI) / 180)
        const y = cy + e.r * Math.sin((e.angle * Math.PI) / 180)
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${e.color}" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" style="font-family:system-ui,sans-serif">
  <!-- Orbites -->
  <circle cx="${cx}" cy="${cy}" r="52" fill="none" stroke="${C.orbit}" stroke-width="1.5"/>
  <circle cx="${cx}" cy="${cy}" r="92" fill="none" stroke="${C.orbit}" stroke-width="1.5"/>
  <!-- Noyau -->
  <circle cx="${cx}" cy="${cy}" r="22" fill="rgba(248,113,113,0.25)" stroke="${C.noyau}" stroke-width="2.5"/>
  <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="8" font-weight="bold" fill="${C.noyau}">${L.protons}</text>
  <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.6)">${L.neutrons}</text>
  <!-- Électrons -->
  ${eDots}
  <!-- Labels shells -->
  <text x="${cx + 50}" y="${cy - 56}" font-size="8" fill="${C.kcolor}">${L.kshell}</text>
  <text x="${cx + 88}" y="${cy - 96}" font-size="8" fill="${C.lcolor}">${L.lshell}</text>
  <!-- Titre -->
  <text x="${cx}" y="20" text-anchor="middle" font-size="11" font-weight="bold" fill="rgba(255,255,255,0.85)">${L.noyau} — Modèle de Bohr</text>
  <text x="10" y="230" font-size="7.5" fill="rgba(255,255,255,0.3)">Exemple : Carbone (Z=6)</text>
</svg>`
    },
  },

  {
    id: 'chi-tableau-periodique',
    titre: 'Tableau périodique (20 premiers)',
    categorie: 'chimie',
    toSvg: (opts = {}) => {
      const C = { metal: 'rgba(96,165,250,0.18)', nonmetal: 'rgba(52,211,153,0.18)', gaz: 'rgba(167,139,250,0.18)', metalBorder: '#60A5FA', nonmetalBorder: '#34D399', gazBorder: '#A78BFA', text: 'rgba(255,255,255,0.9)', ...opts.colors }
      const elements = [
        // Period 1
        { z: 1,  s: 'H',  n: 'Hydrogène',   type: 'nonmetal', col: 1, row: 1 },
        { z: 2,  s: 'He', n: 'Hélium',       type: 'gaz',      col: 18, row: 1 },
        // Period 2
        { z: 3,  s: 'Li', n: 'Lithium',      type: 'metal', col: 1, row: 2 },
        { z: 4,  s: 'Be', n: 'Béryllium',    type: 'metal', col: 2, row: 2 },
        { z: 5,  s: 'B',  n: 'Bore',         type: 'nonmetal', col: 13, row: 2 },
        { z: 6,  s: 'C',  n: 'Carbone',      type: 'nonmetal', col: 14, row: 2 },
        { z: 7,  s: 'N',  n: 'Azote',        type: 'nonmetal', col: 15, row: 2 },
        { z: 8,  s: 'O',  n: 'Oxygène',      type: 'nonmetal', col: 16, row: 2 },
        { z: 9,  s: 'F',  n: 'Fluor',        type: 'nonmetal', col: 17, row: 2 },
        { z: 10, s: 'Ne', n: 'Néon',         type: 'gaz',      col: 18, row: 2 },
        // Period 3
        { z: 11, s: 'Na', n: 'Sodium',       type: 'metal', col: 1, row: 3 },
        { z: 12, s: 'Mg', n: 'Magnésium',    type: 'metal', col: 2, row: 3 },
        { z: 13, s: 'Al', n: 'Aluminium',    type: 'metal', col: 13, row: 3 },
        { z: 14, s: 'Si', n: 'Silicium',     type: 'nonmetal', col: 14, row: 3 },
        { z: 15, s: 'P',  n: 'Phosphore',    type: 'nonmetal', col: 15, row: 3 },
        { z: 16, s: 'S',  n: 'Soufre',       type: 'nonmetal', col: 16, row: 3 },
        { z: 17, s: 'Cl', n: 'Chlore',       type: 'nonmetal', col: 17, row: 3 },
        { z: 18, s: 'Ar', n: 'Argon',        type: 'gaz',      col: 18, row: 3 },
        // Period 4
        { z: 19, s: 'K',  n: 'Potassium',    type: 'metal', col: 1, row: 4 },
        { z: 20, s: 'Ca', n: 'Calcium',      type: 'metal', col: 2, row: 4 },
      ]
      const cellW = 19, cellH = 28, startX = 6, startY = 22
      const colMap: Record<number, number> = { 1: 0, 2: 1, 13: 2, 14: 3, 15: 4, 16: 5, 17: 6, 18: 7 }
      const cells = elements.map(el => {
        const col = colMap[el.col] ?? 0
        const x = startX + col * (cellW + 2)
        const y = startY + (el.row - 1) * (cellH + 2)
        const bg = el.type === 'metal' ? C.metal : el.type === 'gaz' ? C.gaz : C.nonmetal
        const border = el.type === 'metal' ? C.metalBorder : el.type === 'gaz' ? C.gazBorder : C.nonmetalBorder
        return `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="2" fill="${bg}" stroke="${border}" stroke-width="0.8"/>
  <text x="${x + cellW / 2}" y="${y + 12}" text-anchor="middle" font-size="7" font-weight="bold" fill="${C.text}">${el.s}</text>
  <text x="${x + cellW / 2}" y="${y + 21}" text-anchor="middle" font-size="5.5" fill="rgba(255,255,255,0.5)">${el.z}</text>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 162" style="font-family:system-ui,sans-serif">
  <text x="90" y="14" text-anchor="middle" font-size="9" font-weight="bold" fill="rgba(255,255,255,0.8)">Tableau périodique — 20 premiers éléments</text>
  ${cells}
  <!-- Légende -->
  <rect x="6" y="148" width="10" height="8" rx="1" fill="${C.metal}" stroke="${C.metalBorder}" stroke-width="0.8"/>
  <text x="20" y="155" font-size="6.5" fill="rgba(255,255,255,0.6)">Métaux</text>
  <rect x="60" y="148" width="10" height="8" rx="1" fill="${C.nonmetal}" stroke="${C.nonmetalBorder}" stroke-width="0.8"/>
  <text x="74" y="155" font-size="6.5" fill="rgba(255,255,255,0.6)">Non-métaux</text>
  <rect x="126" y="148" width="10" height="8" rx="1" fill="${C.gaz}" stroke="${C.gazBorder}" stroke-width="0.8"/>
  <text x="140" y="155" font-size="6.5" fill="rgba(255,255,255,0.6)">Gaz nobles</text>
</svg>`
    },
  },

  // ── Échelle de pH ─────────────────────────────────────────────────────────
  {
    id: 'chi-ph-echelle',
    titre: 'Échelle de pH',
    categorie: 'chimie',
    toSvg: (opts = {}) => {
      const L = { titre: 'Échelle de pH', acide: 'Acide', neutre: 'Neutre', base: 'Base', ...opts.labels }
      const examples = [
        { ph: 2,  label: 'Citron',  y: 90  },
        { ph: 5,  label: 'Café',    y: 104 },
        { ph: 7,  label: 'Eau',     y: 118 },
        { ph: 9,  label: 'Savon',   y: 132 },
        { ph: 13, label: 'Soude',   y: 146 },
      ]
      const W = 260, barX = 20, barY = 30, barH = 20
      const phToX = (ph: number) => barX + (ph / 14) * W
      const stops = Array.from({ length: 15 }, (_, i) => {
        const h = i <= 6 ? Math.round(0 + i * 20) : i === 7 ? 120 : Math.round(120 + (i - 7) * 17)
        return `<stop offset="${(i / 14 * 100).toFixed(1)}%" stop-color="hsl(${h},80%,45%)"/>`
      }).join('')
      const ticks = Array.from({ length: 15 }, (_, i) => {
        const x = phToX(i)
        return `<line x1="${x}" y1="${barY + barH}" x2="${x}" y2="${barY + barH + 5}" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
  <text x="${x}" y="${barY + barH + 14}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.6)">${i}</text>`
      }).join('\n  ')
      const exHtml = examples.map(e => {
        const x = phToX(e.ph)
        return `<line x1="${x}" y1="${barY + barH}" x2="${x}" y2="${e.y}" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" stroke-dasharray="2,2"/>
  <text x="${x + 4}" y="${e.y + 4}" font-size="8" fill="rgba(255,255,255,0.75)">${e.label} (${e.ph})</text>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 165" style="font-family:system-ui,sans-serif">
  <defs><linearGradient id="phGrad" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient></defs>
  <text x="150" y="18" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.85)">${L.titre}</text>
  <rect x="${barX}" y="${barY}" width="${W}" height="${barH}" rx="4" fill="url(#phGrad)"/>
  <text x="${barX}" y="${barY - 4}" font-size="8" fill="#F87171">${L.acide}</text>
  <text x="${barX + W / 2}" y="${barY - 4}" text-anchor="middle" font-size="8" fill="#34D399">${L.neutre}</text>
  <text x="${barX + W}" y="${barY - 4}" text-anchor="end" font-size="8" fill="#60A5FA">${L.base}</text>
  ${ticks}
  ${exHtml}
</svg>`
    },
  },

  {
    id: 'chi-liaison-covalente',
    titre: 'Liaison covalente (H₂O)',
    categorie: 'chimie',
    toSvg: (opts = {}) => {
      const L = { titre: 'Liaison covalente — H₂O', partage: 'Doublet liant', libre: 'Doublet libre', H1: 'H', H2: 'H', O: 'O', ...opts.labels }
      const C = { O: '#60A5FA', H: '#34D399', bond: '#FBC34A', lone: '#A78BFA', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" style="font-family:system-ui,sans-serif">
  <text x="140" y="15" text-anchor="middle" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.85)">${L.titre}</text>
  <!-- Atome O (centre) -->
  <circle cx="140" cy="100" r="28" fill="rgba(96,165,250,0.18)" stroke="${C.O}" stroke-width="2.5"/>
  <text x="140" y="105" text-anchor="middle" font-size="14" font-weight="bold" fill="${C.O}">${L.O}</text>
  <!-- Atome H1 (gauche) -->
  <circle cx="66" cy="130" r="18" fill="rgba(52,211,153,0.18)" stroke="${C.H}" stroke-width="2"/>
  <text x="66" y="135" text-anchor="middle" font-size="12" font-weight="bold" fill="${C.H}">${L.H1}</text>
  <!-- Atome H2 (droite) -->
  <circle cx="214" cy="130" r="18" fill="rgba(52,211,153,0.18)" stroke="${C.H}" stroke-width="2"/>
  <text x="214" y="135" text-anchor="middle" font-size="12" font-weight="bold" fill="${C.H}">${L.H2}</text>
  <!-- Liaisons (paires partagées) -->
  <line x1="90" y1="118" x2="115" y2="110" stroke="${C.bond}" stroke-width="2.5"/>
  <line x1="165" y1="110" x2="190" y2="118" stroke="${C.bond}" stroke-width="2.5"/>
  <!-- Doublets liants (dots) -->
  <circle cx="100" cy="115" r="3.5" fill="${C.bond}"/>
  <circle cx="108" cy="112" r="3.5" fill="${C.bond}"/>
  <circle cx="172" cy="112" r="3.5" fill="${C.bond}"/>
  <circle cx="180" cy="115" r="3.5" fill="${C.bond}"/>
  <!-- Doublets libres de O -->
  <circle cx="128" cy="75" r="3.5" fill="${C.lone}"/>
  <circle cx="136" cy="72" r="3.5" fill="${C.lone}"/>
  <circle cx="144" cy="72" r="3.5" fill="${C.lone}"/>
  <circle cx="152" cy="75" r="3.5" fill="${C.lone}"/>
  <!-- Labels -->
  <text x="100" y="168" text-anchor="middle" font-size="8" fill="${C.bond}">${L.partage}</text>
  <text x="140" y="62" text-anchor="middle" font-size="8" fill="${C.lone}">${L.libre}</text>
  <!-- Angle de liaison -->
  <path d="M88,125 Q140,95 192,125" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="3,2"/>
  <text x="140" y="170" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.4)">Angle : 104,5°</text>
</svg>`
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// React component schemas chimie (SchemaProps API)
// ═══════════════════════════════════════════════════════════════════════════════

export function AtomeBohrSVG({ width = 300, height = 240, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps & { numeroAtomique?: number; symbole?: string; nom?: string }) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} fontSize={8} fill={col} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  const cx = 150, cy = 120
  const shells = [
    { r: 52, color: '#34D399', count: 2, label: 'K (2e⁻)' },
    { r: 92, color: couleurSecondaire, count: 4, label: 'L (4e⁻)' },
  ]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {shells.map(sh => (
        <circle key={sh.r} cx={cx} cy={cy} r={sh.r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
      ))}
      <circle cx={cx} cy={cy} r={22} fill="rgba(248,113,113,0.25)" stroke="#F87171" strokeWidth="2.5"/>
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#F87171" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('protons', '6p⁺')}>6p⁺</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.6)">6n</text>
      {shells.map(sh =>
        Array.from({ length: sh.count }, (_, i) => {
          const angle = (i / sh.count) * 2 * Math.PI - Math.PI / 2
          const ex = cx + sh.r * Math.cos(angle)
          const ey = cy + sh.r * Math.sin(angle)
          return <circle key={`${sh.r}-${i}`} cx={ex} cy={ey} r={5} fill={sh.color} stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
        })
      )}
      {showLabels && <>
        {lbl('kshell', 'K (2e⁻)', cx + 50, cy - 56, '#34D399')}
        {lbl('lshell', 'L (4e⁻)', cx + 88, cy - 96, couleurSecondaire)}
        <text x={cx} y={20} textAnchor="middle" fontSize={11} fontWeight="bold" fill="rgba(255,255,255,0.85)">Modèle de Bohr — Carbone</text>
      </>}
    </svg>
  )
}

export function TableauPeriodiqueSVG({ width = 380, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className }: SchemaProps) {
  const elements = [
    { z:1,  s:'H',  type:'nonmetal', col:1,  row:1 }, { z:2,  s:'He', type:'gaz',      col:18, row:1 },
    { z:3,  s:'Li', type:'metal',    col:1,  row:2 }, { z:4,  s:'Be', type:'metal',    col:2,  row:2 },
    { z:5,  s:'B',  type:'nonmetal', col:13, row:2 }, { z:6,  s:'C',  type:'nonmetal', col:14, row:2 },
    { z:7,  s:'N',  type:'nonmetal', col:15, row:2 }, { z:8,  s:'O',  type:'nonmetal', col:16, row:2 },
    { z:9,  s:'F',  type:'nonmetal', col:17, row:2 }, { z:10, s:'Ne', type:'gaz',      col:18, row:2 },
    { z:11, s:'Na', type:'metal',    col:1,  row:3 }, { z:12, s:'Mg', type:'metal',    col:2,  row:3 },
    { z:13, s:'Al', type:'metal',    col:13, row:3 }, { z:14, s:'Si', type:'nonmetal', col:14, row:3 },
    { z:15, s:'P',  type:'nonmetal', col:15, row:3 }, { z:16, s:'S',  type:'nonmetal', col:16, row:3 },
    { z:17, s:'Cl', type:'nonmetal', col:17, row:3 }, { z:18, s:'Ar', type:'gaz',      col:18, row:3 },
    { z:19, s:'K',  type:'metal',    col:1,  row:4 }, { z:20, s:'Ca', type:'metal',    col:2,  row:4 },
  ]
  const colMap: Record<number, number> = { 1:0, 2:1, 13:2, 14:3, 15:4, 16:5, 17:6, 18:7 }
  const cellW = 28, cellH = 36, startX = 8, startY = 26
  const colors = { metal: { bg:'rgba(96,165,250,0.18)', border:'#60A5FA' }, nonmetal: { bg:'rgba(52,211,153,0.18)', border:'#34D399' }, gaz: { bg:'rgba(167,139,250,0.18)', border:'#A78BFA' } }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 175" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <text x="135" y="18" textAnchor="middle" fontSize={9} fontWeight="bold" fill="rgba(255,255,255,0.8)">Tableau périodique — 20 premiers éléments</text>
      {elements.map(el => {
        const col = colMap[el.col] ?? 0
        const x = startX + col * (cellW + 2)
        const y = startY + (el.row - 1) * (cellH + 2)
        const c = colors[el.type as keyof typeof colors]
        return (
          <g key={el.z} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(el.s, `${el.s} (Z=${el.z})`)}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={3} fill={c.bg} stroke={c.border} strokeWidth="0.8"/>
            <text x={x + cellW/2} y={y + 16} textAnchor="middle" fontSize={9} fontWeight="bold" fill="rgba(255,255,255,0.9)">{el.s}</text>
            <text x={x + cellW/2} y={y + 26} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.5)">{el.z}</text>
          </g>
        )
      })}
      {showLabels && <>
        <rect x="8" y="155" width="12" height="9" rx="1" fill={colors.metal.bg} stroke={colors.metal.border} strokeWidth="0.8"/>
        <text x="24" y="163" fontSize={7} fill="rgba(255,255,255,0.6)">Métaux</text>
        <rect x="75" y="155" width="12" height="9" rx="1" fill={colors.nonmetal.bg} stroke={colors.nonmetal.border} strokeWidth="0.8"/>
        <text x="91" y="163" fontSize={7} fill="rgba(255,255,255,0.6)">Non-métaux</text>
        <rect x="160" y="155" width="12" height="9" rx="1" fill={colors.gaz.bg} stroke={colors.gaz.border} strokeWidth="0.8"/>
        <text x="176" y="163" fontSize={7} fill="rgba(255,255,255,0.6)">Gaz nobles</text>
      </>}
    </svg>
  )
}

export function MoleculeEauSVG({ width = 280, height = 180, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#34D399', onLabelClick, className }: SchemaProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <text x="140" y="15" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.85)">Liaison covalente — H₂O</text>
      <circle cx="140" cy="100" r="28" fill="rgba(96,165,250,0.18)" stroke={couleurPrimaire} strokeWidth="2.5"/>
      <circle cx="66" cy="130" r="18" fill="rgba(52,211,153,0.18)" stroke={couleurSecondaire} strokeWidth="2"/>
      <circle cx="214" cy="130" r="18" fill="rgba(52,211,153,0.18)" stroke={couleurSecondaire} strokeWidth="2"/>
      <line x1="90" y1="118" x2="115" y2="110" stroke="#FBC34A" strokeWidth="2.5"/>
      <line x1="165" y1="110" x2="190" y2="118" stroke="#FBC34A" strokeWidth="2.5"/>
      <circle cx="100" cy="115" r="3.5" fill="#FBC34A"/>
      <circle cx="108" cy="112" r="3.5" fill="#FBC34A"/>
      <circle cx="172" cy="112" r="3.5" fill="#FBC34A"/>
      <circle cx="180" cy="115" r="3.5" fill="#FBC34A"/>
      <circle cx="128" cy="75" r="3.5" fill="#A78BFA"/>
      <circle cx="136" cy="72" r="3.5" fill="#A78BFA"/>
      <circle cx="144" cy="72" r="3.5" fill="#A78BFA"/>
      <circle cx="152" cy="75" r="3.5" fill="#A78BFA"/>
      {showLabels && <>
        <text x="140" y="105" textAnchor="middle" fontSize={14} fontWeight="bold" fill={couleurPrimaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('O','Oxygène')}>O</text>
        <text x="66" y="135" textAnchor="middle" fontSize={12} fontWeight="bold" fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('H1','Hydrogène')}>H</text>
        <text x="214" y="135" textAnchor="middle" fontSize={12} fontWeight="bold" fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('H2','Hydrogène')}>H</text>
        <text x="100" y="168" textAnchor="middle" fontSize={8} fill="#FBC34A">Doublet liant</text>
        <text x="140" y="62" textAnchor="middle" fontSize={8} fill="#A78BFA">Doublet libre</text>
        <text x="140" y="170" textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.4)">Angle : 104,5°</text>
      </>}
    </svg>
  )
}

export function PhEchelleSVG({ width = 300, height = 165, showLabels = true, couleurPrimaire = '#60A5FA', onLabelClick, className }: SchemaProps) {
  const W = 260, barX = 20, barY = 30, barH = 20
  const phToX = (ph: number) => barX + (ph / 14) * W
  const examples = [
    { ph: 2,  label: 'Citron',  color: '#F87171' },
    { ph: 5,  label: 'Café',    color: '#FBC34A' },
    { ph: 7,  label: 'Eau',     color: '#34D399' },
    { ph: 9,  label: 'Savon',   color: '#60A5FA' },
    { ph: 13, label: 'Soude',   color: '#A78BFA' },
  ]
  const hues = Array.from({ length: 100 }, (_, i) => {
    const ph = i / 99 * 14
    const h = ph <= 6 ? Math.round(ph * 20) : ph <= 7 ? 120 : Math.round(120 + (ph - 7) * 17)
    return `hsl(${h},80%,45%) ${i}%`
  }).join(', ')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 165" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <defs>
        <linearGradient id="phGradComp" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#EF4444"/>
          <stop offset="25%"  stopColor="#F97316"/>
          <stop offset="50%"  stopColor="#34D399"/>
          <stop offset="75%"  stopColor="#22D3EE"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
      </defs>
      <text x="150" y="18" textAnchor="middle" fontSize={10} fontWeight="bold" fill="rgba(255,255,255,0.85)">Échelle de pH</text>
      <rect x={barX} y={barY} width={W} height={barH} rx={4} fill="url(#phGradComp)"/>
      {showLabels && <>
        <text x={barX}       y={barY - 4} fontSize={8} fill="#F87171">← Acide</text>
        <text x={barX + W/2} y={barY - 4} textAnchor="middle" fontSize={8} fill="#34D399">Neutre</text>
        <text x={barX + W}   y={barY - 4} textAnchor="end"    fontSize={8} fill="#6366F1">Base →</text>
      </>}
      {Array.from({ length: 15 }, (_, i) => (
        <g key={i}>
          <line x1={phToX(i)} y1={barY + barH} x2={phToX(i)} y2={barY + barH + 5} stroke="rgba(255,255,255,0.4)" strokeWidth="0.8"/>
          <text x={phToX(i)} y={barY + barH + 14} textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.6)">{i}</text>
        </g>
      ))}
      {examples.map((e, idx) => {
        const x = phToX(e.ph)
        const y = 75 + idx * 16
        return (
          <g key={e.label}>
            <line x1={x} y1={barY + barH} x2={x} y2={y - 4} stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" strokeDasharray="2,2"/>
            <text x={x + 4} y={y} fontSize={8} fill={e.color} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(e.label, `${e.label} — pH ${e.ph}`)}>{e.label} ({e.ph})</text>
          </g>
        )
      })}
    </svg>
  )
}
