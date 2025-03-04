# @pandacss/config

## 0.6.0

### Patch Changes

- Updated dependencies [97fbe63f]
- Updated dependencies [08d33e0f]
- Updated dependencies [f7aff8eb]
  - @pandacss/preset-base@0.6.0
  - @pandacss/types@0.6.0
  - @pandacss/error@0.6.0
  - @pandacss/logger@0.6.0
  - @pandacss/preset-panda@0.6.0

## 0.5.1

### Patch Changes

- 33198907: Create separate entrypoint for merge configs

  ```ts
  import { mergeConfigs } from '@pandacss/config/merge'
  ```

- 1a2c0e2b: Fix `panda.config.xxx` file dependencies detection when using the builder (= with PostCSS or with the VSCode
  extension). It will now also properly resolve tsconfig path aliases.
- Updated dependencies [8c670d60]
- Updated dependencies [f9247e52]
- Updated dependencies [1ed239cd]
- Updated dependencies [78ed6ed4]
  - @pandacss/types@0.5.1
  - @pandacss/logger@0.5.1
  - @pandacss/preset-base@0.5.1
  - @pandacss/preset-panda@0.5.1
  - @pandacss/error@0.5.1

## 0.5.0

### Patch Changes

- Updated dependencies [ead9eaa3]
- Updated dependencies [3a87cff8]
  - @pandacss/types@0.5.0
  - @pandacss/preset-panda@0.5.0
  - @pandacss/preset-base@0.5.0
  - @pandacss/error@0.5.0
  - @pandacss/logger@0.5.0

## 0.4.0

### Patch Changes

- Updated dependencies [e8024347]
- Updated dependencies [d00eb17c]
- Updated dependencies [9156c1c6]
- Updated dependencies [54a8913c]
- Updated dependencies [0f36ebad]
- Updated dependencies [c7b42325]
- Updated dependencies [5b344b9c]
  - @pandacss/preset-base@0.4.0
  - @pandacss/types@0.4.0
  - @pandacss/preset-panda@0.4.0
  - @pandacss/error@0.4.0
  - @pandacss/logger@0.4.0

## 0.3.2

### Patch Changes

- 9822d79a: Remove `bundledDependencies` from `package.json` to fix NPM resolution
  - @pandacss/error@0.3.2
  - @pandacss/logger@0.3.2
  - @pandacss/preset-base@0.3.2
  - @pandacss/preset-panda@0.3.2
  - @pandacss/types@0.3.2

## 0.3.1

### Patch Changes

- efd79d83: Baseline release for the launch
- Updated dependencies [efd79d83]
  - @pandacss/error@0.3.1
  - @pandacss/logger@0.3.1
  - @pandacss/preset-base@0.3.1
  - @pandacss/preset-panda@0.3.1
  - @pandacss/types@0.3.1

## 0.3.0

### Patch Changes

- Updated dependencies [bd5c049b]
- Updated dependencies [6d81ee9e]
  - @pandacss/preset-base@0.3.0
  - @pandacss/preset-panda@0.3.0
  - @pandacss/types@0.3.0
  - @pandacss/error@0.3.0
  - @pandacss/logger@0.3.0

## 0.0.2

### Patch Changes

- c308e8be: Allow asynchronous presets
- fb40fff2: Initial release of all packages

  - Internal AST parser for TS and TSX
  - Support for defining presets in config
  - Support for design tokens (core and semantic)
  - Add `outExtension` key to config to allow file extension options for generated javascript. `.js` or `.mjs`
  - Add `jsxElement` option to patterns, to allow specifying the jsx element rendered by the patterns.

- Updated dependencies [c308e8be]
- Updated dependencies [fb40fff2]
  - @pandacss/types@0.0.2
  - @pandacss/error@0.0.2
  - @pandacss/logger@0.0.2
