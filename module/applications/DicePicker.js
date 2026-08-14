import { localizer } from '../scripts/foundryHelpers.js'
import { bindAll } from '../scripts/domHelpers.js'

const { DialogV2 } = foundry.applications.api
const { renderTemplate } = foundry.applications.handlebars

const getAppendDiceContent = data =>
  renderTemplate('systems/cortexprime/templates/partials/die-display.html', data)

/* -------------------------------------------- */
/*  Automatic selection strategies              */
/* -------------------------------------------- */

const markResultTotals = results => {
  results.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return a.faces - b.faces
  })

  return results.reduce((acc, result) => {
    if (!result.effect && acc.count < 2) return { dice: [...acc.dice, { ...result, total: true }], count: acc.count + 1 }

    return { dice: [...acc.dice, result], count: acc.count }
  }, { dice: [], count: 0 }).dice
}

const markResultEffect = results => {
  results.sort((a, b) => {
    if (a.faces !== b.faces) {
      return b.faces - a.faces
    }

    return a.result - b.result
  })

  return results.reduce((acc, result) => {
    const hasEffectDie = acc.some(item => item.effect)
    if (!result.total && !hasEffectDie) return [...acc, { ...result, effect: true }]

    return [...acc, result]
  }, [])
}

const summarise = dice => {
  dice.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return b.faces - a.faces
  })

  const total = dice.reduce((totalValue, result) => result.total ? totalValue + result.result : totalValue, 0)
  const targetEffectDie = dice.find(result => result.effect)
  const effectDice = targetEffectDie?.faces ? [targetEffectDie.faces] : []

  return { dice, total, effectDice }
}

export const getDiceByEffect = results => {
  const effectMarkedResults = results.length > 2 ? markResultEffect(results) : results

  return summarise(markResultTotals(effectMarkedResults))
}

export const getDiceByTotal = results => {
  return summarise(markResultEffect(markResultTotals(results)))
}

/* -------------------------------------------- */

/**
 * Lets the user decide, die by die, which results contribute to the roll total and which
 * becomes the effect die.
 */
export class DicePicker extends DialogV2 {
  static DEFAULT_OPTIONS = {
    classes: ['cortexprime', 'dice-picker']
  }

  get diceBox () {
    return this.element.querySelector('.dice-box')
  }

  get effectDiceContainer () {
    return this.element.querySelector('.effect-dice')
  }

  get resultDice () {
    return [...(this.diceBox?.querySelectorAll('.result-die') ?? [])]
  }

  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, '.result-die', 'click', this.#onDieClick.bind(this))
    bindAll(html, '.effect-dice', 'mouseup', this.#onEffectDieRemove.bind(this))
    bindAll(html, '.add-to-total', 'click', this.#onAddToTotal.bind(this))
    bindAll(html, '.add-to-effect', 'click', this.#onAddToEffect.bind(this))
    bindAll(html, '.select-by-total', 'click', this.#onSelectByTotal.bind(this))
    bindAll(html, '.select-by-effect', 'click', this.#onSelectByEffect.bind(this))
    bindAll(html, '.reset-selection', 'click', this.#onResetSelection.bind(this))

    this.#refreshControls()
  }

  /* -------------------------------------------- */
  /*  Selection state                             */
  /* -------------------------------------------- */

  #setDieState (die, state) {
    const cpt = die.querySelector('.die-cpt')

    die.classList.remove('chosen', 'result', 'effect', 'selected', 'selectable')
    cpt?.classList.remove('chosen-cpt', 'unchosen-cpt', 'effect-cpt', 'selected-cpt')

    switch (state) {
      case 'chosen':
        die.classList.add('chosen')
        cpt?.classList.add('chosen-cpt')
        break
      case 'effect':
        die.classList.add('effect')
        cpt?.classList.add('effect-cpt')
        break
      case 'selected':
        die.classList.add('selected', 'selectable')
        cpt?.classList.add('selected-cpt')
        break
      default:
        die.classList.add('result', 'selectable')
        cpt?.classList.add('unchosen-cpt')
    }
  }

  #dieState (die) {
    if (die.classList.contains('chosen')) return 'chosen'
    if (die.classList.contains('effect')) return 'effect'
    if (die.classList.contains('selected')) return 'selected'
    return 'result'
  }

  #dieData (die) {
    return {
      key: die.dataset.key,
      faces: parseInt(die.dataset.faces, 10),
      result: parseInt(die.dataset.result, 10)
    }
  }

  #recalculateTotal () {
    const total = this.resultDice
      .filter(die => this.#dieState(die) === 'chosen')
      .reduce((sum, die) => sum + parseInt(die.dataset.result, 10), 0)

    const totalValue = this.element.querySelector('.total-value')
    if (totalValue) totalValue.textContent = total
  }

  async #refreshEffectDice () {
    const container = this.effectDiceContainer
    if (!container) return

    const effectDice = this.resultDice.filter(die => this.#dieState(die) === 'effect')

    container.replaceChildren()

    if (!effectDice.length) {
      container.insertAdjacentHTML('beforeend', await getAppendDiceContent({
        defaultValue: true,
        dieRating: '4',
        value: '4',
        type: 'effect'
      }))
      return
    }

    for (const die of effectDice) {
      const { key, faces } = this.#dieData(die)

      container.insertAdjacentHTML('beforeend', await getAppendDiceContent({
        key: parseInt(key, 10),
        dieRating: faces,
        value: faces,
        type: 'effect'
      }))
    }
  }

  #refreshControls () {
    const states = this.resultDice.map(die => this.#dieState(die))
    const hasSelected = states.includes('selected')
    const hasUsed = states.some(state => ['chosen', 'effect'].includes(state))

    const addToTotal = this.element.querySelector('.add-to-total')
    const addToEffect = this.element.querySelector('.add-to-effect')
    const resetSelection = this.element.querySelector('.reset-selection')

    if (addToTotal) addToTotal.disabled = !hasSelected
    if (addToEffect) addToEffect.disabled = !hasSelected
    if (resetSelection) resetSelection.disabled = !(hasSelected || hasUsed)
  }

  async #refresh () {
    this.#recalculateTotal()
    await this.#refreshEffectDice()
    this.#refreshControls()
  }

  /* -------------------------------------------- */
  /*  Event handlers                              */
  /* -------------------------------------------- */

  async #onDieClick (event) {
    const die = event.currentTarget

    // A pending selection toggles back off; a die already committed to the total or the
    // effect is released. Anything else enters the pending selection.
    this.#setDieState(die, this.#dieState(die) === 'result' ? 'selected' : 'result')

    await this.#refresh()
  }

