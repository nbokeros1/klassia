// ─── KlassIA+ — Schémas SVG Biologie ─────────────────────────────────────────
'use client'
import React from 'react'
import type { SchemaItem } from './index'
import type { SchemaProps } from './types'

export const BIOLOGIE_SCHEMAS: SchemaItem[] = [
  {
    id: 'bio-cellule-animale',
    titre: 'Cellule animale',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { membrane: 'Membrane plasmique', noyau: 'Noyau', nucleole: 'Nucléole', mitochondrie: 'Mitochondrie', golgi: 'App. de Golgi', cytoplasme: 'Cytoplasme', vacuole: 'Vacuole', ...opts.labels }
      const C = { primary: '#60A5FA', secondary: '#FBC34A', accent: '#A78BFA', green: '#34D399', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" style="font-family:system-ui,sans-serif">
  <ellipse cx="150" cy="102" rx="138" ry="88" fill="rgba(251,195,74,0.05)" stroke="${C.secondary}" stroke-width="2" stroke-dasharray="6,3"/>
  <ellipse cx="108" cy="95" rx="40" ry="34" fill="rgba(96,165,250,0.14)" stroke="${C.primary}" stroke-width="2"/>
  <ellipse cx="106" cy="93" rx="13" ry="11" fill="rgba(96,165,250,0.45)" stroke="${C.primary}" stroke-width="1.5"/>
  <ellipse cx="215" cy="68" rx="21" ry="10" fill="rgba(167,139,250,0.14)" stroke="${C.accent}" stroke-width="1.5"/>
  <path d="M197,68 Q215,60 233,68" fill="none" stroke="${C.accent}" stroke-width="0.8" stroke-dasharray="2,2"/>
  <ellipse cx="208" cy="142" rx="19" ry="9" fill="rgba(167,139,250,0.14)" stroke="${C.accent}" stroke-width="1.5" transform="rotate(-20,208,142)"/>
  <path d="M192,142 Q208,135 224,142" fill="none" stroke="${C.accent}" stroke-width="0.8" stroke-dasharray="2,2"/>
  <path d="M161,113 Q172,108 180,113" fill="none" stroke="${C.green}" stroke-width="2.5"/>
  <path d="M159,120 Q171,115 180,120" fill="none" stroke="${C.green}" stroke-width="2.5"/>
  <path d="M161,127 Q172,122 180,127" fill="none" stroke="${C.green}" stroke-width="2"/>
  <circle cx="250" cy="108" r="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" stroke-width="1"/>
  <text x="108" y="59" text-anchor="middle" font-size="9" fill="${C.primary}">${L.noyau}</text>
  <text x="106" y="94" text-anchor="middle" font-size="6.5" fill="rgba(255,255,255,0.75)">${L.nucleole}</text>
  <text x="215" y="52" text-anchor="middle" font-size="8" fill="${C.accent}">${L.mitochondrie}</text>
  <text x="173" y="137" font-size="8" fill="${C.green}">${L.golgi}</text>
  <text x="250" y="126" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.45)">${L.vacuole}</text>
  <text x="12" y="182" font-size="8.5" fill="${C.secondary}">${L.membrane}</text>
  <text x="150" y="182" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,0.3)">${L.cytoplasme}</text>
</svg>`
    },
  },

  {
    id: 'bio-cellule-vegetale',
    titre: 'Cellule végétale',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { paroi: 'Paroi cellulaire', membrane: 'Membrane', noyau: 'Noyau', vacuole: 'Vacuole centrale', chloroplaste: 'Chloroplaste', ...opts.labels }
      const C = { primary: '#60A5FA', secondary: '#FBC34A', green: '#34D399', brown: '#92400E', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" style="font-family:system-ui,sans-serif">
  <rect x="14" y="14" width="272" height="172" rx="6" fill="rgba(146,64,14,0.10)" stroke="#B45309" stroke-width="3"/>
  <rect x="21" y="21" width="258" height="158" rx="4" fill="rgba(251,195,74,0.03)" stroke="${C.secondary}" stroke-width="1.5" stroke-dasharray="5,3"/>
  <rect x="80" y="60" width="148" height="96" rx="5" fill="rgba(96,165,250,0.10)" stroke="${C.primary}" stroke-width="1.5"/>
  <ellipse cx="72" cy="52" rx="26" ry="20" fill="rgba(96,165,250,0.18)" stroke="${C.primary}" stroke-width="1.8"/>
  <ellipse cx="70" cy="50" rx="9" ry="7" fill="rgba(96,165,250,0.45)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="170" cy="38" rx="18" ry="9" fill="rgba(52,211,153,0.20)" stroke="${C.green}" stroke-width="1.5"/>
  <ellipse cx="230" cy="145" rx="17" ry="8" fill="rgba(52,211,153,0.20)" stroke="${C.green}" stroke-width="1.5"/>
  <ellipse cx="45" cy="140" rx="16" ry="8" fill="rgba(52,211,153,0.20)" stroke="${C.green}" stroke-width="1.5" transform="rotate(-15,45,140)"/>
  <text x="150" y="114" text-anchor="middle" font-size="9" fill="${C.primary}">${L.vacuole}</text>
  <text x="72" y="34" text-anchor="middle" font-size="8" fill="${C.primary}">${L.noyau}</text>
  <text x="170" y="28" text-anchor="middle" font-size="8" fill="${C.green}">${L.chloroplaste}</text>
  <text x="14" y="9" font-size="8.5" fill="#B45309">${L.paroi}</text>
  <text x="150" y="192" text-anchor="middle" font-size="8" fill="${C.secondary}">${L.membrane}</text>
</svg>`
    },
  },

  {
    id: 'bio-adn',
    titre: 'Structure ADN',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { brin1: "Brin 5'→3'", brin2: "Brin 3'→5'", pairGC: 'G — C', pairAT: 'A — T', phosphate: 'Phosphate', ...opts.labels }
      const C = { blue: '#60A5FA', green: '#34D399', amber: '#FBC34A', violet: '#A78BFA', ...opts.colors }
      const pairs = [
        { y: 30,  la: 'G', lb: 'C', color: C.green },
        { y: 55,  la: 'A', lb: 'T', color: C.blue  },
        { y: 80,  la: 'T', lb: 'A', color: C.blue  },
        { y: 105, la: 'C', lb: 'G', color: C.green },
        { y: 130, la: 'G', lb: 'C', color: C.green },
        { y: 155, la: 'A', lb: 'T', color: C.blue  },
        { y: 180, la: 'T', lb: 'A', color: C.blue  },
      ]
      const pairsHtml = pairs.map(p => {
        const amp = 36, cx = 150
        const t = ((p.y - 30) / 160) * Math.PI * 2.5
        const x1 = cx - amp * Math.sin(t)
        const x2 = cx + amp * Math.sin(t)
        return `<line x1="${x1.toFixed(1)}" y1="${p.y}" x2="${x2.toFixed(1)}" y2="${p.y}" stroke="${p.color}" stroke-width="2" stroke-dasharray="3,2"/>
  <text x="${(x1 - 10).toFixed(1)}" y="${p.y + 4}" text-anchor="middle" font-size="9" fill="${p.color}">${p.la}</text>
  <text x="${(x2 + 10).toFixed(1)}" y="${p.y + 4}" text-anchor="middle" font-size="9" fill="${p.color}">${p.lb}</text>`
      }).join('\n  ')
      const strand1 = Array.from({ length: 50 }, (_, i) => {
        const t = (i / 49) * Math.PI * 2.5
        const x = 150 - 36 * Math.sin(t)
        const y = 30 + (i / 49) * 160
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
      const strand2 = Array.from({ length: 50 }, (_, i) => {
        const t = (i / 49) * Math.PI * 2.5
        const x = 150 + 36 * Math.sin(t)
        const y = 30 + (i / 49) * 160
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220" style="font-family:system-ui,sans-serif">
  <path d="${strand1}" fill="none" stroke="${C.amber}" stroke-width="2.5"/>
  <path d="${strand2}" fill="none" stroke="${C.violet}" stroke-width="2.5"/>
  ${pairsHtml}
  <text x="66" y="15" text-anchor="middle" font-size="8" fill="${C.amber}">${L.brin1}</text>
  <text x="234" y="15" text-anchor="middle" font-size="8" fill="${C.violet}">${L.brin2}</text>
  <text x="10" y="55" font-size="7.5" fill="${C.green}">${L.pairGC}</text>
  <text x="10" y="80" font-size="7.5" fill="${C.blue}">${L.pairAT}</text>
  <text x="10" y="105" font-size="7.5" fill="${C.blue}">${L.pairAT.replace('A', 'T').replace('T', 'A')}</text>
  <text x="246" y="214" font-size="7.5" fill="${C.amber}">${L.phosphate}</text>
</svg>`
    },
  },

  // ── Système respiratoire ─────────────────────────────────────────────────
  {
    id: 'bio-systeme-respiratoire',
    titre: 'Système respiratoire',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { trachee: 'Trachée', bronche_d: 'Bronche droite', bronche_g: 'Bronche gauche', poumon_d: 'Poumon droit', poumon_g: 'Poumon gauche', diaphragme: 'Diaphragme', alvéoles: 'Alvéoles', ...opts.labels }
      const C = { primary: '#60A5FA', blue: '#93C5FD', trachee: '#A78BFA', diaphragme: '#F87171', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" style="font-family:system-ui,sans-serif">
  <!-- Trachée -->
  <rect x="140" y="10" width="20" height="55" rx="10" fill="rgba(167,139,250,0.15)" stroke="${C.trachee}" stroke-width="2"/>
  <!-- Bronche gauche -->
  <path d="M140,62 Q100,70 80,90" fill="none" stroke="${C.trachee}" stroke-width="3"/>
  <!-- Bronche droite -->
  <path d="M160,62 Q200,70 220,90" fill="none" stroke="${C.trachee}" stroke-width="3"/>
  <!-- Poumon gauche -->
  <ellipse cx="75" cy="145" rx="55" ry="68" fill="rgba(96,165,250,0.12)" stroke="${C.primary}" stroke-width="2"/>
  <!-- Bronchioles gauches -->
  <path d="M80,90 Q70,110 65,130" fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="4,2"/>
  <path d="M80,90 Q85,118 90,135" fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="4,2"/>
  <!-- Poumon droit -->
  <ellipse cx="225" cy="145" rx="55" ry="68" fill="rgba(96,165,250,0.12)" stroke="${C.primary}" stroke-width="2"/>
  <!-- Bronchioles droites -->
  <path d="M220,90 Q215,115 210,135" fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="4,2"/>
  <path d="M220,90 Q230,118 235,135" fill="none" stroke="${C.blue}" stroke-width="1.5" stroke-dasharray="4,2"/>
  <!-- Diaphragme -->
  <path d="M20,215 Q150,235 280,215" fill="none" stroke="${C.diaphragme}" stroke-width="3"/>
  <!-- Labels -->
  <text x="150" y="8" text-anchor="middle" font-size="8" fill="${C.trachee}">${L.trachee}</text>
  <text x="75" y="78" text-anchor="middle" font-size="7.5" fill="${C.trachee}">${L.bronche_g}</text>
  <text x="225" y="78" text-anchor="middle" font-size="7.5" fill="${C.trachee}">${L.bronche_d}</text>
  <text x="75" y="218" text-anchor="middle" font-size="8" fill="${C.primary}">${L.poumon_g}</text>
  <text x="225" y="218" text-anchor="middle" font-size="8" fill="${C.primary}">${L.poumon_d}</text>
  <text x="150" y="238" text-anchor="middle" font-size="8" fill="${C.diaphragme}">${L.diaphragme}</text>
</svg>`
    },
  },

  // ── Système circulatoire ──────────────────────────────────────────────────
  {
    id: 'bio-systeme-circulatoire',
    titre: 'Système circulatoire',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { coeur: 'Cœur', aorte: 'Aorte', veine_cave: 'V. cave', od: 'OD', og: 'OG', vd: 'VD', vg: 'VG', arteres: 'Artères', veines: 'Veines', ...opts.labels }
      const C = { artere: '#F87171', veine: '#60A5FA', coeur: '#EF4444', chambre: 'rgba(239,68,68,0.2)', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" style="font-family:system-ui,sans-serif">
  <!-- Artères vers le haut -->
  <path d="M155,90 Q155,50 150,20" fill="none" stroke="${C.artere}" stroke-width="3"/>
  <path d="M155,90 Q180,60 200,30" fill="none" stroke="${C.artere}" stroke-width="2"/>
  <path d="M145,90 Q120,60 100,30" fill="none" stroke="${C.artere}" stroke-width="2"/>
  <!-- Artères vers le bas -->
  <path d="M145,165 Q130,200 120,230" fill="none" stroke="${C.artere}" stroke-width="2.5"/>
  <path d="M155,165 Q170,200 180,230" fill="none" stroke="${C.artere}" stroke-width="2.5"/>
  <!-- Veines -->
  <path d="M140,90 Q80,70 60,40" fill="none" stroke="${C.veine}" stroke-width="2"/>
  <path d="M145,165 Q80,190 70,220" fill="none" stroke="${C.veine}" stroke-width="2"/>
  <path d="M155,165 Q230,190 240,220" fill="none" stroke="${C.veine}" stroke-width="2"/>
  <!-- Cœur -->
  <rect x="112" y="88" width="76" height="78" rx="12" fill="rgba(239,68,68,0.12)" stroke="${C.coeur}" stroke-width="2.5"/>
  <!-- 4 chambres -->
  <rect x="116" y="92" width="33" height="34" rx="6" fill="${C.chambre}" stroke="${C.coeur}" stroke-width="1.5"/>
  <rect x="151" y="92" width="33" height="34" rx="6" fill="${C.chambre}" stroke="${C.coeur}" stroke-width="1.5"/>
  <rect x="116" y="128" width="33" height="34" rx="6" fill="rgba(239,68,68,0.35)" stroke="${C.coeur}" stroke-width="1.5"/>
  <rect x="151" y="128" width="33" height="34" rx="6" fill="rgba(239,68,68,0.35)" stroke="${C.coeur}" stroke-width="1.5"/>
  <!-- Labels chambres -->
  <text x="133" y="112" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.8)">${L.od}</text>
  <text x="168" y="112" text-anchor="middle" font-size="7" fill="rgba(255,255,255,0.8)">${L.og}</text>
  <text x="133" y="148" text-anchor="middle" font-size="7" fill="white">${L.vd}</text>
  <text x="168" y="148" text-anchor="middle" font-size="7" fill="white">${L.vg}</text>
  <!-- Labels extérieurs -->
  <text x="155" y="16" text-anchor="middle" font-size="8" fill="${C.artere}">${L.aorte}</text>
  <text x="62" y="36" font-size="8" fill="${C.veine}">${L.veine_cave}</text>
  <text x="15" y="120" font-size="8" fill="${C.artere}">${L.arteres}</text>
  <text x="255" y="120" font-size="8" fill="${C.veine}">${L.veines}</text>
</svg>`
    },
  },

  // ── Corps humain ──────────────────────────────────────────────────────────
  {
    id: 'bio-corps-humain',
    titre: 'Corps humain — organes',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { cerveau: 'Cerveau', coeur: 'Cœur', poumons: 'Poumons', estomac: 'Estomac', foie: 'Foie', intestins: 'Intestins', reins: 'Reins', ...opts.labels }
      const C = { skin: 'rgba(255,255,255,0.06)', outline: 'rgba(255,255,255,0.25)', cerveau: '#A78BFA', coeur: '#F87171', poumon: '#60A5FA', estomac: '#34D399', foie: '#B45309', intestin: '#FBC34A', rein: '#F472B6', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 360" style="font-family:system-ui,sans-serif">
  <!-- Silhouette -->
  <ellipse cx="100" cy="28" rx="22" ry="24" fill="${C.skin}" stroke="${C.outline}" stroke-width="1.5"/>
  <rect x="70" y="50" width="60" height="5" rx="2" fill="${C.skin}" stroke="${C.outline}" stroke-width="1"/>
  <path d="M72,55 Q60,80 58,160 Q70,180 100,182 Q130,180 142,160 Q140,80 128,55 Z" fill="${C.skin}" stroke="${C.outline}" stroke-width="1.5"/>
  <path d="M72,55 Q50,60 38,110 Q35,130 48,135 Q60,140 68,115 Q68,80 72,55" fill="${C.skin}" stroke="${C.outline}" stroke-width="1"/>
  <path d="M128,55 Q150,60 162,110 Q165,130 152,135 Q140,140 132,115 Q132,80 128,55" fill="${C.skin}" stroke="${C.outline}" stroke-width="1"/>
  <path d="M80,182 Q72,230 70,290 Q75,310 85,310 Q95,310 100,280 Q105,310 115,310 Q125,310 130,290 Q128,230 120,182 Z" fill="${C.skin}" stroke="${C.outline}" stroke-width="1.5"/>
  <!-- Cerveau -->
  <ellipse cx="100" cy="22" rx="16" ry="14" fill="rgba(167,139,250,0.35)" stroke="${C.cerveau}" stroke-width="1.5"/>
  <!-- Poumons -->
  <ellipse cx="84" cy="90" rx="14" ry="22" fill="rgba(96,165,250,0.25)" stroke="${C.poumon}" stroke-width="1.5"/>
  <ellipse cx="116" cy="90" rx="14" ry="22" fill="rgba(96,165,250,0.25)" stroke="${C.poumon}" stroke-width="1.5"/>
  <!-- Cœur -->
  <ellipse cx="95" cy="88" rx="9" ry="10" fill="rgba(248,113,113,0.4)" stroke="${C.coeur}" stroke-width="1.5"/>
  <!-- Foie -->
  <ellipse cx="113" cy="122" rx="18" ry="12" fill="rgba(180,83,9,0.3)" stroke="${C.foie}" stroke-width="1.5"/>
  <!-- Estomac -->
  <ellipse cx="90" cy="128" rx="13" ry="11" fill="rgba(52,211,153,0.25)" stroke="${C.estomac}" stroke-width="1.5"/>
  <!-- Intestins -->
  <path d="M82,148 Q72,165 80,178 Q92,185 108,178 Q118,165 108,148 Q98,158 82,148" fill="rgba(251,195,74,0.2)" stroke="${C.intestin}" stroke-width="1.5"/>
  <!-- Reins -->
  <ellipse cx="79" cy="140" rx="7" ry="10" fill="rgba(244,114,182,0.25)" stroke="${C.rein}" stroke-width="1.2"/>
  <ellipse cx="121" cy="140" rx="7" ry="10" fill="rgba(244,114,182,0.25)" stroke="${C.rein}" stroke-width="1.2"/>
  <!-- Labels avec lignes pointillées -->
  <line x1="116" y1="22" x2="148" y2="14" stroke="rgba(167,139,250,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="150" y="17" font-size="8" fill="${C.cerveau}">${L.cerveau}</text>
  <line x1="104" y1="84" x2="148" y2="75" stroke="rgba(248,113,113,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="150" y="78" font-size="8" fill="${C.coeur}">${L.coeur}</text>
  <line x1="96" y1="77" x2="25" y2="68" stroke="rgba(96,165,250,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="2" y="71" font-size="8" fill="${C.poumon}">${L.poumons}</text>
  <line x1="90" y1="136" x2="25" y2="128" stroke="rgba(52,211,153,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="2" y="131" font-size="8" fill="${C.estomac}">${L.estomac}</text>
  <line x1="113" y1="130" x2="148" y2="122" stroke="rgba(180,83,9,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="150" y="125" font-size="8" fill="${C.foie}">${L.foie}</text>
  <line x1="95" y1="170" x2="25" y2="165" stroke="rgba(251,195,74,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="2" y="168" font-size="8" fill="${C.intestin}">${L.intestins}</text>
</svg>`
    },
  },

  // ── Système digestif ──────────────────────────────────────────────────────
  {
    id: 'bio-systeme-digestif',
    titre: 'Système digestif',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { bouche: 'Bouche', oesophage: 'Œsophage', estomac: 'Estomac', intestin_grele: 'Intestin grêle', gros_intestin: 'Gros intestin', rectum: 'Rectum', ...opts.labels }
      const C = { tube: '#FBC34A', estomac: '#34D399', intestin: '#A78BFA', gros: '#F87171', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" style="font-family:system-ui,sans-serif">
  <!-- Bouche -->
  <ellipse cx="100" cy="18" rx="18" ry="10" fill="rgba(251,195,74,0.2)" stroke="${C.tube}" stroke-width="2"/>
  <!-- Oesophage -->
  <rect x="93" y="28" width="14" height="45" rx="7" fill="rgba(251,195,74,0.15)" stroke="${C.tube}" stroke-width="1.8"/>
  <!-- Estomac -->
  <path d="M90,73 Q68,78 65,100 Q63,122 80,130 Q100,138 118,128 Q130,118 125,95 Q120,75 100,72 Z" fill="rgba(52,211,153,0.2)" stroke="${C.estomac}" stroke-width="2"/>
  <!-- Intestin grêle (bobines) -->
  <path d="M90,130 Q60,140 62,160 Q64,175 85,176 Q108,177 110,162 Q112,147 90,145 Q72,144 72,158 Q72,170 85,170" fill="none" stroke="${C.intestin}" stroke-width="2.5"/>
  <!-- Gros intestin (cadre) -->
  <path d="M90,172 Q80,185 78,200 Q76,220 90,225 Q106,230 120,225 Q134,218 132,200 Q130,185 118,172" fill="none" stroke="${C.gros}" stroke-width="2.5"/>
  <!-- Rectum -->
  <rect x="94" y="224" width="12" height="35" rx="6" fill="rgba(248,113,113,0.2)" stroke="${C.gros}" stroke-width="1.8"/>
  <!-- Labels -->
  <text x="124" y="21" font-size="8" fill="${C.tube}">${L.bouche}</text>
  <text x="2" y="52" font-size="8" fill="${C.tube}">${L.oesophage}</text>
  <line x1="93" y1="52" x2="55" y2="48" stroke="rgba(251,195,74,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="2" y="105" font-size="8" fill="${C.estomac}">${L.estomac}</text>
  <line x1="66" y1="100" x2="38" y2="101" stroke="rgba(52,211,153,0.5)" stroke-width="0.8" stroke-dasharray="3,2"/>
  <text x="125" y="162" font-size="8" fill="${C.intestin}">${L.intestin_grele}</text>
  <text x="2" y="205" font-size="8" fill="${C.gros}">${L.gros_intestin}</text>
  <text x="112" y="244" font-size="8" fill="${C.gros}">${L.rectum}</text>
</svg>`
    },
  },

  {
    id: 'bio-mitose',
    titre: 'Mitose (4 phases)',
    categorie: 'biologie',
    toSvg: (opts = {}) => {
      const L = { prophase: 'Prophase', metaphase: 'Métaphase', anaphase: 'Anaphase', telophase: 'Télophase', ...opts.labels }
      const C = { primary: '#60A5FA', accent: '#A78BFA', green: '#34D399', amber: '#FBC34A', ...opts.colors }
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180" style="font-family:system-ui,sans-serif">
  <!-- Prophase -->
  <circle cx="42" cy="82" r="34" fill="rgba(167,139,250,0.06)" stroke="${C.accent}" stroke-width="1.5"/>
  <ellipse cx="38" cy="78" rx="10" ry="8" fill="rgba(251,195,74,0.25)" stroke="${C.amber}" stroke-width="1"/>
  <ellipse cx="48" cy="88" rx="9" ry="7" fill="rgba(251,195,74,0.25)" stroke="${C.amber}" stroke-width="1"/>
  <ellipse cx="40" cy="90" rx="8" ry="6" fill="rgba(251,195,74,0.25)" stroke="${C.amber}" stroke-width="1"/>
  <text x="42" y="130" text-anchor="middle" font-size="9" fill="${C.accent}">${L.prophase}</text>

  <!-- Métaphase -->
  <circle cx="127" cy="82" r="34" fill="rgba(167,139,250,0.06)" stroke="${C.accent}" stroke-width="1.5"/>
  <line x1="127" y1="50" x2="127" y2="114" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="3,2"/>
  <ellipse cx="118" cy="82" rx="8" ry="6" fill="rgba(96,165,250,0.35)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="130" cy="82" rx="8" ry="6" fill="rgba(96,165,250,0.35)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="124" cy="75" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="${C.green}" stroke-width="1"/>
  <ellipse cx="124" cy="89" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="${C.green}" stroke-width="1"/>
  <text x="127" y="130" text-anchor="middle" font-size="9" fill="${C.accent}">${L.metaphase}</text>

  <!-- Anaphase -->
  <circle cx="212" cy="82" r="34" fill="rgba(167,139,250,0.06)" stroke="${C.accent}" stroke-width="1.5"/>
  <ellipse cx="204" cy="63" rx="7" ry="5" fill="rgba(96,165,250,0.35)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="218" cy="63" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="${C.green}" stroke-width="1"/>
  <ellipse cx="204" cy="101" rx="7" ry="5" fill="rgba(96,165,250,0.35)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="218" cy="101" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="${C.green}" stroke-width="1"/>
  <line x1="212" y1="52" x2="204" y2="65" stroke="${C.accent}" stroke-width="0.8" opacity="0.5"/>
  <line x1="212" y1="52" x2="218" y2="65" stroke="${C.accent}" stroke-width="0.8" opacity="0.5"/>
  <line x1="212" y1="112" x2="204" y2="99" stroke="${C.accent}" stroke-width="0.8" opacity="0.5"/>
  <line x1="212" y1="112" x2="218" y2="99" stroke="${C.accent}" stroke-width="0.8" opacity="0.5"/>
  <text x="212" y="130" text-anchor="middle" font-size="9" fill="${C.accent}">${L.anaphase}</text>

  <!-- Télophase -->
  <circle cx="298" cy="82" r="34" fill="rgba(167,139,250,0.06)" stroke="${C.accent}" stroke-width="1.5"/>
  <ellipse cx="298" cy="64" rx="22" ry="14" fill="rgba(52,211,153,0.08)" stroke="${C.green}" stroke-width="1.5"/>
  <ellipse cx="298" cy="100" rx="22" ry="14" fill="rgba(52,211,153,0.08)" stroke="${C.green}" stroke-width="1.5"/>
  <ellipse cx="298" cy="64" rx="9" ry="6" fill="rgba(96,165,250,0.25)" stroke="${C.primary}" stroke-width="1"/>
  <ellipse cx="298" cy="100" rx="9" ry="6" fill="rgba(96,165,250,0.25)" stroke="${C.primary}" stroke-width="1"/>
  <text x="298" y="130" text-anchor="middle" font-size="9" fill="${C.accent}">${L.telophase}</text>
</svg>`
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// React component schemas (SchemaProps API avec onClick sur les labels)
// ═══════════════════════════════════════════════════════════════════════════════

export function CorpsHumainSVG({ width = 200, height = 360, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#A78BFA', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} fontSize={8} fill={col} cursor={onLabelClick ? 'pointer' : 'default'}
      onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 360" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <ellipse cx="100" cy="28" rx="22" ry="24" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
      <path d="M72,55 Q60,80 58,160 Q70,180 100,182 Q130,180 142,160 Q140,80 128,55 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <path d="M72,55 Q50,60 38,110 Q35,130 48,135 Q68,115 72,55" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <path d="M128,55 Q150,60 162,110 Q165,130 152,135 Q132,115 128,55" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      <path d="M80,182 Q70,290 85,310 Q100,280 115,310 Q130,290 120,182 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      <ellipse cx="100" cy="22" rx="16" ry="14" fill="rgba(167,139,250,0.35)" stroke={couleurSecondaire} strokeWidth="1.5"/>
      <ellipse cx="84" cy="90" rx="14" ry="22" fill="rgba(96,165,250,0.25)" stroke={couleurPrimaire} strokeWidth="1.5"/>
      <ellipse cx="116" cy="90" rx="14" ry="22" fill="rgba(96,165,250,0.25)" stroke={couleurPrimaire} strokeWidth="1.5"/>
      <ellipse cx="95" cy="88" rx="9" ry="10" fill="rgba(248,113,113,0.4)" stroke="#F87171" strokeWidth="1.5"/>
      <ellipse cx="113" cy="122" rx="18" ry="12" fill="rgba(180,83,9,0.3)" stroke="#B45309" strokeWidth="1.5"/>
      <ellipse cx="90" cy="128" rx="13" ry="11" fill="rgba(52,211,153,0.25)" stroke="#34D399" strokeWidth="1.5"/>
      <path d="M82,148 Q72,165 80,178 Q92,185 108,178 Q118,165 108,148 Q98,158 82,148" fill="rgba(251,195,74,0.2)" stroke="#FBC34A" strokeWidth="1.5"/>
      <ellipse cx="79" cy="140" rx="7" ry="10" fill="rgba(244,114,182,0.25)" stroke="#F472B6" strokeWidth="1.2"/>
      <ellipse cx="121" cy="140" rx="7" ry="10" fill="rgba(244,114,182,0.25)" stroke="#F472B6" strokeWidth="1.2"/>
      {showLabels && <>
        <line x1="116" y1="22" x2="148" y2="14" stroke="rgba(167,139,250,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('cerveau', 'Cerveau', 150, 17, couleurSecondaire)}
        <line x1="104" y1="84" x2="148" y2="75" stroke="rgba(248,113,113,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('coeur', 'Cœur', 150, 78, '#F87171')}
        <line x1="96" y1="77" x2="25" y2="68" stroke="rgba(96,165,250,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('poumons', 'Poumons', 2, 71, couleurPrimaire)}
        <line x1="90" y1="136" x2="25" y2="128" stroke="rgba(52,211,153,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('estomac', 'Estomac', 2, 131, '#34D399')}
        <line x1="113" y1="130" x2="148" y2="122" stroke="rgba(180,83,9,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('foie', 'Foie', 150, 125, '#B45309')}
        <line x1="95" y1="170" x2="25" y2="165" stroke="rgba(251,195,74,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('intestins', 'Intestins', 2, 168, '#FBC34A')}
      </>}
    </svg>
  )
}

export function CelluleAnimaleSVG({ width = 300, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} fontSize={9} fill={col} textAnchor="middle" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <ellipse cx="150" cy="102" rx="138" ry="88" fill="rgba(251,195,74,0.05)" stroke={couleurSecondaire} strokeWidth="2" strokeDasharray="6,3"/>
      <ellipse cx="108" cy="95" rx="40" ry="34" fill="rgba(96,165,250,0.14)" stroke={couleurPrimaire} strokeWidth="2"/>
      <ellipse cx="106" cy="93" rx="13" ry="11" fill="rgba(96,165,250,0.45)" stroke={couleurPrimaire} strokeWidth="1.5"/>
      <ellipse cx="215" cy="68" rx="21" ry="10" fill="rgba(167,139,250,0.14)" stroke="#A78BFA" strokeWidth="1.5"/>
      <ellipse cx="208" cy="142" rx="19" ry="9" fill="rgba(167,139,250,0.14)" stroke="#A78BFA" strokeWidth="1.5" transform="rotate(-20,208,142)"/>
      <path d="M161,113 Q172,108 180,113" fill="none" stroke="#34D399" strokeWidth="2.5"/>
      <path d="M159,120 Q171,115 180,120" fill="none" stroke="#34D399" strokeWidth="2.5"/>
      <circle cx="250" cy="108" r="9" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.22)" strokeWidth="1"/>
      {showLabels && <>
        {lbl('noyau', 'Noyau', 108, 59, couleurPrimaire)}
        {lbl('nucleole', 'Nucléole', 106, 94, 'rgba(255,255,255,0.75)')}
        {lbl('mito', 'Mitochondrie', 215, 52, '#A78BFA')}
        {lbl('golgi', 'App. de Golgi', 173, 137, '#34D399')}
        {lbl('vacuole', 'Vacuole', 250, 126, 'rgba(255,255,255,0.45)')}
        <text x="12" y="182" fontSize={8.5} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('membrane', 'Membrane plasmique')}>Membrane plasmique</text>
      </>}
    </svg>
  )
}

export function CelluleVegetaleSVG({ width = 300, height = 200, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string, anchor = 'middle') => (
    <text key={id} x={x} y={y} fontSize={8} fill={col} textAnchor={anchor as any} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <rect x="14" y="14" width="272" height="172" rx="6" fill="rgba(146,64,14,0.1)" stroke="#B45309" strokeWidth="3"/>
      <rect x="21" y="21" width="258" height="158" rx="4" fill="rgba(251,195,74,0.03)" stroke={couleurSecondaire} strokeWidth="1.5" strokeDasharray="5,3"/>
      <rect x="80" y="60" width="148" height="96" rx="5" fill="rgba(96,165,250,0.1)" stroke={couleurPrimaire} strokeWidth="1.5"/>
      <ellipse cx="72" cy="52" rx="26" ry="20" fill="rgba(96,165,250,0.18)" stroke={couleurPrimaire} strokeWidth="1.8"/>
      <ellipse cx="70" cy="50" rx="9" ry="7" fill="rgba(96,165,250,0.45)" stroke={couleurPrimaire} strokeWidth="1"/>
      <ellipse cx="170" cy="38" rx="18" ry="9" fill="rgba(52,211,153,0.2)" stroke="#34D399" strokeWidth="1.5"/>
      <ellipse cx="230" cy="145" rx="17" ry="8" fill="rgba(52,211,153,0.2)" stroke="#34D399" strokeWidth="1.5"/>
      <ellipse cx="45" cy="140" rx="16" ry="8" fill="rgba(52,211,153,0.2)" stroke="#34D399" strokeWidth="1.5" transform="rotate(-15,45,140)"/>
      {showLabels && <>
        {lbl('vacuole', 'Vacuole centrale', 150, 114, couleurPrimaire)}
        {lbl('noyau', 'Noyau', 72, 34, couleurPrimaire)}
        {lbl('chloroplaste', 'Chloroplaste', 170, 28, '#34D399')}
        {lbl('paroi', 'Paroi cellulaire', 14, 9, '#B45309', 'start')}
        {lbl('membrane', 'Membrane', 150, 192, couleurSecondaire)}
      </>}
    </svg>
  )
}

export function ADNDoubleHeliceSVG({ width = 300, height = 220, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#FBC34A', onLabelClick, className }: SchemaProps) {
  const pairs = [
    { y: 30,  la: 'G', lb: 'C', color: '#34D399' },
    { y: 55,  la: 'A', lb: 'T', color: couleurPrimaire },
    { y: 80,  la: 'T', lb: 'A', color: couleurPrimaire },
    { y: 105, la: 'C', lb: 'G', color: '#34D399' },
    { y: 130, la: 'G', lb: 'C', color: '#34D399' },
    { y: 155, la: 'A', lb: 'T', color: couleurPrimaire },
    { y: 180, la: 'T', lb: 'A', color: couleurPrimaire },
  ]
  const amp = 36, cx = 150
  const strand1 = Array.from({ length: 50 }, (_, i) => { const t = (i / 49) * Math.PI * 2.5; const x = cx - amp * Math.sin(t); const y = 30 + (i / 49) * 160; return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')
  const strand2 = Array.from({ length: 50 }, (_, i) => { const t = (i / 49) * Math.PI * 2.5; const x = cx + amp * Math.sin(t); const y = 30 + (i / 49) * 160; return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}` }).join(' ')
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 220" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <path d={strand1} fill="none" stroke={couleurSecondaire} strokeWidth="2.5"/>
      <path d={strand2} fill="none" stroke="#A78BFA" strokeWidth="2.5"/>
      {pairs.map(p => {
        const t = ((p.y - 30) / 160) * Math.PI * 2.5
        const x1 = (cx - amp * Math.sin(t)).toFixed(1)
        const x2 = (cx + amp * Math.sin(t)).toFixed(1)
        return (
          <g key={p.y}>
            <line x1={x1} y1={p.y} x2={x2} y2={p.y} stroke={p.color} strokeWidth="2" strokeDasharray="3,2"/>
            <text x={+x1 - 10} y={p.y + 4} textAnchor="middle" fontSize={9} fill={p.color} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(p.la, p.la)}>{p.la}</text>
            <text x={+x2 + 10} y={p.y + 4} textAnchor="middle" fontSize={9} fill={p.color} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(p.lb, p.lb)}>{p.lb}</text>
          </g>
        )
      })}
      {showLabels && <>
        <text x="66" y="15" textAnchor="middle" fontSize={8} fill={couleurSecondaire}>Brin 5'→3'</text>
        <text x="234" y="15" textAnchor="middle" fontSize={8} fill="#A78BFA">Brin 3'→5'</text>
        <text x="10" y="55" fontSize={7.5} fill="#34D399">G — C</text>
        <text x="10" y="80" fontSize={7.5} fill={couleurPrimaire}>A — T</text>
      </>}
    </svg>
  )
}

export function MitoseSVG({ width = 340, height = 180, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#A78BFA', onLabelClick, className }: SchemaProps) {
  const phases = [
    { label: 'Prophase',  cx: 42  },
    { label: 'Métaphase', cx: 127 },
    { label: 'Anaphase',  cx: 212 },
    { label: 'Télophase', cx: 298 },
  ]
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      {phases.map(p => (
        <circle key={p.label} cx={p.cx} cy={82} r={34} fill="rgba(167,139,250,0.06)" stroke={couleurSecondaire} strokeWidth="1.5"/>
      ))}
      <ellipse cx="38" cy="78" rx="10" ry="8" fill="rgba(251,195,74,0.25)" stroke="#FBC34A" strokeWidth="1"/>
      <ellipse cx="48" cy="88" rx="9" ry="7" fill="rgba(251,195,74,0.25)" stroke="#FBC34A" strokeWidth="1"/>
      <line x1="127" y1="50" x2="127" y2="114" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,2"/>
      <ellipse cx="118" cy="82" rx="8" ry="6" fill="rgba(96,165,250,0.35)" stroke={couleurPrimaire} strokeWidth="1"/>
      <ellipse cx="130" cy="82" rx="8" ry="6" fill="rgba(96,165,250,0.35)" stroke={couleurPrimaire} strokeWidth="1"/>
      <ellipse cx="204" cy="63" rx="7" ry="5" fill="rgba(96,165,250,0.35)" stroke={couleurPrimaire} strokeWidth="1"/>
      <ellipse cx="218" cy="63" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="#34D399" strokeWidth="1"/>
      <ellipse cx="204" cy="101" rx="7" ry="5" fill="rgba(96,165,250,0.35)" stroke={couleurPrimaire} strokeWidth="1"/>
      <ellipse cx="218" cy="101" rx="6" ry="5" fill="rgba(52,211,153,0.35)" stroke="#34D399" strokeWidth="1"/>
      <ellipse cx="298" cy="64" rx="22" ry="14" fill="rgba(52,211,153,0.08)" stroke="#34D399" strokeWidth="1.5"/>
      <ellipse cx="298" cy="100" rx="22" ry="14" fill="rgba(52,211,153,0.08)" stroke="#34D399" strokeWidth="1.5"/>
      {showLabels && phases.map(p => (
        <text key={p.label} x={p.cx} y={130} textAnchor="middle" fontSize={9} fill={couleurSecondaire} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(p.label, p.label)}>{p.label}</text>
      ))}
    </svg>
  )
}

export function SystemeRespiratoireSVG({ width = 300, height = 240, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#A78BFA', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} textAnchor="middle" fontSize={8} fill={col} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <rect x="140" y="10" width="20" height="55" rx="10" fill="rgba(167,139,250,0.15)" stroke={couleurSecondaire} strokeWidth="2"/>
      <path d="M140,62 Q100,70 80,90" fill="none" stroke={couleurSecondaire} strokeWidth="3"/>
      <path d="M160,62 Q200,70 220,90" fill="none" stroke={couleurSecondaire} strokeWidth="3"/>
      <ellipse cx="75" cy="145" rx="55" ry="68" fill="rgba(96,165,250,0.12)" stroke={couleurPrimaire} strokeWidth="2"/>
      <ellipse cx="225" cy="145" rx="55" ry="68" fill="rgba(96,165,250,0.12)" stroke={couleurPrimaire} strokeWidth="2"/>
      <path d="M80,90 Q70,110 65,130" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4,2"/>
      <path d="M80,90 Q85,118 90,135" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4,2"/>
      <path d="M220,90 Q215,115 210,135" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4,2"/>
      <path d="M220,90 Q230,118 235,135" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4,2"/>
      <path d="M20,215 Q150,235 280,215" fill="none" stroke="#F87171" strokeWidth="3"/>
      {showLabels && <>
        {lbl('trachee', 'Trachée', 150, 8, couleurSecondaire)}
        {lbl('bronche_g', 'Bronche', 75, 78, couleurSecondaire)}
        {lbl('bronche_d', 'Bronche', 225, 78, couleurSecondaire)}
        {lbl('poumon_g', 'Poumon gauche', 75, 218, couleurPrimaire)}
        {lbl('poumon_d', 'Poumon droit', 225, 218, couleurPrimaire)}
        {lbl('diaphragme', 'Diaphragme', 150, 238, '#F87171')}
      </>}
    </svg>
  )
}

export function SystemeCirculatoireSVG({ width = 300, height = 240, showLabels = true, couleurPrimaire = '#60A5FA', couleurSecondaire = '#F87171', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} fontSize={8} fill={col} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <path d="M155,90 Q155,50 150,20" fill="none" stroke={couleurSecondaire} strokeWidth="3"/>
      <path d="M155,90 Q180,60 200,30" fill="none" stroke={couleurSecondaire} strokeWidth="2"/>
      <path d="M145,90 Q120,60 100,30" fill="none" stroke={couleurSecondaire} strokeWidth="2"/>
      <path d="M145,165 Q130,200 120,230" fill="none" stroke={couleurSecondaire} strokeWidth="2.5"/>
      <path d="M155,165 Q170,200 180,230" fill="none" stroke={couleurSecondaire} strokeWidth="2.5"/>
      <path d="M140,90 Q80,70 60,40" fill="none" stroke={couleurPrimaire} strokeWidth="2"/>
      <path d="M145,165 Q80,190 70,220" fill="none" stroke={couleurPrimaire} strokeWidth="2"/>
      <path d="M155,165 Q230,190 240,220" fill="none" stroke={couleurPrimaire} strokeWidth="2"/>
      <rect x="112" y="88" width="76" height="78" rx="12" fill="rgba(239,68,68,0.12)" stroke="#EF4444" strokeWidth="2.5"/>
      <rect x="116" y="92" width="33" height="34" rx="6" fill="rgba(239,68,68,0.2)" stroke="#EF4444" strokeWidth="1.5"/>
      <rect x="151" y="92" width="33" height="34" rx="6" fill="rgba(239,68,68,0.2)" stroke="#EF4444" strokeWidth="1.5"/>
      <rect x="116" y="128" width="33" height="34" rx="6" fill="rgba(239,68,68,0.35)" stroke="#EF4444" strokeWidth="1.5"/>
      <rect x="151" y="128" width="33" height="34" rx="6" fill="rgba(239,68,68,0.35)" stroke="#EF4444" strokeWidth="1.5"/>
      {showLabels && <>
        <text x="133" y="112" textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.8)" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('od','Oreillette droite')}>OD</text>
        <text x="168" y="112" textAnchor="middle" fontSize={7} fill="rgba(255,255,255,0.8)" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('og','Oreillette gauche')}>OG</text>
        <text x="133" y="148" textAnchor="middle" fontSize={7} fill="white" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('vd','Ventricule droit')}>VD</text>
        <text x="168" y="148" textAnchor="middle" fontSize={7} fill="white" cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.('vg','Ventricule gauche')}>VG</text>
        {lbl('aorte', 'Aorte', 155, 16, couleurSecondaire)}
        {lbl('veine_cave', 'V. cave', 62, 36, couleurPrimaire)}
        {lbl('arteres', 'Artères', 15, 120, couleurSecondaire)}
        {lbl('veines', 'Veines', 255, 120, couleurPrimaire)}
      </>}
    </svg>
  )
}

export function SystemeDigestifSVG({ width = 200, height = 280, showLabels = true, couleurPrimaire = '#FBC34A', couleurSecondaire = '#A78BFA', onLabelClick, className }: SchemaProps) {
  const lbl = (id: string, v: string, x: number, y: number, col: string) => (
    <text key={id} x={x} y={y} fontSize={8} fill={col} cursor={onLabelClick ? 'pointer' : 'default'} onClick={() => onLabelClick?.(id, v)}>{v}</text>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width={width} height={height} className={className} style={{ fontFamily: 'system-ui,sans-serif' }}>
      <ellipse cx="100" cy="18" rx="18" ry="10" fill="rgba(251,195,74,0.2)" stroke={couleurPrimaire} strokeWidth="2"/>
      <rect x="93" y="28" width="14" height="45" rx="7" fill="rgba(251,195,74,0.15)" stroke={couleurPrimaire} strokeWidth="1.8"/>
      <path d="M90,73 Q68,78 65,100 Q63,122 80,130 Q100,138 118,128 Q130,118 125,95 Q120,75 100,72 Z" fill="rgba(52,211,153,0.2)" stroke="#34D399" strokeWidth="2"/>
      <path d="M90,130 Q60,140 62,160 Q64,175 85,176 Q108,177 110,162 Q112,147 90,145 Q72,144 72,158 Q72,170 85,170" fill="none" stroke={couleurSecondaire} strokeWidth="2.5"/>
      <path d="M90,172 Q80,185 78,200 Q76,220 90,225 Q106,230 120,225 Q134,218 132,200 Q130,185 118,172" fill="none" stroke="#F87171" strokeWidth="2.5"/>
      <rect x="94" y="224" width="12" height="35" rx="6" fill="rgba(248,113,113,0.2)" stroke="#F87171" strokeWidth="1.8"/>
      {showLabels && <>
        {lbl('bouche', 'Bouche', 124, 21, couleurPrimaire)}
        {lbl('oesophage', 'Œsophage', 2, 52, couleurPrimaire)}
        <line x1="93" y1="52" x2="38" y2="48" stroke="rgba(251,195,74,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('estomac', 'Estomac', 2, 105, '#34D399')}
        <line x1="66" y1="100" x2="30" y2="101" stroke="rgba(52,211,153,0.5)" strokeWidth="0.8" strokeDasharray="3,2"/>
        {lbl('intestin_grele', 'Intestin grêle', 125, 162, couleurSecondaire)}
        {lbl('gros_intestin', 'Gros intestin', 2, 205, '#F87171')}
        {lbl('rectum', 'Rectum', 112, 244, '#F87171')}
      </>}
    </svg>
  )
}
