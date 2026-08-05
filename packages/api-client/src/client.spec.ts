import { describe, it, expect } from 'vitest'
import { researchQueryKeys } from './client'

describe('researchQueryKeys', () => {
  it('should generate correct query key structures', () => {
    expect(researchQueryKeys.all).toEqual(['research'])
    expect(researchQueryKeys.lists()).toEqual(['research', 'list'])
    expect(researchQueryKeys.list({ status: 'published' })).toEqual(['research', 'list', { status: 'published' }])
    expect(researchQueryKeys.detail('res_123')).toEqual(['research', 'detail', 'res_123'])
  })
})