  async #onEffectDieRemove (event) {
    if (event.button !== 2) return

    const wrapper = event.target.closest('.die-icon-wrapper')
    if (!wrapper?.dataset.key) return

    const resultDie = this.diceBox?.querySelector(`.result-die[data-key="${wrapper.dataset.key}"]`)
    if (resultDie) this.#setDieState(resultDie, 'result')

    await this.#refresh()
  }

  async #commitSelected (state, event) {
    event.preventDefault()

    for (const die of this.resultDice) {
      if (this.#dieState(die) === 'selected') this.#setDieState(die, state)
    }

    await this.#refresh()
  }

  #onAddToTotal (event) {
    return this.#commitSelected('chosen', event)
  }

  #onAddToEffect (event) {
    return this.#commitSelected('effect', event)
  }

  async #applyAutoSelection (strategy, event) {
    event.preventDefault()

    const dice = this.resultDice
    const { dice: marked } = strategy(dice.map(die => this.#dieData(die)))
    const byKey = new Map(dice.map(die => [die.dataset.key, die]))

    for (const entry of marked) {
      const die = byKey.get(entry.key)
      if (!die) continue

      this.#setDieState(die, entry.total ? 'chosen' : entry.effect ? 'effect' : 'result')
    }

    await this.#refresh()
  }

  #onSelectByTotal (event) {
    return this.#applyAutoSelection(getDiceByTotal, event)
  }

  #onSelectByEffect (event) {
    return this.#applyAutoSelection(getDiceByEffect, event)
  }

  async #onResetSelection (event) {
    event.preventDefault()

    for (const die of this.resultDice) this.#setDieState(die, 'result')

    await this.#refresh()
  }

  /* -------------------------------------------- */

  collectSelection () {
    return this.resultDice.reduce((values, die) => {
      const state = this.#dieState(die)
      const { faces, result } = this.#dieData(die)
      const value = { effect: state === 'effect', faces, result, total: state === 'chosen' }

      if (value.total) values.total = values.total ? values.total + result : result
      if (value.effect) values.effectDice.push(faces)

      values.dice.push(value)

      return values
    }, { dice: [], total: null, effectDice: [] })
  }
}

/* -------------------------------------------- */

export const pickDice = async rollResults => {
  const themes = game.settings.get('cortexprime', 'themes')
  const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]

  // Built as an element rather than a string so the SVG dice markup is not stripped by
  // DialogV2's HTML cleaning.
  const content = document.createElement('div')
  content.innerHTML = await renderTemplate('systems/cortexprime/templates/dialog/dice-picker.html', {
    rollResults,
    theme
  })

  const result = await DicePicker.wait({
    window: { title: localizer('SelectYourDice') },
    content,
    buttons: [
      {
        action: 'confirm',
        icon: 'fa-solid fa-check',
        label: localizer('Confirm'),
        default: true,
        callback: (event, button, dialog) => dialog.collectSelection()
      }
    ],
    rejectClose: false
  })

  // Dismissing the picker keeps the rolled dice but commits nothing to a total or effect.
  return result ?? {
    dice: rollResults.results.map(({ faces, result }) => ({ effect: false, faces, result, total: false })),
    total: null,
    effectDice: []
  }
}
