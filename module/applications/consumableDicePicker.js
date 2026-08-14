import { getLength } from '../../lib/helpers.js'
import { localizer } from '../scripts/foundryHelpers.js'
import { bindAll, toggleClasses } from '../scripts/domHelpers.js'

const { DialogV2 } = foundry.applications.api
const { renderTemplate } = foundry.applications.handlebars

const NO_SELECTION = { remove: [], value: {} }

/**
 * Prompts the user to pick which of a consumable trait's dice to send to the dice pool,
 * and whether to spend them off the sheet in the process.
 */
class ConsumableDicePicker extends DialogV2 {
  static DEFAULT_OPTIONS = {
    classes: ['cortexprime', 'consumable-dice']
  }

  _onRender (context, options) {
    super._onRender(context, options)

    bindAll(this.element, '.die-select', 'click', event => {
      const container = event.currentTarget
      toggleClasses(container, 'result', 'selected')
      toggleClasses(container.querySelector('.die-cpt'), 'unchosen-cpt', 'chosen-cpt')
    })
  }

  collectSelection () {
    const removeSelected = this.element.querySelector('.remove-check')?.checked
    const selectedDice = [...this.element.querySelectorAll('.die-select.selected')]

    if (!selectedDice.length) return { ...NO_SELECTION }

    return selectedDice.reduce((selectedValues, selectedDie) => {
      if (removeSelected) {
        selectedValues.remove = [...selectedValues.remove, selectedDie.dataset.key]
      }

      selectedValues.value = { ...selectedValues.value, [getLength(selectedValues.value)]: selectedDie.dataset.value }

      return selectedValues
    }, { remove: [], value: {} })
  }
}

export const consumableDicePicker = async (options, label) => {
  // Built as an element rather than a string so the SVG dice markup is not stripped by
  // DialogV2's HTML cleaning.
  const content = document.createElement('div')
  content.innerHTML = await renderTemplate('systems/cortexprime/templates/dialog/consumable-dice.html', {
    options,
    isOwner: game.user.isOwner
  })

  const result = await ConsumableDicePicker.wait({
    window: { title: label },
    content,
    buttons: [
      {
        action: 'cancel',
        icon: 'fa-solid fa-times',
        label: localizer('Cancel'),
        default: true,
        callback: () => ({ ...NO_SELECTION })
      },
      {
        action: 'done',
        icon: 'fa-solid fa-check',
        label: localizer('AddToPool'),
        callback: (event, button, dialog) => dialog.collectSelection()
      }
    ],
    rejectClose: false
  })

  return result ?? { ...NO_SELECTION }
}
