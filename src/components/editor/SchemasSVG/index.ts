// ─── KlassIA+ — Export central des schémas SVG ────────────────────────────────
export type { SchemaConfig, SchemaProps, SchemaEditable } from './types'

export type SchemaOpts = {
  labels?: Record<string, string>
  colors?: Record<string, string>
}

export type SchemaItem = {
  id: string
  titre: string
  categorie: string
  toSvg: (opts?: SchemaOpts) => string
}

export { BIOLOGIE_SCHEMAS   } from './BiologieSchemas'
export { PHYSIQUE_SCHEMAS   } from './PhysiqueSchemas'
export { CHIMIE_SCHEMAS     } from './ChimieSchemas'
export { MATHS_SCHEMAS      } from './MathsSchemas'
export { GEOGRAPHIE_SCHEMAS } from './GeographieSchemas'
export { DIAGRAMMES_SCHEMAS } from './DiagrammesSchemas'

import { BIOLOGIE_SCHEMAS   } from './BiologieSchemas'
import { PHYSIQUE_SCHEMAS   } from './PhysiqueSchemas'
import { CHIMIE_SCHEMAS     } from './ChimieSchemas'
import { MATHS_SCHEMAS      } from './MathsSchemas'
import { GEOGRAPHIE_SCHEMAS } from './GeographieSchemas'
import { DIAGRAMMES_SCHEMAS } from './DiagrammesSchemas'

export const TOUS_SCHEMAS: SchemaItem[] = [
  ...BIOLOGIE_SCHEMAS,
  ...PHYSIQUE_SCHEMAS,
  ...CHIMIE_SCHEMAS,
  ...MATHS_SCHEMAS,
  ...GEOGRAPHIE_SCHEMAS,
  ...DIAGRAMMES_SCHEMAS,
]

export const getSchemasByCategory = (categorie: string): SchemaItem[] =>
  TOUS_SCHEMAS.filter(s => s.categorie === categorie)

// ─── Catalogue enrichi (SchemaConfig) ────────────────────────────────────────
import type { SchemaConfig } from './types'

