import { describe, it, expect } from 'vitest'
import { researchQueryKeys, pdfAccessKeys, notificationKeys } from './client'

describe('queryKeys', () => {
  it('should generate correct research query key structures', () => {
    expect(researchQueryKeys.all).toEqual(['research'])
    expect(researchQueryKeys.lists()).toEqual(['research', 'list'])
    expect(researchQueryKeys.list({ status: 'published' })).toEqual(['research', 'list', { status: 'published' }])
    expect(researchQueryKeys.detail('res_123')).toEqual(['research', 'detail', 'res_123'])
  })

  it('should generate correct PDF access query key structures', () => {
    expect(pdfAccessKeys.all).toEqual(['pdf-access-requests'])
    expect(pdfAccessKeys.lists()).toEqual(['pdf-access-requests', 'list'])
    expect(pdfAccessKeys.list({ status: 'pending' })).toEqual(['pdf-access-requests', 'list', { status: 'pending' }])
  })

  it('should generate correct notification query key structures', () => {
    expect(notificationKeys.all).toEqual(['notifications'])
    expect(notificationKeys.lists()).toEqual(['notifications', 'list'])
    expect(notificationKeys.list({ read: false })).toEqual(['notifications', 'list', { read: false }])
  })
})
