import { COMPANY, LEGAL_DATES, LEGAL_PLACEHOLDERS, LEGAL_VERSIONS } from '@/lib/legal/constants'
import type { LegalSection } from './privacy-fr'

export { type LegalSection }

export const termsMeta = {
  version:  LEGAL_VERSIONS.terms,
  date:     LEGAL_DATES.terms,
  operator: COMPANY.name,
  country:  COMPANY.country,
  product:  COMPANY.product,
}

export const termsSections: LegalSection[] = [
  {
    id:    'exploitant',
    title: '1. Exploitant',
    paragraphs: [
      `ScorgIA est une plateforme détenue et exploitée par ${COMPANY.name} (ci-après « Bodingo »), société constituée au Canada.`,
      LEGAL_PLACEHOLDERS.legalAddress,
      'En utilisant ScorgIA, vous concluez un accord avec Bodingo selon les présentes Conditions d\'utilisation.',
    ],
  },
  {
    id:    'nature',
    title: '2. Nature de ScorgIA',
    paragraphs: [
      'ScorgIA est un outil d\'assistance pédagogique à base d\'intelligence artificielle conçu pour aider les enseignants à préparer et organiser leur enseignement.',
      'ScorgIA est un outil d\'assistance — l\'enseignant demeure en tout temps le décideur professionnel responsable. ScorgIA ne se substitue pas au jugement professionnel de l\'enseignant et ne constitue pas un remplacement à la formation pédagogique professionnelle.',
      'Le contenu généré par ScorgIA est fourni à titre de suggestion et doit être vérifié, adapté et validé par l\'enseignant avant toute utilisation.',
    ],
  },
  {
    id:    'beta-nature',
    title: '3. Statut bêta',
    paragraphs: [
      'ScorgIA est actuellement offert en bêta contrôlée à un groupe restreint d\'utilisateurs invités. En tant qu\'utilisateur bêta, vous acceptez que :',
      '• certaines fonctionnalités peuvent ne pas être entièrement développées ou peuvent évoluer ;',
      '• des erreurs ou interruptions de service peuvent survenir ;',
      '• votre retour d\'expérience peut contribuer au développement de la Plateforme ;',
      '• les conditions de la version générale du service pourront différer des présentes conditions bêta.',
      'Bodingo se réserve le droit de modifier, suspendre ou mettre fin au programme bêta à tout moment.',
    ],
  },
  {
    id:    'licence-acces',
    title: '4. Licence d\'accès',
    paragraphs: [
      'Sous réserve de votre respect des présentes Conditions, Bodingo vous accorde une licence personnelle, non exclusive, non transférable et révocable pour accéder à ScorgIA et l\'utiliser à des fins pédagogiques professionnelles légitimes.',
      'Cette licence ne vous confère aucun droit de propriété sur la Plateforme ou son contenu propriétaire.',
    ],
  },
  {
    id:    'propriete-scorgia',
    title: '5. Propriété de ScorgIA',
    paragraphs: [
      `La plateforme ScorgIA, incluant son code source, ses algorithmes, son architecture, son interface utilisateur, sa documentation propriétaire et ses composants logiciels, est la propriété exclusive de ${COMPANY.name}, protégée par les droits d\'auteur, les brevets et autres lois sur la propriété intellectuelle applicables au Canada.`,
      `© 2026 ${COMPANY.name}. Tous droits réservés.`,
      'Les marques ScorgIA, le logo et les éléments de marque associés sont des marques de commerce de Bodingo. Vous n\'êtes pas autorisé à les utiliser sans autorisation écrite préalable.',
    ],
  },
  {
    id:    'contenu-enseignant',
    title: '6. Contenu de l\'enseignant',
    paragraphs: [
      'Vous conservez l\'ensemble de vos droits sur le contenu original que vous créez et sur les documents que vous téléversez sur ScorgIA (ci-après « votre Contenu »), sous réserve des droits de tiers applicables.',
      'Le téléversement de votre Contenu sur ScorgIA ne transfère pas la propriété de ce Contenu à Bodingo. Bodingo ne revendique aucun droit de propriété sur vos documents pédagogiques originaux.',
    ],
  },
  {
    id:    'licence-exploitation',
    title: '7. Licence d\'exploitation limitée accordée à Bodingo',
    paragraphs: [
      'En téléversant votre Contenu sur ScorgIA, vous accordez à Bodingo une licence mondiale, non exclusive, libre de redevances et limitée aux fins suivantes :',
      '• héberger, stocker et sauvegarder votre Contenu ;',
      '• traiter et analyser votre Contenu pour générer du matériel pédagogique personnalisé ;',
      '• afficher votre Contenu dans l\'interface ScorgIA à votre intention ;',
      '• transmettre votre Contenu aux systèmes nécessaires à la fourniture du service (ex. : traitement IA).',
      'Cette licence prend fin dès la suppression de votre Contenu ou la fermeture de votre compte, sous réserve des délais techniques de suppression.',
      'Bodingo n\'utilisera pas votre Contenu à des fins autres que la fourniture du service sans votre consentement explicite.',
    ],
  },
  {
    id:    'contenu-tiers',
    title: '8. Contenu tiers',
    paragraphs: [
      'Si vous téléversez du contenu appartenant à un tiers (ex. : ressources éducatives protégées par droit d\'auteur, documents d\'un éditeur), vous êtes responsable d\'avoir obtenu les autorisations nécessaires pour le faire.',
      'Bodingo n\'est pas responsable des infractions aux droits de tiers découlant du contenu que vous téléversez.',
    ],
  },
  {
    id:    'curriculum-officiel',
    title: '9. Curriculum officiel',
    paragraphs: [
      'Les programmes d\'études officiels des provinces canadiennes sont des documents gouvernementaux. ScorgIA les utilise pour aligner le contenu généré sur les exigences curriculaires officielles.',
      'Ces programmes sont fournis par les autorités publiques et leur utilisation par ScorgIA est faite dans un contexte pédagogique légal. L\'alignement sur le curriculum est fourni à titre indicatif — l\'enseignant demeure responsable de vérifier la conformité curriculaire.',
    ],
  },
  {
    id:    'contenu-ia',
    title: '10. Contenu généré par intelligence artificielle',
    paragraphs: [
      'Le contenu généré par les fonctionnalités IA de ScorgIA (plans de leçon, syllabi, programmes annuels, activités) est fourni à titre de suggestion pédagogique.',
      'Ce contenu peut ne pas être unique — d\'autres utilisateurs soumettant des requêtes similaires pourraient obtenir un contenu comparable.',
      'Le statut de ce contenu au regard du droit d\'auteur canadien dépend des circonstances spécifiques et peut évoluer avec la jurisprudence. Bodingo ne garantit pas que le contenu généré par IA bénéficiera automatiquement de la protection du droit d\'auteur.',
      'Vous utilisez le contenu généré à vos propres risques, sous réserve des lois applicables et des droits de tiers.',
    ],
  },
  {
    id:    'responsabilite-professionnelle',
    title: '11. Responsabilité professionnelle',
    paragraphs: [
      'L\'enseignant reste en tout temps le décideur professionnel responsable de l\'enseignement dispensé à ses élèves. ScorgIA est un outil d\'assistance et ne remplace pas le jugement professionnel.',
      'Vous êtes responsable de :',
      '• vérifier l\'exactitude pédagogique et curriculaire du contenu généré ;',
      '• adapter le contenu généré à votre contexte de classe spécifique ;',
      '• vous conformer aux politiques de votre établissement scolaire et aux exigences de votre employeur ;',
      '• exercer votre jugement professionnel dans toute décision pédagogique.',
    ],
  },
  {
    id:    'pas-diagnostic',
    title: '12. Pas de diagnostic automatisé',
    paragraphs: [
      'ScorgIA n\'est pas un outil médical, psychologique ou diagnostique. La Plateforme ne pose pas de diagnostic sur les élèves et ne doit pas être utilisée à cette fin.',
      'Les fonctionnalités de différenciation pédagogique sont conçues pour générer des adaptations basées sur des descriptions fonctionnelles des besoins d\'apprentissage — elles ne constituent pas et ne remplacent pas une évaluation professionnelle spécialisée.',
    ],
  },
  {
    id:    'protection-eleves',
    title: '13. Protection des élèves',
    paragraphs: [
      'En utilisant les fonctionnalités de différenciation de ScorgIA, vous vous engagez à :',
      '• ne saisir que des descriptions fonctionnelles des besoins d\'apprentissage, et non des diagnostics médicaux nominatifs ;',
      '• éviter d\'identifier nominativement vos élèves dans les requêtes adressées aux systèmes IA ;',
      '• utiliser ces fonctionnalités conformément aux politiques de votre établissement concernant la protection des renseignements sur les élèves.',
    ],
  },
  {
    id:    'utilisations-interdites',
    title: '14. Utilisations interdites',
    paragraphs: [
      'Il vous est interdit d\'utiliser ScorgIA pour :',
      '• générer du contenu illégal, trompeur, diffamatoire, harcelant ou portant atteinte à des droits de tiers ;',
      '• contourner les mesures de sécurité ou de contrôle d\'accès ;',
      '• utiliser la Plateforme de manière à perturber son fonctionnement normal ;',
      '• revendre, sous-licencier ou commercialiser l\'accès à ScorgIA sans autorisation de Bodingo ;',
      '• automatiser l\'accès à la Plateforme (scraping, bots) sans autorisation ;',
      '• utiliser ScorgIA à des fins autres que pédagogiques légitimes.',
    ],
  },
  {
    id:    'comptes-securite',
    title: '15. Comptes et sécurité',
    paragraphs: [
      'Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toute activité réalisée depuis votre compte.',
      'Vous vous engagez à informer immédiatement Bodingo de tout accès non autorisé à votre compte.',
      'Bodingo se réserve le droit de suspendre ou de désactiver votre compte en cas de violation des présentes Conditions ou de comportement abusif.',
    ],
  },
  {
    id:    'suspension',
    title: '16. Suspension et résiliation',
    paragraphs: [
      'Bodingo peut suspendre ou résilier votre accès à ScorgIA en cas de violation des présentes Conditions, sans préavis en cas de violation grave.',
      'Vous pouvez cesser d\'utiliser ScorgIA à tout moment. La fermeture de votre compte est gérée selon les modalités décrites dans notre Politique de confidentialité.',
    ],
  },
  {
    id:    'disponibilite',
    title: '17. Disponibilité du service',
    paragraphs: [
      'Bodingo s\'efforce d\'assurer la disponibilité continue de ScorgIA, mais ne garantit pas un accès ininterrompu ou sans erreur.',
      'ScorgIA peut être temporairement indisponible pour maintenance, mises à jour ou raisons techniques. Bodingo ne sera pas responsable des dommages résultant d\'une indisponibilité temporaire.',
      'En tant que service bêta, ScorgIA peut présenter des instabilités inhérentes à cette phase de développement.',
    ],
  },
  {
    id:    'precision-ia',
    title: '18. Précision et limites de l\'IA',
    paragraphs: [
      'Bodingo ne garantit pas l\'exactitude, l\'exhaustivité ou la pertinence du contenu généré par les fonctionnalités IA de ScorgIA.',
      'L\'intelligence artificielle peut produire du contenu incorrect, incomplet ou inapproprié. L\'enseignant est tenu de vérifier et de valider tout contenu généré avant utilisation.',
      'L\'alignement du contenu généré sur les curriculums officiels est fourni à titre indicatif et peut comporter des inexactitudes.',
    ],
  },
  {
    id:    'responsabilite',
    title: '19. Limitation de responsabilité',
    paragraphs: [
      'Dans les limites autorisées par la loi applicable, Bodingo ne sera pas responsable des dommages indirects, consécutifs, accessoires ou punitifs découlant de l\'utilisation ou de l\'impossibilité d\'utiliser ScorgIA.',
      'La responsabilité totale de Bodingo à votre égard, pour toute cause, sera limitée au montant que vous avez payé à Bodingo pour l\'accès à ScorgIA au cours des douze mois précédant l\'événement donnant lieu à la réclamation.',
      'Pour les utilisateurs bêta (accès gratuit), la responsabilité de Bodingo est limitée au minimum requis par la loi applicable.',
    ],
  },
  {
    id:    'retours-beta',
    title: '20. Retours bêta',
    paragraphs: [
      'Si vous soumettez des retours, suggestions ou commentaires sur ScorgIA (ci-après « Retours »), Bodingo peut utiliser ces Retours pour améliorer la Plateforme.',
      'La soumission de Retours ne transfère pas la propriété de vos documents pédagogiques originaux à Bodingo. Les Retours concernant les fonctionnalités ou l\'expérience utilisateur ne constituent pas un apport de propriété intellectuelle sur vos créations pédagogiques.',
    ],
  },
  {
    id:    'marques',
    title: '21. Marques et identité de ScorgIA',
    paragraphs: [
      `Les marques ScorgIA, le logo et les éléments d'identité de marque sont des marques de commerce de ${COMPANY.name}.`,
      'Vous n\'êtes pas autorisé à utiliser les marques de Bodingo sans autorisation écrite préalable, sauf dans la mesure nécessaire pour référencer le service conformément aux présentes Conditions.',
    ],
  },
  {
    id:    'modification-service',
    title: '22. Modification du service',
    paragraphs: [
      'Bodingo se réserve le droit de modifier, d\'ajouter ou de supprimer des fonctionnalités de ScorgIA à tout moment.',
      'En cas de modifications importantes des présentes Conditions, Bodingo vous en informera par courriel ou par une notification dans l\'application avant l\'entrée en vigueur des modifications.',
    ],
  },
  {
    id:    'droit-applicable',
    title: '23. Droit applicable',
    paragraphs: [
      LEGAL_PLACEHOLDERS.governingLaw,
      'Les présentes Conditions sont régies et interprétées conformément aux lois du Canada et des lois de la province applicable, sans égard aux règles de conflits de lois.',
    ],
  },
  {
    id:    'contact',
    title: '24. Contact',
    paragraphs: [
      'Pour toute question relative aux présentes Conditions d\'utilisation :',
      LEGAL_PLACEHOLDERS.supportEmail,
      'Pour toute question relative à la protection des renseignements personnels, consultez notre Politique de confidentialité.',
    ],
  },
]
