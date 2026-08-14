import { localizer } from '../scripts/foundryHelpers.js'
import { getLength, objectFindKey, objectFindValue, objectMapValues, objectReduce, objectReindexFilter } from '../../lib/helpers.js'
import { bindAll, intData } from '../scripts/domHelpers.js'
import { removeItem, reorderItem } from '../scripts/settingsHelpers.js'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class ActorSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'actor-settings',
    classes: ['cortexprime', 'actor-settings'],
    tag: 'form',
    window: {
      title: 'ActorSettings',
      resizable: true
    },
    position: {
      width: 600,
      height: 900,
      top: 200,
      left: 400
    },
    form: {
      handler: ActorSettings.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  static PARTS = {
    body: {
      template: 'systems/cortexprime/templates/actor/settings.html'
    }
  }

  async _prepareContext (options) {
    const breadcrumbs = game.settings.get('cortexprime', 'actorBreadcrumbs') ?? {}

    return {
      actorTypes: game.settings.get('cortexprime', 'actorTypes'),
      breadcrumbs,
      goBack: breadcrumbs[getLength(breadcrumbs ?? {}) - 2]?.target ?? 0
    }
  }

  static async onSubmit (event, form, formData) {
    // Die selects are written directly by their own handlers; letting the generic form
    // submission run as well would clobber a removal with the stale select value.
    if (event.target?.classList?.contains('die-select')) return

    const expandedFormData = foundry.utils.expandObject(formData.object)

    if (!expandedFormData.actorTypes) return

    const currentActorTypes = game.settings.get('cortexprime', 'actorTypes') ?? {}

    await game.settings.set('cortexprime', 'actorTypes', foundry.utils.mergeObject(currentActorTypes, expandedFormData.actorTypes))

    await this.render()
  }

  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, '#add-new-actor-type', 'click', this._addNewActorType.bind(this))
    bindAll(html, '.add-descriptor', 'click', this._addDescriptor.bind(this))
    bindAll(html, '.add-simple-trait', 'click', this._addSimpleTrait.bind(this))
    bindAll(html, '.add-sfx', 'click', this._addSfx.bind(this))
    bindAll(html, '.add-sub-trait', 'click', this._addSubTrait.bind(this))
    bindAll(html, '.add-trait', 'click', this._addTrait.bind(this))
    bindAll(html, '.add-trait-set', 'click', this._addTraitSet.bind(this))
    bindAll(html, '.breadcrumb-name-change', 'change', this._breadcrumbNameChange.bind(this))
    bindAll(html, '.breadcrumb:not(.active), .go-back', 'click', this._breadcrumbChange.bind(this))
    bindAll(html, '.default-image', 'click', this._changeDefaultImage.bind(this))
    bindAll(html, '.die-select', 'change', this._onDieChange.bind(this))
    bindAll(html, '.die-select', 'mouseup', this._onDieRemove.bind(this))
    bindAll(html, '.duplicate-item', 'click', this._duplicateItem.bind(this))
    bindAll(html, '.new-die', 'click', this._newDie.bind(this))
    bindAll(html, '.view-change', 'click', this._viewChange.bind(this))

    removeItem.call(this, html)
    reorderItem.call(this, html)
  }

  async _addNewActorType (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const newKey = getLength(source ?? {})

    const newActorType = {
      [newKey]: {
        hasNotesPage: true,
        id: `_${Date.now()}`,
        name: localizer('NewActorType'),
        showProfileImage: true
      }
    }

    await game.settings.set('cortexprime', 'actorTypes', foundry.utils.mergeObject(source, newActorType))
    await this.changeView(localizer('NewActorType'), `actorType-${newKey}`)
  }

  async _addDescriptor (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'actorTypes')
    const currentDescriptors = foundry.utils.getProperty(source, path) || {}

    foundry.utils.setProperty(source, path,
      {
        ...currentDescriptors,
        [getLength(currentDescriptors ?? {})]: {
          label: localizer('NewDescriptor'),
          value: null
        }
      })

    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.render()
  }

  async _addSfx (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'actorTypes')
    const currentSfx = foundry.utils.getProperty(source, path) || {}

    foundry.utils.setProperty(source, path,
      {
        ...currentSfx,
        [getLength(currentSfx ?? {})]: {
          description: null,
          label: localizer('NewSfx'),
          unlocked: true
        }
      })

    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.render()
  }

  async _addSubTrait (event) {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'actorTypes')
    const currentSubTraits = foundry.utils.getProperty(source, path) || {}

    foundry.utils.setProperty(source, path,
      {
        ...currentSubTraits,
        [getLength(currentSubTraits ?? {})]: {
          dice: { value: { 0: '8' } },
          label: localizer('NewSubTrait')
        }
      })

    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.render()
  }

  async _addSimpleTrait (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const { actorType: actorTypeKey } = event.currentTarget.dataset
    const newKey = getLength(source[actorTypeKey]?.simpleTraits || {})

    const newSimpleTrait = {
      [actorTypeKey]: {
        simpleTraits: {
          [newKey]: {
            dice: {
              value: {
                0: '8'
              }
            },
            id: `_${Date.now()}`,
            label: localizer('NewSimpleTrait'),
            settings: {
              editable: true,
              valueType: 'text'
            }
          }
        }
      }
    }

    await game.settings.set('cortexprime', 'actorTypes', foundry.utils.mergeObject(source, newSimpleTrait))
    await this.changeView(localizer('NewSimpleTrait'), `simpleTrait-${actorTypeKey}-${newKey}`)
  }

  async _addTrait (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const { actorType, path, traitSet } = event.currentTarget.dataset
    const currentTraits = foundry.utils.getProperty(source, `${path}.${traitSet}.traits`)
    const newKey = getLength(currentTraits || {})

    const newTraits = {
      ...currentTraits,
      [newKey]: {
        id: `_${Date.now()}`,
        name: localizer('NewTrait'),
        dice: {
          value: {
            0: '8'
          }
        }
      }
    }

    foundry.utils.setProperty(source, `${path}.${traitSet}.traits`, newTraits)

    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.changeView(localizer('NewTrait'), `trait-${actorType}-${traitSet}-${newKey}`)
  }

  async _addTraitSet (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const { actorType: actorTypeKey } = event.currentTarget.dataset
    const newKey = getLength(source[actorTypeKey]?.traitSets || {})

    const newTraitSet = {
      [actorTypeKey]: {
        traitSets: {
          [newKey]: {
            id: `_${Date.now()}`,
            label: localizer('NewTraitSet')
          }
        }
      }
    }

    await game.settings.set('cortexprime', 'actorTypes', foundry.utils.mergeObject(source, newTraitSet))
    await this.changeView(localizer('NewTraitSet'), `traitSet-${actorTypeKey}-${newKey}`)
  }

  async _breadcrumbChange (event) {
    const currentBreadcrumbs = game.settings.get('cortexprime', 'actorBreadcrumbs')

    const { to: target } = event.currentTarget.dataset

    const targetKey = +objectFindKey(currentBreadcrumbs, breadcrumb => breadcrumb.target === target)

    const value = objectReduce(currentBreadcrumbs, (breadcrumbs, breadcrumb, key) => {
      if (+key > targetKey) return breadcrumbs

      breadcrumb.active = breadcrumb.target === target

      return {
        ...breadcrumbs,
        [key]: breadcrumb
      }
    }, {})

    await game.settings.set('cortexprime', 'actorBreadcrumbs', value)
    await this.submit()
    await this.render()
  }

  async _breadcrumbNameChange (event) {
    const nameField = event.currentTarget
    const { target } = nameField.dataset
    const currentBreadcrumbs = game.settings.get('cortexprime', 'actorBreadcrumbs')

    await game.settings.set('cortexprime', 'actorBreadcrumbs', {
      ...objectMapValues(currentBreadcrumbs, breadcrumb => {
        if (breadcrumb.target === target) {
          breadcrumb.name = nameField.value
        }

        return breadcrumb
      })
    })
  }

  async _changeDefaultImage (event) {
    event.preventDefault()
    const { actorTypeIndex } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'actorTypes')
    const currentImage = source[actorTypeIndex]?.defaultImage || 'icons/svg/mystery-man.svg'

    const imagePicker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: currentImage,
      callback: async newImage => {
        source[actorTypeIndex].defaultImage = newImage

        await game.settings.set('cortexprime', 'actorTypes', source)

        await this.render()
      }
    })

    await imagePicker.browse()
  }

  async changeView (name, target) {
    const currentBreadcrumbs = game.settings.get('cortexprime', 'actorBreadcrumbs')

    await game.settings.set('cortexprime', 'actorBreadcrumbs', {
      ...objectMapValues(currentBreadcrumbs, breadcrumb => {
        breadcrumb.active = false
        return breadcrumb
      }),
      [getLength(currentBreadcrumbs)]: {
        active: true,
        localize: false,
        name,
        target
      }
    })

    await this.render()
  }

  async _duplicateItem (event) {
    event.preventDefault()
    const { id, path } = event.currentTarget.dataset
    let source = game.settings.get('cortexprime', 'actorTypes')
    const targetGroup = path ? foundry.utils.getProperty(source, path) : source
    const newKey = getLength(targetGroup ?? {})
    const target = objectFindValue(targetGroup, item => item.id === id)

    const newTarget = {
      [newKey]: objectMapValues(target, (value, key) => {
        if (key === 'id') return `_${Date.now()}`

        return value
      })
    }

    if (path) {
      foundry.utils.setProperty(source, path, { ...targetGroup, ...newTarget })
    } else {
      source = foundry.utils.mergeObject(source, newTarget)
    }

    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.render()
  }

  async _newDie (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const { target: path } = event.currentTarget.dataset
    const currentDice = foundry.utils.getProperty(source, path) || {}
    const values = currentDice.value ?? {}
    const newKey = getLength(values)
    const newValue = newKey > 0 ? values[newKey - 1] : '8'

    foundry.utils.setProperty(source, `${path}.value`, { ...values, [newKey]: newValue })
    await game.settings.set('cortexprime', 'actorTypes', source)
    await this.render()
  }

  async _onDieChange (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'actorTypes')
    const dieSelect = event.currentTarget
    const { target } = dieSelect.dataset
    const targetKey = intData(dieSelect, 'key')
    const targetValue = dieSelect.value
    const currentDiceValues = foundry.utils.getProperty(source, `${target}.value`) ?? {}

    if (parseInt(targetValue, 10) === 0) {
      foundry.utils.setProperty(source, `${target}.value`, objectReindexFilter(currentDiceValues, (_, index) => parseInt(index, 10) !== targetKey))
    } else {
      foundry.utils.setProperty(source, `${target}.value`, objectMapValues(currentDiceValues, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value))
    }

    await game.settings.set('cortexprime', 'actorTypes', source)

    await this.render()
  }

  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button !== 2) return

    const source = game.settings.get('cortexprime', 'actorTypes')
    const dieSelect = event.currentTarget
    const { target } = dieSelect.dataset
    const targetKey = intData(dieSelect, 'key')
    const currentDiceValues = foundry.utils.getProperty(source, `${target}.value`) ?? {}

    foundry.utils.setProperty(source, `${target}.value`, objectReindexFilter(currentDiceValues, (_, index) => parseInt(index, 10) !== targetKey))

    await game.settings.set('cortexprime', 'actorTypes', source)

    await this.render()
  }

  async _viewChange (event) {
    event.preventDefault()
    const { name, to } = event.currentTarget.dataset
    await this.changeView(name, to)
  }
}

Hooks.on('closeActorSettings', async () => {
  await game.settings.set(
    'cortexprime',
    'actorBreadcrumbs',
    {
      0: {
        active: true,
        name: 'ActorTypes',
        target: 'actorTypes',
        localize: true
      }
    }
  )
})
