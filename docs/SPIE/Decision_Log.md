# Decision Log SPIE
## Journal des décisions d'architecture

> Chaque décision architecturale importante est documentée ici.  
> Format : contexte → décision → raison → conséquences  
> Version : SPIE-01

---

## DEC-001 — SPIE est une couche, pas une réécriture

**Date** : 2026-08-03  
**Contexte** : ScorgIA dispose d'une infrastructure IA et pédagogique significative (teacher-reasoning-engine, build-system-prompt, teacher-brain, insight/recommendation/prediction engines, 53+ tables Supabase).  
**Décision** : SPIE est une couche d'orchestration et de typage. Il enveloppe l'infrastructure existante plutôt que de la remplacer.  
**Raison** : Réécrire l'infrastructure existante représenterait des semaines de travail sans valeur ajoutée. L'infrastructure actuelle fonctionne bien. SPIE lui donne une architecture et une intention.  
**Conséquences** : Les fichiers existants ne sont jamais modifiés dans SPIE-01. Les moteurs SPIE délèguent à l'existant dans SPIE-02+. ✅

---

## DEC-002 — Séparation stricte domain model / persistance

**Date** : 2026-08-03  
**Contexte** : Les types existants dans `database.ts` (`Lecon`, `ContenuLecon`, `ProgrammeAnnuel`) sont les types de persistance Supabase.  
**Décision** : SPIE définit ses propres types de domaine (`LessonPlan`, `AnnualPlan`) qui sont plus riches et province-agnostiques. La couche de persistance mappe entre les deux.  
**Raison** : Éviter que la logique métier SPIE soit contrainte par le schéma DB. Le schéma DB peut changer (migrations) sans affecter le domain model.  
**Conséquences** : Il faut maintenir la synchronisation entre `LessonPlan` SPIE et `Lecon` DB. Un mapper sera créé dans SPIE-04. ⚠️

---

## DEC-003 — OutcomeVocabulary comme abstraction centrale

**Date** : 2026-08-03  
**Contexte** : Chaque province utilise un vocabulaire différent pour les résultats d'apprentissage (RAG/RAS, Expectations, Compétences, Big Ideas, Standards).  
**Décision** : SPIE introduit `OutcomeVocabulary` comme type abstrait mappant les différents vocabulaires provinciaux à un vocabulaire neutre commun.  
**Raison** : Permet à un algorithme de génération d'être indépendant de la province, et au PPE d'adapter le vocabulaire à la présentation.  
**Conséquences** : Le PPE doit toujours traduire avant de générer ou d'afficher. Surcoût de traduction compensé par la flexibilité multi-province. ✅

---

## DEC-004 — Pipeline state machine explicite

**Date** : 2026-08-03  
**Contexte** : Le flux curriculum → plan annuel → séquences → leçons est complexe avec des conditions (curriculum déjà extrait, plan déjà généré, etc.).  
**Décision** : SPIE implémente une machine d'états explicite (`PipelineState`, `PipelineStageId`, `PIPELINE_TRANSITIONS`) pour gérer ce flux.  
**Raison** : Rend le flux auditable, redémarrable, et testable. Permet à l'enseignant de reprendre là où il s'est arrêté.  
**Conséquences** : L'état du pipeline doit être persisté (table Supabase à créer dans SPIE-02). ⚠️

---

## DEC-005 — Gabarits versionnés séparés du prompt IA

**Date** : 2026-08-03  
**Contexte** : `build-system-prompt.ts` contient des gabarits Markdown pour la génération IA. `templates-provinciaux.ts` contient des gabarits de formulaire.  
**Décision** : Ces deux types de gabarits restent séparés. `Template` SPIE correspond aux gabarits de formulaire (UI). Les gabarits IA dans `build-system-prompt.ts` ne sont jamais modifiés par SPIE.  
**Raison** : RÈGLE ABSOLUE — Ne pas modifier le contenu pédagogique du SYSTEM_PROMPT. Les gabarits IA ont été validés pédagogiquement. Le risque de régression est trop élevé.  
**Conséquences** : Synchronisation manuelle requise si un gabarit de formulaire change significativement. SPIE-03 créera un process de validation. ⚠️

---

## DEC-006 — CurriculumId réutilise l'existant

**Date** : 2026-08-03  
**Contexte** : `src/lib/constants/curricula.ts` définit `CurriculumId` et `CURRICULA`. Ces identifiants sont utilisés partout dans le code.  
**Décision** : SPIE importe et réutilise `CurriculumId` de `curricula.ts` au lieu de redéfinir ses propres identifiants.  
**Raison** : Éviter la double source de vérité. `curricula.ts` est la source faisant foi pour les identifiants de curriculum.  
**Conséquences** : Si un nouveau curriculum est ajouté, il doit être ajouté dans `curricula.ts` ET dans le registre de provinces du PPE. ✅

---

## DEC-007 — Services vides (stubs) en SPIE-01

**Date** : 2026-08-03  
**Contexte** : SPIE-01 est la fondation. Les algorithmes de génération ne sont pas encore implémentés.  
**Décision** : Toutes les méthodes des engines lèvent `Error('— not implemented (SPIE-XX)')` avec la mission cible. Les interfaces sont complètes, les corps sont vides.  
**Raison** : Permet de valider l'architecture TypeScript (types + interfaces) sans bloquer la compilation. L'enseignant voit les erreurs de démo.  
**Conséquences** : Aucun code métier SPIE n'est utilisable en production avant SPIE-02. C'est intentionnel. ✅

---

## DEC-008 — Validators synchrones pour les opérations critiques

