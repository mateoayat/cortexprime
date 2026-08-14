import { setCssVars } from '../scripts/foundryHelpers.js'
import { bindAll } from '../scripts/domHelpers.js'
import defaultThemes from '../theme/defaultThemes.js'

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

const applyCurrentTheme = () => {
  const themes = game.settings.get('cortexprime', 'themes')
  const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]

  setCssVars(theme)
}

export default class ThemeSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'theme-settings',
    classes: ['cortexprime', 'theme-settings'],
    tag: 'form',
    window: {
      title: 'ThemeSettings',
      resizable: true
    },
    position: {
      width: 960,
      height: 900,
      top: 200,
      left: 400
    },
    form: {
      handler: ThemeSettings.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false
    }
  }

  static PARTS = {
    body: {
      template: 'systems/cortexprime/templates/theme/settings.html'
    }
  }

  async _prepareContext (options) {
    return {
      themes: game.settings.get('cortexprime', 'themes'),
      defaultVersion: defaultThemes.version
    }
  }

  static async onSubmit (event, form, formData) {
    const expandedFormData = foundry.utils.expandObject(formData.object)

    if (!expandedFormData.themes) return

    const currentThemes = game.settings.get('cortexprime', 'themes') ?? {}

    expandedFormData.themes.currentSettings = currentThemes.current !== expandedFormData.themes.current
      ? expandedFormData.themes.current === 'custom'
        ? currentThemes.custom
        : currentThemes.list[expandedFormData.themes.current]
      : expandedFormData.themes.currentSettings

    await game.settings.set('cortexprime', 'themes', foundry.utils.mergeObject(currentThemes, expandedFormData.themes))

    applyCurrentTheme()

    await this.render()
  }

  _onRender (context, options) {
    super._onRender(context, options)

    const html = this.element

    bindAll(html, '.image-picker', 'click', this._changeImage.bind(this))
    bindAll(html, '.image-remove', 'click', this._removeImage.bind(this))
    bindAll(html, '.refresh-preset', 'click', this._refreshPreset.bind(this))
    bindAll(html, '.save-as-custom-preset', 'click', this._saveAsCustomPreset.bind(this))
    bindAll(html, '.update-presets', 'click', this._updatePresets.bind(this))
  }

  async _changeImage (event) {
    event.preventDefault()
    const { targetSetting } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'themes')
    const currentImage = source?.currentSettings?.[targetSetting] || null

    const imagePicker = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: currentImage,
      callback: async newImage => {
        source.currentSettings[targetSetting] = newImage

        await game.settings.set('cortexprime', 'themes', source)

        await this.render()
      }
    })

    await imagePicker.browse()
  }

  async _removeImage (event) {
    event.preventDefault()
    const { targetSetting } = event.currentTarget.dataset
    const source = game.settings.get('cortexprime', 'themes')
    source.currentSettings[targetSetting] = null

    await game.settings.set('cortexprime', 'themes', source)

    await this.render()
  }

  async _refreshPreset (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'themes')
    source.currentSettings = source.current === 'custom'
      ? source.custom
      : source.list[source.current]

    await game.settings.set('cortexprime', 'themes', source)

    applyCurrentTheme()

    await this.render()
  }

  async _saveAsCustomPreset (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'themes')
    source.current = 'custom'
    source.custom = source.currentSettings

    await game.settings.set('cortexprime', 'themes', source)

    applyCurrentTheme()

    await this.render()
  }

  async _updatePresets (event) {
    event.preventDefault()
    const source = game.settings.get('cortexprime', 'themes')

    source.current = source.current !== 'custom'
      ? source[source.current] || defaultThemes.current
      : 'custom'
    source.list = defaultThemes.list
    source.version = defaultThemes.version
    source.currentSettings = source.current === 'custom'
      ? source.custom
      : source.list[source.current]

    await game.settings.set('cortexprime', 'themes', source)

    applyCurrentTheme()

    await this.render()
  }
}
