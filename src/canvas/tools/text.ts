import { hitTest, LINE_HEIGHT } from '../geometry'
import type { EngineApi, ToolHandler } from './types'

/** Click on empty canvas to start typing; click existing text to edit it. */
export function textTool(engine: EngineApi): ToolHandler {
  return {
    cursor: 'text',
    down(p) {
      const tol = engine.tolerance()
      const hit = [...engine.sorted()].reverse().find((el) => el.type === 'text' && hitTest(el, p, tol))
      if (hit?.type === 'text') {
        engine.editText({ id: hit.id, ...hit.data })
        return
      }
      const { stroke, fontSize } = engine.style()
      // Center the first line on the click.
      engine.editText({ id: null, x: p.x, y: p.y - (fontSize * LINE_HEIGHT) / 2, text: '', fontSize, color: stroke })
    },
    move() {},
    up() {},
    cancel() {},
  }
}
