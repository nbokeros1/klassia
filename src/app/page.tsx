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
    texte: 'KlassIA m\'a fait économiser au moins 6 heures par semaine. Je charge mon curriculum en début d\'année et tout est organisé automatiquement. Mes plans de leçon sont prêts en 30 secondes.',
    initiales: 'ML',
    couleur: '#1B3F6E',
    note: 5,
  },
  {
    nom: 'Jean-Philippe Tremblay',
    ecole: 'Collège Notre-Dame, Québec',
    role: 'Enseignant de mathématiques · 10e année',
    texte: 'L\'export PowerPoint est incroyable. Je projette directement les slides générées par KlassIA. La différenciation automatique pour mes élèves à besoins particuliers me sauve chaque semaine.',
    initiales: 'JT',
    couleur: '#6B3FA0',
    note: 5,
  },
  {
    nom: 'Amina Diallo',
    ecole: 'École française de Calgary, AB',
    role: 'Étudiante en éducation · Université Saint-Jean',
    texte: 'En stage, KlassIA m\'a permis de préparer mes leçons aussi vite que des enseignants expérimentés. Le gabarit AVANT/PENDANT/APRÈS est exactement ce qu\'on nous enseigne à l\'université.',
    initiales: 'AD',
    couleur: '#059669',
    note: 5,
  },
  {
    nom: 'Sophie Bergeron',
    ecole: 'École primaire des Érables, Laval',
    role: 'Enseignante · 4e et 5e année',
    texte: 'Je n\'avais jamais utilisé d\'IA avant KlassIA. C\'est simple, en français, et ça respecte la vie privée de mes élèves. C\'est exactement ce dont les enseignants ont besoin.',
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
    sous: 'Chargez votre curriculum officiel. KlassIA analyse et structure toute votre année en moins de 2 minutes — syllabus, unités, leçons.',
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
    sous: 'Décrivez les besoins de vos élèves sans les nommer. KlassIA génère des stratégies et une version adaptée du cours pour chaque profil.',
    accent: '#FCD34D',
    bg: 'linear-gradient(135deg, #1A1000 0%, #2D1E00 100%)',
    mockup: 'inclusion',
  },
]

const ANNONCES_FR = [
  '🔴 NOUVEAU — Génération de slides interactifs disponible bientôt',
  '🎓 72 enseignants ont rejoint KlassIA cette semaine',
  '✦ Export PowerPoint prêt en 1 clic',
  '📚 Curriculum québécois, ontarien et CB supporté',
  '🔒 Données des élèves 100% protégées — jamais envoyées à l\'IA',
  '🆕 Profil IA personnalisable selon votre style pédagogique',
  '⚡ Plan de leçon généré en moins de 30 secondes',
]

