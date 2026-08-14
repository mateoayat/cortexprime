import { UserDicePool } from './applications/UserDicePool.js'
import { localizer, setCssVars } from './scripts/foundryHelpers.js'
import { bindAll, wrapChildren } from './scripts/domHelpers.js'
import rollDice from './scripts/rollDice.js'

const { DialogV2 } = foundry.applications.api
const { renderTemplate } = foundry.applications.handlebars

// v14 renamed the chat controls container from #roll-privacy to #message-modes as part of
// the roll-mode to message-mode rework; the later entries are fallbacks.
const CHAT_CONTROL_SELECTORS = ['#message-modes', '#roll-privacy', '.chat-controls']

const injectDicePoolButton = () => {
  const container = CHAT_CONTROL_SELECTORS
    .map(selector => document.querySelector(selector))
    .find(Boolean)

  if (!container || container.querySelector('.dice-pool-control')) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'control dice-pool-control ui-control fa-solid fa-dice icon'
  button.dataset.control = 'dice-pool'
  button.setAttribute('aria-label', localizer('DicePool'))

  button.addEventListener('click', async () => {
    await game.cortexprime.UserDicePool.toggle()
  })

  container.prepend(button)
}

const showWelcomeDialog = async () => {
  const acknowledged = await DialogV2.wait({
    window: { title: localizer('WelcomeTitle') },
    position: { width: 500, height: 'auto' },
    content: `<div class="bkg-lighter-grey ba-2-primary mb-4 pa-2"><p>${localizer('SettingsMessage')}</p></div>`,
    buttons: [
      {
        action: 'ok',
        label: localizer('Okay'),
        default: true,
        callback: () => true
      }
    ],
    rejectClose: false
  })

  if (acknowledged) {
    await game.settings.set('cortexprime', 'WelcomeSeen', true)
  }
}

const readPoolFromRollResult = rollResult => {
  return [...rollResult.querySelectorAll('.source')].reduce((sources, source) => {
    const traits = [...source.querySelectorAll('.dice-tag')].reduce((dice, tag, tagIndex) => ({
      ...dice,
      [tagIndex]: {
        label: tag.dataset.label,
        value: [...tag.querySelectorAll('.die')].reduce((diceValues, die, dieIndex) => ({
          ...diceValues,
          [dieIndex]: die.dataset.dieRating
        }), {})
      }
    }), {})

    return { ...sources, [source.dataset.source]: traits }
  }, {})
}

export default () => {
  Hooks.once('diceSoNiceReady', dice3d => {
    dice3d.addSystem({ id: 'cp-pp', name: 'Cortex Prime Plot Point' }, false)
    const ppLabel = 'systems/cortexprime/assets/plot-point/plot-point.png'
    dice3d.addDicePreset({
      type: 'dp',
      labels: [ppLabel, ppLabel],
      system: 'standard'
    }, 'd2')
  })

  Hooks.once('ready', async () => {
    const themes = game.settings.get('cortexprime', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
    setCssVars(theme)

    if (game.user.isGM && game.settings.get('cortexprime', 'WelcomeSeen') === false) {
      await showWelcomeDialog()
    }

    injectDicePoolButton()
  })

  // The chat input is re-parented when the sidebar is popped out or collapsed, which drops
  // the injected button along with it.
  Hooks.on('renderChatInput', () => {
    injectDicePoolButton()
  })

  Hooks.on('ready', async () => {
    game.cortexprime.UserDicePool = new UserDicePool()
    await game.cortexprime.UserDicePool.initPool()
  })

  Hooks.on('renderChatMessageHTML', async (message, html) => {
    const rollResult = html.querySelector('.roll-result')

    if (!rollResult) return

    const chatMessage = rollResult.closest('.chat-message') ?? html

    chatMessage.classList.add('roll-message')
    chatMessage.insertAdjacentHTML('afterbegin', '<div class="message-background"></div><div class="message-image"></div>')

    const messageHeader = chatMessage.querySelector('.message-header')

    if (messageHeader) {
      const headerContent = document.createElement('div')
      headerContent.className = 'message-header-content'

      wrapChildren(messageHeader, headerContent)
      messageHeader.insertAdjacentHTML('afterbegin', '<div class="message-header-image"></div><div class="message-header-background"></div>')
    }

    for (const die of rollResult.querySelectorAll('.die')) {
      const { dieRating, type, value: number } = die.dataset

      die.innerHTML = await renderTemplate(`systems/cortexprime/templates/partials/dice/d${dieRating}.html`, {
        type,
        number
      })
    }

    bindAll(html, '.source-header', 'click', event => {
      const source = event.currentTarget

      source.querySelector('.fa')?.classList.toggle('fa-chevron-down')
      source.querySelector('.fa')?.classList.toggle('fa-chevron-up')

      source.parentElement?.querySelector('.source-content')?.classList.toggle('hide')
    })

    bindAll(rollResult, '.re-roll', 'click', async event => {
      event.preventDefault()
      await rollDice(readPoolFromRollResult(rollResult))
    })

    bindAll(rollResult, '.send-to-pool', 'click', async event => {
      event.preventDefault()
      await game.cortexprime.UserDicePool._setPool(readPoolFromRollResult(rollResult))
    })
  })
}
