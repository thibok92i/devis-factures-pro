import { registerClientHandlers } from './clients'
import { registerDevisHandlers } from './devis'
import { registerFactureHandlers } from './factures'
import { registerCatalogueHandlers } from './catalogue'
import { registerSettingsHandlers } from './settings'
import { registerForfaitHandlers } from './forfaits'
import { registerTemplateHandlers } from './templates'

export function registerAllHandlers(): void {
  registerClientHandlers()
  registerDevisHandlers()
  registerFactureHandlers()
  registerCatalogueHandlers()
  registerSettingsHandlers()
  registerForfaitHandlers()
  registerTemplateHandlers()
}
