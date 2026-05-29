import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildTestCaseEntry, importTestCases } from './testCaseStore'

// Dummy FileReader implementation for testing in Node
class DummyFileReader {
  constructor() {
    this.onload = null
    this.onerror = null
  }

  readAsText(file) {
    setTimeout(() => {
      try {
        if (file.shouldFail) {
          if (this.onerror) {
            this.onerror(new Error('Failed to read file'))
          }
        } else {
          if (this.onload) {
            this.onload({
              target: {
                result: JSON.stringify(file.data),
              },
            })
          }
        }
      } catch (err) {
        if (this.onerror) {
          this.onerror(err)
        }
      }
    }, 0)
  }
}

describe('TestCaseStore Persistence & Identity Preservation', () => {
  const originalIndexedDB = globalThis.indexedDB
  const originalFileReader = globalThis.FileReader

  let mockStore
  let mockTx
  let mockDb

  beforeEach(() => {
    mockStore = {
      put: vi.fn(),
      add: vi.fn(),
      delete: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(),
    }

    mockTx = {
      objectStore: vi.fn().mockReturnValue(mockStore),
      oncomplete: null,
      onerror: null,
    }

    mockDb = {
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(true),
      },
      transaction: vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockTx.oncomplete) mockTx.oncomplete()
        }, 0)
        return mockTx
      }),
    }

    const mockReq = {
      onsuccess: null,
      onerror: null,
      result: mockDb,
    }

    globalThis.indexedDB = {
      open: vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (mockReq.onsuccess) {
            mockReq.onsuccess({ target: { result: mockDb } })
          }
        }, 0)
        return mockReq
      }),
    }

    globalThis.FileReader = DummyFileReader
  })

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB
    globalThis.FileReader = originalFileReader
    vi.restoreAllMocks()
  })

  describe('buildTestCaseEntry', () => {
    it('should preserve the original ID if provided', () => {
      const existingId = 'tc_123456789_abcdef'
      const entry = buildTestCaseEntry({
        id: existingId,
        name: 'Binary Search Test',
        algorithm: 'Binary Search',
        input: '1 2 3 4 5\n3',
        description: 'Standard search',
        pinned: true,
      })

      expect(entry.id).toBe(existingId)
      expect(entry.name).toBe('Binary Search Test')
      expect(entry.algorithm).toBe('Binary Search')
      expect(entry.pinned).toBe(true)
    })

    it('should generate a new random ID if none is provided', () => {
      const entry = buildTestCaseEntry({
        name: 'Merge Sort Test',
        algorithm: 'Merge Sort',
        input: '5 4 3 2 1',
      })

      expect(entry.id).toBeDefined()
      expect(entry.id.startsWith('tc_')).toBe(true)
      expect(entry.name).toBe('Merge Sort Test')
      expect(entry.algorithm).toBe('Merge Sort')
      expect(entry.pinned).toBe(false)
    })

    it('should fall back to generating a new ID for malformed or empty IDs', () => {
      const entry = buildTestCaseEntry({
        id: '',
        name: 'Quick Sort Test',
        algorithm: 'Quick Sort',
        input: '1 3 2',
      })

      expect(entry.id).toBeDefined()
      expect(entry.id.startsWith('tc_')).toBe(true)
      expect(entry.id).not.toBe('')
    })
  })

  describe('importTestCases', () => {
    it('should preserve IndexedDB identity and use put() to allow overwriting', async () => {
      const importData = [
        {
          id: 'tc_existing_1',
          name: 'Bubble Sort Test 1',
          algorithm: 'Bubble Sort',
          input: '3 2 1',
          description: 'Reversed array',
          pinned: false,
          createdAt: '2026-05-28T12:00:00.000Z',
          usedAt: '2026-05-28T12:05:00.000Z',
        },
        {
          id: 'tc_existing_2',
          name: 'Bubble Sort Test 2',
          algorithm: 'Bubble Sort',
          input: '1 2 3',
          description: 'Sorted array',
          pinned: true,
          createdAt: '2026-05-28T12:10:00.000Z',
          usedAt: '2026-05-28T12:15:00.000Z',
        },
      ]

      const file = { data: importData, shouldFail: false }
      const count = await importTestCases(file)

      expect(count).toBe(2)
      expect(mockStore.put).toHaveBeenCalledTimes(2)

      // Verify that put was called with identical IDs to preserve identity
      const firstCallArg = mockStore.put.mock.calls[0][0]
      const secondCallArg = mockStore.put.mock.calls[1][0]

      expect(firstCallArg.id).toBe('tc_existing_1')
      expect(firstCallArg.name).toBe('Bubble Sort Test 1')
      expect(firstCallArg.createdAt).toBe('2026-05-28T12:00:00.000Z')

      expect(secondCallArg.id).toBe('tc_existing_2')
      expect(secondCallArg.name).toBe('Bubble Sort Test 2')
      expect(secondCallArg.pinned).toBe(true)
    })

    it('should fall back to generating IDs for imported entries that have no ID', async () => {
      const importData = [
        {
          name: 'No ID Test',
          algorithm: 'Linear Search',
          input: '1 2 3',
        },
      ]

      const file = { data: importData, shouldFail: false }
      const count = await importTestCases(file)

      expect(count).toBe(1)
      expect(mockStore.put).toHaveBeenCalledTimes(1)

      const callArg = mockStore.put.mock.calls[0][0]
      expect(callArg.id).toBeDefined()
      expect(callArg.id.startsWith('tc_')).toBe(true)
      expect(callArg.name).toBe('No ID Test')
    })
  })
})
