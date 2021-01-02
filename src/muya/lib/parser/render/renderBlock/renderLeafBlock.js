import katex from 'katex'
import prism, { loadedCache, transfromAliasToOrigin } from '../../../prism/'
import { CLASS_OR_ID, DEVICE_MEMORY, PREVIEW_DOMPURIFY_CONFIG, HAS_TEXT_BLOCK_REG } from '../../../config'
import { tokenizer } from '../../'
import { snakeToCamel, sanitize, escapeHtml, getLongUniqueId, getImageInfo } from '../../../utils'
import { h, htmlToVNode } from '../snabbdom'

// todo@jocs any better solutions?
const MARKER_HASK = {
  '<': `%${getLongUniqueId()}%`,
  '>': `%${getLongUniqueId()}%`,
  '"': `%${getLongUniqueId()}%`,
  "'": `%${getLongUniqueId()}%`
}

const getHighlightHtml = (text, highlights, escape = false, handleLineEnding = false) => {
  let code = ''
  let pos = 0
  const getEscapeHTML = (className, content) => {
    return `${MARKER_HASK['<']}span class=${MARKER_HASK['"']}${className}${MARKER_HASK['"']}${MARKER_HASK['>']}${content}${MARKER_HASK['<']}/span${MARKER_HASK['>']}`
  }

  for (const highlight of highlights) {
    const { start, end, active } = highlight
    code += text.substring(pos, start)
    const className = active ? 'ag-highlight' : 'ag-selection'
    let highlightContent = text.substring(start, end)
    if (handleLineEnding && text.endsWith('\n') && end === text.length) {
      highlightContent = highlightContent.substring(start, end - 1) +
        (escape
          ? getEscapeHTML('ag-line-end', '\n')
          : '<span class="ag-line-end">\n</span>')
    }
    code += escape
      ? getEscapeHTML(className, highlightContent)
      : `<span class="${className}">${highlightContent}</span>`
    pos = end
  }
  if (pos !== text.length) {
    if (handleLineEnding && text.endsWith('\n')) {
      code += text.substring(pos, text.length - 1) +
        (escape
          ? getEscapeHTML('ag-line-end', '\n')
          : '<span class="ag-line-end">\n</span>')
    } else {
      code += text.substring(pos)
    }
  }

  return code
}

const hasReferenceToken = tokens => {
  let result = false
  const travel = tokens => {
    for (const token of tokens) {
      if (/reference_image|reference_link/.test(token.type)) {
        result = true
        break
      }
      if (Array.isArray(token.children) && token.children.length) {
        travel(token.children)
      }
    }
  }
  travel(tokens)
  return result
}

