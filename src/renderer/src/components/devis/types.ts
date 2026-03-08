/**
 * Shared types for the DevisEditor decomposed components.
 */

export interface EditableLigne {
  id?: string
  catalogue_item_id?: string
  designation: string
  description: string
  unite: string
  quantite: number
  prix_unitaire: number
  is_option?: boolean
  note_interne?: string
}

/** Check if a ligne is actually a section separator */
export function isSection(ligne: EditableLigne): boolean {
  return ligne.description === '__SECTION__'
}