export const SCHEMAS_CATALOGUE: SchemaConfig[] = [
  // Biologie
  { id:'corps-humain',          nom:'Corps humain',           categorie:'biologie', type:'svg_editable', description:'Vue frontale du corps humain avec organes principaux', tags:['corps','humain','organes','anatomie'],                   matieres_liees:['biologie','sciences'] },
  { id:'cellule-animale',       nom:'Cellule animale',        categorie:'biologie', type:'svg_editable', description:'Structure complète de la cellule animale',              tags:['cellule','animale','noyau','organites'],                 matieres_liees:['biologie'] },
  { id:'cellule-vegetale',      nom:'Cellule végétale',       categorie:'biologie', type:'svg_editable', description:'Structure complète de la cellule végétale',             tags:['cellule','végétale','chloroplaste','paroi'],             matieres_liees:['biologie'] },
  { id:'systeme-respiratoire',  nom:'Système respiratoire',   categorie:'biologie', type:'svg_editable', description:'Poumons, trachée, bronches, diaphragme',                tags:['respiration','poumons','bronches'],                      matieres_liees:['biologie'] },
  { id:'systeme-circulatoire',  nom:'Système circulatoire',   categorie:'biologie', type:'svg_editable', description:'Cœur et réseau sanguin principal',                      tags:['coeur','sang','veines','artères'],                       matieres_liees:['biologie'] },
  { id:'adn-double-helice',     nom:'Structure ADN',          categorie:'biologie', type:'svg_editable', description:'Double hélice avec bases azotées',                     tags:['adn','gène','hélice','nucléotide'],                     matieres_liees:['biologie'] },
  { id:'mitose',                nom:'Mitose — 4 phases',      categorie:'biologie', type:'svg_editable', description:'Prophase, métaphase, anaphase, télophase',              tags:['mitose','division','cellulaire'],                        matieres_liees:['biologie'] },
  { id:'systeme-digestif',      nom:'Système digestif',       categorie:'biologie', type:'svg_editable', description:'Bouche, oesophage, estomac, intestins',                 tags:['digestion','estomac','intestin'],                        matieres_liees:['biologie'] },
  // Chimie
  { id:'atome-bohr',            nom:'Atome de Bohr',          categorie:'chimie',   type:'svg_editable', description:'Noyau + orbites électroniques éditables',               tags:['atome','électron','proton','noyau'],                    matieres_liees:['chimie','physique'] },
  { id:'tableau-periodique',    nom:'Tableau périodique',     categorie:'chimie',   type:'svg_editable', description:'20 premiers éléments avec numéro atomique',             tags:['tableau','éléments','périodique'],                      matieres_liees:['chimie'] },
  { id:'molecule-eau',          nom:'Molécule H₂O',           categorie:'chimie',   type:'svg_editable', description:"Structure de la molécule d'eau",                        tags:['eau','h2o','molécule','liaison'],                        matieres_liees:['chimie'] },
  { id:'ph-echelle',            nom:'Échelle de pH',          categorie:'chimie',   type:'svg_editable', description:'Échelle 0-14 avec exemples courants',                   tags:['ph','acide','base','échelle'],                          matieres_liees:['chimie'] },
  // Physique
  { id:'circuit-serie',         nom:'Circuit série',          categorie:'physique', type:'svg_editable', description:'Pile, résistances, ampoule en série',                   tags:['circuit','série','électricité','pile'],                 matieres_liees:['physique'] },
  { id:'circuit-parallele',     nom:'Circuit parallèle',      categorie:'physique', type:'svg_editable', description:'Composants montés en parallèle',                        tags:['circuit','parallèle','branche'],                        matieres_liees:['physique'] },
  { id:'diagramme-forces',      nom:'Diagramme de forces',    categorie:'physique', type:'svg_editable', description:'Vecteurs forces sur un objet',                          tags:['forces','vecteurs','résultante','newtons'],             matieres_liees:['physique'] },
  { id:'ondes-sinusoide',       nom:'Onde sinusoïdale',       categorie:'physique', type:'svg_editable', description:"Amplitude, longueur d'onde, fréquence",                 tags:['onde','sinusoïde','amplitude','fréquence'],             matieres_liees:['physique'] },
  { id:'refraction-lumiere',    nom:'Réfraction lumière',     categorie:'physique', type:'svg_editable', description:'Rayon incident, réfracté, angle',                       tags:['lumière','réfraction','optique','angle'],               matieres_liees:['physique'] },
  { id:'plan-incline',          nom:'Plan incliné + forces',  categorie:'physique', type:'svg_editable', description:'Objet sur plan incliné avec vecteurs',                  tags:['plan','incliné','poids','normale'],                     matieres_liees:['physique'] },
  // Maths
  { id:'plan-cartesien',        nom:'Plan cartésien',         categorie:'maths',    type:'svg_editable', description:'Axes x/y avec quadrants et graduations',                tags:['cartésien','axes','coordonnées','graphique'],           matieres_liees:['maths','physique'] },
  { id:'graphique-fonction',    nom:'Graphique de fonction',  categorie:'maths',    type:'svg_editable', description:'Tracé de fonction y=f(x) personnalisable',              tags:['fonction','graphique','courbe'],                        matieres_liees:['maths'] },
  { id:'triangle-rectangle',    nom:'Triangle rectangle',     categorie:'maths',    type:'svg_editable', description:'Triangle avec côtés et angles nommés',                  tags:['triangle','rectangle','pythagore','hypoténuse'],        matieres_liees:['maths'] },
  { id:'diagramme-venn',        nom:'Diagramme de Venn',      categorie:'maths',    type:'svg_editable', description:'2 ou 3 ensembles avec intersection',                    tags:['venn','ensembles','union','intersection'],               matieres_liees:['maths'] },
  { id:'arbre-probabilite',     nom:'Arbre de probabilité',   categorie:'maths',    type:'svg_editable', description:'Arbre avec branches et probabilités',                   tags:['probabilité','arbre','branches'],                       matieres_liees:['maths'] },
  { id:'diagramme-barres',      nom:'Diagramme à barres',     categorie:'maths',    type:'svg_editable', description:'Histogramme avec données éditables',                    tags:['barres','histogramme','statistiques'],                   matieres_liees:['maths','sciences'] },
]

export function getSchemasByMatiere(matiere: string): SchemaConfig[] {
  return SCHEMAS_CATALOGUE.filter(s =>
    s.matieres_liees.some(m =>
      matiere.toLowerCase().includes(m) || m.includes(matiere.toLowerCase())
    )
  )
}

export function getSchemasByCategorieCatalogue(categorie: string): SchemaConfig[] {
  return SCHEMAS_CATALOGUE.filter(s => s.categorie === categorie)
}
