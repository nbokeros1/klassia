'use client'

const MISSION = "Rendre l'éducation de qualité accessible à tous les enseignants francophones grâce à l'intelligence artificielle — peu importe où ils se trouvent dans le monde."

const VISION_2035 = "Bodingo AI Tech Inc. est la principale entreprise d'intelligence artificielle éducative du monde francophone, opérant dans 30+ pays avec 500 000 enseignants actifs et un impact direct sur plus de 10 millions d'élèves."

const OKR_2026 = [
  { objectif: 'O1 — Lancer la bêta privée de Scorgia', resultats: ['KR1.1 : 10 enseignants bêta actifs d\'ici Q2 2026', 'KR1.2 : Score NPS bêta ≥ 50', 'KR1.3 : 0 bug critique en production'] },
  { objectif: 'O2 — Générer les premiers revenus', resultats: ['KR2.1 : 3 abonnements Pro payants d\'ici Q3 2026', 'KR2.2 : MRR ≥ 100 $ d\'ici fin 2026', 'KR2.3 : Stripe opérationnel en production'] },
  { objectif: 'O3 — Infrastructure AWS opérationnelle', resultats: ['KR3.1 : Migration complète AWS d\'ici Q2 2026', 'KR3.2 : Uptime ≥ 99.9%', 'KR3.3 : CI/CD automatisé sur branche main'] },
  { objectif: 'O4 — Poser les bases de MboaSchool', resultats: ['KR4.1 : Document de vision MboaSchool rédigé', 'KR4.2 : MVP fonctionnel d\'ici Q4 2026', 'KR4.3 : 1er partenariat éducatif africain signé'] },
]

const ROADMAP_2035 = [
  { annee: '2026', titre: 'Scorgia Bêta & Revenus', items: ['Bêta privée → bêta publique', 'Déploiement AWS', 'Facturation Stripe', 'MboaSchool MVP'], couleur: '#F59E0B' },
  { annee: '2027', titre: 'Croissance Scorgia', items: ['100 enseignants actifs', 'Application mobile', 'Intégration LMS', 'MboaSchool bêta'], couleur: '#60A5FA' },
  { annee: '2028', titre: 'Expansion Francophone', items: ['France & Belgique', 'Afrique francophone', '1000 utilisateurs', 'Produit #3 en gestation'], couleur: '#A78BFA' },
  { annee: '2030', titre: 'Plateforme Multi-Produits', items: ['Suite complète Bodingo', 'API & Marketplace', '10 000 enseignants', 'Partenariats institutionnels'], couleur: '#34D399' },
  { annee: '2035', titre: 'Leader Mondial Francophone', items: ['500 000 enseignants', '30+ pays', '10M élèves impactés', 'IPO ou acquisition stratégique'], couleur: '#FB923C' },
]

const INNOVATION = [
  { titre: 'IA Pédagogique Avancée', description: 'Modèles spécialisés pour l\'éducation francophone, entraînés sur des curricula réels.', icon: '🧠' },
  { titre: 'Voix & Accessibilité', description: 'Synthèse vocale et interaction orale pour les régions à faible connectivité.', icon: '🎙️' },
  { titre: 'Analyse Prédictive', description: 'Anticipation des difficultés d\'apprentissage avant qu\'elles ne deviennent des blocages.', icon: '📡' },
  { titre: 'Collaboration Enseignants', description: 'Réseau de partage de ressources pédagogiques entre enseignants francophones.', icon: '🤝' },
]

export default function FounderVision() {
  return (
    <div style={{ padding: '32px 36px', maxWidth: 880 }}>

      {/* ── En-tête ── */}
      <div style={{ marginBottom: 40, paddingBottom: 28, borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 8 }}>
          Bodingo AI Tech Inc. · Réservé aux Founders
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#FEF3C7', lineHeight: 1.1, marginBottom: 10, letterSpacing: '-0.02em' }}>
          Vision Center
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          La boussole de l&apos;entreprise. Ce document définit pourquoi Bodingo existe, où elle va, et comment elle y arrivera.
        </div>
      </div>

      {/* ── Mission ── */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel>Mission</SectionLabel>
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#FEF3C7', lineHeight: 1.6, letterSpacing: '-0.01em' }}>
            &quot;{MISSION}&quot;
          </div>
        </div>
      </section>

      {/* ── Vision 2035 ── */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel>Vision 2035</SectionLabel>
        <div style={{ background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#E2E8F0', lineHeight: 1.7 }}>
            &quot;{VISION_2035}&quot;
          </div>
        </div>
      </section>

      {/* ── OKR 2026 ── */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel>OKR 2026</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {OKR_2026.map((okr, i) => (
            <div key={i} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7', marginBottom: 10 }}>{okr.objectif}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {okr.resultats.map((kr, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)', flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{kr}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roadmap 2035 ── */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel>Roadmap 2035</SectionLabel>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 20, top: 24, bottom: 24, width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {ROADMAP_2035.map((phase, i) => (
              <div key={i} style={{ display: 'flex', gap: 20, paddingLeft: 48, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 12, top: 16, width: 16, height: 16, borderRadius: '50%', background: phase.couleur, border: '3px solid #060D1A' }} />
                <div style={{ flex: 1, background: '#0B1628', border: `1px solid ${phase.couleur}22`, borderRadius: 12, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: phase.couleur, fontVariantNumeric: 'tabular-nums' }}>{phase.annee}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7' }}>{phase.titre}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {phase.items.map(item => (
                      <span key={item} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: `${phase.couleur}12`, border: `1px solid ${phase.couleur}25`, color: `${phase.couleur}`, fontWeight: 500 }}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Innovation ── */}
      <section style={{ marginBottom: 40 }}>
        <SectionLabel>Innovation</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {INNOVATION.map(item => (
            <div key={item.titre} style={{ background: '#0B1628', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FEF3C7', marginBottom: 5 }}>{item.titre}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{item.description}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Produits ── */}
      <section>
        <SectionLabel>Portefeuille Produits</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { nom: 'Scorgia', desc: 'Assistant IA pour enseignants', statut: 'En bêta', couleur: '#F59E0B', emoji: '⚡', year: '2024—' },
            { nom: 'MboaSchool', desc: 'Plateforme éducative africaine', statut: 'En conception', couleur: '#34D399', emoji: '🌍', year: '2026—' },
            { nom: 'Produit #3', desc: 'À définir — EdTech IA avancée', statut: 'Futur', couleur: 'rgba(255,255,255,0.2)', emoji: '🔮', year: '2028—' },
            { nom: 'Produit #4', desc: 'À définir — Expansion verticale', statut: 'Futur', couleur: 'rgba(255,255,255,0.2)', emoji: '🚀', year: '2030—' },
          ].map(p => (
            <div key={p.nom} style={{ background: '#0B1628', border: `1px solid ${p.couleur}22`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{p.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.couleur }}>{p.nom}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${p.couleur}15`, border: `1px solid ${p.couleur}30`, color: p.couleur, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.statut}</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.desc}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{p.year}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.2)' }} />
      {children}
      <div style={{ flex: 1, height: 1, background: 'rgba(245,158,11,0.2)' }} />
    </div>
  )
}
