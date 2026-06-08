// ─── KlassIA+ — Schémas SVG Diagrammes ───────────────────────────────────────
import type { SchemaItem } from './index'

export const DIAGRAMMES_SCHEMAS: SchemaItem[] = [
  {
    id: 'diag-venn',
    titre: 'Diagramme de Venn',
    categorie: 'diagrammes',
    toSvg: (opts = {}) => {
      const L = { A: 'A', B: 'B', intersection: 'A ∩ B', univers: 'U', seulA: 'Uniquement A', seulB: 'Uniquement B', commun: 'Communs', ...opts.labels }
      const C = { A: '#60A5FA', B: '#A78BFA', intersection: 'rgba(52,211,153,0.7)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.2)', text: 'rgba(255,255,255,0.85)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180" style="font-family:system-ui,sans-serif">
  <!-- Univers -->
  <rect x="5" y="10" width="290" height="155" rx="8" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
  <text x="15" y="26" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.5)">${L.univers}</text>
  <!-- Cercle A -->
  <circle cx="118" cy="95" r="58" fill="rgba(96,165,250,0.10)" stroke="${C.A}" stroke-width="2"/>
  <!-- Cercle B -->
  <circle cx="182" cy="95" r="58" fill="rgba(167,139,250,0.10)" stroke="${C.B}" stroke-width="2"/>
  <!-- Zone intersection (re-colorée) -->
  <clipPath id="clipA"><circle cx="118" cy="95" r="58"/></clipPath>
  <circle cx="182" cy="95" r="58" fill="rgba(52,211,153,0.12)" stroke="none" clip-path="url(#clipA)"/>
  <!-- Labels -->
  <text x="90" y="95" text-anchor="middle" font-size="22" font-weight="bold" fill="${C.A}">${L.A}</text>
  <text x="210" y="95" text-anchor="middle" font-size="22" font-weight="bold" fill="${C.B}">${L.B}</text>
  <text x="150" y="92" text-anchor="middle" font-size="8.5" fill="${C.intersection}">${L.intersection}</text>
  <text x="78" y="140" text-anchor="middle" font-size="7.5" fill="${C.A}" opacity="0.7">${L.seulA}</text>
  <text x="222" y="140" text-anchor="middle" font-size="7.5" fill="${C.B}" opacity="0.7">${L.seulB}</text>
</svg>`
    },
  },

  {
    id: 'diag-frise',
    titre: 'Frise chronologique',
    categorie: 'diagrammes',
    toSvg: (opts = {}) => {
      const defaultEvents = [
        { date: '1000', label: 'Événement 1', pos: 0.05 },
        { date: '1300', label: 'Événement 2', pos: 0.25 },
        { date: '1500', label: 'Événement 3', pos: 0.42 },
        { date: '1789', label: 'Événement 4', pos: 0.64 },
        { date: '1900', label: 'Événement 5', pos: 0.83 },
      ]
      const events = (opts as any).events || defaultEvents
      const L = { titre: 'Frise chronologique', ...opts.labels }
      const C = { axis: '#60A5FA', event: '#FBC34A', line: 'rgba(255,255,255,0.3)', text: 'rgba(255,255,255,0.85)', date: 'rgba(255,255,255,0.55)', ...opts.colors }
      const axisY = 110, startX = 20, endX = 360, width = endX - startX
      const items = events.map((e: any, i: number) => {
        const x = startX + e.pos * width
        const above = i % 2 === 0
        const labelY = above ? axisY - 28 : axisY + 38
        const lineY1 = above ? axisY - 10 : axisY + 10
        const lineY2 = above ? axisY - 24 : axisY + 24
        return `<line x1="${x}" y1="${lineY1}" x2="${x}" y2="${lineY2}" stroke="${C.event}" stroke-width="1.5"/>
  <circle cx="${x}" cy="${axisY}" r="5" fill="${C.event}" stroke="${C.axis}" stroke-width="1.5"/>
  <text x="${x}" y="${labelY}" text-anchor="middle" font-size="8" fill="${C.event}">${e.label}</text>
  <text x="${x}" y="${above ? axisY + 20 : axisY - 8}" text-anchor="middle" font-size="7.5" fill="${C.date}">${e.date}</text>`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 170" style="font-family:system-ui,sans-serif">
  <text x="190" y="18" text-anchor="middle" font-size="11" font-weight="bold" fill="rgba(255,255,255,0.8)">${L.titre}</text>
  <!-- Axe -->
  <line x1="${startX}" y1="${axisY}" x2="${endX}" y2="${axisY}" stroke="${C.axis}" stroke-width="2.5" marker-end="url(#atl)" marker-start="url(#atlr)"/>
  ${items}
  <defs>
    <marker id="atl"  viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
    <marker id="atlr" viewBox="0 0 8 8" refX="2" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 Z" fill="${C.axis}"/></marker>
  </defs>
  <text x="190" y="160" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.25)">Temps →</text>
</svg>`
    },
  },

  {
    id: 'diag-organigramme',
    titre: 'Organigramme',
    categorie: 'diagrammes',
    toSvg: (opts = {}) => {
      const L = { niveau1: 'Direction', n2a: 'Dép. A', n2b: 'Dép. B', n2c: 'Dép. C', n3a: 'Poste 1', n3b: 'Poste 2', n3c: 'Poste 3', n3d: 'Poste 4', n3e: 'Poste 5', n3f: 'Poste 6', ...opts.labels }
      const C = { top: '#6B3FA0', mid: '#60A5FA', bottom: 'rgba(96,165,250,0.6)', line: 'rgba(255,255,255,0.3)', textTop: 'white', textMid: 'white', textBot: 'rgba(255,255,255,0.85)', ...opts.colors }
      const bw = 68, bh = 26, gap = 10
      const n1x = 150, n1y = 20
      const n2ys = 80
      const n2xs = [50, 150, 250]
      const n3y = 140
      const n3xs = [18, 88, 118, 188, 218, 288]
      const midRects = n2xs.map((x, i) => `<rect x="${x - bw / 2}" y="${n2ys}" width="${bw}" height="${bh}" rx="5" fill="rgba(96,165,250,0.18)" stroke="${C.mid}" stroke-width="1.5"/>
  <text x="${x}" y="${n2ys + 16}" text-anchor="middle" font-size="9" font-weight="600" fill="${C.textMid}">${[L.n2a, L.n2b, L.n2c][i]}</text>`).join('\n  ')
      const botRects = n3xs.map((x, i) => `<rect x="${x}" y="${n3y}" width="${bw - 6}" height="${bh - 2}" rx="4" fill="rgba(96,165,250,0.08)" stroke="${C.mid}" stroke-width="1" opacity="0.7"/>
  <text x="${x + (bw - 6) / 2}" y="${n3y + 14}" text-anchor="middle" font-size="8" fill="${C.textBot}">${[L.n3a, L.n3b, L.n3c, L.n3d, L.n3e, L.n3f][i]}</text>`).join('\n  ')
      const lines1 = n2xs.map(x => `<line x1="${n1x}" y1="${n1y + bh}" x2="${x}" y2="${n2ys}" stroke="${C.line}" stroke-width="1.5"/>`).join('\n  ')
      const lines2 = [
        `<line x1="${n2xs[0]}" y1="${n2ys + bh}" x2="${n3xs[0] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
        `<line x1="${n2xs[0]}" y1="${n2ys + bh}" x2="${n3xs[1] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
        `<line x1="${n2xs[1]}" y1="${n2ys + bh}" x2="${n3xs[2] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
        `<line x1="${n2xs[1]}" y1="${n2ys + bh}" x2="${n3xs[3] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
        `<line x1="${n2xs[2]}" y1="${n2ys + bh}" x2="${n3xs[4] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
        `<line x1="${n2xs[2]}" y1="${n2ys + bh}" x2="${n3xs[5] + (bw - 6) / 2}" y2="${n3y}" stroke="${C.line}" stroke-width="1.2"/>`,
      ].join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 185" style="font-family:system-ui,sans-serif">
  <!-- Niveau 1 -->
  <rect x="${n1x - bw / 2}" y="${n1y}" width="${bw}" height="${bh}" rx="6" fill="rgba(107,63,160,0.35)" stroke="#8B5CF6" stroke-width="2"/>
  <text x="${n1x}" y="${n1y + 16}" text-anchor="middle" font-size="9" font-weight="700" fill="${C.textTop}">${L.niveau1}</text>
  ${lines1}
  <!-- Niveau 2 -->
  ${midRects}
  ${lines2}
  <!-- Niveau 3 -->
  ${botRects}
</svg>`
    },
  },

  {
    id: 'diag-ishikawa',
    titre: 'Diagramme cause-effet',
    categorie: 'diagrammes',
    toSvg: (opts = {}) => {
      const L = { effet: 'Effet / Problème', matiere: 'Matière', methode: 'Méthode', mainoeuvre: "Main-d'œuvre", machine: 'Machine', milieu: 'Milieu', mesure: 'Mesure', ...opts.labels }
      const C = { spine: '#60A5FA', branch: '#A78BFA', arrowHead: '#60A5FA', effect: '#F87171', text: 'rgba(255,255,255,0.85)', branchText: 'rgba(255,255,255,0.7)', ...opts.colors }
      const cx = 340, cy = 100, spineEnd = 55
      const branches = [
        { x: 120, angle: -40, label: L.matiere,    sub: ['Qualité', 'Stock'] },
        { x: 200, angle: -40, label: L.methode,    sub: ['Process', 'Standard'] },
        { x: 280, angle: -40, label: L.mainoeuvre, sub: ['Formation', 'Exp.'] },
        { x: 120, angle:  40, label: L.machine,    sub: ['Entretien', 'Âge'] },
        { x: 200, angle:  40, label: L.milieu,     sub: ['Espace', 'Temp.'] },
        { x: 280, angle:  40, label: L.mesure,     sub: ['Précision', 'Outil'] },
      ]
      const branchSvg = branches.map(b => {
        const rad = (b.angle * Math.PI) / 180
        const bx = b.x + 60 * Math.cos(rad), by = cy + 60 * Math.sin(rad)
        const above = b.angle < 0
        const labelY = above ? by - 8 : by + 16
        const subLines = b.sub.map((s, si) => {
          const sx = b.x + (30 + si * 30) * Math.cos(rad) + (above ? -20 : 20) * Math.sin(Math.abs(rad))
          const sy = cy + (30 + si * 30) * Math.sin(rad) + (above ? -14 : 14)
          return `<line x1="${(b.x + (si * 30) * Math.cos(rad)).toFixed(0)}" y1="${(cy + (si * 30) * Math.sin(rad)).toFixed(0)}" x2="${sx.toFixed(0)}" y2="${sy.toFixed(0)}" stroke="rgba(167,139,250,0.5)" stroke-width="1"/>
  <text x="${sx.toFixed(0)}" y="${(sy + (above ? -3 : 10)).toFixed(0)}" font-size="7" fill="rgba(255,255,255,0.45)">${s}</text>`
        }).join('\n  ')
        return `<line x1="${b.x}" y1="${cy}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${C.branch}" stroke-width="2"/>
  <text x="${bx.toFixed(1)}" y="${labelY}" text-anchor="middle" font-size="8.5" font-weight="600" fill="${C.branchText}">${b.label}</text>
  ${subLines}`
      }).join('\n  ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 200" style="font-family:system-ui,sans-serif">
  <!-- Épine principale -->
  <line x1="${spineEnd}" y1="${cy}" x2="${cx}" y2="${cy}" stroke="${C.spine}" stroke-width="3" marker-end="url(#aish)"/>
  <!-- Branches -->
  ${branchSvg}
  <!-- Boîte effet -->
  <rect x="${cx}" y="${cy - 22}" width="36" height="44" rx="5" fill="rgba(248,113,113,0.2)" stroke="${C.effect}" stroke-width="2"/>
  <text x="${cx + 18}" y="${cy - 4}" text-anchor="middle" font-size="7" font-weight="bold" fill="${C.effect}">${L.effet.split(' / ')[0]}</text>
  <text x="${cx + 18}" y="${cy + 10}" text-anchor="middle" font-size="7" fill="${C.effect}">${L.effet.split(' / ')[1] || ''}</text>
  <defs><marker id="aish" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="${C.arrowHead}"/></marker></defs>
</svg>`
    },
  },
]