**Date** : 2026-08-03  
**Contexte** : TQE est le validateur asynchrone (appelle l'IA). Mais certaines validations doivent être faites sans IA (champs obligatoires, cohérence de base).  
**Décision** : `src/lib/spie/validators/` contient des validateurs synchrones purs (pas d'API calls). TQE peut appeler ces validateurs ET ajouter sa propre validation IA.  
**Raison** : Performance — les validations basiques ne doivent pas attendre une réponse API. Robustesse — même sans connexion, les validations de base fonctionnent.  
**Conséquences** : Deux niveaux de validation : synchrone (validators/) et asynchrone (TQE). ✅

---

## DEC-009 — extraire-texte.ts réutilisé sans modification (SPIE-02)

**Date** : 2026-08-04  
**Contexte** : `src/lib/documents/extraire-texte.ts` extrait déjà le texte de PDF (via pdf-parse) et DOCX (via mammoth). C'est du code production-ready.  
**Décision** : Les parseurs SPIE-02 délèguent à `extraireTexte()` pour l'extraction de texte brut et ajoutent uniquement la logique de détection de sections curriculaires.  
**Raison** : Zero duplication. Réutiliser l'infrastructure de production testée plutôt que de recréer une extraction identique.  
**Conséquences** : Dépendance de la couche parseur à `extraire-texte.ts`. Si ce fichier change d'API, les parseurs doivent être mis à jour. Risque faible — API stable. ✅

---

## DEC-010 — Extraction IA province-aware, sortie province-agnostique (SPIE-02)

**Date** : 2026-08-04  
**Contexte** : L'invite d'extraction doit utiliser le vocabulaire provincial correct (RAG/RAS pour Alberta, Expectations pour Ontario) pour guider l'IA.  
**Décision** : L'invite est paramétrée par province (`buildExtractionUserPrompt(texte, { province })`), mais la sortie normalisée (`NormalizedOutcome.vocabulaireSpie`) utilise le vocabulaire SPIE neutre.  
**Raison** : Permet à n'importe quel curriculum futur d'être ingéré sans modifier le pipeline. La normalisation est le pont entre provincial et universel.  
**Conséquences** : Le vocabulaire original est préservé dans `vocabulaireOriginal` pour l'affichage provincial. Aucune perte d'information. ✅

---

## DEC-011 — CurriculumGraph en Map (pas Record) en mémoire (SPIE-02)

**Date** : 2026-08-04  
**Contexte** : Le graphe peut contenir des centaines de nodes et être traversé fréquemment.  
**Décision** : `CurriculumGraph.nodes` est un `Map<string, GraphNode>` (pas `Record`). La sérialisation utilise `Record` (JSON-compatible).  
**Raison** : `Map.get()` est O(1) et plus performant que l'indexation de Record pour les traversals fréquents. La sérialisation vers Record est une opération ponctuelle.  
**Conséquences** : `serializeGraph()` / `deserializeGraph()` nécessaires pour persistence. ✅

---

## DEC-012 — Seuil validPourGeneration à 40 (pas 60) (SPIE-02)

**Date** : 2026-08-04  
**Contexte** : Les curricula partiels ou mal formatés ont souvent un score de qualité entre 40–60.  
**Décision** : `validPourGeneration = score >= 40 && !erreurCritique` (pas 60).  
**Raison** : Bloquer à 60 refuserait trop de curricula réels qui sont incomplets mais exploitables. Le PCE (SPIE-03) peut compenser avec d'autres sources contextuelles.  
**Conséquences** : La génération peut se faire avec des données partielles — les warnings du rapport qualité sont passés au PCE pour qu'il en tienne compte. ✅

---

## DEC-013 — PCE (SPIE-03) est le 7e moteur SPIE (SPIE-03)

**Date** : 2026-08-04  
**Contexte** : SPIE-01 définissait 6 moteurs (CKG, PPE, PGE, TQE, LCE, PAE). SPIE-03 introduit le Pedagogical Context Engine.  
**Décision** : PCE est officiellement le 7e moteur SPIE. Il est positionné entre CKG/PPE et PGE — c'est l'entrée obligatoire de toute génération.  
**Raison** : PCE est fondamentalement distinct des 6 moteurs originaux : il n'est pas un générateur, ni un validateur, ni un moteur de graphe. C'est un agrégateur de contexte.  
**Conséquences** : SPIE_Blueprint.md et Architecture.md doivent être mis à jour pour inclure PCE. ✅

---

## DEC-014 — AYDTE (SPIE-04) remplace la notion de "plan annuel document" (SPIE-04)

**Date** : 2026-08-04  
**Contexte** : Le plan annuel était traité comme un document généré une fois. SPIE-04 le transforme en objet vivant.  
**Décision** : `AcademicYearTwin` est un objet métier avec versionnement, historique, et recalcul partiel. Il n'est jamais un document Word figé.  
**Raison** : L'année scolaire évolue — absences, révisions, rythme réel. L'objet vivant permet l'adaptation permanente sans tout reconstruire.  
**Conséquences** : Le mapper AYDTE → documents d'export (PDF/DOCX) reste nécessaire pour l'impression, mais c'est une vue, pas la source de vérité. ✅

---

## DEC-015 — Calendrier province-agnostique (SPIE-04)

**Date** : 2026-08-04  
**Contexte** : Chaque province canadienne a ses propres dates de rentrée et vacances.  
**Décision** : `CalendarEngineService` contient un dictionnaire `PROVINCE_YEAR_DEFAULTS` avec les dates approximatives par province. La structure `SchoolCalendar` est identique pour toutes.  
**Raison** : Les calendriers provinciaux sont de la données, pas du code. Un enseignant peut toujours saisir ses dates manuellement.  
**Conséquences** : Si une province change ses dates, seul le dictionnaire change — pas l'engine. ✅

---

## DEC-016 — TwinSchoolTerm vs SchoolTerm (SPIE-04)

**Date** : 2026-08-04  
**Contexte** : SPIE-01 définit `SchoolTerm` dans `types/calendar.ts`. SPIE-04 a un modèle de terme différent (basé sur les numéros de semaine, pas les jours de cours).  
**Décision** : Le type AYDTE est renommé `TwinSchoolTerm` / `TwinTermType` pour éviter la collision dans le barrel export de `src/lib/spie/index.ts`.  
**Raison** : Les deux types modélisent des niveaux d'abstraction différents. Il n'y a pas de raison de fusionner.  
**Conséquences** : Le code AYDTE utilise `TwinSchoolTerm`, le code LCE/SPIE-01 utilise `SchoolTerm`. ✅

---

## DEC-017 — PPS : jamais auto-application (SPIE-05)

**Date** : 2026-08-04  
**Contexte** : Le simulateur génère des recommandations pour ajuster le plan pédagogique.  
**Décision** : `SimulationRecommendation.autoApplicable` est encodé dans le type comme `false` (pas une valeur optionnelle booléenne). Cela garantit statiquement qu'aucun code ne peut tenter d'auto-appliquer.  
**Raison** : L'enseignant doit rester maître de son plan. Auto-appliquer des modifications curriculaires serait une violation de l'autonomie pédagogique.  
**Conséquences** : Toute application d'une recommandation doit passer par une action explicite de l'enseignant dans l'interface. ✅

---

## DEC-018 — PPS : 0 appels IA (SPIE-05)

**Date** : 2026-08-04  
**Contexte** : Le simulateur doit être rapide et fiable — un appel IA ajouterait latence et coût.  
**Décision** : Tous les algorithmes du PPS sont déterministes (ratio temps, seuils de couverture, comparaisons numériques). Aucun appel à Claude.  
**Raison** : La simulation est une opération fréquente (à chaque modification du plan). Avec IA = trop lent et trop coûteux pour un usage interactif.  
**Conséquences** : Les seuils (90% couverture, 15h séquence max, etc.) sont codifiés et peuvent être ajustés via config. ✅

---

## DEC-019 — PSE synthétise tous les moteurs SPIE (SPIE-07)

**Date** : 2026-08-04  
**Contexte** : SPIE-02 à SPIE-06 produisent chacun une couche de données (curriculum, contexte, twin, simulation, temps). Ces couches restaient disconnectées jusqu'à SPIE-07.  
**Décision** : Le `StrategyBuilder` accepte en entrée les sorties de tous les moteurs précédents (`NormalizedOutcome`, `PedagogicalContext`, `AcademicYearTwin`, `PedagogicalSimulation`, `AcademicTime`) et les fusionne en une `PedagogicalStrategy`.  
**Raison** : La stratégie pédagogique est par nature synthétique — elle doit intégrer la réalité du programme, du contexte, du calendrier, et des risques en une seule décision.  
**Conséquences** : PSE est le dernier moteur SPIE avant la génération. Tous les inputs sont optionnels (dégradation gracieuse). ✅

---

## DEC-020 — PSE : traçabilité obligatoire de toutes les décisions (SPIE-07)

**Date** : 2026-08-04  
**Contexte** : Le `StrategyBuilder` fait 7 décisions algorithmiques (approche, difficulté, ordre, évaluations, différenciation, temps, risques).  
**Décision** : Chaque décision est enregistrée dans un `StrategyDecisionNode` avec `facteursConsideres`, `reponse`, `rationale`, et `score` de confiance. Le `PedagogicalDecisionTree` consolide l'ensemble.  
**Raison** : L'enseignant a le droit de comprendre pourquoi une stratégie a été choisie. La traçabilité permet l'audit et la contestation des décisions algorithmiques.  
**Conséquences** : Toute modification du `StrategyBuilder` doit aussi enregistrer ses décisions. Un builder sans `decisions` est incomplet. ✅

---

## DEC-021 — PSE : 7 dimensions de validation pondérées (SPIE-07)

**Date** : 2026-08-04  
**Contexte** : Le `StrategyValidator` devait évaluer plusieurs aspects de la stratégie sans arbitraire.  
**Décision** : 7 dimensions avec pondération fixe (couverture=25%, temps=20%, cohérence=15%, équilibre=15%, compétences=10%, évaluations=10%, contraintes=5%). Score global = moyenne pondérée.  
**Raison** : La couverture curriculaire et la gestion du temps sont les contraintes les plus critiques (poids les plus élevés). La cohérence et l'équilibre sont importants mais moins bloquants.  
**Conséquences** : `validePourGeneration = scoreGlobal >= 60 AND bloqueurs.length === 0`. Un score < 60 ou un bloqueur interdit la génération. ✅

---

## DEC-022 — PSE : comparaison A/B/C déterministe (SPIE-07)

**Date** : 2026-08-04  
**Contexte** : Le `StrategyComparisonEngine` doit proposer des alternatives sans être subjectif.  
**Décision** : A = stratégie telle que construite. B = approche alternative (mapping fixe par approche). C = toujours `enseignement_direct`, niveau `moyen`, heures × 0.90. Recommandation = exclure les stratégies avec ≥5 risques, puis maximiser scoreQualité.  
**Raison** : Les enseignants ont besoin de voir des alternatives concrètes et comparables, pas des variantes aléatoires. La logique déterministe garantit la reproductibilité.  
**Conséquences** : Le moteur n'appelle pas Claude — la comparaison est instantanée et gratuite. ✅

---

## DEC-023 — SPIE-X : architecture définitive — plus de nouveaux moteurs (SPIE-X)

**Date** : 2026-08-04  
**Contexte** : Après SPIE-07, l'architecture pédagogique SPIE est complète. 7 moteurs couvrent l'ensemble du cycle : curriculum → contexte → jumeau → simulation → temps → stratégie.  
**Décision** : Aucun nouveau moteur SPIE ne sera ajouté sauf justification exceptionnelle documentée par un nouveau DEC. Les prochaines missions développent des **fonctionnalités**, pas de l'architecture.  
**Raison** : L'architecture a atteint sa maturité. Ajouter des couches sans développer les features crée de la complexité sans valeur pédagogique ajoutée.  
**Conséquences** : Toute proposition d'un SPIE-08+ doit d'abord prouver qu'aucun moteur existant ne peut répondre au besoin. ✅

---

## DEC-024 — SPIE-X : persistance SPIE via colonnes JSONB (SPIE-X Sprint 1)

**Date** : 2026-08-04  
**Contexte** : Les objets domain SPIE (AcademicYearTwin, PedagogicalStrategy, PedagogicalSimulation, AcademicTime) sont recalculés à chaque requête et jamais persistés.  
**Décision** : Persister les objets SPIE via des colonnes JSONB sur les tables existantes (`programmes_annuels.spie_metadata`, `classes.spie_context`) plutôt que de créer de nouvelles tables SPIE.  
**Raison** : Évite la prolifération de tables. Les objets SPIE sont des enrichissements du modèle DB existant, pas des entités indépendantes. Les colonnes JSONB permettent de stocker des structures riches sans migration complexe.  
**Conséquences** : Nécessite un mapper bidirectionnel AcademicYearTwin ↔ ProgrammeAnnuel (DEC-002). RLS hérité des tables parentes. ⚠️

---

## DEC-025 — SPIE-X : PCE comme gate obligatoire pour toute génération (SPIE-X Sprint 2)

**Date** : 2026-08-04  
**Contexte** : PCE (DEC-013) est défini comme entrée obligatoire pour toute génération mais n'est pas encore intégré dans les routes API.  
**Décision** : Intégrer PCE dans `/api/ia/generer` comme middleware pédagogique. Un `PedagogicalContext` est construit et injecté dans le contexte de génération avant tout appel Claude.  
**Raison** : Sans PCE, les générations ignorent le curriculum, la couverture du programme, et la progression réelle de la classe. C'est la promesse centrale de SPIE-03.  
**Conséquences** : Légère augmentation de la latence (construction du contexte). En cas d'échec PCE, la génération continue avec `partial: true` (dégradation gracieuse — DEC-014). ✅

---

## DEC-026 — SPIE-BETA-02 : gabarit officiel ScorgIA Alberta ≠ document ministériel (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Les gabarits `scorgia_alberta` couvrent 3 types de documents (plan annuel, séquence, plan de leçon). L'enseignant pourrait les confondre avec des formulaires officiels d'Alberta Education.  
**Décision** : Tout gabarit ScorgIA Alberta affiche obligatoirement l'avertissement légal `avertissement_legal` défini dans `ALBERTA_PACK_METADATA`. Le footer de tout export DOCX inclut cet avertissement. L'interface affiche une bannière si `province === 'alberta'`.  
**Raison** : Protection légale et honnêteté envers l'enseignant. ScorgIA n'est pas Alberta Education.  
**Conséquences** : L'avertissement ne peut jamais être supprimé programmatiquement — il est encodé dans les exports et dans la définition des gabarits. ✅

---

## DEC-027 — SPIE-BETA-02 : Quality Gate sans score arbitraire (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Le Quality Gate devait initialement produire un "score de qualité" en pourcentage.  
**Décision** : Pas de score affiché. La règle unique est `peut_marquer_pret = erreurs_bloquantes === 0`. Si un score est calculé pour usage interne, la formule est documentée : `score = valides / (valides + erreurs×3 + avertissements×1.5 + recommandations×0.5)`.  
**Raison** : Un pourcentage non documenté crée une fausse objectivité. Les enseignants comprennent "0 erreur bloquante" mieux qu'un "74% de qualité".  
**Conséquences** : L'interface affiche uniquement les 4 compteurs (erreurs, avertissements, recommandations, valides) et le verdict binaire. ✅

---

## DEC-028 — SPIE-BETA-02 : versionnement `pack_versions` avant toute modification utilisateur (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : L'enseignant peut modifier manuellement le syllabus. Une modification IA ultérieure (re-génération) ne doit jamais écraser silencieusement le travail de l'enseignant.  
**Décision** : Avant chaque écriture dans `programme_annuel.syllabus_json`, l'API `syllabus-save` crée une copie de la version précédente dans `pack_versions`. Le champ `modifie_par` ('ia' vs 'utilisateur') est toujours renseigné.  
**Raison** : Respect de l'autonomie pédagogique. La règle : "les modifications manuelles ne sont jamais silencieusement écrasées".  
**Conséquences** : `pack_versions` peut croître rapidement pour les enseignants actifs. Politique de rétention à définir en production (ex. 30 dernières versions). ⚠️

---

## DEC-029 — SPIE-BETA-02 : entitlements server-side dans `spie-access.ts` (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Les entitlements SPIE-BETA-01 (`entitlements.ts`) vérifient les droits au niveau UI et pipeline. Pour les exports et la Quality Gate, la vérification doit être strictement server-side.  
**Décision** : `src/lib/spie-access.ts` est créé pour les actions spécifiques SPIE-BETA-02 (`SpieAction`). `requireEntitlement()` retourne un `NextResponse` 403 directement si l'accès est refusé. Les boutons côté client peuvent masquer les fonctionnalités, mais ne remplacent jamais la vérification serveur.  
**Raison** : Sécurité en profondeur. Un utilisateur ne peut pas contourner le forfait en manipulant l'UI.  
**Conséquences** : Toute nouvelle action SPIE doit être ajoutée à `SpieAction` et à la matrice `canPerformAction()`. ✅

---

## DEC-030 — SPIE-BETA-02 : analyse de gabarit utilisateur sans stockage du fichier (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : L'enseignant peut téléverser son propre gabarit Word/PDF pour que ScorgIA le mappe aux objets SPIE.  
**Décision** : Le fichier est lu en mémoire (max 8KB extrait), transmis à Claude (haiku) pour analyse, puis la réponse est retournée directement. Le fichier n'est jamais stocké dans Supabase Storage ni dans la base de données.  
**Raison** : Confidentialité des données enseignantes + économie de stockage. Le gabarit personnalisé n'a pas besoin d'être conservé — seul le résultat du mapping est utilisé.  
**Conséquences** : L'enseignant doit re-téléverser son gabarit à chaque session s'il souhaite refaire le mapping. ✅

---

## DEC-031 — SPIE-BETA-02 : TQS 2019 uniquement comme référence indicative (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Le Teaching Quality Standard (Alberta Education, 2019) est utilisé pour l'alignement professionnel dans `professional-standards-alberta.ts`.  
**Décision** : Le TQS est utilisé uniquement comme référence pédagogique indicative. L'avertissement `AVERTISSEMENT_LEGAL_TQS` est obligatoire sur toute interface affichant un alignement TQS. ScorgIA ne certifie jamais la conformité d'un enseignant au TQS.  
**Raison** : L'évaluation professionnelle officielle appartient au conseil scolaire et à Alberta Education. ScorgIA ne peut ni ne doit se substituer à ce processus.  
**Conséquences** : Les niveaux d'alignement (fort/partiel/faible) sont indicatifs. Aucune décision RH ne doit être basée sur les données ScorgIA. ✅

---

## DEC-032 — SPIE-BETA-02 : exports DOCX uniquement sous branding ScorgIA (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Les exports DOCX sont générés avec la bibliothèque `docx`. Les métadonnées Word incluent l'auteur et le titre.  
**Décision** : Le footer de tout export DOCX contient exactement : `"Document généré par ScorgIA (Bodingo AI Tech Inc.)"`. "Powered by Claude" ou tout marquage Anthropic est **interdit** dans tout export. Les métadonnées Word n'incluent pas de référence à Claude ou Anthropic.  
**Raison** : Respect des contraintes commerciales et de branding. ScorgIA est le produit — Claude est un composant technique interne.  
**Conséquences** : Toute modification du générateur DOCX doit vérifier l'absence de mentions Anthropic/Claude avant déploiement. ✅

---

## DEC-033 — SPIE-BETA-02 : syllabus autosave avec debounce 1.5s (SPIE-BETA-02)

**Date** : 2026-08-04  
**Contexte** : Le `SyllabusEditor` doit sauvegarder automatiquement les modifications sans bloquer l'enseignant.  
**Décision** : Debounce de 1.5 secondes implémenté avec `useRef<ReturnType<typeof setTimeout>>` pour éviter les stale closures. L'autosave appelle `/api/spie/syllabus-save` qui crée une version avant d'écraser (DEC-028).  
**Raison** : 1.5s est suffisamment court pour une UX réactive et suffisamment long pour éviter les appels API inutiles en cours de frappe. `useRef` (vs `setState`) évite les re-renders sur chaque frappe.  
**Conséquences** : En cas de perte de connexion, la version précédente est dans `pack_versions`. L'enseignant voit le statut de sauvegarde (idle/saving/saved/error). ✅

---

## DEC-034 — SPIE-BETA-03 : DetailedLesson stockée dans `fichiers_dossier.contenu_json` (SPIE-BETA-03)

**Date** : 2026-08-05  
**Contexte** : La `DetailedLesson` est un objet JSON complexe (~5-15 KB). Deux options : table dédiée `lecons_detaillees` ou colonne JSONB dans `fichiers_dossier`.  
**Décision** : Stockage dans `fichiers_dossier` avec une nouvelle colonne `contenu_json JSONB` (migration 038). La leçon est aussi sérialisée en `contenu_html = JSON.stringify()` pour compatibilité ascendante.  
**Raison** : `fichiers_dossier` est déjà le système de persistance des documents enseignants. RLS, indexation et intégration bibliothèque sont gratuits. Évite une table supplémentaire à maintenir.  
**Conséquences** : Requêtes sur `contenu_json` utilisent l'opérateur JSONB PostgreSQL. Index créé sur `type_fichier`. ✅

---

## DEC-035 — SPIE-BETA-03 : SSE pour le pipeline de génération de leçon (SPIE-BETA-03)

**Date** : 2026-08-05  
**Contexte** : La génération complète (13 étapes) prend 30-60 secondes selon les appels IA. Un appel HTTP unique timeouterait.  
**Décision** : SSE via `ReadableStream` (pattern identique à `/api/spie/build-year`). Chaque étape envoie un `LessonGenerationEvent` avec `progress` 0→100. Le client lit le stream et met à jour l'UI en temps réel.  
**Raison** : Cohérence avec l'architecture SPIE existante. SSE est unidirectionnel et suffisant (pas besoin de WebSocket). `AbortController` permet d'annuler côté client.  
**Conséquences** : Le composant `LessonEngineProgress` affiche chaque étape en temps réel. Sur `fichier_id` reçu dans l'événement `termine`, l'UI charge la `DetailedLessonView`. ✅

---

## DEC-036 — SPIE-BETA-03 : le corrigé n'est jamais transmis hors du contexte enseignant (SPIE-BETA-03)

**Date** : 2026-08-05  
**Contexte** : Le corrigé (`AnswerKeyItem[]`) est généré par l'IA et stocké dans `DetailedLesson.corrige`. Il contient les réponses correctes et la rétroaction.  
**Décision** : Le corrigé ne transite jamais vers : (1) la table `quiz` / `questions_quiz`, (2) les exports sans mention "SECTION ENSEIGNANT SEULEMENT", (3) les modes présentation/projection, (4) les données accessibles aux élèves.  
**Raison** : Intégrité de l'évaluation. Un élève qui accède au corrigé invalide toute la mesure d'apprentissage.  
**Conséquences** : `DetailedLessonView` masque le corrigé par défaut derrière un bouton "Afficher le corrigé". L'export DOCX inclut une section marquée ENSEIGNANT SEULEMENT. ✅

---

## DEC-037 — SPIE-BETA-03 : régénération ciblée avec archivage `pack_versions` (SPIE-BETA-03)

**Date** : 2026-08-05  
**Contexte** : L'enseignant peut régénérer n'importe quelle section de la `DetailedLesson` (objectifs, phases, activités, etc.) sans régénérer toute la leçon.  
**Décision** : La route `POST /api/spie/lesson-regenerate` archive la version précédente dans `pack_versions` (`type_version = 'avant_regen_section'`) avant d'écraser. Le champ `version` est incrémenté. L'archivage est non-bloquant (try/catch).  
**Raison** : Cohérence avec DEC-028 (versionnement avant toute modification). L'enseignant peut voir l'historique des versions.  
**Conséquences** : `pack_versions` accumule potentiellement de nombreuses entrées pour les utilisateurs actifs. La table n'est pas exposée à l'UI pour l'instant — accès admin uniquement. ✅

---

## DEC-047 — CERTIFICATION BÊTA PRIVÉE GO (2026-08-05)

**Date** : 2026-08-05  
**Contexte** : Après les missions SPIE-BETA-01→04 + DEPLOY-BETA-01 + DEPLOY-BETA-02A + DEPLOY-BETA-02B, le Product Owner a émis une certification formelle.  
**Décision** : ScorgIA Beta 0.9.1 est certifiée GO pour la bêta privée (≤5 enseignants). Domaines validés : Teaching Pack, Curriculum, Annual Planning, Lesson Planning, Quiz, Teaching Mode, Founder, Security, RLS, Exports, Performance.  
**Raison** : Tous les critères SPIE-BETA-04 Palier 2 sont satisfaits. Le middleware proxy est actif. Les migrations sont corrigées. Le branding est propre. Les exports DOCX/PPTX fonctionnent (PDF désactivé proprement).  
**Conséquences** : La plateforme peut recevoir les 3–5 premiers enseignants bêta après exécution des migrations Supabase et déploiement Vercel. ✅

---

## DEC-039 — SPIE-BETA-04 : logSpieAccess connecté à spie_access_log (SPIE-BETA-04)

**Date** : 2026-08-05  
**Contexte** : `logSpieAccess` dans `src/lib/spie-access.ts` était un stub qui loggait seulement sur la console.  
**Décision** : La fonction crée maintenant un client Supabase service role en interne et écrit dans `spie_access_log` (migration 038). L'appel reste non-bloquant (try/catch).  
**Raison** : L'observabilité est un prérequis bêta. Chaque accès à une fonctionnalité SPIE doit être tracé pour diagnostiquer les problèmes de production.  
**Conséquences** : La table `spie_access_log` est maintenant alimentée. RLS : chaque enseignant voit ses propres logs uniquement. ✅

---

## DEC-040 — SPIE-BETA-04 : correction colonnes conflit studio_ia_memoire (SPIE-BETA-04)

**Date** : 2026-08-05  
**Contexte** : Le pipeline `build-year` utilisait `onConflict: 'enseignant_id,classe_id,cle'` pour l'upsert PCE mémoire, mais l'index unique (migration 010) est sur `(enseignant_id, cle, type)`.  
**Décision** : Correction vers `onConflict: 'enseignant_id,cle,type'` pour correspondre à l'index réel.  
**Raison** : Un conflit non résolu causerait des insertions en double ou une erreur silencieuse — le contexte PCE n'était jamais mis à jour.  
**Conséquences** : Le PCE reçoit maintenant le contexte du Teaching Pack à chaque génération. ✅

---

## DEC-041 — SPIE-BETA-04 : correction colonnes pack_versions dans lesson-regenerate (SPIE-BETA-04)

**Date** : 2026-08-05  
**Contexte** : L'insert dans `pack_versions` utilisait des colonnes inexistantes (`fichier_id`, `version_num`, `type_version`, `created_by`) plutôt que les colonnes réelles du schéma (`document_id`, `version_numero`, `label`, `enseignant_id`).  
**Décision** : Correction de l'insert pour utiliser les colonnes correctes. `document_type = 'plan_lecon'`, `label = 'avant_regen_section:<target>'`.  
**Raison** : L'archivage échouait silencieusement — aucune version n'était jamais sauvegardée lors des régénérations.  
**Conséquences** : L'historique des versions de leçon est maintenant correctement archivé. ✅

---

## DEC-042 — SPIE-BETA-04 : suppression "Powered by Claude" du prompt système assistant (SPIE-BETA-04)

**Date** : 2026-08-05  
**Contexte** : Le prompt système de l'assistant IA contenait "Tu es propulsé par Claude d'Anthropic" (FR) et "Powered by Claude by Anthropic" (EN). Cela pouvait amener l'assistant à répéter cette attribution dans ses réponses.  
**Décision** : Ces phrases ont été retirées des deux variantes (FR/EN) du prompt système dans `src/app/api/ia/assistant/route.ts`.  
**Raison** : Règle absolue : "Ne jamais afficher 'Powered by Claude'". Le prompt système conditionne le comportement de l'IA — si le modèle croit devoir s'identifier comme "propulsé par Claude", il le dira.  
**Conséquences** : L'assistant se présente uniquement comme "ScorgIA". ✅

---

## DEC-043 — DEPLOY-BETA-01 : proxy.ts est le middleware natif Next.js 16 (pas middleware.ts)

**Date** : 2026-08-05  
**Contexte** : `src/proxy.ts` contenait toute la logique de protection des routes mais n'était pas activé — `middleware-manifest.json` était vide. Tentative de créer `src/middleware.ts` échouait avec l'erreur "Both middleware file and proxy file detected".  
**Décision** : Dans Next.js 16, `proxy.ts` IS le middleware (remplace `middleware.ts`). Il s'active automatiquement. L'autorité est `functions-config-manifest.json` (pas `middleware-manifest.json` legacy).  
**Raison** : Breaking change Next.js 16 — l'API Proxy remplace l'API Middleware. `middleware-manifest.json` reste vide par conception.  
**Conséquences** : Aucun `middleware.ts` n'est nécessaire ni souhaitable. Proxy actif, 5 matchers confirmés dans `functions-config-manifest.json`. ✅

---

## DEC-044 — DEPLOY-BETA-01 : /founder ajouté au proxy + vérification rôle founder

**Date** : 2026-08-05  
**Contexte** : `/founder` était statiquement prérendu et accessible sans auth — la protection reposait uniquement sur RLS (données vides pour non-founders, mais structure de page visible).  
**Décision** : Ajout de `isProtectedFounder` dans `src/proxy.ts` + vérification `profil.role IN ('founder','super_admin')` + `/founder/:path*` dans le matcher.  
**Raison** : Le dashboard Founder expose des métriques d'entreprise sensibles. RLS seule ne suffit pas.  
**Conséquences** : Tout accès non-founder à `/founder/*` redirige vers `/dashboard`. ✅

---

## DEC-045 — DEPLOY-BETA-01 : branding "KlassIA" → "ScorgIA" dans l'UI

**Date** : 2026-08-05  
**Contexte** : Deux occurrences "KlassIA" visibles par les utilisateurs finaux trouvées lors de l'audit branding DEPLOY-BETA-01.  
**Décision** : Correction du watermark dans `sondage/page.tsx` et du label dans `CopilotPanel.tsx`.  
**Raison** : La marque commerciale est ScorgIA. Toute référence visible à KlassIA crée de la confusion pour les enseignants bêta.  
**Conséquences** : L'UI est désormais cohérente sur le nom ScorgIA. Références KlassIA restantes = code interne (localStorage, events, commentaires) — housekeeping post-bêta. ✅

---

## DEC-046 — DEPLOY-BETA-01 : maxDuration = 300 requis sur routes SSE longues (Vercel Pro)

**Date** : 2026-08-05  
**Contexte** : Le plan Vercel Hobby limite les fonctions serverless à 60 s. `lesson-engine` (13 étapes) prend 90–180 s. `build-year` prend 60–120 s.  
**Décision** : Vercel Pro obligatoire. Ajouter `export const maxDuration = 300` dans `lesson-engine/route.ts` et `build-year/route.ts` avant le déploiement bêta.  
**Raison** : Sans maxDuration explicite sur Pro, la limite par défaut reste 60 s pour certaines configurations. Mieux vaut l'expliciter.  
**Conséquences** : Action requise par le PO — voir `VERCEL_COMPATIBILITY_ASSESSMENT.md` section Actions requises. ⚠ En attente

---

## DEC-047 — DEPLOY-BETA-01 : Certification GO Bêta Privée ScorgIA Beta 0.9.1

**Date** : 2026-08-05  
**Contexte** : Toutes les missions SPIE-BETA et DEPLOY-BETA-01/02A/02B complètes. 11 domaines audités.  
**Décision** : GO Bêta Privée certifié par le Product Owner. Version 0.9.1 autorisée pour 3–5 enseignants.  
**Raison** : Teaching Pack, Curriculum, Annual Planning, Lesson Planning, Quiz, Teaching Mode, Founder, Security, RLS, Exports, Performance — tous validés.  
**Conséquences** : Le déploiement Vercel peut être déclenché après exécution des 7 conditions préalables. ✅

---

## DEC-048 — DEPLOY-BETA-03 : maxDuration ajouté à 19 routes IA manquantes

**Date** : 2026-08-06  
**Contexte** : Audit DEPLOY-BETA-03 a détecté que 19 routes API faisant des appels Anthropic n'avaient pas de `maxDuration` déclaré. Sur Vercel Pro, le timeout par défaut est 60s — insuffisant pour le chat Préparer (`/api/ia/assistant`) ou la génération Studio IA (`/api/ia/generer`) qui peuvent prendre 30–90s.  
**Décision** : Ajout de `maxDuration = 120` sur les routes de génération longue, `maxDuration = 60` sur toutes les autres routes IA. Total : 19 routes couvertes + les 4 routes déjà traitées en DEPLOY-BETA-02A.  
**Raison** : Un timeout silencieux sur `/api/ia/assistant` (chat principal de Préparer) aurait rendu la fonctionnalité centrale inutilisable sur Vercel sans erreur explicite pour l'utilisateur.  
**Conséquences** : Toutes les routes IA sont maintenant explicitement couvertes. Version incrémentée à Beta 0.9.2. ✅

---

## DEC-038 — SPIE-BETA-03 : haiku pour la structure, sonnet pour le contenu riche (SPIE-BETA-03)

**Date** : 2026-08-05  
**Contexte** : Le pipeline SSE fait 8 appels IA. Le choix du modèle affecte la qualité, le coût et la latence.  
**Décision** : `claude-haiku-4-5-20251001` pour toutes les étapes structurées (objectifs, phases, quiz, corrigé, différenciation, évaluation). `claude-sonnet-4-6` pour les activités (2500 tok) et le contenu pédagogique (2000 tok).  
**Raison** : Les activités et le contenu nécessitent des descriptions riches et contextualisées. Les autres étapes génèrent du JSON structuré où haiku est suffisant et plus rapide.  
**Conséquences** : Coût par génération = ~2 appels sonnet + 6 appels haiku. Latence totale ~30-60s selon charge Anthropic. ✅

---

## DEC-049 — RELEASE-P0.2 : sources fusionnées pour les compteurs Classe

**Date** : 2026-08-09
**Contexte** : build-year écrit dans `fichiers_dossier`. Les cartes Classe lisaient uniquement `lecons`. Résultat : compteurs toujours à 0 après build.
**D��cision** : Les cartes lisent 3 sources — `lecons` + `fichiers_dossier` + `teaching_packs`. Fusion à l'application level, sans migration DB.
**Raison** : Séparation des responsabilités préservée. `lecons` reste la source de vérité pour l'éditeur.
**Conséquences** : Compteurs fiables post-build. +2 requêtes au chargement des classes. ✅

---

## DEC-050 — RELEASE-P0.2 : idempotence programme_annuel (check-then-update)

**Date** : 2026-08-09
**Contexte** : Chaque rebuild créait un nouveau `programme_annuel` orphelin. Accumulation de données.
**D��cision** : Pattern check-then-update — chercher d'abord par `teaching_pack_id`, update si trouvé, insert sinon. Fallback par `classe_id` si FK null, avec réparation silencieuse.
**Raison** : Idempotence sans migration de schéma.
**Conséquences** : Plus d'orphelins. Un seul `programme_annuel` actif par Teaching Pack. ✅

---

## DEC-051 �� RELEASE-P0.2 : PedagogiqueExplorer sur données réelles (4 tables)

**Date** : 2026-08-09
**Contexte** : L'explorateur ne lisait que `conversations_ia`. Les données Teaching Pack n'apparaissaient pas.
**Décision** : Chargement parallèle de `teaching_packs` + `programme_annuel` + `fichiers_dossier` + `conversations_ia`. Arbre : "Mon Année Scolaire" (Teaching Pack) + "Anciens contenus" (conversations).
**Raison** : Le document métier est l'objet central. Aucune conversation ne doit être créée pour ouvrir un document persisté.
**Conséquences** : Clic Teaching Pack → `router.push(programme?tab=xxx)`. Clic conversation → `onSelectConversation`. Contenus historiques préservés. ✅

---

## DEC-052 — RELEASE-P0.2 : modal confirmation Reconstruire + CTA adaptatif

**Date** : 2026-08-09
**Contexte** : "Reconstruire" relançait le wizard sans confirmation, pouvant écraser du travail.
**Décision** : Si pack existe → modal confirmation rouge. Sinon → wizard direct. CTA "Construire" → "Reprendre la génération" selon état.
**Raison** : Action destructive (remplace `programme_annuel`) → confirmation obligatoire.
**Conséquences** : Pas de build accidentel. UX adaptative selon l'état de la classe. ✅

---

## DEC-053 — SPIE-PERSISTENCE-01 : SUCCESS uniquement si DB verification = SUCCESS

**Date** : 2026-08-09
**Contexte** : Le pipeline `build-year` déclarait les étapes SUCCESS dès la réponse IA, sans vérifier que les données étaient effectivement en base. Packs marqués `pret` avec contenu null.
**Décision** : Chaque étape suit le pattern GENERATE → VALIDATE → PERSIST → VERIFY. `stepSuccess()` n'est appelé qu'après une re-lecture DB confirmant l'existence et la non-nullité des données.
**Raison** : La promesse centrale de SPIE est la fiabilité pédagogique. Un enseignant qui voit "Année scolaire construite ✓" doit pouvoir ouvrir chaque onglet et trouver le contenu.
**Conséquences** : Légère augmentation de latence (re-lectures DB). Fiabilité de livraison garantie. ✅

---

## DEC-054 — SPIE-PERSISTENCE-01 : BuildState persisté dans contenu_json (pas de table séparée)

**Date** : 2026-08-09
**Contexte** : Le BuildState (état de chaque étape du pipeline) devait survivre aux déconnexions pour permettre la reprise. Options : table `build_states` dédiée ou colonne JSONB existante.
**Décision** : `BuildState` est persisté dans `teaching_packs.contenu_json.build_state` — colonne JSONB existante (migration 036). Aucune migration requise.
**Raison** : Cohérence avec DEC-024 (persistance via colonnes JSONB). Le BuildState est un attribut du Teaching Pack, pas une entité indépendante.
**Conséquences** : `contenu_json` grossit légèrement (~2KB par BuildState). Accès via operateur JSONB PostgreSQL. ✅

---

## DEC-055 — SPIE-PERSISTENCE-01 : anti-doublon 409 avant ouverture stream SSE

**Date** : 2026-08-09
**Contexte** : Si l'enseignant clique deux fois sur "Construire", ou si deux onglets exécutent le build simultanément, deux pipelines tournent en parallèle sur le même Teaching Pack — conflits d'écriture.
**Décision** : Vérification `statut === 'generation_en_cours'` AVANT d'ouvrir le stream SSE. Retour HTTP 409 immédiat si actif.
**Raison** : Le stream SSE est unidirectionnel — une fois ouvert, il n'est pas possible d'envoyer un 409. La vérification doit être synchrone avant l'ouverture.
**Conséquences** : Le client doit gérer le 409 et informer l'enseignant. Le pipeline ne démarre pas. ✅

---

## DEC-056 — SPIE-PERSISTENCE-01 : smart resume — skip des étapes success, re-vérif objectId stale

**Date** : 2026-08-09
**Contexte** : Un enseignant reprend un build interrompu. Régénérer toutes les étapes depuis zéro (coût IA + latence) est inutile si certaines étapes ont déjà réussi.
**Décision** : `reprendre: true` dans l'input → le pipeline lit le BuildState existant, saute les étapes `status === 'success'`, et re-vérifie que les `objectId` existent toujours en DB (stale reference check).
**Raison** : Économie IA + UX enseignant (reprise rapide). La re-vérification protège contre la suppression accidentelle d'un fichier entre deux sessions.
**Conséquences** : Un objectId stale (fichier supprimé) force la régénération de cette étape uniquement. ✅

---

## DEC-057 — SPIE-PERSISTENCE-01 : verifyTeachingPackCompleteness lit DB après toutes les étapes

**Date** : 2026-08-09
**Contexte** : L'étape de finalisation devait déterminer le statut final du Teaching Pack. Utiliser les variables en mémoire était insuffisant (elles peuvent être non-nulles alors que les writes ont échoué).
**Décision** : `verifyTeachingPackCompleteness()` re-lit `teaching_packs`, `programme_annuel`, et compte les `fichiers_dossier` depuis Supabase avant d'écrire le statut final.
**Raison** : La vérité est en base. Aucune inférence depuis l'état en mémoire pour le statut final.
**Conséquences** : +1 requête à la finalisation (latence négligeable). Statut final toujours cohérent avec la réalité DB. ✅

---

## DEC-058 — SPIE-PERSISTENCE-01 : statut = completeness.status (pas état en mémoire)

**Date** : 2026-08-09
**Contexte** : Avant, `statutFinal = premiereLeconId ? 'pret' : 'partiellement_genere'`. Cette variable en mémoire pouvait diverger de la DB.
**Décision** : `statut = completeness.status` où `completeness` est le résultat de `verifyTeachingPackCompleteness()`.
**Raison** : Cohérence avec DEC-053. La source de vérité est la DB.
**Conséquences** : La UI reflétera toujours l'état réel du pack. ✅

---

## DEC-059 — SPIE-PERSISTENCE-01 : etapes_completees = projection build_state, success uniquement

**Date** : 2026-08-09
**Contexte** : `etapes_completees` incluait 'syllabus' même quand le syllabus était null (étape non validée).
**Décision** : `etapes_completees` est calculé dynamiquement depuis `buildState` — uniquement les étapes avec `status === 'success'` sont incluses.
**Raison** : `etapes_completees` est utilisé pour l'UI (badge d'avancement). Une étape non-success ne doit jamais y apparaître.
**Conséquences** : `etapes_completees` est désormais une projection fiable de `build_state`. ✅

---

## DEC-060 — SPIE-PERSISTENCE-01 : erreurs non critiques → CONTINUE pipeline (pas CLOSE)

**Date** : 2026-08-09
**Contexte** : Un enseignant en forfait Pro peut ne pas avoir accès à la génération de leçon ou de quiz. Ou la génération peut échouer sur une étape non essentielle. Fermer le stream à la moindre erreur serait trop strict.
**Décision** : Seule l'ÉTAPE 1 (pack upsert + verify) peut `CLOSE` le stream. Toutes les autres étapes échouantes émettent un SSE erreur et laissent le pipeline continuer. Le pack final sera `partiellement_genere`.
**Raison** : Un plan annuel sans leçon générée est toujours utile. L'enseignant peut relancer la génération via "Reprendre".
**Conséquences** : Le pack ne sera jamais coincé dans un état bloquant irréparable. ✅

---

## DEC-061 — SPIE-DIAGNOSTIC-01 : supprimer genere_par_ia de programme_annuel

**Date** : 2026-08-09
**Contexte** : Le pipeline `build-year` utilisait `genere_par_ia: true` dans l'INSERT et l'UPDATE de `programme_annuel`. Cette colonne n'existe pas dans le schéma DB (ni dans `schema.sql`, ni dans aucune migration).
**Décision** : Supprimer `genere_par_ia: true` des deux opérations DB sur `programme_annuel`.
**Raison** : Tout INSERT avec une colonne inexistante lève une erreur PostgreSQL, rendant `progId = null` et bloquant toutes les étapes downstream.
**Conséquences** : L'étape "Sauvegarde plan annuel" peut maintenant persister en DB. ✅

---

## DEC-062 — SPIE-DIAGNOSTIC-01 : statut fichiers_dossier = 'brouillon' (pas 'prete')

**Date** : 2026-08-09
**Contexte** : Le code utilisait `statut: 'prete'` pour les INSERT de leçon (`type_fichier: 'lecon_complete'`) et quiz dans `fichiers_dossier`. La contrainte CHECK de cette table n'accepte que `('brouillon','valide','enseigne','archive')`.
**Décision** : Utiliser `statut: 'brouillon'` pour tous les INSERT de fichiers générés par le pipeline.
**Raison** : `'prete'` est valide pour `lecons.statut`, pas pour `fichiers_dossier.statut`. Violation de contrainte = INSERT silencieusement rejeté.
**Conséquences** : Les leçons et quiz sont maintenant correctement persistés. ✅

---

## DEC-063 — SPIE-DIAGNOSTIC-01 : logging structuré obligatoire pour syllabus

**Date** : 2026-08-09
**Contexte** : Sans logging de la réponse brute Claude, il est impossible de diagnostiquer un échec de parsing du syllabus en production.
**Décision** : Capturer `rawSylCapture` avant tout parsing. Logguer via `console.error('[build-year][syllabus] FAIL ...')` avec `packId`, `error`, et `raw[0:500]`. Extraire le JSON robustement via `indexOf('{')` / `lastIndexOf('}')`.
**Raison** : Un échec de parsing syllabus se manifeste exactement comme un échec de génération — sans raw, impossible de distinguer les deux.
**Conséquences** : Chaque échec de syllabus est maintenant traçable côté serveur. ✅

---

## DEC-064 — SPIE-DIAGNOSTIC-01 : endpoint founder /api/founder/build-debug

**Date** : 2026-08-09
**Contexte** : Diagnostiquer un pack défaillant nécessitait d'accéder directement à Supabase Studio, inaccessible hors contexte dev.
**Décision** : Créer `GET /api/founder/build-debug?packId=...`, protégé par `is_admin` ou rôle `founder/super_admin`. Retourne pack metadata, db state, build_state complet, step trace, failing steps, et completeness réel.
**Raison** : Le fondateur doit pouvoir diagnostiquer un pack en production sans accès DB direct.
**Conséquences** : Diagnostic possible depuis n'importe quel navigateur authentifié en tant qu'admin. ✅

---

## DEC-065 — SPIE-DIAGNOSTIC-01 : audit schema avant tout INSERT

**Date** : 2026-08-09
**Contexte** : Les erreurs de SPIE-DIAGNOSTIC-01 (genere_par_ia, statut prete) auraient pu être détectées avant déploiement.
**Décision** : Toute future modification d'INSERT/UPDATE dans build-year doit être précédée d'une lecture de `supabase/schema.sql` et des migrations pour confirmer les colonnes et contraintes CHECK de la table cible.
**Raison** : TypeScript ne connaît pas les colonnes DB ni les contraintes CHECK — seule la lecture des migrations confirme ce qui est valide.
**Conséquences** : Réduction du risque de régression DB silencieuse dans le pipeline. ✅
