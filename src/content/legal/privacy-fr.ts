import { COMPANY, LEGAL_DATES, LEGAL_PLACEHOLDERS, LEGAL_VERSIONS } from '@/lib/legal/constants'

export interface LegalSection {
  id:           string
  title:        string
  paragraphs:   string[]
  subsections?: { title: string; paragraphs: string[] }[]
}

export const privacyMeta = {
  version:    LEGAL_VERSIONS.privacy,
  date:       LEGAL_DATES.privacy,
  operator:   COMPANY.name,
  country:    COMPANY.country,
  product:    COMPANY.product,
}

export const privacySections: LegalSection[] = [
  {
    id:    'champ',
    title: '1. Champ d\'application',
    paragraphs: [
      `La présente Politique de confidentialité s'applique à l'utilisation de la plateforme ${COMPANY.product} (ci-après « ScorgIA » ou « la Plateforme »), détenue et exploitée par ${COMPANY.name} (ci-après « Bodingo »).`,
      'Elle s\'applique à toutes les personnes qui s\'inscrivent à ScorgIA, y naviguent ou l\'utilisent, notamment les enseignants, les étudiants en éducation et les responsables d\'établissement (ci-après « vous » ou « l\'utilisateur »).',
      'ScorgIA est actuellement offert en bêta contrôlée à un groupe restreint d\'utilisateurs invités. Certaines pratiques décrites ici sont propres à cette phase bêta.',
    ],
  },
  {
    id:    'engagement',
    title: '2. Notre engagement',
    paragraphs: [
      `${COMPANY.name} s'engage à respecter votre vie privée et à traiter vos renseignements personnels conformément aux lois canadiennes applicables en matière de protection des renseignements personnels, notamment la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) ainsi que les lois provinciales applicables.`,
      'ScorgIA est conçu pour minimiser la collecte de renseignements personnels au strict nécessaire. Nous n\'exploitons pas vos renseignements à des fins publicitaires et ne vendons jamais vos renseignements personnels à des tiers.',
    ],
  },
  {
    id:    'renseignements-utilisateur',
    title: '3. Renseignements de l\'utilisateur',
    paragraphs: [
      'Pour créer un compte ScorgIA et utiliser la Plateforme, nous recueillons les renseignements suivants :',
    ],
    subsections: [
      {
        title: '3.1 Renseignements d\'inscription',
        paragraphs: [
          'Prénom, nom, adresse courriel, mot de passe (chiffré), école ou établissement d\'appartenance, type de compte (enseignant, étudiant en éducation, institution), langue de préférence.',
          'Ces renseignements sont nécessaires pour créer et gérer votre compte et vous permettre d\'accéder aux fonctionnalités de ScorgIA.',
        ],
      },
      {
        title: '3.2 Renseignements de profil pédagogique',
        paragraphs: [
          'Matière(s) enseignée(s), niveau(x) d\'enseignement, province ou territoire, style pédagogique, préférences de génération de contenu, historique d\'utilisation des fonctionnalités IA.',
          'Ces renseignements nous permettent de personnaliser le contenu généré par l\'IA en fonction de votre contexte professionnel.',
        ],
      },
      {
        title: '3.3 Données d\'utilisation',
        paragraphs: [
          'Données de connexion, fonctionnalités utilisées, plans de leçon générés, erreurs techniques rencontrées. Ces données sont utilisées pour améliorer la Plateforme et diagnostiquer les problèmes techniques.',
        ],
      },
    ],
  },
  {
    id:    'donnees-pedagogiques',
    title: '4. Données pédagogiques',
    paragraphs: [
      'Vous pouvez téléverser sur ScorgIA des documents pédagogiques tels que des programmes d\'études officiels, des plans de cours, des ressources éducatives et des documents de classe.',
      'Ces documents sont traités pour extraire le contenu pédagogique pertinent et générer du matériel d\'enseignement. Bodingo ne s\'approprie pas vos documents originaux.',
      'Vous conservez tous les droits sur vos documents pédagogiques originaux que vous créez ou téléversez, sous réserve des droits de tiers. Le téléversement d\'un document sur ScorgIA ne transfère pas la propriété de ce document à Bodingo.',
      'Bodingo reçoit uniquement la licence technique limitée nécessaire à la fourniture du service : hébergement, traitement, affichage et transmission de vos documents dans le cadre de l\'utilisation normale de la Plateforme.',
    ],
  },
  {
    id:    'renseignements-eleves',
    title: '5. Renseignements sur les élèves',
    paragraphs: [
      'ScorgIA reconnaît que les renseignements concernant les élèves méritent une protection accrue. La Plateforme est conçue pour minimiser l\'exposition de renseignements personnels identifiables sur les élèves.',
    ],
    subsections: [
      {
        title: '5.1 Ce que vous saisissez',
        paragraphs: [
          'Vous pouvez saisir des informations sur vos élèves à des fins de différenciation pédagogique, comme des descriptions de besoins d\'apprentissage. ScorgIA vous encourage à n\'inclure que les informations strictement nécessaires à la finalité pédagogique.',
          'Évitez d\'inclure des renseignements médicaux diagnostiques, des numéros de dossier officiel ou toute information qui n\'est pas nécessaire pour générer du matériel pédagogique adapté.',
        ],
      },
      {
        title: '5.2 Traitement sécurisé',
        paragraphs: [
          'Lorsque des profils d\'élèves sont utilisés dans le contexte de fonctionnalités IA, ScorgIA applique des mécanismes de sanitisation pour remplacer les termes médicaux diagnostiques par des descriptions fonctionnelles, et pour ne pas transmettre les notes textuelles brutes de l\'enseignant aux systèmes d\'IA.',
          'ScorgIA n\'identifie pas les élèves par leur nom dans les interactions avec les fournisseurs d\'IA. Les contextes pédagogiques transmis restent agrégés et anonymisés dans la mesure du possible.',
        ],
      },
      {
        title: '5.3 Responsabilité de l\'enseignant',
        paragraphs: [
          'En tant qu\'utilisateur, vous êtes responsable de vous conformer aux obligations légales applicables à votre établissement concernant la collecte et l\'utilisation de renseignements sur vos élèves. ScorgIA n\'est pas responsable des renseignements que vous choisissez de saisir dans la Plateforme.',
        ],
      },
    ],
  },
  {
    id:    'donnees-sensibles',
    title: '6. Données sensibles',
    paragraphs: [
      'ScorgIA n\'est pas une plateforme médicale, psychologique ou diagnostique. Vous ne devez pas saisir de renseignements médicaux, de diagnostics officiels ou de renseignements de santé identifiables comme données personnelles dans la Plateforme.',
      'Si vous décrivez des besoins d\'apprentissage dans un contexte de différenciation, limitez ces descriptions au niveau fonctionnel nécessaire (ex. : « difficulté de concentration » plutôt qu\'un diagnostic médical précis).',
      'ScorgIA ne peut garantir la sécurité de renseignements sensibles de nature médicale ou psychologique. Toute saisie de tels renseignements est effectuée à votre propre discrétion et sous votre responsabilité.',
    ],
  },
  {
    id:    'intelligence-artificielle',
    title: '7. Intelligence artificielle',
    paragraphs: [
      'ScorgIA utilise des systèmes d\'intelligence artificielle pour assister certaines tâches pédagogiques, notamment la génération de plans de leçon, de syllabi, de programmes annuels et de contenu de différenciation.',
    ],
    subsections: [
      {
        title: '7.1 Fournisseur d\'IA',
        paragraphs: [
          'ScorgIA utilise des services d\'IA fournis par Anthropic (Claude). Ces appels sont effectués exclusivement depuis les serveurs de Bodingo — vos données ne sont jamais envoyées directement à un fournisseur d\'IA depuis votre navigateur.',
          'Le contenu de vos requêtes (matière, niveau, sujet de leçon, curriculum) peut être transmis au fournisseur d\'IA pour générer la réponse. Les renseignements d\'identification personnelle sont minimisés avant transmission.',
        ],
      },
      {
        title: '7.2 Contenu généré',
        paragraphs: [
          'Le contenu généré par l\'IA est fourni à titre de suggestion pédagogique. L\'enseignant demeure le décideur professionnel et doit vérifier, adapter et valider tout contenu généré avant de l\'utiliser avec ses élèves.',
          'Le contenu généré par IA peut ne pas être unique — d\'autres utilisateurs soumettant des requêtes similaires pourraient obtenir un contenu comparable. Ce contenu peut ne pas bénéficier automatiquement de la protection du droit d\'auteur selon les lois applicables.',
          'ScorgIA ne garantit pas l\'exactitude pédagogique, l\'alignement curriculaire ou la pertinence légale du contenu généré.',
        ],
      },
      {
        title: '7.3 Rétention et formation',
        paragraphs: [
          'Pour les informations relatives à l\'utilisation de vos données par le fournisseur d\'IA (Anthropic) et à leurs pratiques de confidentialité, veuillez consulter la politique de confidentialité d\'Anthropic. Bodingo ne contrôle pas les pratiques de rétention ou de formation du fournisseur d\'IA tiers.',
        ],
      },
    ],
  },
  {
    id:    'finalites',
    title: '8. Finalités du traitement',
    paragraphs: [
      'Bodingo traite vos renseignements personnels aux fins suivantes :',
      '• Création et gestion de votre compte ScorgIA ;',
      '• Fourniture des fonctionnalités de la Plateforme, notamment la génération de contenu pédagogique ;',
      '• Personnalisation de votre expérience selon votre profil enseignant ;',
      '• Amélioration de la Plateforme sur la base de données d\'utilisation agrégées et anonymisées ;',
      '• Gestion du programme bêta (retours, invitations, accès) ;',
      '• Respect de nos obligations légales ;',
      '• Communication avec vous concernant votre compte ou la Plateforme.',
      'Bodingo ne traite pas vos renseignements personnels à des fins incompatibles avec les finalités ci-dessus sans votre consentement.',
    ],
  },
  {
    id:    'pas-de-vente',
    title: '9. Pas de vente de renseignements personnels',
    paragraphs: [
      `${COMPANY.name} ne vend pas, ne loue pas et ne partage pas à des fins commerciales vos renseignements personnels ou ceux de vos élèves à des annonceurs, courtiers en données ou autres tiers à des fins de ciblage publicitaire.`,
      'Bodingo n\'utilise pas le contenu de vos documents pédagogiques ou de vos données d\'utilisation à des fins publicitaires.',
    ],
  },
  {
    id:    'sous-traitants',
    title: '10. Sous-traitants',
    paragraphs: [
      'Pour fournir la Plateforme, Bodingo fait appel à des sous-traitants qui peuvent traiter certaines de vos données dans le cadre de leurs services. Ces sous-traitants sont sélectionnés pour leurs pratiques de sécurité et de confidentialité.',
      'Les principales catégories de sous-traitants incluent : services d\'hébergement et d\'infrastructure infonuagique, services de base de données et d\'authentification, fournisseurs de services d\'intelligence artificielle.',
      'Pour la liste complète des sous-traitants identifiés et leur rôle, veuillez consulter notre inventaire des sous-traitants disponible sur demande.',
    ],
  },
  {
    id:    'transfrontalier',
    title: '11. Traitement transfrontalier',
    paragraphs: [
      'Vos données peuvent être traitées dans des pays autres que le Canada par nos sous-traitants. Ces transferts sont encadrés par des garanties contractuelles appropriées.',
      'Les serveurs principaux de ScorgIA sont exploités par des fournisseurs d\'infrastructure infonuagique. La localisation exacte des serveurs dépend de la configuration de nos sous-traitants. Pour des informations spécifiques sur la localisation du traitement de vos données, veuillez nous contacter.',
    ],
  },
  {
    id:    'securite',
    title: '12. Sécurité',
    paragraphs: [
      'Bodingo met en œuvre des mesures de sécurité techniques et organisationnelles adaptées pour protéger vos renseignements personnels contre l\'accès non autorisé, la divulgation, la modification ou la destruction.',
      'Ces mesures comprennent notamment : l\'authentification sécurisée des utilisateurs avec validation JWT côté serveur, le contrôle d\'accès au niveau des lignes de la base de données (row-level security), la validation des requêtes côté serveur, la protection des clés d\'accès API.',
      'Cependant, aucune mesure de sécurité n\'est infaillible. En cas de doute concernant la sécurité de votre compte, contactez-nous immédiatement.',
    ],
  },
  {
    id:    'conservation',
    title: '13. Conservation des données',
    paragraphs: [
      'Vos renseignements personnels sont conservés aussi longtemps que votre compte ScorgIA est actif ou que nécessaire pour vous fournir les services.',
      'En cas de fermeture de compte, vos données personnelles identificatrices sont supprimées dans un délai raisonnable, sous réserve des obligations légales de conservation.',
      'Certaines données agrégées et anonymisées peuvent être conservées à des fins d\'amélioration de la Plateforme après la fermeture de votre compte.',
      'Une politique de conservation formelle avec des délais précis sera publiée avant l\'ouverture générale du service.',
    ],
  },
  {
    id:    'suppression',
    title: '14. Fermeture de compte et suppression',
    paragraphs: [
      'Vous pouvez demander la fermeture de votre compte ScorgIA à tout moment. Cette demande entraîne la suppression de votre profil et de vos données personnelles identificatrices.',
      'Fonctionnalité de suppression en libre-service : en cours de développement. Pendant la phase bêta, la fermeture de compte se fait sur demande.',
      LEGAL_PLACEHOLDERS.supportEmail,
    ],
  },
  {
    id:    'acces-correction',
    title: '15. Accès et correction',
    paragraphs: [
      'Vous avez le droit d\'accéder aux renseignements personnels que nous détenons à votre sujet et d\'en demander la correction s\'ils sont inexacts ou incomplets.',
      'Pour exercer ces droits, contactez le responsable de la protection des renseignements personnels de Bodingo.',
      LEGAL_PLACEHOLDERS.privacyEmail,
    ],
  },
  {
    id:    'responsabilites',
    title: '16. Responsabilités de l\'enseignant et de l\'école',
    paragraphs: [
      'En tant qu\'enseignant utilisant ScorgIA, vous êtes responsable de :',
      '• vous conformer aux politiques de votre établissement concernant l\'utilisation d\'outils numériques et d\'intelligence artificielle ;',
      '• obtenir les autorisations nécessaires de votre établissement avant d\'utiliser ScorgIA dans un contexte professionnel réglementé ;',
      '• ne saisir que les renseignements sur vos élèves que vous êtes autorisé à utiliser dans ce contexte ;',
      '• vérifier et valider tout contenu généré avant de l\'utiliser avec vos élèves ;',
      '• informer vos élèves de l\'utilisation d\'outils IA dans la préparation de votre enseignement, selon les exigences applicables.',
      'Bodingo ne peut vérifier si vous disposez des autorisations nécessaires pour utiliser ScorgIA dans votre contexte professionnel spécifique.',
    ],
  },
  {
    id:    'enfants',
    title: '17. Comptes et élèves mineurs',
    paragraphs: [
      'ScorgIA est une plateforme destinée aux enseignants et professionnels de l\'éducation, et non directement aux élèves mineurs.',
      'ScorgIA ne collecte pas sciemment de renseignements personnels directement auprès d\'élèves mineurs. Si vous pensez qu\'un mineur a créé un compte sans autorisation parentale ou institutionnelle appropriée, veuillez nous contacter.',
      'Les informations sur les élèves que vous saisissez dans ScorgIA sont traitées sous votre responsabilité professionnelle en tant qu\'enseignant.',
    ],
  },
  {
    id:    'beta',
    title: '18. Phase bêta',
    paragraphs: [
      'ScorgIA est actuellement offert en bêta contrôlée. Pendant cette phase :',
      '• L\'accès est limité à des utilisateurs invités triés sur le volet ;',
      '• Certaines fonctionnalités peuvent évoluer ou être modifiées ;',
      '• Vos retours d\'expérience peuvent être utilisés pour améliorer la Plateforme. Vos retours ne constituent pas un transfert de propriété de vos documents pédagogiques originaux ;',
      '• Les pratiques de confidentialité décrites dans la présente politique s\'appliquent intégralement pendant la phase bêta.',
    ],
  },
  {
    id:    'incidents',
    title: '19. Incidents de confidentialité',
    paragraphs: [
      'En cas d\'incident de sécurité susceptible de compromettre vos renseignements personnels, Bodingo prendra les mesures appropriées, notamment vous notifier dans les délais prévus par la loi applicable.',
      'Une procédure formelle de réponse aux incidents sera publiée avant l\'ouverture générale du service.',
    ],
  },
  {
    id:    'responsable',
    title: '20. Responsable de la protection des renseignements personnels',
    paragraphs: [
      'Pour toute question relative à la protection de vos renseignements personnels, vous pouvez contacter le responsable de la protection des renseignements personnels de Bodingo :',
      LEGAL_PLACEHOLDERS.privacyOfficer,
      'Coordonnées à publier avant l\'ouverture générale du service.',
    ],
  },
  {
    id:    'modifications',
    title: '21. Modifications de la présente politique',
    paragraphs: [
      'Bodingo peut modifier la présente Politique de confidentialité pour refléter l\'évolution de nos pratiques ou des exigences légales.',
      'En cas de modifications importantes, nous vous en informerons par courriel ou par une notification visible dans l\'application avant l\'entrée en vigueur des modifications.',
      'En continuant à utiliser ScorgIA après la date d\'entrée en vigueur des modifications, vous acceptez la politique révisée.',
      'La version en vigueur est indiquée en en-tête de ce document avec la date de dernière mise à jour.',
    ],
  },
  {
    id:    'propriete',
    title: '22. Propriété de ScorgIA',
    paragraphs: [
      `ScorgIA est une plateforme détenue et exploitée par ${COMPANY.name}. Toute la technologie sous-jacente, les algorithmes, l\'architecture logicielle, l\'interface et la documentation propriétaire constituent la propriété exclusive de Bodingo, protégée par les lois canadiennes sur la propriété intellectuelle.`,
      `© 2026 ${COMPANY.name}. Tous droits réservés.`,
    ],
  },
]
