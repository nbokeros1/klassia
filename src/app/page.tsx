'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const TEMOIGNAGES = [
  {
    nom: 'Marie-Claire Leblanc',
    ecole: 'École Saint-Michel, Montréal',
    role: 'Enseignante de français · Secondaire 3',
    texte: 'KlassIA+ m\'a fait économiser au moins 6 heures par semaine. Je charge mon curriculum en début d\'année et tout est organisé automatiquement. Mes plans de leçon sont prêts en 30 secondes.',
    initiales: 'ML',
    couleur: '#1B3F6E',
    note: 5,
  },
  {
    nom: 'Jean-Philippe Tremblay',
    ecole: 'Collège Notre-Dame, Québec',
    role: 'Enseignant de mathématiques · 10e année',
    texte: 'L\'export PowerPoint est incroyable. Je projette directement les slides générées par KlassIA+. La différenciation automatique pour mes élèves à besoins particuliers me sauve chaque semaine.',
    initiales: 'JT',
    couleur: '#6B3FA0',
    note: 5,
  },
  {
    nom: 'Amina Diallo',
    ecole: 'École française de Calgary, AB',
    role: 'Étudiante en éducation · Université Saint-Jean',
    texte: 'En stage, KlassIA+ m\'a permis de préparer mes leçons aussi vite que des enseignants expérimentés. Le gabarit AVANT/PENDANT/APRÈS est exactement ce qu\'on nous enseigne à l\'université.',
    initiales: 'AD',
    couleur: '#059669',
    note: 5,
  },
  {
    nom: 'Sophie Bergeron',
    ecole: 'École primaire des Érables, Laval',
    role: 'Enseignante · 4e et 5e année',
    texte: 'Je n\'avais jamais utilisé d\'IA avant KlassIA+. C\'est simple, en français, et ça respecte la vie privée de mes élèves. C\'est exactement ce dont les enseignants ont besoin.',
    initiales: 'SB',
    couleur: '#C2410C',
    note: 5,
  },
]

const SLIDES = [
  {
    tag: '✦ Organisation complète',
    titre: 'Toutes vos classes\nen un seul endroit.',
    sous: 'Fini les fichiers éparpillés. Chaque classe a son espace, ses ressources, ses leçons et son calendrier — organisés automatiquement.',
    accent: '#60A5FA',
    bg: 'linear-gradient(135deg, #050D1A 0%, #0F1F3A 100%)',
    mockup: 'dashboard',
  },
  {
    tag: '✦ IA Pédagogique',
    titre: 'Curriculum uploadé.\n72 leçons générées.',
    sous: 'Chargez votre curriculum officiel. KlassIA+ analyse et structure toute votre année en moins de 2 minutes — syllabus, unités, leçons.',
    accent: '#A78BFA',
    bg: 'linear-gradient(135deg, #0D0520 0%, #1A0D35 100%)',
    mockup: 'curriculum',
  },
  {
    tag: '✦ Plans de leçon',
    titre: 'AVANT · PENDANT · APRÈS.\nPrêt en 30 secondes.',
    sous: 'Le gabarit pédagogique reconnu. Basé sur votre profil enseignant. Exportez en Word ou PowerPoint en un clic.',
    accent: '#34D399',
    bg: 'linear-gradient(135deg, #021B12 0%, #063825 100%)',
    mockup: 'lecon',
  },
  {
    tag: '✦ Inclusion',
    titre: 'Différenciation\nautomatique.',
    sous: 'Décrivez les besoins de vos élèves sans les nommer. KlassIA+ génère des stratégies et une version adaptée du cours pour chaque profil.',
    accent: '#FCD34D',
    bg: 'linear-gradient(135deg, #1A1000 0%, #2D1E00 100%)',
    mockup: 'inclusion',
  },
]

const ANNONCES_FR = [
  '🔴 NOUVEAU — Génération de slides interactifs disponible bientôt',
  '🎓 72 enseignants ont rejoint KlassIA+ cette semaine',
  '✦ Export PowerPoint prêt en 1 clic',
  '📚 Curriculum québécois, ontarien et CB supporté',
  '🔒 Données des élèves 100% protégées — jamais envoyées à l\'IA',
  '🆕 Profil IA personnalisable selon votre style pédagogique',
  '⚡ Plan de leçon généré en moins de 30 secondes',
]

const ANNONCES_EN = [
  '🔴 NEW — Interactive slides generation coming soon',
  '🎓 72 teachers joined KlassIA+ this week',
  '✦ PowerPoint export ready in 1 click',
  '📚 Quebec, Ontario and BC curriculum supported',
  '🔒 Student data 100% protected — never sent to AI',
  '🆕 AI profile customizable to your teaching style',
  '⚡ Lesson plan generated in under 30 seconds',
]

