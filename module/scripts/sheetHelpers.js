import { objectReindexFilter } from '../../lib/helpers.js'
import { localizer } from './foundryHelpers.js'
import { bindAll } from './domHelpers.js'

const { DialogV2 } = foundry.applications.api

/**
 * Overwrite `path.target` wholesale rather than merging into it. Foundry deep-merges update
 * data by default, so removing a key from a keyed collection requires an explicit replacement.
 */
export const resetDataPoint = async function (path, target, value) {
  await this.actor.update({
    [`${path}.${target}`]: foundry.data.operators.ForcedReplacement.create(value)
  })
}

export const toggleItems = function (html) {
  bindAll(html, '.toggle-item', 'click', async event => {
    event.preventDefault()
    const { path } = event.currentTarget.dataset
    const value = !foundry.utils.getProperty(this.actor, path)

    await this.actor.update({
      [path]: value
    })
  })
}

export const removeDataPoint = async function (data, path, target, key) {
  const currentData = data || {}

  const newData = objectReindexFilter(currentData, (_, currentKey) => parseInt(currentKey, 10) !== parseInt(key, 10))

  await resetDataPoint.call(this, path, target, newData)
}

export const removeItems = function (html) {
  bindAll(html, '.remove-item', 'click', async event => {
    event.preventDefault()
    const {
      path,
      itemKey,
      itemName,
      target
    } = event.currentTarget.dataset

    const confirmed = await DialogV2.confirm({
      window: { title: localizer('AreYouSure') },
      content: `<p>${localizer('Remove')} ${foundry.utils.escapeHTML(itemName ?? '')}?</p>`,
      modal: true,
      yes: { default: false },
      no: { default: true }
    })

    if (confirmed) {
      const data = foundry.utils.getProperty(this.actor, `${path}.${target}`)

      await removeDataPoint.call(this, data, path, target, itemKey)
    }
  })
}
