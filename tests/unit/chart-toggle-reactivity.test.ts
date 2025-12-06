import { describe, it, expect } from 'vitest'
import { ref, computed, nextTick } from 'vue'

describe('Chart Toggle Reactivity', () => {
  describe('Array Mutation Patterns - Core Reactivity Tests', () => {
    it('filter() creates new array reference (good for reactivity)', () => {
      const original = ['a', 'b', 'c']
      const filtered = original.filter(item => item !== 'b')
      
      expect(filtered).not.toBe(original)
      expect(filtered).toEqual(['a', 'c'])
    })

    it('spread operator creates new array reference (good for reactivity)', () => {
      const original = ['a', 'b']
      const withAdded = [...original, 'c']
      
      expect(withAdded).not.toBe(original)
      expect(withAdded).toEqual(['a', 'b', 'c'])
    })

    it('splice() mutates original array (can cause reactivity issues)', () => {
      const original = ['a', 'b', 'c']
      const copy = [...original]
      copy.splice(1, 1) // Remove 'b'
      
      // Copy is mutated but it's a different reference, so this is OK
      expect(copy).not.toBe(original)
      expect(copy).toEqual(['a', 'c'])
      
      // However, if we mutate the original ref directly, Vue might not detect it
      const refValue = ref(['a', 'b', 'c'])
      const oldRef = refValue.value
      refValue.value.splice(1, 1) // BAD: Mutates array in place
      
      // Same reference - this is the problem!
      expect(refValue.value).toBe(oldRef)
    })

    it('push() mutates original array (can cause reactivity issues)', () => {
      const refValue = ref(['a', 'b'])
      const oldRef = refValue.value
      refValue.value.push('c') // BAD: Mutates array in place
      
      // Same reference - Vue computed properties might not trigger
      expect(refValue.value).toBe(oldRef)
      
      // CORRECT approach: Create new array
      refValue.value = [...refValue.value, 'd']
      expect(refValue.value).not.toBe(oldRef)
    })
  })

  describe('Vue Reactivity with Computed and Arrays', () => {
    it('computed property should update when ref array is replaced', async () => {
      const selectedItems = ref(['a', 'b', 'c'])
      const itemCount = computed(() => selectedItems.value.length)
      
      expect(itemCount.value).toBe(3)
      
      // Replace with new array (good)
      selectedItems.value = selectedItems.value.filter(item => item !== 'b')
      await nextTick()
      
      expect(itemCount.value).toBe(2)
      expect(selectedItems.value).toEqual(['a', 'c'])
    })

    it('computed property should update when using spread to add items', async () => {
      const selectedItems = ref(['a', 'b'])
      const itemCount = computed(() => selectedItems.value.length)
      
      expect(itemCount.value).toBe(2)
      
      // Add item with spread (good)
      selectedItems.value = [...selectedItems.value, 'c']
      await nextTick()
      
      expect(itemCount.value).toBe(3)
      expect(selectedItems.value).toContain('c')
    })

    it('computed series should update when selected items change', async () => {
      type RatioKey = 'pe' | 'ps' | 'roic'
      const selectedRatios = ref<RatioKey[]>(['pe', 'ps'])
      
      const series = computed(() => {
        return selectedRatios.value.map(key => ({
          name: key.toUpperCase(),
          data: [1, 2, 3]
        }))
      })
      
      expect(series.value).toHaveLength(2)
      expect(series.value[0]?.name).toBe('PE')
      
      // Add ratio
      selectedRatios.value = [...selectedRatios.value, 'roic']
      await nextTick()
      
      expect(series.value).toHaveLength(3)
      expect(series.value[2]?.name).toBe('ROIC')
      
      // Remove ratio
      selectedRatios.value = selectedRatios.value.filter(key => key !== 'ps')
      await nextTick()
      
      expect(series.value).toHaveLength(2)
      expect(series.value.find(s => s.name === 'PS')).toBeUndefined()
    })
  })

  describe('Toggle Function Patterns', () => {
    it('toggle function should create new array references', async () => {
      const selected = ref(['dividends', 'buybacks'])
      
      function toggleSegment(segment: string) {
        const idx = selected.value.indexOf(segment)
        if (idx >= 0) {
          // Remove - create new array with filter
          if (selected.value.length > 1) {
            selected.value = selected.value.filter(seg => seg !== segment)
          }
        } else {
          // Add - create new array with spread
          selected.value = [...selected.value, segment]
        }
      }
      
      const before = selected.value
      toggleSegment('buybacks') // Remove
      await nextTick()
      
      expect(selected.value).not.toBe(before)
      expect(selected.value).toEqual(['dividends'])
      
      const after = selected.value
      toggleSegment('buybacks') // Add back
      await nextTick()
      
      expect(selected.value).not.toBe(after)
      expect(selected.value).toEqual(['dividends', 'buybacks'])
    })

    it('series length changes should trigger key-based re-rendering', async () => {
      const selected = ref(['pe', 'ps', 'roic'])
      const series = computed(() => selected.value.map(key => ({ name: key, data: [] })))
      
      const initialLength = series.value.length
      expect(initialLength).toBe(3)
      
      // Add item
      selected.value = [...selected.value, 'grossMargin']
      await nextTick()
      expect(series.value.length).toBe(4)
      expect(series.value.length).not.toBe(initialLength)
      
      // Remove item
      selected.value = selected.value.filter(key => key !== 'pe')
      await nextTick()
      expect(series.value.length).toBe(3)
      expect(series.value.length).toBe(initialLength) // Back to original
    })
  })

  describe('Array Mutation Patterns', () => {
    it('filter() creates new array reference (good for reactivity)', () => {
      const original = ['a', 'b', 'c']
      const filtered = original.filter(item => item !== 'b')
      
      expect(filtered).not.toBe(original)
      expect(filtered).toEqual(['a', 'c'])
    })

    it('spread operator creates new array reference (good for reactivity)', () => {
      const original = ['a', 'b']
      const withAdded = [...original, 'c']
      
      expect(withAdded).not.toBe(original)
      expect(withAdded).toEqual(['a', 'b', 'c'])
    })

    it('splice() mutates original array (can cause reactivity issues)', () => {
      const original = ['a', 'b', 'c']
      const copy = [...original]
      copy.splice(1, 1) // Remove 'b'
      
      // Copy is mutated but it's a different reference, so this is OK
      expect(copy).not.toBe(original)
      expect(copy).toEqual(['a', 'c'])
      
      // However, if we mutate the original ref directly, Vue might not detect it
      const refValue = ref(['a', 'b', 'c'])
      const oldRef = refValue.value
      refValue.value.splice(1, 1) // BAD: Mutates array in place
      
      // Same reference - this is the problem!
      expect(refValue.value).toBe(oldRef)
    })

    it('push() mutates original array (can cause reactivity issues)', () => {
      const refValue = ref(['a', 'b'])
      const oldRef = refValue.value
      refValue.value.push('c') // BAD: Mutates array in place
      
      // Same reference - Vue computed properties might not trigger
      expect(refValue.value).toBe(oldRef)
      
      // CORRECT approach: Create new array
      refValue.value = [...refValue.value, 'd']
      expect(refValue.value).not.toBe(oldRef)
    })
  })

})