export default function renderLeafBlock (parent, block, activeBlocks, matches, useCache = false) {
  const { loadMathMap } = this
  const { cursor } = this.muya.contentState
  let selector = this.getSelector(block, activeBlocks)
  // highlight search key in block
  const highlights = matches.filter(m => m.key === block.key)
  const {
    text,
    type,
    checked,
    key,
    lang,
    functionType,
    editable
  } = block

  const data = {
    props: {},
    attrs: {},
    dataset: {},
    style: {}
  }

  let children = ''

  if (text) {
    let tokens = []
    if (highlights.length === 0 && this.tokenCache.has(text)) {
      tokens = this.tokenCache.get(text)
    } else if (
      HAS_TEXT_BLOCK_REG.test(type) &&
      functionType !== 'codeContent' &&
      functionType !== 'languageInput'
    ) {
      const hasBeginRules = /paragraphContent|atxLine/.test(functionType)

      tokens = tokenizer(text, {
        highlights,
        hasBeginRules,
        labels: this.labels,
        options: this.muya.options
      })
      const hasReferenceTokens = hasReferenceToken(tokens)
      if (highlights.length === 0 && useCache && DEVICE_MEMORY >= 4 && !hasReferenceTokens) {
        this.tokenCache.set(text, tokens)
      }
    }
    // console.log(...this[snakeToCamel(token.type)])
    // console.log(...this[snakeToCamel(token.type)])
    /* tokens.reduce((acc, token) => {
          console.log(snakeToCamel(token.type))
          console.log('bRUUUUUU', ...this[snakeToCamel(token.type)])
        },
          []) */
    // children = tokens.map(token => this[snakeToCamel(token.type)](h, cursor, block, token))

    children = []

    // console.log(Object.keys(this))
    // console.log(Object.getOwnPropertyNames(this.prototype))
    // console.log(typeof this)
    // console.log(this.prototype)

    /* const isGetter = (x, name) => (Object.getOwnPropertyDescriptor(x, name) || {}).get
    const isFunction = (x, name) => typeof x[name] === 'function'
    const deepFunctions = x =>
      x && x !== Object.prototype &&
      Object.getOwnPropertyNames(x)
        .filter(name => isGetter(x, name) || isFunction(x, name))
        .concat(deepFunctions(Object.getPrototypeOf(x)) || [])
    const distinctDeepFunctions = x => Array.from(new Set(deepFunctions(x)))
    const userFunctions = x => distinctDeepFunctions(x).filter(name => name !== 'constructor' && !~name.indexOf('__')).sort()
    console.log(userFunctions(this).sort()) */

    for (let i = 0, len = tokens.length; i < len; i++) {
      // console.log(snakeToCamel(tokens[i].type))
      const dynamicReturned = this[snakeToCamel(tokens[i].type)](h, cursor, block, tokens[i])
      // merge 2 arrays of object
      Array.prototype.push.apply(children, dynamicReturned)
    }

    /* tokens.forEach(token => {
      // call every function in tokens
      const dynamicReturned = this[snakeToCamel(token.type)](h, cursor, block, token)
      console.log(...dynamicReturned)
      children.push(...dynamicReturned)
    }) */

    /* children = tokens.reduce((accumulator, token) => {
      // this = ContentState
      const dynamicFunc = this[snakeToCamel(token.type)](h, cursor, block, token)
      const toSpread = dynamicFunc(h, cursor, block, token)
      // console.log('toSpread', toSpread)
      // return accumulator.concat(toSpread)
      // console.log([...accumulator, ...toSpread])
      return [...accumulator, ...toSpread]
    }, // initial value: empty array
      []) */

    /* children = tokens.reduce((acc, token) => [
      ...acc,
      ...this[snakeToCamel(token.type)](h, cursor, block, token)
    ],
      []) */
    // console.log('children', children)
  }

  if (editable === false) {
    Object.assign(data.attrs, {
      spellcheck: 'false',
      contenteditable: 'false'
    })
  }

  if (type === 'div') {
    const code = this.codeCache.get(block.preSibling)
    switch (functionType) {
      case 'html': {
        selector += `.${CLASS_OR_ID.AG_HTML_PREVIEW}`
        Object.assign(data.attrs, { spellcheck: 'false' })

        const { disableHtml } = this.muya.options
        const htmlContent = sanitize(code, PREVIEW_DOMPURIFY_CONFIG, disableHtml)

        // handle empty html bock
        if (/^<([a-z][a-z\d]*)[^>]*?>(\s*)<\/\1>$/.test(htmlContent.trim())) {
          children = htmlToVNode('<div class="ag-empty">&lt;Empty HTML Block&gt;</div>')
        } else {
          const parser = new DOMParser()
          const doc = parser.parseFromString(htmlContent, 'text/html')
          const imgs = doc.documentElement.querySelectorAll('img')
          for (const img of imgs) {
            const src = img.getAttribute('src')
            const imageInfo = getImageInfo(src)
            img.setAttribute('src', imageInfo.src)
          }

          children = htmlToVNode(doc.documentElement.querySelector('body').innerHTML)
        }
        break
      }
      case 'multiplemath': {
        const key = `${code}_display_math`
        selector += `.${CLASS_OR_ID.AG_CONTAINER_PREVIEW}`
        Object.assign(data.attrs, { spellcheck: 'false' })
        if (code === '') {
          children = '< Empty Mathematical Formula >'
          selector += `.${CLASS_OR_ID.AG_EMPTY}`
        } else if (loadMathMap.has(key)) {
          children = loadMathMap.get(key)
        } else {
          try {
            const html = katex.renderToString(code, {
              displayMode: true
            })

            children = htmlToVNode(html)
            loadMathMap.set(key, children)
          } catch (err) {
            children = '< Invalid Mathematical Formula >'
            selector += `.${CLASS_OR_ID.AG_MATH_ERROR}`
          }
        }
        break
      }
      case 'mermaid': {
        selector += `.${CLASS_OR_ID.AG_CONTAINER_PREVIEW}`
        Object.assign(data.attrs, { spellcheck: 'false' })
        if (code === '') {
          children = '< Empty Mermaid Block >'
          selector += `.${CLASS_OR_ID.AG_EMPTY}`
        } else {
          children = 'Loading...'
          this.mermaidCache.set(`#${block.key}`, {
            code,
            functionType
          })
        }
        break
      }
      case 'flowchart':
      case 'sequence':
      case 'vega-lite': {
        selector += `.${CLASS_OR_ID.AG_CONTAINER_PREVIEW}`
        Object.assign(data.attrs, { spellcheck: 'false' })
        if (code === '') {
          children = '< Empty Diagram Block >'
          selector += `.${CLASS_OR_ID.AG_EMPTY}`
        } else {
          children = 'Loading...'
          this.diagramCache.set(`#${block.key}`, {
            code,
            functionType
          })
        }
        break
      }
    }
  } else if (type === 'input') {
    const { fontSize, lineHeight } = this.muya.options

    Object.assign(data.attrs, {
      type: 'checkbox',
      style: `top: ${(fontSize * lineHeight / 2 - 8).toFixed(2)}px`
    })

    selector = `${type}#${key}.${CLASS_OR_ID.AG_TASK_LIST_ITEM_CHECKBOX}`
    if (checked) {
      Object.assign(data.attrs, {
        checked: true
      })
      selector += `.${CLASS_OR_ID.AG_CHECKBOX_CHECKED}`
    }
    children = ''
  } else if (type === 'span' && functionType === 'codeContent') {
    const code = escapeHtml(getHighlightHtml(text, highlights, true, true))
      .replace(new RegExp(MARKER_HASK['<'], 'g'), '<')
      .replace(new RegExp(MARKER_HASK['>'], 'g'), '>')
      .replace(new RegExp(MARKER_HASK['"'], 'g'), '"')
      .replace(new RegExp(MARKER_HASK["'"], 'g'), "'")
    // transfrom alias to original language
    const transformedLang = transfromAliasToOrigin([lang])[0]

    if (transformedLang && /\S/.test(code) && loadedCache.has(transformedLang)) {
      const wrapper = document.createElement('div')
      wrapper.classList.add(`language-${transformedLang}`)
      wrapper.innerHTML = code
      prism.highlightElement(wrapper, false, function () {
        const highlightedCode = this.innerHTML
        selector += `.language-${transformedLang}`
        children = htmlToVNode(highlightedCode)
      })
    } else {
      children = htmlToVNode(code)
    }
  } else if (type === 'span' && functionType === 'languageInput') {
    const html = getHighlightHtml(text, highlights)
    children = htmlToVNode(html)
  } else if (type === 'span' && functionType === 'footnoteInput') {
    Object.assign(data.attrs, { spellcheck: 'false' })
  }

  console.log('finalChildren', children)

  if (!block.parent) {
    return h(selector, data, [this.renderIcon(block), ...children])
  } else {
    return h(selector, data, children)
  }
}
