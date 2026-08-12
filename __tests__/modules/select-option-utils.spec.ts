/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { filterSelectOptions, findNextEnabledSelectIndex, shouldShowSelectSearch } from '@/components/ui/selectOptionUtils'

describe('selectOptionUtils', () => {
  it('shows search after the threshold', () => {
    expect(shouldShowSelectSearch(5)).toBe(false)
    expect(shouldShowSelectSearch(6)).toBe(true)
  })

  it('filters by label or value', () => {
    const options = [
      { label: 'zh-CN', value: 'zh-CN' },
      { label: 'en-US', value: 'en-US' },
    ]
    expect(filterSelectOptions(options, 'zh')).toEqual([options[0]])
  })

  it('skips disabled options when walking highlight', () => {
    const options = [{ disabled: true }, { disabled: false }, { disabled: true }]
    expect(findNextEnabledSelectIndex(options, -1, 1)).toBe(1)
    expect(findNextEnabledSelectIndex(options, 1, 1)).toBe(1)
  })
})
