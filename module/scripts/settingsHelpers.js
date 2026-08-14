import { getLength, objectMapKeys, objectReduce, objectReindexFilter } from '../../lib/helpers.js'
import { localizer } from './foundryHelpers.js'
import { bindAll } from './domHelpers.js'

const { DialogV2 } = foundry.applications.api

export const removeItem = function (html) {
  bindAll(html, '.remove-item', 'click', async event => {
    event.preventDefault()
    const {
      group,
      itemKey,
      itemName,
      setting,
      stayOnPage
    } = event.currentTarget.dataset

    const confirmed = await DialogV2.confirm({
      window: { title: localizer('AreYouSure') },
      content: `<p>${localizer('Remove')} ${foundry.utils.escapeHTML(itemName ?? '')}?</p>`,
      modal: true,
      yes: { default: false },
      no: { default: true }
    })

    if (!confirmed || !setting) return

    let settings = game.settings.get('cortexprime', setting)

    const currentGroupSettings = group ? foundry.utils.getProperty(settings, group) : settings
    const groupSettingValue = objectReindexFilter(currentGroupSettings, (_, key) => +key !== +itemKey)

    if (group) {
      foundry.utils.setProperty(settings, group, groupSettingValue)
    } else {
      settings = groupSettingValue
    }

    await game.settings.set('cortexprime', setting, settings)

    if (setting === 'actorTypes' && !stayOnPage) {
      const currentBreadcrumbs = game.settings.get('cortexprime', 'actorBreadcrumbs')

      const breadcrumbsValue = objectReduce(currentBreadcrumbs, (acc, value, key, length) => {
        if (+key === length - 1) return acc
        return {
          ...acc,
          [key]: {
            ...value,
            active: +key === (length - 2)
          }
        }
      }, {})

      await game.settings.set('cortexprime', 'actorBreadcrumbs', breadcrumbsValue)
    }

    await this.render()
  })
}

export const reorderItem = function (html) {
  bindAll(html, '.reorder', 'click', async event => {
    event.preventDefault()
    const {
      currentIndex,
      newIndex,
      path,
      setting
    } = event.currentTarget.dataset

    let settings = game.settings.get('cortexprime', setting)
    const targetObject = (path || parseInt(path, 10) === 0) ? foundry.utils.getProperty(settings, path) ?? {} : settings
    const maxKey = getLength(targetObject ?? {}) - 1

    const key = +newIndex < 0
      ? maxKey
      : maxKey < +newIndex
        ? 0
        : +newIndex

    const value = objectMapKeys(targetObject, (_, targetKey) => {
      return +targetKey === +currentIndex
        ? key
        : +currentIndex > key
          ? +targetKey < +currentIndex && +targetKey >= key
            ? +targetKey + 1
            : +targetKey
          : +targetKey > +currentIndex && +targetKey <= key
            ? +targetKey - 1
            : +targetKey
    })

    if (path || parseInt(path, 10) === 0) {
      foundry.utils.setProperty(settings, path, value)
    } else {
      settings = value
    }

    await game.settings.set('cortexprime', setting, settings)
    await this.render()
  })
}
