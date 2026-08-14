/**
 * Native-DOM replacements for the jQuery idioms this system used under ApplicationV1.
 */

/**
 * Listeners are bound directly to the matched elements rather than delegated from the
 * application root. ApplicationV2 replaces part content on every render, so per-element
 * listeners are discarded along with the old nodes and cannot stack up.
 */
export const bindAll = (root, selector, eventName, handler) => {
  if (!root) return

  for (const element of root.querySelectorAll(selector)) {
    element.addEventListener(eventName, handler)
  }
}

export const toggleClasses = (element, ...classNames) => {
  if (!element) return

  for (const className of classNames) {
    element.classList.toggle(className)
  }
}

/**
 * Parse an element's `data-*` value as an integer. `dataset` always yields strings, whereas
 * jQuery's `.data()` coerced numeric-looking values to numbers, so every former `.data()`
 * read that fed a numeric comparison must go through here.
 */
export const intData = (element, key) => {
  const value = element?.dataset?.[key]
  return value === undefined || value === '' ? null : parseInt(value, 10)
}

/** Move every child of `element` into a new wrapper element, preserving order. */
export const wrapChildren = (element, wrapper) => {
  if (!element) return null

  wrapper.append(...element.childNodes)
  element.append(wrapper)

  return wrapper
}
