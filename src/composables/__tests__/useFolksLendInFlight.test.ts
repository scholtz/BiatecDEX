import { describe, expect, it } from 'vitest'
import { useFolksLendInFlight } from '@/composables/useFolksLendInFlight'

describe('useFolksLendInFlight', () => {
  it('is shared by every caller and locked while any conversion is in flight', () => {
    const a = useFolksLendInFlight()
    const b = useFolksLendInFlight()
    expect(a.waiting.value).toBe(false)

    const endA = a.begin()
    expect(b.waiting.value).toBe(true)
    const endB = b.begin()

    // The first one to finish does not unlock the form of the other.
    endA()
    expect(a.waiting.value).toBe(true)
    endB()
    expect(a.waiting.value).toBe(false)
  })

  it('releases once, however often the release is called', () => {
    const { waiting, begin } = useFolksLendInFlight()
    const endFirst = begin()
    const endSecond = begin()
    endFirst()
    endFirst()
    endFirst()
    expect(waiting.value).toBe(true)
    endSecond()
    expect(waiting.value).toBe(false)
  })
})
