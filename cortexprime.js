import { CortexPrimeActor } from './module/entities/CortexPrimeActor.js'
import { CharacterData } from './module/data/CharacterData.js'
import PlotPoint from './module/PlotPoint.js'
import { preloadHandlebarsTemplates } from './module/handlebars/preloadTemplates.js'
import { registerHandlebarHelpers } from './module/handlebars/helpers.js'
import { registerSettings } from './module/settings/settings.js'
import { CortexPrimeActorSheet } from './module/actor/actor-sheet.js'
import cortexPrimeHooks from './module/cortexPrimeHooks.js'

Hooks.once('init', () => {
  console.log(`CP | Initializing Cortex Prime`)

  game.cortexprime = {
    CortexPrimeActor
  }

  CONFIG.Actor.documentClass = CortexPrimeActor
  CONFIG.Actor.dataModels.character = CharacterData
  CONFIG.Dice.terms['p'] = PlotPoint

  registerHandlebarHelpers()
  preloadHandlebarsTemplates()
  registerSettings()

  const { DocumentSheetConfig } = foundry.applications.apps

  DocumentSheetConfig.unregisterSheet(foundry.documents.Actor, 'core', foundry.applications.sheets.ActorSheetV2)
  DocumentSheetConfig.registerSheet(foundry.documents.Actor, 'cortexprime', CortexPrimeActorSheet, { makeDefault: true })

  cortexPrimeHooks()
})
