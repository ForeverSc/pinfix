import { describe, expect, it } from 'vitest'
import {
  createDesignPanelChangeContext,
  createVisualChangeContext,
  diffDesignPanelChanges,
  getColorPickerValue,
  getKeyboardAdjustment,
  getDesignPanelDefaults,
} from '../visual-edit'

describe('visual edit helpers', () => {
  it('summarizes move and resize deltas for a selected source element', () => {
    const change = createVisualChangeContext({
      source: 'src/App.tsx:10:5',
      target: { tagName: 'button', id: 'cta', className: 'primary', text: 'Save' },
      beforeRect: { x: 10, y: 20, width: 100, height: 40 },
      afterRect: { x: 18, y: 24, width: 120, height: 48 },
      computedStyle: { display: 'inline-flex', position: 'static' },
      parentLayout: { tagName: 'div', display: 'flex', gap: '12px' },
    })

    expect(change.operation).toBe('move-resize')
    expect(change.delta).toEqual({ x: 8, y: 4, width: 20, height: 8 })
  })

  it('maps arrow keys to move and resize adjustments', () => {
    expect(getKeyboardAdjustment({ key: 'ArrowRight', shiftKey: false })).toEqual({
      mode: 'move',
      x: 1,
      y: 0,
    })
    expect(getKeyboardAdjustment({ key: 'ArrowDown', shiftKey: true })).toEqual({
      mode: 'resize',
      width: 0,
      height: 1,
    })
  })

  it('builds design panel changes for the selected element', () => {
    const change = createDesignPanelChangeContext({
      source: 'src/App.tsx:10:5',
      targetScope: 'element',
      target: { tagName: 'button', className: 'primary', text: 'Save' },
      beforeRect: { x: 10, y: 20, width: 100, height: 40 },
      afterRect: { x: 10, y: 20, width: 100, height: 40 },
      computedStyle: { display: 'inline-flex' },
      parentLayout: { tagName: 'div', display: 'flex', gap: '8px' },
      changes: {
        layout: { justifyContent: 'center', alignItems: 'center', gap: '16px' },
        style: { borderRadius: '12px' },
      },
    })

    expect(change.operation).toBe('design-panel')
    expect(change.targetScope).toBe('element')
    expect(change.changes.layout).toEqual({
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
    })
    expect(change.intent).toContain('element')
  })

  it('maps computed styles into design panel defaults', () => {
    const defaults = getDesignPanelDefaults({
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 16px',
      margin: '0px',
      width: '120px',
      height: '40px',
      borderRadius: '10px',
      backgroundColor: 'rgb(0, 112, 234)',
      color: 'rgb(255, 255, 255)',
      fontSize: '14px',
      fontWeight: '600',
      textAlign: 'center',
    })

    expect(defaults.layout).toEqual({
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12',
    })
    expect(defaults.spacing.padding).toBe('8 16')
    expect(defaults.style.borderRadius).toBe('10')
    expect(defaults.typography.fontSize).toBe('14')
  })

  it('diffs design panel values against the style baseline', () => {
    const diff = diffDesignPanelChanges(
      {
        spacing: { padding: '8px 20px', margin: '0px' },
        style: { borderRadius: '10px' },
      },
      {
        spacing: { padding: '8px 16px', margin: '0px' },
        style: { borderRadius: '10px' },
      },
    )

    expect(diff).toEqual({
      spacing: { padding: '8px 20px' },
    })
  })

  it('normalizes css colors for native color inputs', () => {
    expect(getColorPickerValue('rgb(0, 112, 234)')).toBe('#0070ea')
    expect(getColorPickerValue('#fff')).toBe('#ffffff')
    expect(getColorPickerValue('var(--brand)')).toBe('#000000')
  })
})
