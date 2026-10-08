import { describe, expect, it } from 'vitest'
import { boardTitleSchema, displayNameSchema } from '../../src/lib/schemas'
import { safeAvatarUrl, safeNextPath, stripUnsafeChars } from '../../src/lib/safety'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/boards')).toBe('/boards')
    expect(safeNextPath('/b/123?x=1#y')).toBe('/b/123?x=1#y')
  })

  it.each([
    ['protocol-relative', '//evil.com'],
    ['backslash trick', '/' + '\\' + 'evil.com'],
    ['absolute URL', 'https://evil.com'],
    ['javascript URL', 'javascript:alert(1)'],
    ['relative path', 'boards'],
    ['tab in path', '/' + '\t' + '/evil.com'],
    ['empty', ''],
  ])('rejects %s', (_, input) => {
    expect(safeNextPath(input)).toBe('/boards')
  })

  it('handles missing values', () => {
    expect(safeNextPath(null)).toBe('/boards')
    expect(safeNextPath(undefined, '/x')).toBe('/x')
  })
})

describe('names and titles', () => {
  const spoof = 'Ana' + '\u202e' + 'nimda'
  it('strips zero-width and bidi-override characters', () => {
    expect(stripUnsafeChars('A' + '\u200b' + 'na')).toBe('Ana')
    expect(stripUnsafeChars(spoof)).toBe('Ananimda')
  })

  it('schemas clean before validating', () => {
    expect(displayNameSchema.parse('  An' + '\u200b' + 'a ')).toBe('Ana')
    expect(boardTitleSchema.parse('Login ' + '\u202e' + 'flow')).toBe('Login flow')
  })

  it('a name made only of invisible characters is empty, so it is rejected', () => {
    expect(displayNameSchema.safeParse('\u200b\u200b').success).toBe(false)
  })

  it('leaves real text alone', () => {
    expect(displayNameSchema.parse('Ron-ron Aspe Rivera ñ')).toBe('Ron-ron Aspe Rivera ñ')
  })
})

describe('safeAvatarUrl', () => {
  it('accepts GitHub and Google avatars', () => {
    expect(safeAvatarUrl('https://avatars.githubusercontent.com/u/123?v=4')).toBeTruthy()
    expect(safeAvatarUrl('https://lh3.googleusercontent.com/a/abc=s96-c')).toBeTruthy()
  })

  it.each([
    'http://avatars.githubusercontent.com/u/1',
    'https://evil.com/track.png',
    'https://avatars.githubusercontent.com.evil.com/x',
    'https://evil.com/?https://avatars.githubusercontent.com/',
    'javascript:alert(1)',
    42,
  ])('rejects %s', (url) => {
    expect(safeAvatarUrl(url)).toBeNull()
  })
})