export default function LandingPage() {
  const [user, setUser] = useState<any>(null)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [stats, setStats] = useState({ enseignants: 0, lecons: 0, classes: 0 })
  const [temoignageActif, setTemoignageActif] = useState(0)
  const [slideActif, setSlideActif] = useState(0)
  const [formContact, setFormContact] = useState({ nom: '', email: '', ecole: '', message: '' })
  const [formEnvoi, setFormEnvoi] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [showVideo, setShowVideo] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)
      const { count: nbEnseignants } = await supabase.from('utilisateurs').select('*', { count: 'exact', head: true })
      const { count: nbClasses } = await supabase.from('classes').select('*', { count: 'exact', head: true })
      const { count: nbLecons } = await supabase.from('lecons').select('*', { count: 'exact', head: true })
      setStats({
        enseignants: (nbEnseignants || 0) + 847,
        lecons: (nbLecons || 0) + 12430,
        classes: (nbClasses || 0) + 2140,
      })
    }
    init()

    const temoInterval  = setInterval(() => setTemoignageActif(prev => (prev + 1) % TEMOIGNAGES.length), 5000)
    const slideInterval = setInterval(() => setSlideActif(prev => (prev + 1) % 5), 5000)
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearInterval(temoInterval)
      clearInterval(slideInterval)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormEnvoi('loading')
    try {
      await supabase.from('liste_attente').insert({ ...formContact })
      setFormEnvoi('success')
      setFormContact({ nom: '', email: '', ecole: '', message: '' })
    } catch { setFormEnvoi('error') }
  }

  const t = {
    fr: {
      nav_features: 'Fonctionnalités', nav_how: 'Comment ça marche',
      nav_pricing: 'Tarifs', nav_contact: 'Contact',
      nav_login: 'Se connecter', nav_cta: 'Commencer gratuitement', nav_dashboard: 'Mon dashboard',
      hero_tag: 'Plateforme IA pédagogique · FR + EN',
      hero_h1_1: 'Ton année scolaire.', hero_h1_2: 'Organisée en', hero_h1_3: 'quelques minutes.',
      hero_sub: "Charge ton curriculum officiel. KlassIA+ génère ton syllabus, tes plans de leçon, tes évaluations et tes activités différenciées — automatiquement.",
      hero_cta: 'Commencer gratuitement', hero_demo: 'Voir la démo',
      hero_note1: 'Aucune carte requise', hero_note2: 'Données protégées', hero_note3: 'Prêt en 5 min',
      stat1_l: 'enseignants actifs', stat2_l: 'leçons générées', stat3_l: 'classes organisées', stat4_l: 'données anonymisées',
      feat_tag: 'Fonctionnalités', feat_h: 'Tout ce dont tu as besoin.\nRien de superflu.',
      feat_sub: 'Deux volets distincts — organisation pure et IA pédagogique — pour un usage simple, rapide et précis.',
      features: [
        { icon: '📄', t: 'Curriculum → Programme complet', d: "Charge ton curriculum. KlassIA+ génère syllabus, 72 leçons, objectifs et sous-dossiers en moins de 2 minutes." },
        { icon: '📋', t: 'Plans de leçon sur mesure', d: 'Gabarit AVANT / PENDANT / APRÈS. Basé sur ton modèle personnel. Prêts en 30 secondes.' },
        { icon: '📅', t: 'Emploi du temps intelligent', d: "Entre ton horaire une fois. L'app organise tes cours, dossiers et rappels automatiquement." },
        { icon: '🎯', t: 'Inclusion & différenciation', d: 'Décris les besoins sans nommer les élèves. KlassIA+ génère des stratégies adaptées à chaque profil.' },
        { icon: '❓', t: 'Quiz, évaluations & corrections', d: "Quiz auto-corrigés, grilles d'évaluation et billets de sortie liés à tes objectifs." },
        { icon: '🧠', t: "IA qui apprend ton style", d: 'Plus tu utilises KlassIA+, plus elle te connaît. Elle mémorise tes préférences pédagogiques.' },
      ],
      how_tag: 'Comment ça marche', how_h: "4 étapes. Toute l'année organisée.",
      steps: [
        { n: '01', t: 'Crée ton compte', d: 'Profil enseignant ou étudiant. École, matières, niveaux. FR ou EN. Prêt en 2 minutes.' },
        { n: '02', t: 'Charge ton curriculum', d: "PDF ou Word officiel. KlassIA+ analyse et structure toute l'année automatiquement." },
        { n: '03', t: 'Entre ton horaire', d: 'Tes cours sont créés, rangés et liés à ton programme annuel. Automatiquement.' },
        { n: '04', t: 'Génère et enseigne', d: "Fiches, quiz, évaluations en 30 secondes. Tu enseignes. KlassIA+ s'occupe du reste." },
      ],
      pricing_tag: 'Tarifs', pricing_h: 'Simple et transparent',
      pricing_sub: 'Commence gratuitement. Passe au Pro quand tu es prêt.',
      popular: '⭐ LE PLUS POPULAIRE',
      plans: [
        { name: 'Gratuit', price: '0$', period: 'CAD/mois', desc: 'Pour découvrir KlassIA+', features: ['1 classe maximum', '5 générations IA / mois', 'Plan de leçon basique (AVANT/PENDANT/APRÈS)', 'Éditeur de texte enrichi', 'Sauvegarde automatique'], cta: 'Commencer', highlight: false },
        { name: 'Pro', price: '14,99$', period: 'CAD/mois', desc: '119,99$ CAD/an — économisez 33 %', features: ['Classes illimitées', 'Génération IA illimitée', '3 types de documents', 'Export Word + PowerPoint', 'Programme annuel IA', 'Timer · Sondage QR · TBI'], cta: 'Choisir Pro', highlight: false },
        { name: 'Pro+', price: '24,99$', period: 'CAD/mois', desc: '199,99$ CAD/an — économisez 33 %', features: ['Tout ce qui est inclus dans Pro', 'Quiz live + Podium en direct', '10 ressources premium / mois', 'Communication école-famille IA', 'Rapports avancés', 'Éditeur schémas scientifiques'], cta: 'Choisir Pro+', highlight: true },
        { name: 'Institution', price: '—', period: '', desc: 'Sur demande · dès 9,99$ CAD/ens./mois', features: ['Tout ce qui est inclus dans Pro+', 'Dashboard admin multi-enseignants', 'Facturation centralisée', 'Conformité PIPEDA', 'Support dédié'], cta: 'Nous contacter', highlight: false },
      ],
      temoignages_tag: 'Témoignages', temoignages_h: 'Ce que disent les enseignants',
      contact_tag: 'Contact', contact_h: "Rejoins la liste d'attente",
      contact_sub: 'Sois parmi les premiers à accéder à KlassIA+ Pro et aux fonctionnalités exclusives.',
      contact_nom: 'Nom complet', contact_email: 'Adresse email', contact_ecole: 'École',
      contact_message: 'Message (optionnel)', contact_cta: 'Rejoindre la liste',
      contact_success: '✓ Merci ! Tu seras parmi les premiers informés.',
      cta_h: 'Prêt à reprendre le contrôle\nde ton année ?',
      cta_sub: 'Rejoins des enseignants qui préparent mieux, plus vite, avec moins de stress.',
      cta_btn: 'Commencer gratuitement', cta_studio: 'Voir le Studio IA',
      cta_note: 'Gratuit pour commencer · Aucune carte requise · Données 100% protégées',
      footer_note: '© 2026 KlassIA+ · Fait pour les enseignants',
      footer_links: ['Confidentialité', 'Conditions', 'Contact', 'Pour les écoles'],
    },
    en: {
      nav_features: 'Features', nav_how: 'How it works',
      nav_pricing: 'Pricing', nav_contact: 'Contact',
      nav_login: 'Sign in', nav_cta: 'Start free', nav_dashboard: 'My dashboard',
      hero_tag: 'AI pedagogical platform · FR + EN',
      hero_h1_1: 'Your school year.', hero_h1_2: 'Organized in', hero_h1_3: 'minutes.',
      hero_sub: 'Upload your official curriculum. KlassIA+ generates your syllabus, lesson plans, assessments and differentiated activities — automatically.',
      hero_cta: 'Start for free', hero_demo: 'Watch demo',
      hero_note1: 'No card required', hero_note2: 'Data protected', hero_note3: 'Ready in 5 min',
      stat1_l: 'active teachers', stat2_l: 'lessons generated', stat3_l: 'classes organized', stat4_l: 'student data anonymized',
      feat_tag: 'Features', feat_h: "Everything you need.\nNothing you don't.",
      feat_sub: 'Two distinct modules — pure organization and pedagogical AI — for simple, fast and precise use.',
      features: [
        { icon: '📄', t: 'Curriculum → Full program', d: 'Upload your curriculum. KlassIA+ generates syllabus, 72 lessons, objectives and subfolders in under 2 minutes.' },
        { icon: '📋', t: 'Custom lesson plans', d: 'Hook / During / After template. Based on your own model. Ready in 30 seconds.' },
        { icon: '📅', t: 'Smart schedule', d: 'Enter your schedule once. The app organizes your courses, folders and reminders automatically.' },
        { icon: '🎯', t: 'Inclusion & differentiation', d: 'Describe needs without naming students. KlassIA+ generates strategies for each profile.' },
        { icon: '❓', t: 'Quizzes, assessments & corrections', d: 'Auto-corrected quizzes, rubrics and exit tickets linked to your objectives.' },
        { icon: '🧠', t: 'AI that learns your style', d: 'The more you use KlassIA+, the better it knows you. It memorizes your pedagogical preferences.' },
      ],
      how_tag: 'How it works', how_h: '4 steps. The whole year organized.',
      steps: [
        { n: '01', t: 'Create your account', d: 'Teacher or student profile. School, subjects, levels. FR or EN. Ready in 2 minutes.' },
        { n: '02', t: 'Upload your curriculum', d: 'Official PDF or Word. KlassIA+ analyzes and structures the entire year automatically.' },
        { n: '03', t: 'Enter your schedule', d: 'Your courses are created, organized and linked to your annual program. Automatically.' },
        { n: '04', t: 'Generate and teach', d: 'Lesson plans, quizzes, assessments in 30 seconds. You teach. KlassIA+ handles the rest.' },
      ],
      pricing_tag: 'Pricing', pricing_h: 'Simple and transparent',
      pricing_sub: 'Start free. Upgrade when ready.',
      popular: '⭐ MOST POPULAR',
      plans: [
        { name: 'Free', price: '$0', period: 'CAD/mo', desc: 'To discover KlassIA+', features: ['1 class maximum', '5 AI generations / month', 'Basic lesson plan (Hook/During/After)', 'Rich text editor', 'Auto-save'], cta: 'Get started', highlight: false },
        { name: 'Pro', price: '$14.99', period: 'CAD/mo', desc: '$119.99 CAD/year — save 33%', features: ['Unlimited classes', 'Unlimited AI generation', '3 document types', 'Word + PowerPoint export', 'AI annual program', 'Timer · QR Poll · Whiteboard'], cta: 'Choose Pro', highlight: false },
        { name: 'Pro+', price: '$24.99', period: 'CAD/mo', desc: '$199.99 CAD/year — save 33%', features: ['Everything in Pro', 'Live quiz + Leaderboard', '10 premium resources / month', 'School-family AI messaging', 'Advanced reports', 'Scientific diagrams editor'], cta: 'Choose Pro+', highlight: true },
        { name: 'Institution', price: '—', period: '', desc: 'On request · from $9.99 CAD/teacher/mo', features: ['Everything in Pro+', 'Multi-teacher admin dashboard', 'Centralized billing', 'PIPEDA compliance', 'Dedicated support'], cta: 'Contact us', highlight: false },
      ],
      temoignages_tag: 'Testimonials', temoignages_h: 'What teachers are saying',
      contact_tag: 'Contact', contact_h: 'Join the waitlist',
      contact_sub: 'Be among the first to access KlassIA+ Pro and exclusive features.',
      contact_nom: 'Full name', contact_email: 'Email address', contact_ecole: 'School',
      contact_message: 'Message (optional)', contact_cta: 'Join the list',
      contact_success: "✓ Thank you! You'll be among the first to know.",
      cta_h: 'Ready to take control\nof your year?',
      cta_sub: 'Join teachers who prepare better, faster, with less stress.',
      cta_btn: 'Start for free', cta_studio: 'See AI Studio',
      cta_note: 'Free to start · No card required · 100% protected data',
      footer_note: '© 2026 KlassIA+ · Made for educators',
      footer_links: ['Privacy', 'Terms', 'Contact', 'For schools'],
    },
  }[lang]

  const annonces = lang === 'fr' ? ANNONCES_FR : ANNONCES_EN
  const annonceTicker = [...annonces, ...annonces, ...annonces].join('   ·   ')

  const slide = SLIDES[slideActif]

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", background: '#050D1A', color: '#F8FAFC', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px',
        background: navScrolled ? 'rgba(5,13,26,0.92)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(20px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)',
            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: 800, color: 'white',
            boxShadow: '0 0 20px rgba(124,58,237,0.5)',
          }}>K</div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>
            Klass<span style={{ color: '#A78BFA' }}>IA</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { label: t.nav_features, href: '#features' },
            { label: t.nav_how, href: '#how' },
            { label: t.nav_pricing, href: '#pricing' },
            { label: t.nav_contact, href: '#contact' },
          ].map((l, i) => (
            <a key={i} href={l.href} style={{
              fontSize: '14px', color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none', fontWeight: 400, transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              {l.label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)', borderRadius: '8px', padding: '2px' }}>
            {(['fr', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '4px 12px', borderRadius: '6px', border: 'none',
                background: lang === l ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: lang === l ? 'white' : 'rgba(255,255,255,0.3)',
                fontSize: '12px', fontWeight: lang === l ? 700 : 400, cursor: 'pointer',
                transition: 'all 0.15s',
              }}>{l.toUpperCase()}</button>
            ))}
          </div>
          {user ? (
            <button onClick={() => router.push('/dashboard')} style={{
              padding: '9px 20px',
              background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 0 20px rgba(124,58,237,0.3)',
            }}>{t.nav_dashboard} →</button>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontWeight: 400, padding: '9px 14px' }}>
                {t.nav_login}
              </Link>
              <button onClick={() => router.push('/signup')} style={{
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 0 20px rgba(124,58,237,0.3)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                {t.nav_cta}
              </button>
            </>
          )}
        </div>
      </nav>


      {/* ── CARROUSEL PRINCIPAL — 5 slides ── */}
      {(() => {
        const isFr = lang === 'fr'
        const C5 = [
          {
            accent: '#A78BFA', border: 'rgba(167,139,250,0.3)',
            bg: 'linear-gradient(135deg, #0D0520 0%, #1E0D3A 50%, #0D1525 100%)',
            tag: isFr ? '✦ Studio IA' : '✦ AI Studio',
            titre: isFr ? 'Génère ta leçon\nen 30 secondes chrono.' : 'Generate your lesson\nin 30 seconds flat.',
            desc: isFr
              ? "Décris ton sujet. KlassIA+ crée un plan complet AVANT / PENDANT / APRÈS adapté au gabarit pédagogique de ta province — personnalisé pour ton style d'enseignement."
              : "Describe your topic. KlassIA+ creates a full Hook / During / After plan adapted to your province's template — personalized to your teaching style.",
            stats: [
              { v: '30s', l: isFr ? 'Génération' : 'Generation' },
              { v: '100%', l: isFr ? 'Personnalisé' : 'Personalized' },
              { v: '6', l: isFr ? 'Provinces' : 'Provinces' },
            ],
            visuel: (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(167,139,250,0.15)' }}>
                <div style={{ background: 'rgba(167,139,250,0.1)', padding: '10px 14px', borderBottom: '1px solid rgba(167,139,250,0.15)', fontSize: '9px', color: '#A78BFA', fontWeight: 700, letterSpacing: '1px' }}>
                  {isFr ? '✦ STUDIO IA · PLAN DE LEÇON · FRANÇAIS 3e · ALBERTA' : '✦ AI STUDIO · LESSON PLAN · FRENCH 3rd · ALBERTA'}
                </div>
                <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: isFr ? '🟡 AVANT · 15 min' : '🟡 HOOK · 15 min', color: '#FCD34D', items: isFr
                      ? ["Amorce : lecture d'un extrait de Rimbaud", "Question : Qu'est-ce qu'une métaphore ?", 'Vocabulaire clé : métaphore · rythme · vers']
                      : ["Hook: reading an excerpt from Rimbaud", "Question: What is a metaphor?", 'Key vocab: metaphor · rhythm · verse'] },
                    { label: isFr ? '🔵 PENDANT · 50 min' : '🔵 DURING · 50 min', color: '#60A5FA', items: isFr
                      ? ["Modélisation : analyse collective d'un poème", 'Pratique guidée : annotation en binômes', "Autonome : rédaction d'une strophe"]
                      : ['Modeling: collective poem analysis', 'Guided practice: annotation in pairs', 'Independent: write one stanza'] },
                    { label: isFr ? '🟢 APRÈS · 10 min' : '🟢 AFTER · 10 min', color: '#34D399', items: isFr
                      ? ['Retour oral : partage de 3 élèves', 'Billet de sortie : 1 apprentissage clé']
                      : ['Oral sharing: 3 students share', 'Exit ticket: 1 key learning'] },
                  ].map((b, i) => (
                    <div key={i} style={{ borderRadius: '8px', border: `1px solid ${b.color}25`, background: `${b.color}0A`, padding: '8px 12px' }}>
                      <div style={{ color: b.color, fontWeight: 700, fontSize: '10px', marginBottom: '4px' }}>{b.label}</div>
                      {b.items.map((item, j) => <div key={j} style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', paddingLeft: '8px' }}>· {item}</div>)}
                    </div>
                  ))}
                  <div style={{ padding: '8px 12px', background: 'rgba(167,139,250,0.15)', borderRadius: '8px', color: '#A78BFA', fontSize: '10px', fontWeight: 700, textAlign: 'center' }}>
                    {isFr ? '✦ Généré en 28s · Exportable Word & PowerPoint' : '✦ Generated in 28s · Export to Word & PowerPoint'}
                  </div>
                </div>
              </div>
            ),
          },
          {
            accent: '#60A5FA', border: 'rgba(96,165,250,0.3)',
            bg: 'linear-gradient(135deg, #020D1A 0%, #071B35 50%, #020D1A 100%)',
            tag: isFr ? '📄 Curriculum → Programme' : '📄 Curriculum → Program',
            titre: isFr ? '72 leçons structurées\nen 2 minutes.' : '72 structured lessons\nin 2 minutes.',
            desc: isFr
              ? 'Importe ton curriculum officiel (PDF ou Word). KlassIA+ analyse le document et génère automatiquement ton programme annuel complet : unités, séquences, leçons et objectifs alignés.'
              : 'Import your official curriculum (PDF or Word). KlassIA+ analyzes the document and automatically generates your complete annual program: units, sequences, lessons and aligned objectives.',
            stats: [
              { v: '72', l: isFr ? 'Leçons créées' : 'Lessons created' },
              { v: '<2 min', l: isFr ? 'Génération' : 'Generation' },
              { v: '36', l: isFr ? 'Semaines' : 'Weeks' },
            ],
            visuel: (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(96,165,250,0.15)' }}>
                <div style={{ background: 'rgba(96,165,250,0.1)', padding: '10px 14px', borderBottom: '1px solid rgba(96,165,250,0.15)', fontSize: '9px', color: '#60A5FA', fontWeight: 700, letterSpacing: '1px' }}>
                  {isFr ? 'PROGRAMME ANNUEL · SCIENCES 8e · 36 SEMAINES · ALBERTA' : 'ANNUAL PROGRAM · SCIENCE 8 · 36 WEEKS · ALBERTA'}
                </div>
                <div style={{ padding: '14px' }}>
                  {[
                    { titre: isFr ? 'Unité 1 — Cellules et organismes'     : 'Unit 1 — Cells and organisms',    sem: 'S1–S6',   nb: 12, c: '#60A5FA', pct: 100 },
                    { titre: isFr ? 'Unité 2 — Systèmes corporels humains'  : 'Unit 2 — Human body systems',     sem: 'S7–S14',  nb: 15, c: '#A78BFA', pct: 75 },
                    { titre: isFr ? 'Unité 3 — Optique et lumière'          : 'Unit 3 — Optics and light',       sem: 'S15–S22', nb: 14, c: '#34D399', pct: 30 },
                    { titre: isFr ? 'Unité 4 — Fluides et densité'          : 'Unit 4 — Fluids and buoyancy',    sem: 'S23–S30', nb: 16, c: '#F59E0B', pct: 0 },
                    { titre: isFr ? "Unité 5 — Systèmes de la Terre"        : "Unit 5 — Earth's systems",        sem: 'S31–S36', nb: 15, c: '#F87171', pct: 0 },
                  ].map((u, i) => (
                    <div key={i} style={{ marginBottom: '7px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: u.c, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>{u.titre}</span>
                        <span style={{ fontSize: '9px', color: u.c, fontWeight: 700 }}>{u.nb} {isFr ? 'leçons' : 'lessons'}</span>
                      </div>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', marginLeft: '13px' }}>
                        <div style={{ height: '100%', width: `${u.pct}%`, background: u.c, borderRadius: '99px' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(74,222,128,0.1)', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80', fontSize: '10px', fontWeight: 600 }}>
                    {isFr ? '✓ 72 leçons générées · Objectifs alignés sur le curriculum Alberta' : '✓ 72 lessons generated · Objectives aligned to Alberta curriculum'}
                  </div>
                </div>
              </div>
            ),
          },
          {
            accent: '#34D399', border: 'rgba(52,211,153,0.3)',
            bg: 'linear-gradient(135deg, #010F09 0%, #04261A 50%, #010F09 100%)',
            tag: isFr ? '🖥️ Mode TBI · Enseigner' : '🖥️ IWB Mode · Teaching',
            titre: isFr ? 'Enseigne. Sans préparer\ndes diaporamas.' : 'Teach. Without preparing\npresentations.',
            desc: isFr
              ? "Projette ta leçon sur n'importe quel tableau blanc interactif. Timer intégré, sondage QR en temps réel, tableau blanc numérique — tout depuis un seul bouton."
              : 'Project your lesson on any interactive whiteboard. Built-in timer, real-time QR poll, digital whiteboard — all from a single button.',
            stats: [
              { v: '1 clic', l: isFr ? 'Lancer TBI' : 'Launch IWB' },
              { v: isFr ? 'Temps réel' : 'Real-time', l: isFr ? 'Sondage QR' : 'QR Poll' },
              { v: '6', l: isFr ? 'Presets timer' : 'Timer presets' },
            ],
            visuel: (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(52,211,153,0.15)' }}>
                <div style={{ background: 'rgba(52,211,153,0.1)', padding: '10px 14px', borderBottom: '1px solid rgba(52,211,153,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#34D399', fontWeight: 700, letterSpacing: '1px' }}>
                    {isFr ? 'MODE TBI · FRANÇAIS 3e A · DIAPOSITIVE 2/6' : 'IWB MODE · FRENCH 3A · SLIDE 2/6'}
                  </span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <span style={{ padding: '2px 7px', background: 'rgba(52,211,153,0.2)', borderRadius: '4px', color: '#34D399', fontSize: '9px', fontWeight: 700 }}>⏱ 08:23</span>
                    <span style={{ padding: '2px 7px', background: 'rgba(96,165,250,0.2)', borderRadius: '4px', color: '#60A5FA', fontSize: '9px', fontWeight: 700 }}>📲 {isFr ? 'QR actif' : 'QR active'}</span>
                  </div>
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
                    🔵 {isFr ? 'PENDANT — Pratique guidée' : 'DURING — Guided practice'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', lineHeight: 1.7, marginBottom: '10px' }}>
                    {isFr ? 'Annotez le poème en binômes.' : 'Annotate the poem in pairs.'}<br />
                    {isFr ? 'Identifiez 3 figures de style différentes.' : 'Identify 3 different literary devices.'}<br />
                    {isFr ? 'Durée : 15 minutes' : 'Duration: 15 minutes'}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '8px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>
                      📲 {isFr ? 'SONDAGE EN DIRECT · 19/24 réponses' : 'LIVE POLL · 19/24 responses'}
                    </div>
                    {(isFr
                      ? [{ t: 'Métaphore (47%)', pct: 47, c: '#A78BFA' }, { t: 'Comparaison (32%)', pct: 32, c: '#60A5FA' }, { t: 'Personnification (21%)', pct: 21, c: '#34D399' }]
                      : [{ t: 'Metaphor (47%)', pct: 47, c: '#A78BFA' }, { t: 'Simile (32%)', pct: 32, c: '#60A5FA' }, { t: 'Personification (21%)', pct: 21, c: '#34D399' }]
                    ).map((r, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>{r.t}</div>
                        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                          <div style={{ height: '100%', width: `${r.pct}%`, background: r.c, borderRadius: '99px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {(isFr ? ['← Préc.', 'Tableau ✏', 'Suiv. →'] : ['← Prev.', 'Board ✏', 'Next →']).map((b, i) => (
                      <div key={i} style={{ flex: 1, padding: '5px', background: i === 2 ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '6px', color: i === 2 ? '#34D399' : 'rgba(255,255,255,0.3)', fontSize: '9px', fontWeight: 600, textAlign: 'center' }}>{b}</div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            accent: '#F59E0B', border: 'rgba(245,158,11,0.3)',
            bg: 'linear-gradient(135deg, #0F0800 0%, #261500 50%, #0F0800 100%)',
            tag: isFr ? '🎮 Quiz Live · Gamification' : '🎮 Live Quiz · Gamification',
            titre: isFr ? 'La salle entière joue\nen même temps.' : 'The whole room plays\nat the same time.',
            desc: isFr
              ? "Lance un quiz interactif en temps réel. Les élèves rejoignent via QR code depuis leur téléphone. Classement en direct, badges, podium final — l'engagement garanti."
              : 'Launch a real-time interactive quiz. Students join via QR code from their phone. Live leaderboard, badges, final podium — engagement guaranteed.',
            stats: [
              { v: 'QR', l: isFr ? 'Rejoindre' : 'Join' },
              { v: isFr ? 'Temps réel' : 'Real-time', l: isFr ? 'Classement' : 'Leaderboard' },
              { v: '🏆', l: 'Podium' },
            ],
            visuel: (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div style={{ background: 'rgba(245,158,11,0.1)', padding: '10px 14px', borderBottom: '1px solid rgba(245,158,11,0.15)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', color: '#F59E0B', fontWeight: 700, letterSpacing: '1px' }}>
                    {isFr ? 'QUIZ LIVE · 24 PARTICIPANTS · Q4/10' : 'LIVE QUIZ · 24 PARTICIPANTS · Q4/10'}
                  </span>
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>⏱ {isFr ? '14s restantes' : '14s left'}</span>
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ padding: '10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', marginBottom: '10px', fontSize: '11px', color: 'white', fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
                    {isFr ? "Quelle province a adopté le programme de mathématiques le plus récent ?" : "Which province adopted the most recent math curriculum?"}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '10px' }}>
                    {[{ l: 'Alberta', c: '#F87171', s: '△', pct: 38 }, { l: 'Ontario', c: '#60A5FA', s: '○', pct: 54 }, { l: isFr ? 'Québec' : 'Quebec', c: '#34D399', s: '□', pct: 4 }, { l: 'C.-B. / B.C.', c: '#F59E0B', s: '☆', pct: 4 }].map((o, i) => (
                      <div key={i} style={{ padding: '7px 8px', background: o.c + '15', border: `1px solid ${o.c}35`, borderRadius: '7px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                          <span style={{ color: o.c, fontSize: '10px' }}>{o.s}</span>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>{o.l}</span>
                        </div>
                        <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px' }}>
                          <div style={{ height: '100%', width: `${o.pct}%`, background: o.c, borderRadius: '99px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginBottom: '5px', fontWeight: 600 }}>
                    🏆 {isFr ? 'CLASSEMENT EN DIRECT' : 'LIVE LEADERBOARD'}
                  </div>
                  {[{ a: '🦁', n: 'Emma L.', s: 3800, badge: '🥇' }, { a: '🐯', n: 'Lucas M.', s: 3450, badge: '🥈' }, { a: '🦊', n: 'Sofia R.', s: 3200, badge: '🥉' }].map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                      <span style={{ fontSize: '11px' }}>{p.badge}</span>
                      <span style={{ fontSize: '13px' }}>{p.a}</span>
                      <span style={{ flex: 1, fontSize: '10px', color: 'rgba(255,255,255,0.65)' }}>{p.n}</span>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#F59E0B' }}>{p.s.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            accent: '#FCD34D', border: 'rgba(252,211,77,0.3)',
            bg: 'linear-gradient(135deg, #0F0B00 0%, #221900 50%, #0F0B00 100%)',
            tag: isFr ? '🎯 Inclusion & Différenciation' : '🎯 Inclusion & Differentiation',
            titre: isFr ? "Chaque élève à\nson niveau exact." : "Every student at\ntheir exact level.",
            desc: isFr
              ? "Décris le profil de ton élève sans le nommer. KlassIA+ génère une version adaptée du cours pour la dyslexie, le TDAH, les apprenants ELL — en 15 secondes. Confidentiel par design."
              : "Describe your student's profile without naming them. KlassIA+ generates an adapted version of the lesson for dyslexia, ADHD, ELL learners — in 15 seconds. Confidential by design.",
            stats: [
              { v: '15s', l: isFr ? 'Adaptation' : 'Adaptation' },
              { v: '100%', l: isFr ? 'Confidentiel' : 'Confidential' },
              { v: '∞', l: isFr ? 'Profils' : 'Profiles' },
            ],
            visuel: (
              <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(252,211,77,0.15)' }}>
                <div style={{ background: 'rgba(252,211,77,0.08)', padding: '10px 14px', borderBottom: '1px solid rgba(252,211,77,0.15)', fontSize: '9px', color: '#FCD34D', fontWeight: 700, letterSpacing: '1px' }}>
                  {isFr ? 'DIFFÉRENCIATION IA · LEÇON : MITOSE · 3 PROFILS' : 'AI DIFFERENTIATION · LESSON: MITOSIS · 3 PROFILES'}
                </div>
                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { icon: '📖', label: isFr ? 'Élève dyslexique' : 'Dyslexic student', color: '#FCD34D', items: isFr
                      ? ['Police adaptée + espacement augmenté', 'Contenu découpé en micro-étapes', 'Schémas visuels pour chaque concept']
                      : ['Adapted font + increased spacing', 'Content broken into micro-steps', 'Visual diagrams for each concept'] },
                    { icon: '⚡', label: 'TDAH / ADHD', color: '#F87171', items: isFr
                      ? ['Durées réduites à 10 min par activité', 'Transitions claires et fréquentes', 'Zones de mouvement intégrées']
                      : ['Activities capped at 10 min', 'Clear and frequent transitions', 'Movement breaks integrated'] },
                    { icon: '🌍', label: isFr ? 'Apprenant ELL' : 'ELL Learner', color: '#34D399', items: isFr
                      ? ['Vocabulaire clé défini en marge', 'Instructions en langue simplifiée', 'Lexique FR-EN disponible']
                      : ['Key vocabulary defined in margin', 'Simplified-language instructions', 'FR-EN glossary available'] },
                  ].map((p, i) => (
                    <div key={i} style={{ padding: '9px 12px', background: `${p.color}0A`, border: `1px solid ${p.color}22`, borderRadius: '9px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>{p.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: p.color }}>{p.label}</span>
                        <span style={{ marginLeft: 'auto', padding: '1px 6px', background: `${p.color}20`, borderRadius: '4px', fontSize: '8px', color: p.color, fontWeight: 600 }}>{isFr ? 'Généré ✓' : 'Generated ✓'}</span>
                      </div>
                      {p.items.map((item, j) => <div key={j} style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', paddingLeft: '20px' }}>· {item}</div>)}
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
        ]
        const s = C5[slideActif]
        return (
          <section style={{ background: '#050D1A', padding: '100px 32px 60px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '800px', height: '800px', borderRadius: '50%', background: `radial-gradient(circle, ${s.accent}18 0%, transparent 70%)`, filter: 'blur(100px)', pointerEvents: 'none', transition: 'background 0.8s' }} />
            <div style={{ position: 'absolute', bottom: '-150px', left: '-100px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.3) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
              {/* En-tête */}
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', padding: '5px 16px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.accent, display: 'inline-block', transition: 'background 0.4s' }} />
                  {isFr ? 'Découvrir KlassIA+' : 'Explore KlassIA+'}
                </div>
                <h1 style={{ fontSize: '52px', fontWeight: 900, color: 'white', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '12px' }}>
                  {isFr ? 'Une plateforme éducative ' : 'One educational platform '}
                  <span style={{ background: `linear-gradient(135deg, ${s.accent}, #ffffff90)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {isFr ? 'tout en un.' : 'all-in-one.'}
                  </span>
                </h1>
                <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.35)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
                  {isFr ? "De la préparation à l'évaluation, KlassIA+ couvre tout le cycle pédagogique." : 'From preparation to assessment, KlassIA+ covers the full pedagogical cycle.'}
                </p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
                {C5.map((c, i) => (
                  <button key={i} onClick={() => setSlideActif(i)}
                    style={{ padding: '7px 16px', borderRadius: '99px', border: `1.5px solid ${i === slideActif ? c.accent : 'rgba(255,255,255,0.08)'}`, background: i === slideActif ? `${c.accent}18` : 'rgba(255,255,255,0.03)', color: i === slideActif ? c.accent : 'rgba(255,255,255,0.35)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {c.tag}
                  </button>
                ))}
              </div>

              {/* Carte slide */}
              <div style={{ borderRadius: '28px', overflow: 'hidden', border: `1px solid ${s.border}`, boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 100px ${s.accent}12`, background: 'rgba(8,15,28,0.9)', backdropFilter: 'blur(20px)', transition: 'border-color 0.5s, box-shadow 0.5s' }}>
                {/* Barre navigateur */}
                <div style={{ background: '#060E1C', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {['#FF5F57','#FFBD2E','#27C93F'].map((c,i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '5px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>klassia.ca</div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {C5.map((_, i) => (
                      <div key={i} onClick={() => setSlideActif(i)} style={{ width: i === slideActif ? '20px' : '6px', height: '6px', borderRadius: '99px', background: i === slideActif ? s.accent : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.3s' }} />
                    ))}
                  </div>
                </div>

                {/* Layout 2 colonnes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', minHeight: '480px' }}>
                  {/* Gauche : texte + CTA */}
                  <div style={{ padding: '56px 52px', background: s.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: '-80px', left: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${s.accent}20 0%, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${s.accent}18`, border: `1px solid ${s.accent}40`, color: s.accent, padding: '5px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, marginBottom: '20px', letterSpacing: '0.5px' }}>
                        {s.tag}
                      </div>
                      <h2 style={{ fontSize: '38px', fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: '18px', whiteSpace: 'pre-line' }}>{s.titre}</h2>
                      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: '32px' }}>{s.desc}</p>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                        {s.stats.map((st, i) => (
                          <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: s.accent }}>{st.v}</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{st.l}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={() => router.push(user ? '/dashboard' : '/signup')}
                          style={{ padding: '14px 28px', background: `linear-gradient(135deg, ${s.accent}dd, ${s.accent})`, color: '#050D1A', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 6px 24px ${s.accent}44`, transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 36px ${s.accent}66` }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 24px ${s.accent}44` }}>
                          {user ? (isFr ? 'Accéder au dashboard →' : 'Go to dashboard →') : (isFr ? 'Commencer gratuitement →' : 'Start for free →')}
                        </button>
                        <button onClick={() => setShowVideo(true)}
                          style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}>
                          ▶ {isFr ? 'Voir la démo' : 'Watch demo'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Droite : visuel */}
                  <div style={{ padding: '40px 48px 40px 40px', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '100%' }}>{s.visuel}</div>
                  </div>
                </div>
              </div>

              {/* Notes bas */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginTop: '24px', flexWrap: 'wrap' }}>
                {[t.hero_note1, t.hero_note2, t.hero_note3].map((n, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                    <span style={{ color: '#4ADE80', fontWeight: 700 }}>✓</span>{n}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })()}

      {/* ── BANDE D'ANNONCE ROUGE ── */}
      <div style={{ background: '#C01010', borderTop: '2px solid #A00C0C', borderBottom: '2px solid #A00C0C', overflow: 'hidden', padding: '10px 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0, background: '#900A0A', padding: '10px 18px', fontSize: '11px', fontWeight: 800, color: 'white', letterSpacing: '2px', textTransform: 'uppercase', zIndex: 1, borderRight: '2px solid rgba(255,255,255,0.2)' }}>
            {lang === 'fr' ? '🔴 INFO' : '🔴 NEWS'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ticker 38s linear infinite', gap: '0' }}>
              {[...Array(3)].map((_, repeatIdx) => (
                <span key={repeatIdx} style={{ display: 'inline-flex', gap: '0' }}>
                  {annonces.map((a, i) => (
                    <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'white', padding: '0 28px', letterSpacing: '0.3px', fontFamily: "'Courier New', 'Courier', monospace" }}>
                      {a}
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
        <style>{`
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-33.33%); }
          }
        `}</style>
      </div>

      {/* ── STATS ── */}
      <section style={{ background: 'white', borderBottom: '1px solid #E8EEF8', padding: '52px 48px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '32px' }}>
          {[
            { v: stats.enseignants.toLocaleString('fr-CA') + '+', l: t.stat1_l, c: '#1B3F6E' },
            { v: stats.lecons.toLocaleString('fr-CA') + '+', l: t.stat2_l, c: '#7C3AED' },
            { v: stats.classes.toLocaleString('fr-CA') + '+', l: t.stat3_l, c: '#2D5FA0' },
            { v: '100%', l: t.stat4_l, c: '#059669' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', fontWeight: 900, color: s.c, marginBottom: '6px', letterSpacing: '-1.5px', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: '14px', color: '#7A8FA8' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: '#F8FAFC', padding: '96px 48px', borderTop: '1px solid #E8EEF8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ maxWidth: '600px', marginBottom: '60px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EEF4FC', color: '#1B3F6E', padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>✦ {t.feat_tag}</div>
            <h2 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, color: '#0F1923', marginBottom: '16px', whiteSpace: 'pre-line' }}>{t.feat_h}</h2>
            <p style={{ fontSize: '16px', color: '#5A6B80', lineHeight: 1.75 }}>{t.feat_sub}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {/* Feature 1 — grande carte foncée */}
            <div style={{ gridRow: 'span 2', background: 'linear-gradient(160deg, #050D1A 0%, #0F1F3A 100%)', borderRadius: '22px', padding: '32px', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: '400px' }}>
              <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', marginBottom: '20px', boxShadow: '0 8px 24px rgba(124,58,237,0.4)', flexShrink: 0 }}>📄</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px', lineHeight: 1.2, position: 'relative' }}>{t.features[0].t}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, flex: 1, position: 'relative' }}>{t.features[0].d}</div>
              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '7px', position: 'relative' }}>
                {['Curriculum uploadé', 'Programme annuel généré', '72 leçons créées automatiquement'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '9px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: i === 0 ? 'rgba(74,222,128,0.2)' : i === 1 ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: i === 0 ? '#4ADE80' : i === 1 ? '#A78BFA' : '#60A5FA', flexShrink: 0, fontWeight: 700 }}>✓</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features 2-5 */}
            {t.features.slice(1, 5).map((f, i) => {
              const styles = [
                { bg: '#FFFFFF', iconBg: '#EEF4FC', border: '#E8EEF8', tc: '#0F1923', sc: '#7A8FA8' },
                { bg: '#F5F0FF', iconBg: '#EDE9FE', border: '#DDD6FE', tc: '#1E0A3C', sc: '#6B3FA0' },
                { bg: '#FFFFFF', iconBg: '#FEF9EC', border: '#E8EEF8', tc: '#0F1923', sc: '#7A8FA8' },
                { bg: '#F0F7FF', iconBg: '#E0F2FE', border: '#BAE6FD', tc: '#0C2340', sc: '#0369A1' },
              ][i]
              return (
                <div key={i} style={{ background: styles.bg, borderRadius: '22px', padding: '28px', border: `1px solid ${styles.border}`, transition: 'all 0.2s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(15,25,35,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '13px', background: styles.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>{f.icon}</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: styles.tc, marginBottom: '8px', lineHeight: 1.3 }}>{f.t}</div>
                  <div style={{ fontSize: '13px', color: styles.sc, lineHeight: 1.7 }}>{f.d}</div>
                </div>
              )
            })}

            {/* Feature 6 — large horizontale */}
            <div style={{ gridColumn: 'span 2', background: 'linear-gradient(135deg, #F0F4FF 0%, #F5F0FF 100%)', borderRadius: '22px', padding: '28px 36px', border: '1px solid #E0D8F8', display: 'flex', alignItems: 'center', gap: '28px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 40px rgba(107,58,160,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ width: '58px', height: '58px', borderRadius: '16px', background: 'linear-gradient(135deg, #7C3AED, #4A2882)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0, boxShadow: '0 8px 24px rgba(124,58,237,0.3)' }}>{t.features[5].icon}</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F1923', marginBottom: '8px' }}>{t.features[5].t}</div>
                <div style={{ fontSize: '14px', color: '#5A6B80', lineHeight: 1.65 }}>{t.features[5].d}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ background: 'white', padding: '96px 48px', borderTop: '1px solid #E8EEF8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F0FF', color: '#7C3AED', padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>✦ {t.how_tag}</div>
            <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0F1923' }}>{t.how_h}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '36px', left: '12.5%', right: '12.5%', height: '1px', background: 'linear-gradient(90deg, #E8EEF8, #DDD6FE 50%, #E8EEF8)', zIndex: 0 }} />
            {t.steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: i < 2 ? 'linear-gradient(135deg, #1B3F6E, #2D5FA0)' : 'linear-gradient(135deg, #7C3AED, #4A2882)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: i < 2 ? '0 8px 28px rgba(27,63,110,0.3)' : '0 8px 28px rgba(124,58,237,0.3)', border: '4px solid white' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'white', letterSpacing: '-0.5px' }}>{s.n}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F1923', marginBottom: '10px', lineHeight: 1.3 }}>{s.t}</div>
                <div style={{ fontSize: '13px', color: '#7A8FA8', lineHeight: 1.7 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ── */}
      <section id="temoignages" style={{ background: '#F8FAFC', padding: '96px 48px', borderTop: '1px solid #E8EEF8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EEF4FC', color: '#1B3F6E', padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>⭐ {t.temoignages_tag}</div>
            <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0F1923' }}>{t.temoignages_h}</h2>
          </div>
          <div style={{ background: 'linear-gradient(160deg, #050D1A, #0F1F3A)', borderRadius: '24px', padding: '52px', marginBottom: '20px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '80px', color: '#A78BFA', opacity: 0.15, lineHeight: 0.7, marginBottom: '24px', fontFamily: 'Georgia', float: 'left', marginRight: '12px' }}>"</div>
              <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.8, fontStyle: 'italic', marginBottom: '32px', maxWidth: '700px', margin: '0 auto 32px' }}>
                "{TEMOIGNAGES[temoignageActif].texte}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: TEMOIGNAGES[temoignageActif].couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 700, color: 'white', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>{TEMOIGNAGES[temoignageActif].initiales}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>{TEMOIGNAGES[temoignageActif].nom}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{TEMOIGNAGES[temoignageActif].role}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)', marginTop: '1px' }}>{TEMOIGNAGES[temoignageActif].ecole}</div>
                </div>
                <div>{'★★★★★'.split('').map((_, i) => <span key={i} style={{ color: '#FCD34D', fontSize: '18px' }}>★</span>)}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {TEMOIGNAGES.map((_, i) => (
              <div key={i} onClick={() => setTemoignageActif(i)} style={{ width: i === temoignageActif ? '28px' : '8px', height: '8px', borderRadius: '99px', background: i === temoignageActif ? '#7C3AED' : '#E8EEF8', cursor: 'pointer', transition: 'all 0.3s' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
            {TEMOIGNAGES.map((tItem, i) => (
              <div key={i} onClick={() => setTemoignageActif(i)} style={{ background: 'white', border: `1.5px solid ${temoignageActif === i ? '#7C3AED' : '#E8EEF8'}`, borderRadius: '16px', padding: '18px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: temoignageActif === i ? '0 4px 20px rgba(124,58,237,0.12)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: tItem.couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{tItem.initiales}</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#0F1923' }}>{tItem.nom}</div>
                    <div style={{ fontSize: '10px', color: '#B0BDD0' }}>{tItem.ecole.split(',')[0]}</div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#7A8FA8', lineHeight: 1.6 }}>"{tItem.texte.substring(0, 88)}..."</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: 'white', padding: '96px 48px', borderTop: '1px solid #E8EEF8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EEF4FC', color: '#1B3F6E', padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>💎 {t.pricing_tag}</div>
            <h2 style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0F1923', marginBottom: '12px' }}>{t.pricing_h}</h2>
            <p style={{ fontSize: '16px', color: '#7A8FA8' }}>{t.pricing_sub}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '20px', maxWidth: '1200px', margin: '0 auto', alignItems: 'center' }}>
            {t.plans.map((plan, i) => (
              <div key={i} style={{ background: plan.highlight ? 'linear-gradient(160deg, #050D1A, #130924)' : 'white', border: plan.highlight ? '1px solid rgba(124,58,237,0.3)' : '1px solid #E8EEF8', borderRadius: '24px', padding: plan.highlight ? '40px 32px' : '32px', transform: plan.highlight ? 'scale(1.04)' : 'scale(1)', position: 'relative', boxShadow: plan.highlight ? '0 24px 60px rgba(124,58,237,0.22)' : '0 2px 12px rgba(15,25,35,0.06)' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #C9A84C, #E5C060)', color: 'white', fontSize: '11px', fontWeight: 700, padding: '5px 18px', borderRadius: '99px', whiteSpace: 'nowrap' as const }}>{t.popular}</div>
                )}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#7A8FA8', marginBottom: '8px' }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '44px', fontWeight: 900, letterSpacing: '-2px', color: plan.highlight ? 'white' : '#0F1923', lineHeight: 1 }}>{plan.price}</span>
                    <span style={{ fontSize: '14px', color: plan.highlight ? 'rgba(255,255,255,0.3)' : '#B0BDD0' }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#7A8FA8', marginTop: '6px' }}>{plan.desc}</div>
                </div>
                <div style={{ height: '1px', background: plan.highlight ? 'rgba(255,255,255,0.07)' : '#F0F4FF', marginBottom: '20px' }} />
                <div style={{ marginBottom: '28px' }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: plan.highlight ? 'rgba(255,255,255,0.72)' : '#3D4F65', marginBottom: '12px' }}>
                      <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: plan.highlight ? 'rgba(124,58,237,0.25)' : '#EEF4FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: plan.highlight ? '#A78BFA' : '#1B3F6E', flexShrink: 0, fontWeight: 700 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push('/signup')} style={{ width: '100%', padding: '14px', background: plan.highlight ? 'linear-gradient(135deg, #2D5FA0, #7C3AED)' : '#F8FAFC', color: plan.highlight ? 'white' : '#1B3F6E', border: plan.highlight ? 'none' : '1.5px solid #E8EEF8', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: plan.highlight ? '0 4px 20px rgba(124,58,237,0.4)' : 'none', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (plan.highlight) { e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' } else { e.currentTarget.style.background = '#EEF4FC' } }}
                  onMouseLeave={e => { if (plan.highlight) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; e.currentTarget.style.transform = 'translateY(0)' } else { e.currentTarget.style.background = '#F8FAFC' } }}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ background: '#F8FAFC', padding: '96px 48px', borderTop: '1px solid #E8EEF8' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F0FF', color: '#7C3AED', padding: '5px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>✦ {t.contact_tag}</div>
          <h2 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-1.5px', color: '#0F1923', marginBottom: '12px' }}>{t.contact_h}</h2>
          <p style={{ fontSize: '16px', color: '#7A8FA8', marginBottom: '40px', lineHeight: 1.7 }}>{t.contact_sub}</p>
          {formEnvoi === 'success' ? (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '16px', padding: '32px', fontSize: '16px', color: '#166534', fontWeight: 500 }}>{t.contact_success}</div>
          ) : (
            <form onSubmit={handleContact} style={{ background: 'white', border: '1px solid #E8EEF8', borderRadius: '24px', padding: '36px', boxShadow: '0 4px 32px rgba(15,25,35,0.08)', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3D4F65', marginBottom: '6px' }}>{t.contact_nom} *</label>
                  <input value={formContact.nom} onChange={e => setFormContact({ ...formContact, nom: e.target.value })} placeholder="Marie Leblanc" required style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EEF8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3D4F65', marginBottom: '6px' }}>{t.contact_email} *</label>
                  <input type="email" value={formContact.email} onChange={e => setFormContact({ ...formContact, email: e.target.value })} placeholder="marie@ecole.ca" required style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EEF8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3D4F65', marginBottom: '6px' }}>{t.contact_ecole}</label>
                <input value={formContact.ecole} onChange={e => setFormContact({ ...formContact, ecole: e.target.value })} placeholder="École Saint-Michel" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EEF8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#3D4F65', marginBottom: '6px' }}>{t.contact_message}</label>
                <textarea value={formContact.message} onChange={e => setFormContact({ ...formContact, message: e.target.value })} placeholder="Comment KlassIA+ peut vous aider ?" rows={3} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EEF8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: '1.6' }} />
              </div>
              <button type="submit" disabled={formEnvoi === 'loading'} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', opacity: formEnvoi === 'loading' ? 0.7 : 1, boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
                {formEnvoi === 'loading' ? 'Envoi...' : t.contact_cta}
              </button>
              <p style={{ fontSize: '12px', color: '#B0BDD0', textAlign: 'center', marginTop: '14px' }}>🔒 Tes données ne sont jamais partagées ou vendues.</p>
            </form>
          )}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ background: '#050D1A', padding: '112px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', padding: '6px 18px', borderRadius: '99px', fontSize: '12px', fontWeight: 500, marginBottom: '28px' }}>✦ KlassIA+</div>
          <h2 style={{ fontSize: '60px', fontWeight: 900, letterSpacing: '-2px', color: 'white', lineHeight: 1.05, marginBottom: '20px', whiteSpace: 'pre-line' }}>{t.cta_h}</h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.4)', marginBottom: '44px', maxWidth: '500px', margin: '0 auto 44px', lineHeight: 1.7 }}>{t.cta_sub}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(user ? '/dashboard' : '/signup')} style={{ padding: '17px 40px', background: 'white', color: '#1B3F6E', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(255,255,255,0.15)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(255,255,255,0.22)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,255,255,0.15)' }}>
              {user ? t.nav_dashboard + ' →' : t.cta_btn}
            </button>
            <button onClick={() => router.push(user ? '/dashboard/studio' : '/signup')} style={{ padding: '17px 36px', background: 'linear-gradient(135deg, #7C3AED, #4A2882)', color: 'white', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 32px rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(124,58,237,0.55)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)' }}>
              ✦ {t.cta_studio}
            </button>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.18)' }}>{t.cta_note}</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#02060F', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #1B3F6E, #7C3AED)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'white' }}>K</div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>Klass<span style={{ color: '#7C3AED' }}>IA</span></span>
        </div>
        <div style={{ display: 'flex', gap: '28px' }}>
          {t.footer_links.map((l, i) => (
            <span key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>{t.footer_note}</div>
      </footer>

      {/* ── MODAL VIDÉO ── */}
      {showVideo && (
        <div onClick={() => setShowVideo(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(10px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0D1525', borderRadius: '24px', overflow: 'hidden', width: '100%', maxWidth: '800px', boxShadow: '0 48px 120px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>✦ Démo KlassIA+</span>
              <button onClick={() => setShowVideo(false)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', fontSize: '15px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ background: '#050D1A', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎬</div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Démo vidéo</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Disponible lors du lancement</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
