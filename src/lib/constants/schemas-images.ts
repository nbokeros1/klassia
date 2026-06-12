export type Annotation = {
  id: string
  x: number
  y: number
  texte: string
  couleur: string
}

export type SchemaImage = {
  id: string
  nom: string
  categorie: string
  url: string
  url_fallback: string
  annotations_defaut: Annotation[]
  matieres: string[]
}

export const SCHEMAS_IMAGES: SchemaImage[] = [
  // BIOLOGIE
  {
    id: 'cellule-animale',
    nom: 'Cellule animale',
    categorie: 'biologie',
    url: '/schemas/biologie/cellule-animale.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Animal_Cell.svg/800px-Animal_Cell.svg.png',
    annotations_defaut: [
      { id: '1', x: 50, y: 45, texte: 'Noyau',              couleur: '#7F77DD' },
      { id: '2', x: 30, y: 30, texte: 'Mitochondrie',       couleur: '#EF9F27' },
      { id: '3', x: 70, y: 60, texte: 'Membrane cellulaire', couleur: '#1D9E75' },
    ],
    matieres: ['biologie', 'sciences'],
  },
  {
    id: 'systeme-digestif',
    nom: 'Système digestif',
    categorie: 'biologie',
    url: '/schemas/biologie/systeme-digestif.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Digestive_system_diagram_en.svg/400px-Digestive_system_diagram_en.svg.png',
    annotations_defaut: [
      { id: '1', x: 45, y: 15, texte: 'Bouche',         couleur: '#F87171' },
      { id: '2', x: 45, y: 35, texte: 'Estomac',        couleur: '#EF9F27' },
      { id: '3', x: 45, y: 60, texte: 'Intestin grêle', couleur: '#34D399' },
    ],
    matieres: ['biologie', 'sciences'],
  },
  {
    id: 'adn',
    nom: 'Structure ADN',
    categorie: 'biologie',
    url: '/schemas/biologie/adn.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/DNA_structure_and_bases_FR.svg/400px-DNA_structure_and_bases_FR.svg.png',
    annotations_defaut: [
      { id: '1', x: 20, y: 30, texte: 'Double hélice',  couleur: '#7F77DD' },
      { id: '2', x: 60, y: 50, texte: 'Bases azotées',  couleur: '#F87171' },
    ],
    matieres: ['biologie'],
  },
  // CHIMIE
  {
    id: 'atome-bohr',
    nom: 'Atome de Bohr',
    categorie: 'chimie',
    url: '/schemas/chimie/atome-bohr.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Bohr_atom_model.svg/400px-Bohr_atom_model.svg.png',
    annotations_defaut: [
      { id: '1', x: 50, y: 50, texte: 'Noyau',      couleur: '#F87171' },
      { id: '2', x: 80, y: 30, texte: 'Électrons',  couleur: '#378ADD' },
      { id: '3', x: 85, y: 50, texte: 'Orbite',     couleur: '#1D9E75' },
    ],
    matieres: ['chimie', 'physique'],
  },
  {
    id: 'tableau-periodique',
    nom: 'Tableau périodique',
    categorie: 'chimie',
    url: '/schemas/chimie/tableau-periodique.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tableau_p%C3%A9riodique_des_%C3%A9l%C3%A9ments.svg/800px-Tableau_p%C3%A9riodique_des_%C3%A9l%C3%A9ments.svg.png',
    annotations_defaut: [],
    matieres: ['chimie'],
  },
  // PHYSIQUE
  {
    id: 'circuit-electrique',
    nom: 'Circuit électrique',
    categorie: 'physique',
    url: '/schemas/physique/circuit.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Simple_circuit.svg/400px-Simple_circuit.svg.png',
    annotations_defaut: [
      { id: '1', x: 20, y: 50, texte: 'Pile',          couleur: '#EF9F27' },
      { id: '2', x: 80, y: 50, texte: 'Résistance',    couleur: '#F87171' },
      { id: '3', x: 50, y: 10, texte: 'Fil conducteur', couleur: '#94A3B8' },
    ],
    matieres: ['physique'],
  },
  {
    id: 'spectre-electromagnetique',
    nom: 'Spectre électromagnétique',
    categorie: 'physique',
    url: '/schemas/physique/spectre-em.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/EM_spectrum.svg/800px-EM_spectrum.svg.png',
    annotations_defaut: [],
    matieres: ['physique'],
  },
  // MATHS
  {
    id: 'plan-cartesien',
    nom: 'Plan cartésien',
    categorie: 'maths',
    url: '/schemas/maths/plan-cartesien.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Cartesian-coordinate-system.svg/400px-Cartesian-coordinate-system.svg.png',
    annotations_defaut: [
      { id: '1', x: 95, y: 50, texte: 'Axe X',       couleur: '#378ADD' },
      { id: '2', x: 50, y: 5,  texte: 'Axe Y',       couleur: '#F87171' },
      { id: '3', x: 52, y: 52, texte: 'Origine (0,0)', couleur: '#1D9E75' },
    ],
    matieres: ['maths'],
  },
  {
    id: 'pythagore',
    nom: 'Théorème de Pythagore',
    categorie: 'maths',
    url: '/schemas/maths/pythagore.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Pythagorean.svg/400px-Pythagorean.svg.png',
    annotations_defaut: [
      { id: '1', x: 10, y: 90, texte: 'a',              couleur: '#F87171' },
      { id: '2', x: 90, y: 90, texte: 'b',              couleur: '#378ADD' },
      { id: '3', x: 50, y: 20, texte: 'c (hypoténuse)', couleur: '#1D9E75' },
    ],
    matieres: ['maths'],
  },
  // GÉOGRAPHIE
  {
    id: 'cycle-eau',
    nom: "Cycle de l'eau",
    categorie: 'geographie',
    url: '/schemas/geo/cycle-eau.svg',
    url_fallback: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Water_cycle_fr.svg/800px-Water_cycle_fr.svg.png',
    annotations_defaut: [
      { id: '1', x: 20, y: 80, texte: 'Évaporation',    couleur: '#378ADD' },
      { id: '2', x: 60, y: 10, texte: 'Condensation',   couleur: '#94A3B8' },
      { id: '3', x: 80, y: 70, texte: 'Précipitation',  couleur: '#1D9E75' },
    ],
    matieres: ['geographie', 'sciences'],
  },
]

export function getSchemasByMatiere(matiere: string): SchemaImage[] {
  const m = matiere.toLowerCase()
  return SCHEMAS_IMAGES.filter(s =>
    s.matieres.some(sm => m.includes(sm) || sm.includes(m))
  )
}

export function getSchemasByCategorie(cat: string): SchemaImage[] {
  return SCHEMAS_IMAGES.filter(s => s.categorie === cat)
}
