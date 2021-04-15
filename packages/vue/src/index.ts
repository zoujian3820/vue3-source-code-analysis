// This entry is the "full-build" that includes both the runtime
// and the compiler, and supports on-the-fly compilation of the template option.
import { initDev } from './dev'
import { compile, CompilerOptions, CompilerError } from '@vue/compiler-dom'
import { registerRuntimeCompiler, RenderFunction, warn } from '@vue/runtime-dom'
import * as runtimeDom from '@vue/runtime-dom'
import { isString, NOOP, generateCodeFrame, extend } from '@vue/shared'
import { InternalRenderFunction } from 'packages/runtime-core/src/component'

if (__DEV__) {
  initDev()
}

const compileCache: Record<string, RenderFunction> = Object.create(null)

function compileToFunction(
  template: string | HTMLElement,
  options?: CompilerOptions
): RenderFunction {
  // 如果不是字符串模版
  if (!isString(template)) {
    // 并且是真实节点
    if (template.nodeType) {
      // 则获取其内部所有html当模版
      template = template.innerHTML
    } else {
      // 不是真实节点且是dev 报个warn
      __DEV__ && warn(`invalid template option: `, template)
      // 返回个空对象函数  NOOP是一个函数，并返回一个{}
      // export const NOOP = () => {}
      return NOOP
    }
  }

  // 把模版当成了key
  const key = template
  // 检查当前缓存中有没有
  const cached = compileCache[key]
  if (cached) {
    // 有则直接反回，其反回的是把模版转换成的render函数
    return cached
  }

  // 模版是否是一个id选择器
  if (template[0] === '#') {
    const el = document.querySelector(template)
    if (__DEV__ && !el) {
      warn(`Template element not found or is empty: ${template}`)
    }
    // __UNSAFE__
    // Reason: potential execution of JS expressions in in-DOM template.
    // The user must make sure the in-DOM template is trusted. If it's rendered
    // by the server, the template should not contain any user data.

    // 是则找到并获取其内部html当模版使用
    template = el ? el.innerHTML : ``
  }

  //转换成render函数的字符代码块code，返回结果如下
  // "const _Vue = Vue
  //
  // return function render(_ctx, _cache) {
  //   with (_ctx) {
  //     const { toDisplayString: _toDisplayString } = _Vue
  //
  //     return _toDisplayString(count)
  //   }
  // }"
  const { code } = compile(
    template,
    // extend： 调用的是Object.assign
    // 此处是合并 options 选项，并得到一个新的Object
    extend(
      {
        hoistStatic: true,
        onError(err: CompilerError) {
          if (__DEV__) {
            const message = `Template compilation error: ${err.message}`
            const codeFrame =
              err.loc &&
              generateCodeFrame(
                template as string,
                err.loc.start.offset,
                err.loc.end.offset
              )
            warn(codeFrame ? `${message}\n${codeFrame}` : message)
          } else {
            /* istanbul ignore next */
            throw err
          }
        }
      },
      options
    )
  )

  // The wildcard import results in a huge object with every export
  // with keys that cannot be mangled, and can be quite heavy size-wise.
  // In the global build we know `Vue` is available globally so we can avoid
  // the wildcard object.

  // 通过new fun解析并执行字符串代码，获取到反回的render函数
  // console.log(__GLOBAL__)
  const render = (__GLOBAL__ // true
    ? new Function(code)()
    : new Function('Vue', code)(runtimeDom)) as RenderFunction

  // mark the function as runtime compiled
  ;(render as InternalRenderFunction)._rc = true

  //把当前的模版转换成的render函数，加以缓存
  return (compileCache[key] = render)
}

registerRuntimeCompiler(compileToFunction)

export { compileToFunction as compile }
export * from '@vue/runtime-dom'
