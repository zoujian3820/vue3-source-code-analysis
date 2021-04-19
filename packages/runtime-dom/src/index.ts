import {
  createRenderer,
  createHydrationRenderer,
  warn,
  RootRenderFunction,
  CreateAppFunction,
  Renderer,
  HydrationRenderer,
  App,
  RootHydrateFunction,
  isRuntimeOnly
} from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp, forcePatchProp } from './patchProp'
// Importing from the compiler, will be tree-shaken in prod
import { isFunction, isString, isHTMLTag, isSVGTag, extend } from '@vue/shared'

declare module '@vue/reactivity' {
  export interface RefUnwrapBailTypes {
    // Note: if updating this, also update `types/refBail.d.ts`.
    runtimeDOMBailTypes: Node | Window
  }
}

// 这里是一些平台特性的操作， 当成createRenderer的参数传入
// 包含了一些dom的原生操作
const rendererOptions = extend({ patchProp, forcePatchProp }, nodeOps)

// lazy create the renderer - this makes core renderer logic tree-shakable
// in case the user only imports reactivity utilities from Vue.
let renderer: Renderer<Element> | HydrationRenderer

let enabledHydration = false

function ensureRenderer() {
  // 渲染器
  // 单例模式
  // 存就返回，不存在创建
  // rendererOptions 这里是一些平台特性的操作 如 dom 操作都在这个里面
  return renderer || (renderer = createRenderer<Node, Element>(rendererOptions))
}

function ensureHydrationRenderer() {
  renderer = enabledHydration
    ? renderer
    : createHydrationRenderer(rendererOptions)
  enabledHydration = true
  return renderer as HydrationRenderer
}

// use explicit type casts here to avoid import() calls in rolled-up d.ts
export const render = ((...args) => {
  ensureRenderer().render(...args)
}) as RootRenderFunction<Element>

export const hydrate = ((...args) => {
  ensureHydrationRenderer().hydrate(...args)
}) as RootHydrateFunction

// 这个就是我们使用的createApp
// 后面的as是ts的关键字，是用来限制当前的类型
export const createApp = ((...args) => {
  // 首先获取一个渲染器
  // 实际上createApp方法是由渲染器提供的
  const app = ensureRenderer().createApp(...args)

  if (__DEV__) {
    injectNativeTagCheck(app)
    injectCustomElementCheck(app)
  }

  const { mount } = app
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    // 通过选择器返回真实的元素
    const container = normalizeContainer(containerOrSelector)
    if (!container) return
    const component = app._component
    if (!isFunction(component) && !component.render && !component.template) {
      // 如果不是函数组件，或者没有render或者没有模版，则把当前的元素内容当template
      component.template = container.innerHTML
    }
    // clear content before mounting
    // 清除当前根元素(#app)的内容
    // 因为上面已经拿了他的innerHtml当template
    container.innerHTML = ''
    const proxy = mount(container, false, container instanceof SVGElement)
    if (container instanceof Element) {
      container.removeAttribute('v-cloak')
      container.setAttribute('data-v-app', '')
    }
    return proxy
  }

  return app
}) as CreateAppFunction<Element>

export const createSSRApp = ((...args) => {
  const app = ensureHydrationRenderer().createApp(...args)

  if (__DEV__) {
    injectNativeTagCheck(app)
    injectCustomElementCheck(app)
  }

  const { mount } = app
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    const container = normalizeContainer(containerOrSelector)
    if (container) {
      return mount(container, true, container instanceof SVGElement)
    }
  }

  return app
}) as CreateAppFunction<Element>

function injectNativeTagCheck(app: App) {
  // Inject `isNativeTag`
  // this is used for component name validation (dev only)
  Object.defineProperty(app.config, 'isNativeTag', {
    value: (tag: string) => isHTMLTag(tag) || isSVGTag(tag),
    writable: false
  })
}

// dev only
function injectCustomElementCheck(app: App) {
  if (isRuntimeOnly()) {
    const value = app.config.isCustomElement
    Object.defineProperty(app.config, 'isCustomElement', {
      get() {
        return value
      },
      set() {
        warn(
          `The \`isCustomElement\` config option is only respected when using the runtime compiler.` +
            `If you are using the runtime-only build, \`isCustomElement\` must be passed to \`@vue/compiler-dom\` in the build setup instead` +
            `- for example, via the \`compilerOptions\` option in vue-loader: https://vue-loader.vuejs.org/options.html#compileroptions.`
        )
      }
    })
  }
}

function normalizeContainer(
  container: Element | ShadowRoot | string
): Element | null {
  if (isString(container)) {
    const res = document.querySelector(container)
    if (__DEV__ && !res) {
      warn(
        `Failed to mount app: mount target selector "${container}" returned null.`
      )
    }
    return res
  }
  if (
    __DEV__ &&
    container instanceof window.ShadowRoot &&
    container.mode === 'closed'
  ) {
    warn(
      `mounting on a ShadowRoot with \`{mode: "closed"}\` may lead to unpredictable bugs`
    )
  }
  return container as any
}

// SFC CSS utilities
export { useCssModule } from './helpers/useCssModule'
export { useCssVars } from './helpers/useCssVars'

// DOM-only components
export { Transition, TransitionProps } from './components/Transition'
export {
  TransitionGroup,
  TransitionGroupProps
} from './components/TransitionGroup'

// **Internal** DOM-only runtime directive helpers
export {
  vModelText,
  vModelCheckbox,
  vModelRadio,
  vModelSelect,
  vModelDynamic
} from './directives/vModel'
export { withModifiers, withKeys } from './directives/vOn'
export { vShow } from './directives/vShow'

// re-export everything from core
// h, Component, reactivity API, nextTick, flags & types
export * from '@vue/runtime-core'
