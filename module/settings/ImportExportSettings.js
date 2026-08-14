import defaultActorTypes from '../actor/defaultActorTypes.js'
import { localizer, setCssVars } from '../scripts/foundryHelpers.js'
import { bindAll } from '../scripts/domHelpers.js'

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api

export default class ImportExportSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'import-export-settings',
    classes: ['cortexprime', 'import-export-settings'],
    tag: 'form',
    window: {
      title: 'ImportExportSettings',
      resizable: true
    },
    position: {
      width: 'auto',
      height: 'auto',
      top: 200,
      left: 400
    },
    form: {
      handler: ImportExportSettings.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  static PARTS = {
    body: {
      template: 'systems/cortexprime/templates/import-export-settings.html'
    }
  }

  async _prepareContext (options) {
    return game.settings.get('cortexprime', 'importedSettings')
  }

  static async onSubmit (event, form, formData) {}

  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, '.export-settings', 'click', this._exportSettings.bind(this))
    bindAll(html, '.import-settings', 'change', this._importSettings.bind(this))
    bindAll(html, '.reset-settings', 'click', this._resetSettings.bind(this))
  }

  async _exportSettings (event) {
    event.preventDefault()

    const { current, custom } = game.settings.get('cortexprime', 'themes')

    const settings = {
      actorTypes: game.settings.get('cortexprime', 'actorTypes'),
      cortexPrimeVersion: game.system.version,
      theme: { current, custom }
    }

    foundry.utils.saveDataToFile(JSON.stringify(settings), 'json', 'my-cortex-prime-settings.json')
  }

  async _importSettings (event) {
    event.preventDefault()
    const [file] = event.currentTarget.files ?? []

    if (!file) return

    let data

    try {
      data = JSON.parse(await file.text())
    } catch (error) {
      console.error(error)
      ui.notifications.error(localizer('CantReadImportFile'))
      return
    }

    if (!data?.cortexPrimeVersion && !data?.actorTypes) {
      ui.notifications.error(localizer('CantReadImportFile'))
      return
    }

    const warning = game.system.version !== data?.cortexPrimeVersion
      ? localizer('ImportVersionWarning')
      : null

    const confirmed = await DialogV2.confirm({
      window: { title: localizer('AreYouSure') },
      content: `<div>${warning ? '<p class="my-2 pa-2 ba-2-primary">' + warning + '</p>' : ''}<p class="my-2">${localizer('ConfirmImportMessage')}</p></div>`,
      modal: true,
      yes: { default: false },
      no: { default: true }
    })

    if (!confirmed) return

    await game.settings.set('cortexprime', 'importedSettings', { currentSetting: file.name })
    await game.settings.set('cortexprime', 'actorTypes', data.actorTypes)

    const themeSettings = game.settings.get('cortexprime', 'themes')

    const { current, custom } = data.theme ?? {}

    themeSettings.current = current ?? 'Default'
    themeSettings.custom = custom ?? themeSettings.custom

    await game.settings.set('cortexprime', 'themes', themeSettings)

    const theme = themeSettings.current === 'custom' ? themeSettings.custom : themeSettings.list[themeSettings.current]

    setCssVars(theme)

    ui.notifications.info(localizer('ImportSuccessMessage'))

    await this.render()
  }

  async _resetSettings (event) {
    event.preventDefault()

    const confirmed = await DialogV2.confirm({
      window: { title: localizer('AreYouSure') },
      content: `<p>${localizer('ConfirmResetSettingsMessage')}</p>`,
      modal: true,
      yes: { default: false },
      no: { default: true }
    })

    if (!confirmed) return

    await game.settings.set('cortexprime', 'importedSettings', { currentSetting: localizer('Default') })
    await game.settings.set('cortexprime', 'actorTypes', defaultActorTypes)
    ui.notifications.info(localizer('ResetSuccessMessage'))

    await this.render()
  }
}
