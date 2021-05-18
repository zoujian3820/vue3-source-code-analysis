<!--
 * @Author: mrzou
 * @Date: 2021-05-17 09:24:51
 * @LastEditors: mrzou
 * @LastEditTime: 2021-05-17 10:28:43
 * @Description: file content
-->

##  依赖安装 
yarn --ignore-scripts

## 准备调试
- 添加 --sourcemap
    ```
    "dev": "node scripts/dev.js --sourcemap",
    ```
- 执行 yarn dev    

## 入口文件
- 从执行命令npm run dev开始
```javascript
// "dev": "node scripts/dev.js --sourcemap"
// 找到 scripts/dev.js 发现 TARGET 默认为 vue
```
- 从rollup打包配置文件rollup.config.js中入手
```javascript
  // 打包的入口文件
  // 我们这次看的是浏览器的版本，所以是src/index.ts
  // runtime webpack运行时的版本
  const entryFile = /runtime$/.test(format) ? `src/runtime.ts` : `src/index.ts`
  
  // packages/
  const packagesDir = path.resolve(__dirname, 'packages')
  // 默认的packages/vue
  const packageDir = path.resolve(packagesDir, process.env.TARGET)
  const name = path.basename(packageDir)
  const resolve = p => path.resolve(packageDir, p)
  
   // 入口文件配置
   // input: resolve(entryFile),
   // 由此找到入口文件是 packages/vue/src/index.ts
```
## 功能点
### 初始化
[初始化流程及源码入口](https://github.com/zoujian3820/blog/blob/master/note/vue3%E6%BA%90%E7%A0%81/vue.md)