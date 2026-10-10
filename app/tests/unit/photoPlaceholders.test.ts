import { describe, expect, it } from 'vitest'
import { isPlaceholderPhoto } from '../../utils/photoPlaceholders'

describe('isPlaceholderPhoto', () => {
  it("recognises Inmuebles El País' 'no photo' card by host and size", () => {
    const url = 'https://imagenes.gallito.com.uy/rinmu/sinblanco/ef13797a0c014.jpg'
    expect(isPlaceholderPhoto(url, 338, 253)).toBe(true)
  })

  it('keeps real photos from the same host and the same size elsewhere', () => {
    expect(
      isPlaceholderPhoto('https://imagenes.gallito.com.uy/rinmu/sinblanco/0f5.jpg', 1024, 768)
    ).toBe(false)
    expect(isPlaceholderPhoto('https://cdn1.infocasas.com.uy/repo/img/1.jpg', 338, 253)).toBe(false)
    expect(isPlaceholderPhoto('not a url', 338, 253)).toBe(false)
  })
})
