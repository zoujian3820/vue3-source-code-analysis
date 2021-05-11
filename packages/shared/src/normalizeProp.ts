import { isArray, isString, isObject, hyphenate } from './'
import { isNoUnitNumericStyleProp } from './domAttrConfig'

export type NormalizedStyle = Record<string, string | number>

export function normalizeStyle(value: unknown): NormalizedStyle | undefined {
  // 如果 style 为数组 则遍历并做类型检测
  if (isArray(value)) {
    const res: NormalizedStyle = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      // { style: [{color: '#333'}, 'font-size: 16px;'] }
      const normalized = normalizeStyle(
        // 如果是字符串则标准化一下 (做两次字符串切割) 处理成对象形式
        // 所以样式最好直接写对象形式，以减少转换操作 和 递归
        // 否则（如：对象 | 数组） 则递归一次，走相应处理
        isString(item) ? parseStringStyle(item) : item
      )
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res

  //  如果为对象就直接返回
  } else if (isObject(value)) {
    // { style: {color: '#333'} }
    return value
  }
}

const listDelimiterRE = /;(?![^(]*\))/g
const propertyDelimiterRE = /:(.+)/

export function parseStringStyle(cssText: string): NormalizedStyle {
  // 做两次字符串切割 'color:#333;font-size:16px;'
  const ret: NormalizedStyle = {}
  // 并用使 ';' 切割成 ['color:#333', 'font-size:16px']
  cssText.split(listDelimiterRE).forEach(item => {
    if (item) {
      // 遍历 并用使 ':' 切割成 ['color', '#333']
      const tmp = item.split(propertyDelimiterRE)
      tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim())
    }
  })
  return ret
}

export function stringifyStyle(styles: NormalizedStyle | undefined): string {
  let ret = ''
  if (!styles) {
    return ret
  }
  for (const key in styles) {
    const value = styles[key]
    const normalizedKey = key.startsWith(`--`) ? key : hyphenate(key)
    if (
      isString(value) ||
      (typeof value === 'number' && isNoUnitNumericStyleProp(normalizedKey))
    ) {
      // only render valid values
      ret += `${normalizedKey}:${value};`
    }
  }
  return ret
}

export function normalizeClass(value: unknown): string {
  // 判断是 字符串 还是 对象 还是 数组，并转换成平铺的 className   'aa1 aa2 aa3 ...'
  // 数组的话会执行递归，意味着数组内部，再写对象也是可以
  // 但是为了性能，减少递归，直接写对象形式比较快
  // { class: {"aa1": isTrue1, "aa2": isTrue2} }  { class: ["aa1", "aa2"] }
  let res = ''
  if (isString(value)) {
    res = value
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const normalized = normalizeClass(value[i])
      if (normalized) {
        res += normalized + ' '
      }
    }
  } else if (isObject(value)) {
    for (const name in value) {
      if (value[name]) {
        res += name + ' '
      }
    }
  }
  return res.trim()
}
