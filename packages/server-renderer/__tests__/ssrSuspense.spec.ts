import { createApp, h, Suspense } from 'vue'
import { renderToString } from '../src/renderToString'

describe('SSR Suspense', () => {
  let logError: jest.SpyInstance

  beforeEach(() => {
    logError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logError.mockRestore()
  })

  const ResolvingAsync = {
    async setup() {
      return () => h('div', 'async')
    }
  }

  const RejectingAsync = {
    setup() {
      return new Promise((_, reject) => reject('foo'))
    }
  }

  test('render', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h(ResolvingAsync),
          fallback: h('div', 'fallback')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(`<div>async</div>`)
    expect(logError).not.toHaveBeenCalled()
  })

  test('fallback', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h(RejectingAsync),
          fallback: h('div', 'fallback')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(`<div>fallback</div>`)
    expect(logError).toHaveBeenCalled()
  })

  test('2 components', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h('div', [h(ResolvingAsync), h(ResolvingAsync)]),
          fallback: h('div', 'fallback')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(
      `<div><div>async</div><div>async</div></div>`
    )
    expect(logError).not.toHaveBeenCalled()
  })

  test('resolving component + rejecting component', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h('div', [h(ResolvingAsync), h(RejectingAsync)]),
          fallback: h('div', 'fallback')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(`<div>fallback</div>`)
    expect(logError).toHaveBeenCalled()
  })

  test('failing suspense in passing suspense', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h('div', [
            h(ResolvingAsync),
            h(Suspense, null, {
              default: h('div', [h(RejectingAsync)]),
              fallback: h('div', 'fallback 2')
            })
          ]),
          fallback: h('div', 'fallback 1')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(
      `<div><div>async</div><div>fallback 2</div></div>`
    )
    expect(logError).toHaveBeenCalled()
  })

  test('passing suspense in failing suspense', async () => {
    const Comp = {
      render() {
        return h(Suspense, null, {
          default: h('div', [
            h(RejectingAsync),
            h(Suspense, null, {
              default: h('div', [h(ResolvingAsync)]),
              fallback: h('div', 'fallback 2')
            })
          ]),
          fallback: h('div', 'fallback 1')
        })
      }
    }

    expect(await renderToString(createApp(Comp))).toBe(`<div>fallback 1</div>`)
    expect(logError).toHaveBeenCalled()
  })
})