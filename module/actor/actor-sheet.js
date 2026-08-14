/**
 * The Cortex Prime actor sheet.
 * @extends {foundry.applications.sheets.ActorSheetV2}
 */
import { getLength, objectMapValues, objectReindexFilter, objectFindValue } from '../../lib/helpers.js'
import { localizer } from '../scripts/foundryHelpers.js'
import { bindAll, intData } from '../scripts/domHelpers.js'
import { removeItems, resetDataPoint, toggleItems } from '../scripts/sheetHelpers.js'
import { consumableDicePicker } from '../applications/consumableDicePicker.js'

const { HandlebarsApplicationMixin } = foundry.applications.api
const { ActorSheetV2 } = foundry.applications.sheets

export class CortexPrimeActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ['cortexprime', 'sheet', 'actor', 'actor-sheet'],
    position: {
      width: 960,
      height: 900
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    },
    actions: {
      editImage: CortexPrimeActorSheet.prototype._onEditImage
    }
  }

  static PARTS = {
    body: {
      template: 'systems/cortexprime/templates/actor/actor-sheet.html'
    }
  }

  tabGroups = {
    primary: 'traits'
  }

  /** @override */
  async _prepareContext (options) {
    const context = await super._prepareContext(options)
    const themes = game.settings.get('cortexprime', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
    const data = this.actor.toObject(false)

    return {
      ...context,
      actor: this.actor,
      actorTypeOptions: objectMapValues(game.settings.get('cortexprime', 'actorTypes'), val => val.name),
      activeTab: this.tabGroups.primary,
      cssClass: this.isEditable ? 'editable' : 'locked',
      data,
      enrichedNotes: await this._enrichNotes(data.system?.actorType?.notes),
      owner: this.actor.isOwner,
      theme
    }
  }

  async _enrichNotes (notes) {
    const entries = await Promise.all(
      Object.entries(notes ?? {}).map(async ([key, note]) => [
        key,
        await foundry.applications.ux.TextEditor.enrichHTML(note?.value ?? '', {
          relativeTo: this.actor,
          secrets: this.actor.isOwner
        })
      ])
    )

    return Object.fromEntries(entries)
  }

  /* -------------------------------------------- */

  /** @override */
  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, 'nav[data-group] [data-tab]', 'click', this._onTabClick.bind(this))
    bindAll(html, '.update-actor-settings', 'click', this._updateActorSettings.bind(this))
    bindAll(html, '.actor-type-confirm', 'click', this._actorTypeConfirm.bind(this))
    bindAll(html, '.add-pp', 'click', () => { this.actor.changePpBy(1) })
    bindAll(html, '.add-asset', 'click', this._addAsset.bind(this))
    bindAll(html, '.add-complication', 'click', this._addComplication.bind(this))
    bindAll(html, '.add-descriptor', 'click', this._addDescriptor.bind(this))
    bindAll(html, '.add-note', 'click', this._addNote.bind(this))
    bindAll(html, '.add-sfx', 'click', this._addSfx.bind(this))
    bindAll(html, '.add-sub-trait', 'click', this._addSubTrait.bind(this))
    bindAll(html, '.add-to-pool', 'click', this._addToPool.bind(this))
    bindAll(html, '.add-trait', 'click', this._addTrait.bind(this))
    bindAll(html, '.close-trait-set-edit', 'click', this._closeTraitSetEdit.bind(this))
    bindAll(html, '.die-select', 'change', this._onDieChange.bind(this))
    bindAll(html, '.die-select', 'mouseup', this._onDieRemove.bind(this))
    bindAll(html, '.new-die', 'click', this._newDie.bind(this))
    bindAll(html, '.pp-number-field', 'change', this._ppNumberChange.bind(this))
    bindAll(html, '.spend-pp', 'click', this._spendPp.bind(this))
    bindAll(html, '.trait-set-edit', 'click', this._traitSetEdit.bind(this))

    removeItems.call(this, html)
    toggleItems.call(this, html)
  }

  _onTabClick (event) {
    event.preventDefault()
    const { tab, group } = event.currentTarget.dataset
    this.changeTab(tab, group ?? 'primary', { event, navElement: event.currentTarget })
  }

  async _onEditImage (event, target) {
    const current = this.actor.img
    const picker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current,
      callback: path => this.actor.update({ img: path }),
      position: {
        top: (this.position.top ?? 0) + 40,
        left: (this.position.left ?? 0) + 10
      }
    })

    return picker.browse()
  }

  /* -------------------------------------------- */

  async _actorTypeConfirm (event) {
    event.preventDefault()
    const actorTypes = game.settings.get('cortexprime', 'actorTypes')
    const actorTypeIndex = this.element.querySelector('.actor-type-select')?.value

    const actorType = actorTypes[actorTypeIndex]

    await this.actor.update({
      img: actorType.defaultImage,
      'system.actorType': actorType,
      'system.pp.value': actorType.hasPlotPoints ? 1 : 0
    })
  }

  async _addAsset (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const currentAssets = foundry.utils.getProperty(this.actor, `${path}.assets`) ?? {}

    await this._resetDataPoint(path, 'assets', {
      ...currentAssets,
      [getLength(currentAssets)]: {
        label: localizer('NewAsset'),
        dice: {
          value: {
            0: '6'
          }
        }
      }
    })
  }

  async _addComplication (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const currentComplications = foundry.utils.getProperty(this.actor, `${path}.complications`) ?? {}

    await this._resetDataPoint(path, 'complications', {
      ...currentComplications,
      [getLength(currentComplications)]: {
        label: localizer('NewComplication'),
        dice: {
          value: {
            0: '6'
          }
        }
      }
    })
  }

  async _addDescriptor (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const currentDescriptors = foundry.utils.getProperty(this.actor, `${path}.descriptors`) ?? {}

    await this._resetDataPoint(path, 'descriptors', {
      ...currentDescriptors,
      [getLength(currentDescriptors)]: {
        label: localizer('NewDescriptor'),
        value: null
      }
    })
  }

  async _addNote (event) {
    event.preventDefault()
    const currentNotes = this.actor.system.actorType.notes ?? {}

    await this._resetDataPoint('system.actorType', 'notes', {
      ...currentNotes,
      [getLength(currentNotes)]: {
        label: localizer('Notes'),
        value: ''
      }
    })
  }

  async _addSfx (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const currentSfx = foundry.utils.getProperty(this.actor, `${path}.sfx`) ?? {}

    await this._resetDataPoint(path, 'sfx', {
      ...currentSfx,
      [getLength(currentSfx)]: {
        description: null,
        label: localizer('NewSfx'),
        unlocked: true
      }
    })
  }

  async _addSubTrait (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const currentSubTraits = foundry.utils.getProperty(this.actor, `${path}.subTraits`) ?? {}

    await this._resetDataPoint(path, 'subTraits', {
      ...currentSubTraits,
      [getLength(currentSubTraits)]: {
        dice: {
          value: {
            0: '8'
          }
        },
        label: localizer('NewSubTrait')
      }
    })
  }

  async _addToPool (event) {
    const { consumable, path, label } = event.currentTarget.dataset
    let value = foundry.utils.getProperty(this.actor, `${path}.value`)

    if (consumable) {
      const selectedDice = await consumableDicePicker(value, label)

      if (selectedDice.remove?.length) {
        const newValue = objectReindexFilter(value, (_, key) => !selectedDice.remove.map(x => parseInt(x, 10)).includes(parseInt(key, 10)))

        await this._resetDataPoint(path, 'value', newValue)
      }

      value = selectedDice.value
    }

    if (getLength(value)) {
      await game.cortexprime.UserDicePool._addTraitToPool(this.actor.name, label, value)
    }
  }

  async _addTrait (event) {
    const { path } = event.currentTarget.dataset
    const currentCustomTraits = foundry.utils.getProperty(this.actor, `${path}.customTraits`) ?? {}

    await this._resetDataPoint(path, 'customTraits', {
      ...currentCustomTraits,
      [getLength(currentCustomTraits)]: {
        id: `_${Date.now()}`,
        name: localizer('NewTrait'),
        dice: {
          value: {
            0: '8'
          }
        }
      }
    })
  }

  async _closeTraitSetEdit (event) {
    await this.actor.update({
      'system.actorType.traitSetEdit': null
    })
  }

  async _newDie (event) {
    event.preventDefault()
    const { target } = event.currentTarget.dataset
    const currentDiceData = foundry.utils.getProperty(this.actor, target)
    const currentDice = currentDiceData?.value ?? {}
    const newIndex = getLength(currentDice)
    const newValue = currentDice[newIndex - 1] ?? '8'

    await this.actor.update({
      [target]: {
        value: {
          ...currentDice,
          [newIndex]: newValue
        }
      }
    })
  }

  async _onDieChange (event) {
    event.preventDefault()
    const element = event.currentTarget
    const { target } = element.dataset
    const targetKey = intData(element, 'key')
    const targetValue = element.value
    const currentDiceData = foundry.utils.getProperty(this.actor, target)

    const newValue = objectMapValues(currentDiceData.value ?? {}, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value)

    await this._resetDataPoint(target, 'value', newValue)
  }

  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button === 2) {
      const element = event.currentTarget
      const { target } = element.dataset
      const targetKey = intData(element, 'key')
      const currentDiceData = foundry.utils.getProperty(this.actor, target)

      const newValue = objectReindexFilter(currentDiceData.value ?? {}, (_, key) => parseInt(key, 10) !== targetKey)

      await this._resetDataPoint(target, 'value', newValue)
    }
  }

  async _ppNumberChange (event) {
    event.preventDefault()
    const parsedValue = parseInt(event.currentTarget.value, 10)
    const currentValue = parseInt(this.actor.system.pp.value, 10)
    const newValue = parsedValue < 0 ? 0 : parsedValue
    const changeAmount = newValue - currentValue

    await this.actor.changePpBy(changeAmount, true)
  }

  async _spendPp (event) {
    await this.actor.changePpBy(-1)

    if (game.dice3d) {
      game.dice3d.show({ throws: [{ dice: [{ result: 1, resultLabel: 1, type: 'dp', vectors: [], options: {} }] }] }, game.user, true)
    }
  }

  async _resetDataPoint (path, target, value) {
    await resetDataPoint.call(this, path, target, value)
  }

  async _traitSetEdit (event) {
    const { traitSet } = event.currentTarget.dataset

    await this.actor.update({
      'system.actorType.traitSetEdit': traitSet
    })
  }

  async _updateActorSettings (event) {
    event.preventDefault()

    const actorData = this.actor.system.actorType
    const actorTypeSettings = objectFindValue(game.settings.get('cortexprime', 'actorTypes'), actorType => actorType.id === actorData.id)

    if (!actorTypeSettings) {
      ui.notifications.error(localizer('MissingActorTypeMessage'))
      return
    }

    const newData = {
      ...actorData,
      ...objectMapValues(actorTypeSettings, (propValue, key) => {
        if (key === 'simpleTraits') {
          return objectMapValues(propValue, ({ dice, hasDescription, id, label, settings }) => {
            const matchingSetting = objectFindValue((actorData.simpleTraits ?? {}), ({ id: matchId }) => matchId === id) ?? {}

            return {
              ...matchingSetting,
              dice: {
                ...matchingSetting.dice,
                consumable: dice.consumable
              },
              hasDescription,
              id,
              label,
              settings
            }
          })
        }

        if (key === 'traitSets') {
          return objectMapValues(propValue, ({ hasDescription, id, label, settings, traits }) => {
            const matchingSetting = objectFindValue((actorData.traitSets ?? {}), ({ id: matchId }) => matchId === id) ?? {}

            return {
              ...matchingSetting,
              description: matchingSetting.description,
              hasDescription,
              id,
              label,
              shutdown: matchingSetting.shutdown,
              settings,
              traits: objectMapValues(traits ?? {}, trait => {
                const matchingTraitSetting = objectFindValue(matchingSetting.traits ?? {}, ({ id: matchId }) => matchId === trait.id) ?? {}
                return {
                  ...matchingTraitSetting,
                  id: trait.id,
                  name: trait.name
                }
              })
            }
          })
        }

        return propValue
      })
    }

    await this._resetDataPoint('system', 'actorType', newData)
  }
}
