import { describe, it, expect } from 'vitest'
import { shouldSkipPath } from './fileWalker.js'

describe('shouldSkipPath', () => {
  it('skips node_modules', () => {
    expect(shouldSkipPath('/repo/node_modules/lodash/index.js')).toBe(true)
  })
  it('skips .git directory', () => {
    expect(shouldSkipPath('/repo/.git/HEAD')).toBe(true)
  })
  it('skips dist and build', () => {
    expect(shouldSkipPath('/repo/dist/index.js')).toBe(true)
    expect(shouldSkipPath('/repo/build/app.js')).toBe(true)
  })
  it('skips minified files', () => {
    expect(shouldSkipPath('/repo/src/app.min.js')).toBe(true)
  })
  it('allows normal source files', () => {
    expect(shouldSkipPath('/repo/src/utils.ts')).toBe(false)
  })
  it('allows files in nested src', () => {
    expect(shouldSkipPath('/repo/src/components/Button.tsx')).toBe(false)
  })
})
