import { getLength, objectFilter, objectMapValues, objectReindexFilter } from '../../lib/helpers.js'
import { bindAll, intData } from '../scripts/domHelpers.js'
import rollDice from '../scripts/rollDice.js'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

const blankPool = {
  customAdd: {
    label: '',
    value: { 0: '8' }
  },
  pool: {}
}

const readPool = () => game.user.getFlag('cortexprime', 'dicePool')

/**
 * Overwrite the stored pool rather than merging into it, so that removing a trait or a die
 * actually drops the key instead of leaving the previous value behind.
 */
const writePool = async dicePool => {
  await game.user.update({
    'flags.cortexprime.dicePool': foundry.data.operators.ForcedReplacement.create(dicePool)
  })
}

export class UserDicePool extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'user-dice-pool',
    classes: ['cortexprime', 'user-dice-pool'],
    tag: 'form',
    window: {
      title: 'DicePool',
      resizable: true
    },
    position: {
      width: 600,
      height: 'auto',
      top: 500,
      left: 20
    },
    form: {
      handler: UserDicePool.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  static PARTS = {
    body: {
      template: 'systems/cortexprime/templates/dice-pool.html'
    }
  }

  constructor (options = {}) {
    super(options)
    this.dicePool = readPool() ?? blankPool
  }

  async _prepareContext (options) {
    const dice = readPool()
    const themes = game.settings.get('cortexprime', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]

    return { ...dice, theme }
  }

  static async onSubmit (event, form, formData) {
    const currentDice = readPool()
    const newDice = foundry.utils.mergeObject(currentDice, foundry.utils.expandObject(formData.object))

    await writePool(newDice)
  }

  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, '.add-trait-to-pool', 'click', this._addCustomTraitToPool.bind(this))
    bindAll(html, '.clear-dice-pool', 'click', this._clearDicePool.bind(this))
    bindAll(html, '.new-die', 'click', this._onNewDie.bind(this))
    bindAll(html, '.die-select', 'change', this._onDieChange.bind(this))
    bindAll(html, '.die-select', 'mouseup', this._onDieRemove.bind(this))
    bindAll(html, '.remove-pool-trait', 'click', this._removePoolTrait.bind(this))
    bindAll(html, '.reset-custom-pool-trait', 'click', this._resetCustomPoolTrait.bind(this))
    bindAll(html, '.roll-dice-pool', 'click', this._rollDicePool.bind(this))
    bindAll(html, '.clear-source', 'click', this._clearSource.bind(this))
  }

  async initPool () {
    await writePool(this.dicePool)
  }

  async _addCustomTraitToPool (event) {
    event.preventDefault()

    const currentDice = readPool()
    const currentCustomLength = getLength(currentDice.pool.custom ?? {})

    foundry.utils.setProperty(currentDice, `pool.custom.${currentCustomLength}`, currentDice.customAdd)

    foundry.utils.setProperty(currentDice, 'customAdd', {
      label: '',
      value: { 0: '8' }
    })

    await writePool(currentDice)
    await this.render()
  }

  async _addTraitToPool (source, label, value) {
    const currentDice = readPool()
    const currentDiceLength = getLength(currentDice.pool[source] || {})

    foundry.utils.setProperty(currentDice, `pool.${source}.${currentDiceLength}`, { label, value })

    await writePool(currentDice)
    await this.render()
  }

  async _clearDicePool (event) {
    if (event) event.preventDefault()

    await writePool(blankPool)
    await this.render()
  }

  async _clearSource (event) {
    event.preventDefault()
    const { source } = event.currentTarget.dataset
    const currentDice = readPool()

    currentDice.pool = objectFilter(currentDice.pool, (_, dieSource) => source !== dieSource)

    await writePool(currentDice)
    await this.render()
  }

  async _onDieChange (event) {
    event.preventDefault()
    const element = event.currentTarget
    const { target } = element.dataset
    const targetKey = intData(element, 'key')
    const targetValue = element.value

    await this.submit()

    const currentDice = readPool()
    const dataTargetValue = foundry.utils.getProperty(currentDice, `${target}.value`) || {}

    foundry.utils.setProperty(
      currentDice,
      `${target}.value`,
      objectMapValues(dataTargetValue, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value)
    )

    await writePool(currentDice)
    await this.render()
  }

  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button !== 2) return

    const element = event.currentTarget
    const { target } = element.dataset
    const targetKey = intData(element, 'key')

    await this.submit()

    const currentDice = readPool()
    const dataTargetValue = foundry.utils.getProperty(currentDice, `${target}.value`) || {}

    foundry.utils.setProperty(
      currentDice,
      `${target}.value`,
      objectReindexFilter(dataTargetValue, (_, index) => parseInt(index, 10) !== targetKey)
    )

    await writePool(currentDice)
    await this.render()
  }

  async _onNewDie (event) {
    event.preventDefault()
    const currentDice = readPool()
    const { target } = event.currentTarget.dataset
    const dataTargetValue = foundry.utils.getProperty(currentDice, `${target}.value`) || {}
    const currentLength = getLength(dataTargetValue)
    const lastValue = dataTargetValue[currentLength - 1] || '8'

    foundry.utils.setProperty(currentDice, `${target}.value`, { ...dataTargetValue, [currentLength]: lastValue })

    await writePool(currentDice)
    await this.render()
  }

  async _removePoolTrait (event) {
    event.preventDefault()
    const element = event.currentTarget
    const { source } = element.dataset
    const key = intData(element, 'key')
    const currentDicePool = readPool()

    if (getLength(currentDicePool.pool[source] || {}) < 2) {
      delete currentDicePool.pool[source]
    } else {
      currentDicePool.pool[source] = objectReindexFilter(currentDicePool.pool[source], (_, index) => parseInt(index, 10) !== key)
    }

    await writePool(currentDicePool)
    await this.render()
  }

  async _resetCustomPoolTrait (event) {
    event.preventDefault()

    const currentDice = readPool()

    foundry.utils.setProperty(currentDice, 'customAdd', {
      label: '',
      value: { 0: '8' }
    })

    await writePool(currentDice)
    await this.render()
  }

  async _setPool (pool) {
    const currentDice = readPool()

    foundry.utils.setProperty(currentDice, 'pool', pool)

    await writePool(currentDice)
    await this.render()
  }

  async _rollDicePool (event) {
    event.preventDefault()
    const target = event.currentTarget

    const dicePool = readPool().pool

    const rollType = target.classList.contains('roll-for-total')
      ? 'total'
      : target.classList.contains('roll-for-effect')
        ? 'effect'
        : 'select'

    await rollDice.call(this, dicePool, rollType)
  }

  async toggle () {
    if (this.rendered) {
      await this.close()
    } else {
      await this.render({ force: true })
    }
  }
}