const ANNONCES_EN = [
  '🔴 NEW — Interactive slides generation coming soon',
  '🎓 72 teachers joined KlassIA this week',
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

    const temoInterval = setInterval(() => setTemoignageActif(prev => (prev + 1) % TEMOIGNAGES.length), 5000)
    const slideInterval = setInterval(() => setSlideActif(prev => (prev + 1) % SLIDES.length), 4500)
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
      hero_sub: "Charge ton curriculum officiel. KlassIA génère ton syllabus, tes plans de leçon, tes évaluations et tes activités différenciées — automatiquement.",
      hero_cta: 'Commencer gratuitement', hero_demo: 'Voir la démo',
      hero_note1: 'Aucune carte requise', hero_note2: 'Données protégées', hero_note3: 'Prêt en 5 min',
      stat1_l: 'enseignants actifs', stat2_l: 'leçons générées', stat3_l: 'classes organisées', stat4_l: 'données anonymisées',
      feat_tag: 'Fonctionnalités', feat_h: 'Tout ce dont tu as besoin.\nRien de superflu.',
      feat_sub: 'Deux volets distincts — organisation pure et IA pédagogique — pour un usage simple, rapide et précis.',
      features: [
        { icon: '📄', t: 'Curriculum → Programme complet', d: "Charge ton curriculum. KlassIA génère syllabus, 72 leçons, objectifs et sous-dossiers en moins de 2 minutes." },
        { icon: '📋', t: 'Plans de leçon sur mesure', d: 'Gabarit AVANT / PENDANT / APRÈS. Basé sur ton modèle personnel. Prêts en 30 secondes.' },
        { icon: '📅', t: 'Emploi du temps intelligent', d: "Entre ton horaire une fois. L'app organise tes cours, dossiers et rappels automatiquement." },
        { icon: '🎯', t: 'Inclusion & différenciation', d: 'Décris les besoins sans nommer les élèves. KlassIA génère des stratégies adaptées à chaque profil.' },
        { icon: '❓', t: 'Quiz, évaluations & corrections', d: "Quiz auto-corrigés, grilles d'évaluation et billets de sortie liés à tes objectifs." },
        { icon: '🧠', t: "IA qui apprend ton style", d: 'Plus tu utilises KlassIA, plus elle te connaît. Elle mémorise tes préférences pédagogiques.' },
      ],
      how_tag: 'Comment ça marche', how_h: "4 étapes. Toute l'année organisée.",
      steps: [
        { n: '01', t: 'Crée ton compte', d: 'Profil enseignant ou étudiant. École, matières, niveaux. FR ou EN. Prêt en 2 minutes.' },
        { n: '02', t: 'Charge ton curriculum', d: "PDF ou Word officiel. KlassIA analyse et structure toute l'année automatiquement." },
        { n: '03', t: 'Entre ton horaire', d: 'Tes cours sont créés, rangés et liés à ton programme annuel. Automatiquement.' },
        { n: '04', t: 'Génère et enseigne', d: "Fiches, quiz, évaluations en 30 secondes. Tu enseignes. KlassIA s'occupe du reste." },
      ],
      pricing_tag: 'Tarifs', pricing_h: 'Simple et transparent',
      pricing_sub: 'Commence gratuitement. Passe au Pro quand tu es prêt.',
      popular: '⭐ POPULAIRE',
      plans: [
        { name: 'Gratuit', price: '0$', period: '/mois', desc: 'Pour découvrir KlassIA', features: ['1 classe', '10 générations IA/mois', 'Plans de leçon', 'Export PDF'], cta: 'Commencer', highlight: false },
        { name: 'Pro', price: '9$', period: '/mois', desc: 'Pour les enseignants actifs', features: ['Classes illimitées', 'IA illimitée', 'Export PowerPoint + Word', 'Mémoire IA', 'Priorité support'], cta: 'Commencer Pro', highlight: true },
        { name: 'Institution', price: '399$', period: '/an', desc: 'Pour les écoles', features: ['Enseignants illimités', 'Dashboard admin', 'Formation incluse', 'Données hébergées au CA', 'Support dédié'], cta: 'Contacter', highlight: false },
      ],
      temoignages_tag: 'Témoignages', temoignages_h: 'Ce que disent les enseignants',
      contact_tag: 'Contact', contact_h: "Rejoins la liste d'attente",
      contact_sub: 'Sois parmi les premiers à accéder à KlassIA Pro et aux fonctionnalités exclusives.',
      contact_nom: 'Nom complet', contact_email: 'Adresse email', contact_ecole: 'École',
      contact_message: 'Message (optionnel)', contact_cta: 'Rejoindre la liste',
      contact_success: '✓ Merci ! Tu seras parmi les premiers informés.',
      cta_h: 'Prêt à reprendre le contrôle\nde ton année ?',
      cta_sub: 'Rejoins des enseignants qui préparent mieux, plus vite, avec moins de stress.',
      cta_btn: 'Commencer gratuitement', cta_studio: 'Voir le Studio IA',
      cta_note: 'Gratuit pour commencer · Aucune carte requise · Données 100% protégées',
      footer_note: '© 2026 KlassIA · Fait pour les enseignants',
      footer_links: ['Confidentialité', 'Conditions', 'Contact', 'Pour les écoles'],
    },
    en: {
      nav_features: 'Features', nav_how: 'How it works',
      nav_pricing: 'Pricing', nav_contact: 'Contact',
      nav_login: 'Sign in', nav_cta: 'Start free', nav_dashboard: 'My dashboard',
      hero_tag: 'AI pedagogical platform · FR + EN',
      hero_h1_1: 'Your school year.', hero_h1_2: 'Organized in', hero_h1_3: 'minutes.',
      hero_sub: 'Upload your official curriculum. KlassIA generates your syllabus, lesson plans, assessments and differentiated activities — automatically.',
      hero_cta: 'Start for free', hero_demo: 'Watch demo',
      hero_note1: 'No card required', hero_note2: 'Data protected', hero_note3: 'Ready in 5 min',
      stat1_l: 'active teachers', stat2_l: 'lessons generated', stat3_l: 'classes organized', stat4_l: 'student data anonymized',
      feat_tag: 'Features', feat_h: "Everything you need.\nNothing you don't.",
      feat_sub: 'Two distinct modules — pure organization and pedagogical AI — for simple, fast and precise use.',
      features: [
        { icon: '📄', t: 'Curriculum → Full program', d: 'Upload your curriculum. KlassIA generates syllabus, 72 lessons, objectives and subfolders in under 2 minutes.' },
        { icon: '📋', t: 'Custom lesson plans', d: 'Hook / During / After template. Based on your own model. Ready in 30 seconds.' },
        { icon: '📅', t: 'Smart schedule', d: 'Enter your schedule once. The app organizes your courses, folders and reminders automatically.' },
        { icon: '🎯', t: 'Inclusion & differentiation', d: 'Describe needs without naming students. KlassIA generates strategies for each profile.' },
        { icon: '❓', t: 'Quizzes, assessments & corrections', d: 'Auto-corrected quizzes, rubrics and exit tickets linked to your objectives.' },
        { icon: '🧠', t: 'AI that learns your style', d: 'The more you use KlassIA, the better it knows you. It memorizes your pedagogical preferences.' },
      ],
      how_tag: 'How it works', how_h: '4 steps. The whole year organized.',
      steps: [
        { n: '01', t: 'Create your account', d: 'Teacher or student profile. School, subjects, levels. FR or EN. Ready in 2 minutes.' },
        { n: '02', t: 'Upload your curriculum', d: 'Official PDF or Word. KlassIA analyzes and structures the entire year automatically.' },
        { n: '03', t: 'Enter your schedule', d: 'Your courses are created, organized and linked to your annual program. Automatically.' },
        { n: '04', t: 'Generate and teach', d: 'Lesson plans, quizzes, assessments in 30 seconds. You teach. KlassIA handles the rest.' },
      ],
      pricing_tag: 'Pricing', pricing_h: 'Simple and transparent',
      pricing_sub: 'Start free. Upgrade when ready.',
      popular: '⭐ POPULAR',
      plans: [
        { name: 'Free', price: '$0', period: '/month', desc: 'To discover KlassIA', features: ['1 class', '10 AI generations/month', 'Lesson plans', 'PDF export'], cta: 'Get started', highlight: false },
        { name: 'Pro', price: '$9', period: '/month', desc: 'For active teachers', features: ['Unlimited classes', 'Unlimited AI', 'PowerPoint + Word export', 'AI memory', 'Priority support'], cta: 'Start Pro', highlight: true },
        { name: 'Institution', price: '$399', period: '/year', desc: 'For schools', features: ['Unlimited teachers', 'Admin dashboard', 'Training included', 'CA-hosted data', 'Dedicated support'], cta: 'Contact us', highlight: false },
      ],
      temoignages_tag: 'Testimonials', temoignages_h: 'What teachers are saying',
      contact_tag: 'Contact', contact_h: 'Join the waitlist',
      contact_sub: 'Be among the first to access KlassIA Pro and exclusive features.',
      contact_nom: 'Full name', contact_email: 'Email address', contact_ecole: 'School',
      contact_message: 'Message (optional)', contact_cta: 'Join the list',
      contact_success: "✓ Thank you! You'll be among the first to know.",
      cta_h: 'Ready to take control\nof your year?',
      cta_sub: 'Join teachers who prepare better, faster, with less stress.',
      cta_btn: 'Start for free', cta_studio: 'See AI Studio',
      cta_note: 'Free to start · No card required · 100% protected data',
      footer_note: '© 2026 KlassIA · Made for educators',
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

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '120px 48px 80px',
        overflow: 'hidden', background: '#050D1A',
      }}>
        {/* Aurora orbs */}
        <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 12s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,63,110,0.4) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'aurora 15s ease-in-out infinite reverse', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '35%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,95,160,0.18) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'aurora 10s ease-in-out infinite', animationDelay: '-5s', pointerEvents: 'none' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '64px 64px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center', width: '100%' }}>
          {/* Left */}
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)',
              color: '#A78BFA', padding: '6px 16px', borderRadius: '99px',
              fontSize: '12px', fontWeight: 600, marginBottom: '28px', letterSpacing: '0.5px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A78BFA', display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite' }} />
              {t.hero_tag}
            </div>
            <h1 style={{ fontSize: '76px', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: '24px', color: 'white' }}>
              {t.hero_h1_1}<br />
              {t.hero_h1_2}{' '}
              <span style={{ background: 'linear-gradient(135deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic' }}>
                {t.hero_h1_3}
              </span>
            </h1>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: '40px', maxWidth: '480px' }}>{t.hero_sub}</p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '36px', flexWrap: 'wrap' }}>
              <button onClick={() => router.push(user ? '/dashboard' : '/signup')} style={{
                padding: '16px 32px', background: 'linear-gradient(135deg, #2D5FA0, #7C3AED)',
                color: 'white', border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(124,58,237,0.55)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(124,58,237,0.4)' }}>
                {user ? t.nav_dashboard + ' →' : t.hero_cta + ' →'}
              </button>
              <button onClick={() => setShowVideo(true)} style={{
                padding: '16px 24px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
                borderRadius: '12px', fontSize: '15px', cursor: 'pointer', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(10px)',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}>
                ▶ {t.hero_demo}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[t.hero_note1, t.hero_note2, t.hero_note3].map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                  <span style={{ color: '#4ADE80', fontWeight: 700, fontSize: '15px' }}>✓</span>{n}
                </div>
              ))}
            </div>
          </div>

          {/* Right: App mockup */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-24px', right: '-16px', zIndex: 2, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '12px', padding: '10px 16px', backdropFilter: 'blur(16px)', animation: 'float 3.5s ease-in-out infinite' }}>
              <div style={{ fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>✓ Plan de leçon généré</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>72 leçons · Français 3e</div>
            </div>
            <div style={{ position: 'absolute', bottom: '16px', left: '-28px', zIndex: 2, background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)', borderRadius: '12px', padding: '10px 16px', backdropFilter: 'blur(16px)', animation: 'float 4.5s ease-in-out infinite', animationDelay: '-2s' }}>
              <div style={{ fontSize: '11px', color: '#A78BFA', fontWeight: 600 }}>✦ Studio IA actif</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>24 générations ce mois</div>
            </div>

            <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 48px 120px rgba(0,0,0,0.7)', background: '#0D1525' }}>
              <div style={{ background: '#0A111E', padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#FF5F57', '#FFBD2E', '#27C93F'].map((c, i) => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '5px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>klassia.app</div>
              </div>
              <div style={{ display: 'flex', height: '380px' }}>
                <div style={{ width: '148px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', padding: '14px 0', background: '#080F1C' }}>
                  <div style={{ padding: '0 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Klass<span style={{ color: '#A78BFA' }}>IA</span></span>
                  </div>
                  {[{ l: 'Dashboard', a: true }, { l: 'Mes classes', a: false }, { l: 'Calendrier', a: false }, { l: 'Ressources', a: false }].map((item, i) => (
                    <div key={i} style={{ padding: '7px 14px', fontSize: '10px', background: item.a ? 'rgba(27,63,110,0.25)' : 'transparent', color: item.a ? '#60A5FA' : 'rgba(255,255,255,0.28)', fontWeight: item.a ? 600 : 400, borderLeft: `2px solid ${item.a ? '#2D5FA0' : 'transparent'}` }}>{item.l}</div>
                  ))}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 12px' }} />
                  <div style={{ padding: '0 14px 6px', fontSize: '8px', color: '#A78BFA', fontWeight: 700, letterSpacing: '1px' }}>IA ✦</div>
                  {[{ l: 'Studio IA' }, { l: 'Profil IA' }, { l: 'Historique' }].map((item, i) => (
                    <div key={i} style={{ padding: '7px 14px', fontSize: '10px', color: 'rgba(167,139,250,0.55)' }}>{item.l}</div>
                  ))}
                </div>
                <div style={{ flex: 1, padding: '18px', overflow: 'hidden' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'white', marginBottom: '2px' }}>Bonjour, Marie 👋</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.22)' }}>Lundi · 4 cours aujourd'hui</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', marginBottom: '14px' }}>
                    {[{ v: '4', l: 'Classes', bg: 'rgba(27,63,110,0.3)', c: '#60A5FA' }, { v: '72', l: 'Leçons', bg: 'rgba(124,58,237,0.3)', c: '#A78BFA' }, { v: '98%', l: 'Prêtes', bg: 'rgba(74,222,128,0.12)', c: '#4ADE80' }, { v: '✦ 24', l: 'IA', bg: 'rgba(124,58,237,0.2)', c: '#C084FC' }].map((s, i) => (
                      <div key={i} style={{ background: s.bg, borderRadius: '8px', padding: '8px', textAlign: 'center', border: `1px solid ${s.c}18` }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: s.c }}>{s.v}</div>
                        <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', padding: '10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', marginBottom: '8px', letterSpacing: '0.5px' }}>COURS DU JOUR</div>
                    {[{ n: 'Français 3e A', t: '8h00', s: 'Prête', c: '#4ADE80' }, { n: 'Littérature 5e', t: '10h00', s: 'Prête', c: '#4ADE80' }, { n: 'Français 2e', t: '13h00', s: 'À préparer', c: '#FCD34D' }, { n: 'Français 4e B', t: '15h00', s: '✦ IA', c: '#A78BFA' }].map((l, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '2px', background: l.c, flexShrink: 0 }} />
                        <div style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{l.n}</div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.2)' }}>{l.t}</div>
                        <div style={{ fontSize: '7px', padding: '2px 6px', borderRadius: '4px', background: l.c + '20', color: l.c, fontWeight: 600 }}>{l.s}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CARROUSEL ── */}
      <section style={{ background: '#07101F', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '64px 48px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
              {lang === 'fr' ? 'Découvrez KlassIA' : 'Explore KlassIA'}
            </div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'white', letterSpacing: '-1px', lineHeight: 1.15 }}>
              {lang === 'fr' ? 'Une plateforme. Tout en un.' : 'One platform. All-in-one.'}
            </h2>
          </div>

          {/* Slide principale */}
          <div style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', marginBottom: '16px', transition: 'all 0.5s ease' }}>
            <div style={{ background: slide.bg, padding: '56px 64px', minHeight: '340px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${slide.accent}30 0%, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${slide.accent}18`, border: `1px solid ${slide.accent}35`, color: slide.accent, padding: '5px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 600, marginBottom: '20px', letterSpacing: '0.5px' }}>
                  {slide.tag}
                </div>
                <h3 style={{ fontSize: '38px', fontWeight: 900, color: 'white', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '18px', whiteSpace: 'pre-line' }}>
                  {slide.titre}
                </h3>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, marginBottom: '28px' }}>
                  {slide.sous}
                </p>
                <button onClick={() => router.push(user ? '/dashboard' : '/signup')} style={{ padding: '12px 24px', background: slide.accent, color: '#050D1A', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 6px 20px ${slide.accent}40` }}>
                  {lang === 'fr' ? 'Essayer maintenant →' : 'Try now →'}
                </button>
              </div>

              {/* Slide visual */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slide.mockup === 'dashboard' && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>VOS CLASSES</div>
                    {[{ n: 'Français 3e A', p: 85, c: '#60A5FA' }, { n: 'Mathématiques 10e', p: 72, c: '#A78BFA' }, { n: 'Sciences 8e', p: 60, c: '#34D399' }].map((cls, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>{cls.n}</span>
                          <span style={{ fontSize: '11px', color: cls.c, fontWeight: 600 }}>{cls.p}%</span>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                          <div style={{ width: `${cls.p}%`, height: '100%', background: cls.c, borderRadius: '2px' }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {slide.mockup === 'curriculum' && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>GÉNÉRATION EN COURS</div>
                    {['Analyse du curriculum...', 'Création des unités (4/6)...', 'Génération des leçons...'].map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'rgba(167,139,250,0.08)', borderRadius: '8px', border: '1px solid rgba(167,139,250,0.15)' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: i < 2 ? 'rgba(74,222,128,0.2)' : 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: i < 2 ? '#4ADE80' : '#A78BFA', flexShrink: 0 }}>{i < 2 ? '✓' : '⟳'}</div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{step}</span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 14px', background: 'rgba(74,222,128,0.08)', borderRadius: '8px', border: '1px solid rgba(74,222,128,0.2)', fontSize: '11px', color: '#4ADE80', fontWeight: 600 }}>✓ 72 leçons générées avec succès</div>
                  </>
                )}
                {slide.mockup === 'lecon' && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PLAN DE LEÇON</div>
                    {[{ label: 'AVANT', color: '#60A5FA', content: 'Activation des connaissances · 10 min' }, { label: 'PENDANT', color: '#A78BFA', content: 'Modelage + pratique guidée · 50 min' }, { label: 'APRÈS', color: '#34D399', content: 'Clôture + billet de sortie · 10 min' }].map((phase, i) => (
                      <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${phase.color}25`, background: `${phase.color}0D` }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: phase.color, marginBottom: '3px', letterSpacing: '0.5px' }}>{phase.label}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{phase.content}</div>
                      </div>
                    ))}
                  </>
                )}
                {slide.mockup === 'inclusion' && (
                  <>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PROFILS GÉNÉRÉS</div>
                    {[{ label: 'Élève dyslexique', icon: '📖', color: '#FCD34D' }, { label: 'TDAH', icon: '⚡', color: '#F87171' }, { label: 'Apprenant ELL', icon: '🌍', color: '#34D399' }].map((profil, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: `${profil.color}0D`, borderRadius: '8px', border: `1px solid ${profil.color}25` }}>
                        <span style={{ fontSize: '16px' }}>{profil.icon}</span>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: profil.color }}>{profil.label}</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>Cours adapté généré ✓</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Slide dots + navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {SLIDES.map((s, i) => (
                <button key={i} onClick={() => setSlideActif(i)} style={{
                  width: i === slideActif ? '32px' : '8px', height: '8px',
                  borderRadius: '99px', border: 'none',
                  background: i === slideActif ? SLIDES[slideActif].accent : 'rgba(255,255,255,0.15)',
                  cursor: 'pointer', transition: 'all 0.3s', padding: 0,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setSlideActif(prev => (prev - 1 + SLIDES.length) % SLIDES.length)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>‹</button>
              <button onClick={() => setSlideActif(prev => (prev + 1) % SLIDES.length)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>›</button>
            </div>
          </div>
        </div>
      </section>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px', maxWidth: '960px', margin: '0 auto', alignItems: 'center' }}>
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
                <textarea value={formContact.message} onChange={e => setFormContact({ ...formContact, message: e.target.value })} placeholder="Comment KlassIA peut vous aider ?" rows={3} style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E8EEF8', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: '1.6' }} />
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
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#A78BFA', padding: '6px 18px', borderRadius: '99px', fontSize: '12px', fontWeight: 500, marginBottom: '28px' }}>✦ KlassIA</div>
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
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>✦ Démo KlassIA</span>
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
