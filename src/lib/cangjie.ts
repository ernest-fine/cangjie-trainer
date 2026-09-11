/** Third-generation Cangjie key letters and their radicals. */
export const RADICALS: Readonly<Record<string, string>> = Object.freeze({
  A: '日', B: '月', C: '金', D: '木', E: '水', F: '火', G: '土',
  H: '竹', I: '戈', J: '十', K: '大', L: '中', M: '一', N: '弓',
  O: '人', P: '心', Q: '手', R: '口', S: '尸', T: '廿', U: '山',
  V: '女', W: '田', X: '難', Y: '卜', Z: '重',
})

/** Maps a letter code such as `ROWR` to its radicals, `口人田口`. */
export function radicalsFor(code: string): string {
  return [...code]
    .map((letter) => {
      const radical = RADICALS[letter]
      if (!radical) throw new Error(`"${letter}" is not a Cangjie key`)
      return radical
    })
    .join('')
}
