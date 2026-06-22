import { describe, expect, it } from 'vitest'
import { pickCategoryId } from '../../utils/productClassify'
import { IMPORT_PRODUCT_TYPES } from '../../utils/importProductTypes'

describe('pickCategoryId', () => {
  it('matches a bare category id', () => {
    expect(pickCategoryId('libros')).toBe('libros')
    expect(pickCategoryId('electronica')).toBe('electronica')
  })

  it('extracts the id from surrounding prose', () => {
    expect(pickCategoryId('The best category is: medicamentos.')).toBe('medicamentos')
  })

  it('handles underscored ids', () => {
    expect(pickCategoryId('alcohol_tabaco')).toBe('alcohol_tabaco')
  })

  it('returns the first matching catalog id', () => {
    expect(pickCategoryId('ropa or maybe juguetes')).toBe('ropa')
  })

  it('returns null when no known id is present', () => {
    expect(pickCategoryId('id: foobar nonsense')).toBeNull()
    expect(pickCategoryId('')).toBeNull()
  })

  it('only accepts ids that exist in the catalog', () => {
    const ids = IMPORT_PRODUCT_TYPES.map(t => t.id)
    const picked = pickCategoryId('prohibidos')
    expect(picked).toBe('prohibidos')
    expect(ids).toContain(picked)
  })
})
