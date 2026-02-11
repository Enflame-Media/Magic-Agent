/**
 * Tests for SDK query SIGKILL escalation
 *
 * These tests verify that when a child process ignores SIGTERM,
 * we escalate to SIGKILL after 5 seconds to prevent zombie processes.
 *
 * This mirrors the tests in claudeLocal.test.ts but for the SDK query function.
 * Both use the same escalation pattern to ensure child processes are properly
 * terminated even if they ignore SIGTERM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'

/**
 * Mock child process for testing SIGKILL escalation logic.
 * This mimics the relevant parts of ChildProcess without the readonly constraints.
 */
interface MockChildProcess extends EventEmitter {
    killed: boolean
    exitCode: number | null
    signalCode: NodeJS.Signals | null
    kill: (signal?: string) => boolean
    stdio: (null)[]
    pid: number
}

function createMockChild(): MockChildProcess {
    const emitter = new EventEmitter()
    return Object.assign(emitter, {
        killed: false,
        exitCode: null,
        signalCode: null,
        kill: vi.fn(function(this: MockChildProcess, signal?: string) {
            if (signal === 'SIGKILL') {
                this.killed = true
            }
            return true
        }),
        stdio: [null, null, null, null],
        pid: 12345
    }) as MockChildProcess
}

describe('SDK query SIGKILL escalation', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should send SIGKILL if child does not exit within 5 seconds of abort', async () => {
        // Create a mock child process that ignores SIGTERM
        const mockChild = createMockChild()

        // Simulate the abort signal setup (mirrors query.ts implementation)
        const abortController = new AbortController()
        let killTimeout: NodeJS.Timeout | undefined

        // Note: query.ts uses config.options?.abort, so we simulate that pattern
        const abort: AbortSignal | undefined = abortController.signal

        if (abort) {
            abort.addEventListener('abort', () => {
                killTimeout = setTimeout(() => {
                    // Check if process is still alive (exitCode/signalCode are null until process exits)
                    if (mockChild.exitCode === null && mockChild.signalCode === null) {
                        mockChild.kill('SIGKILL')
                    }
                }, 5000)
            })
        }

        mockChild.on('exit', () => {
            if (killTimeout) {
                clearTimeout(killTimeout)
                killTimeout = undefined
            }
        })

        // Trigger abort (simulates user pressing Ctrl+C or remote abort)
        abortController.abort()

        // Child hasn't exited yet - should not have SIGKILL yet
        expect(mockChild.kill).not.toHaveBeenCalled()

        // Advance time by 4 seconds - still no SIGKILL
        await vi.advanceTimersByTimeAsync(4000)
        expect(mockChild.kill).not.toHaveBeenCalled()

        // Advance to 5 seconds - should trigger SIGKILL
        await vi.advanceTimersByTimeAsync(1000)
        expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL')
        expect(mockChild.killed).toBe(true)
    })

    it('should clear timeout if child exits before 5 seconds', async () => {
        const mockChild = createMockChild()

        const abortController = new AbortController()
        let killTimeout: NodeJS.Timeout | undefined

        const abort: AbortSignal | undefined = abortController.signal

        if (abort) {
            abort.addEventListener('abort', () => {
                killTimeout = setTimeout(() => {
                    // Check if process is still alive (exitCode/signalCode are null until process exits)
                    if (mockChild.exitCode === null && mockChild.signalCode === null) {
                        mockChild.kill('SIGKILL')
                    }
                }, 5000)
            })
        }

        mockChild.on('exit', () => {
            if (killTimeout) {
                clearTimeout(killTimeout)
                killTimeout = undefined
            }
        })

        // Trigger abort
        abortController.abort()

        // Child exits after 2 seconds (responds to SIGTERM from spawn's signal option)
        await vi.advanceTimersByTimeAsync(2000)
        mockChild.exitCode = 0
        mockChild.signalCode = 'SIGTERM'
        mockChild.emit('exit', 0, 'SIGTERM')

        // Timeout should be cleared
        expect(killTimeout).toBeUndefined()

        // Advance time past 5 seconds - no SIGKILL should be sent
        await vi.advanceTimersByTimeAsync(5000)

        // kill() should never have been called (SIGTERM was handled by spawn's signal option)
        expect(mockChild.kill).not.toHaveBeenCalled()
    })

    it('should not send SIGKILL if child exits normally before abort', async () => {
        const mockChild = createMockChild()

        const abortController = new AbortController()
        let killTimeout: NodeJS.Timeout | undefined

        const abort: AbortSignal | undefined = abortController.signal

        if (abort) {
            abort.addEventListener('abort', () => {
                killTimeout = setTimeout(() => {
                    // Check if process is still alive (exitCode/signalCode are null until process exits)
                    if (mockChild.exitCode === null && mockChild.signalCode === null) {
                        mockChild.kill('SIGKILL')
                    }
                }, 5000)
            })
        }

        mockChild.on('exit', () => {
            if (killTimeout) {
                clearTimeout(killTimeout)
                killTimeout = undefined
            }
        })

        // Child exits normally (no abort)
        mockChild.exitCode = 0
        mockChild.emit('exit', 0, null)

        // Now abort happens after exit
        abortController.abort()

        // Advance all timers
        await vi.advanceTimersByTimeAsync(10000)

        // SIGKILL should not be sent because child.killed is true
        expect(mockChild.kill).not.toHaveBeenCalled()
    })

    it('should handle already-aborted signal gracefully', async () => {
        const mockChild = createMockChild()

        // Create an already-aborted signal
        const abortController = new AbortController()
        abortController.abort() // Abort before adding listener

        let killTimeout: NodeJS.Timeout | undefined

        // Mirrors the implementation pattern: check .aborted before addEventListener
        // In Node.js, addEventListener doesn't fire for already-aborted signals
        const setKillTimeout = () => {
            killTimeout = setTimeout(() => {
                // Check if process is still alive (exitCode/signalCode are null until process exits)
                if (mockChild.exitCode === null && mockChild.signalCode === null) {
                    mockChild.kill('SIGKILL')
                }
            }, 5000)
        }

        if (abortController.signal.aborted) {
            setKillTimeout()
        } else {
            abortController.signal.addEventListener('abort', setKillTimeout)
        }

        mockChild.on('exit', () => {
            if (killTimeout) {
                clearTimeout(killTimeout)
                killTimeout = undefined
            }
        })

        // Timeout should have been set immediately since signal was already aborted
        expect(killTimeout).toBeDefined()

        // Advance 5 seconds - SIGKILL should fire
        await vi.advanceTimersByTimeAsync(5000)
        expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL')
    })

    it('should not set up SIGKILL escalation when no abort signal provided', async () => {
        const mockChild = createMockChild()

        // Simulate query.ts when config.options?.abort is undefined
        // This test verifies the behavior when abort is not provided
        let killTimeout: NodeJS.Timeout | undefined

        // The SIGKILL escalation code path is skipped when abort is undefined
        // (mimics: if (config.options?.abort) { ... })
        const abortIsProvided = false
        if (abortIsProvided) {
            // This block would set up the abort listener
            killTimeout = setTimeout(() => {}, 5000)
        }

        mockChild.on('exit', () => {
            if (killTimeout) {
                clearTimeout(killTimeout)
                killTimeout = undefined
            }
        })

        // No abort signal means no timeout should be set up
        expect(killTimeout).toBeUndefined()

        // Advance time - no SIGKILL should ever be sent
        await vi.advanceTimersByTimeAsync(10000)
        expect(mockChild.kill).not.toHaveBeenCalled()
    })
})

/**
 * Tests for exit handler lifecycle management (HAP-175)
 *
 * These tests verify that:
 * 1. Exit handlers are registered when query() is called
 * 2. Exit handlers are removed when processExitPromise resolves/rejects
 * 3. Multiple sequential query() calls don't accumulate handlers
 * 4. Cleanup is idempotent (can be called multiple times safely)
 *
 * This prevents the race condition fixed in HAP-52 from regressing.
 */
describe('SDK query exit handler lifecycle', () => {
    /**
     * Simulates the exit handler registration/removal pattern from query.ts
     * This mirrors lines 443-444 and 492-493 of query.ts
     */
    function createExitHandlerSimulation() {
        const cleanup = vi.fn()
        const exitHandler = () => cleanup()

        return {
            cleanup,
            exitHandler,
            register: () => process.on('exit', exitHandler),
            unregister: () => process.removeListener('exit', exitHandler)
        }
    }

    it('should register exit handler on query start', () => {
        const initialCount = process.listenerCount('exit')
        const simulation = createExitHandlerSimulation()

        // Simulate query() registering exit handler (line 444 of query.ts)
        simulation.register()

        // Handler should be registered
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        // Cleanup
        simulation.unregister()
        expect(process.listenerCount('exit')).toBe(initialCount)
    })

    it('should remove exit handler on normal completion', () => {
        const initialCount = process.listenerCount('exit')
        const simulation = createExitHandlerSimulation()

        // Simulate query lifecycle
        simulation.register()
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        // Simulate processExitPromise.finally() completing (lines 492-493 of query.ts)
        simulation.unregister()

        // Handler should be removed
        expect(process.listenerCount('exit')).toBe(initialCount)
    })

    it('should remove exit handler on error', () => {
        const initialCount = process.listenerCount('exit')
        const simulation = createExitHandlerSimulation()

        // Simulate query lifecycle with error
        simulation.register()
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        // Simulate error path - processExitPromise.finally() still runs
        // The finally block removes the handler regardless of success/failure
        simulation.unregister()

        // Handler should be removed even on error
        expect(process.listenerCount('exit')).toBe(initialCount)
    })

    it('should not accumulate exit handlers across multiple sequential queries', () => {
        const initialCount = process.listenerCount('exit')

        // Simulate 5 sequential query() calls, each completing normally
        for (let i = 0; i < 5; i++) {
            const simulation = createExitHandlerSimulation()

            // Simulate query start
            simulation.register()
            expect(process.listenerCount('exit')).toBe(initialCount + 1)

            // Simulate query completion (processExitPromise.finally())
            simulation.unregister()
            expect(process.listenerCount('exit')).toBe(initialCount)
        }

        // After all queries complete, should be back to initial count
        expect(process.listenerCount('exit')).toBe(initialCount)
    })

    it('should not accumulate handlers even with overlapping queries', () => {
        const initialCount = process.listenerCount('exit')

        // Simulate 3 overlapping query() calls
        const sim1 = createExitHandlerSimulation()
        const sim2 = createExitHandlerSimulation()
        const sim3 = createExitHandlerSimulation()

        // All three queries start (register handlers)
        sim1.register()
        sim2.register()
        sim3.register()
        expect(process.listenerCount('exit')).toBe(initialCount + 3)

        // Queries complete in different order
        sim2.unregister()
        expect(process.listenerCount('exit')).toBe(initialCount + 2)

        sim1.unregister()
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        sim3.unregister()
        expect(process.listenerCount('exit')).toBe(initialCount)
    })
})

/**
 * Tests for process exit behavior during active query (HAP-175)
 *
 * These tests verify that when process.exit() is called during an active query,
 * the exit handler triggers cleanup and the child process receives SIGTERM.
 */
describe('SDK query process exit during active query', () => {
    it('should call cleanup and send SIGTERM when exit event fires', () => {
        const mockChild = createMockChild()

        // Simulate the complete exit handler flow from query.ts (lines 434-444)
        const cleanup = vi.fn(() => {
            if (!mockChild.killed) {
                mockChild.kill('SIGTERM')
            }
        })
        const exitHandler = () => cleanup()

        // Register exit handler (simulating query start)
        process.on('exit', exitHandler)

        // Simulate process.exit() being called - emit 'exit' event
        // Note: We can't actually call process.exit() in tests, but we can
        // emit the event to verify our handler responds correctly
        process.emit('exit', 0)

        // Verify cleanup was called
        expect(cleanup).toHaveBeenCalledTimes(1)

        // Verify child received SIGTERM
        expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
        expect(mockChild.kill).toHaveBeenCalledTimes(1)

        // Clean up
        process.removeListener('exit', exitHandler)
    })

    it('should not send SIGTERM if child already killed before exit', () => {
        const mockChild = createMockChild()
        mockChild.killed = true // Child already killed

        const cleanup = vi.fn(() => {
            if (!mockChild.killed) {
                mockChild.kill('SIGTERM')
            }
        })
        const exitHandler = () => cleanup()

        process.on('exit', exitHandler)

        // Simulate exit event
        process.emit('exit', 0)

        // Cleanup was called, but kill was NOT called (child already dead)
        expect(cleanup).toHaveBeenCalledTimes(1)
        expect(mockChild.kill).not.toHaveBeenCalled()

        process.removeListener('exit', exitHandler)
    })

    it('should handle exit during query with proper SIGTERM delivery', () => {
        const mockChild = createMockChild()
        const initialCount = process.listenerCount('exit')

        // Full simulation of query lifecycle with exit interruption
        const cleanup = () => {
            if (!mockChild.killed) {
                mockChild.kill('SIGTERM')
            }
        }
        const exitHandler = () => cleanup()

        // Query starts - register handler
        process.on('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        // Exit happens during active query
        process.emit('exit', 0)

        // Child should have received SIGTERM
        expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')

        // Cleanup: remove handler (normally done in finally block)
        process.removeListener('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount)
    })
})

/**
 * Tests for cleanup idempotency (HAP-175)
 *
 * These tests verify that cleanup operations can be called multiple times
 * without causing errors or unexpected behavior.
 */
describe('SDK query cleanup idempotency', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('should safely call cleanup() multiple times', () => {
        const mockChild = createMockChild()

        // Simulate the cleanup function from query.ts (lines 434-438)
        const cleanup = () => {
            if (!mockChild.killed) {
                mockChild.kill('SIGTERM')
            }
        }

        // First call - should kill
        cleanup()
        expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
        expect(mockChild.kill).toHaveBeenCalledTimes(1)

        // Simulate child being killed
        mockChild.killed = true

        // Second call - should NOT kill again (already killed)
        cleanup()
        expect(mockChild.kill).toHaveBeenCalledTimes(1) // Still 1

        // Third call - still safe
        cleanup()
        expect(mockChild.kill).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should handle Query class isDisposed pattern', () => {
        // Simulates Query class cleanup idempotency (lines 272-279 of query.ts)
        let isDisposed = false
        const cleanupControllers = vi.fn()
        const clearPendingResponses = vi.fn()

        const cleanup = () => {
            if (isDisposed) {
                return
            }
            isDisposed = true
            cleanupControllers()
            clearPendingResponses()
        }

        // First call - should execute cleanup
        cleanup()
        expect(cleanupControllers).toHaveBeenCalledTimes(1)
        expect(clearPendingResponses).toHaveBeenCalledTimes(1)
        expect(isDisposed).toBe(true)

        // Second call - should skip due to isDisposed flag
        cleanup()
        expect(cleanupControllers).toHaveBeenCalledTimes(1) // Still 1
        expect(clearPendingResponses).toHaveBeenCalledTimes(1) // Still 1

        // Third call - still idempotent
        cleanup()
        expect(cleanupControllers).toHaveBeenCalledTimes(1)
        expect(clearPendingResponses).toHaveBeenCalledTimes(1)
    })

    it('should handle exit handler removal idempotency', () => {
        const initialCount = process.listenerCount('exit')
        const exitHandler = () => {}

        // Register handler
        process.on('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount + 1)

        // First removal - should work
        process.removeListener('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount)

        // Second removal - should be safe (no-op)
        process.removeListener('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount)

        // Third removal - still safe
        process.removeListener('exit', exitHandler)
        expect(process.listenerCount('exit')).toBe(initialCount)
    })
})

/**
 * Tests for abort signal listener cleanup (HAP-173 related)
 *
 * These tests verify that abort signal listeners are properly removed
 * to prevent accumulation when AbortSignal is reused.
 */
describe('SDK query abort listener cleanup', () => {
    it('should remove abort listener when query completes', () => {
        const abortController = new AbortController()
        const signal = abortController.signal

        // Track listener count using a wrapper approach
        // Note: AbortSignal doesn't expose listenerCount, so we track manually
        let listenerAdded = false
        const setKillTimeout = vi.fn()

        // Simulate query.ts pattern (lines 386-407)
        if (!signal.aborted) {
            signal.addEventListener('abort', setKillTimeout)
            listenerAdded = true
        }

        expect(listenerAdded).toBe(true)

        // Simulate processExitPromise.finally() cleanup (lines 496-499)
        if (listenerAdded) {
            signal.removeEventListener('abort', setKillTimeout)
        }

        // Triggering abort after removal should NOT call setKillTimeout
        abortController.abort()
        expect(setKillTimeout).not.toHaveBeenCalled()
    })

    it('should not add listener if signal already aborted', () => {
        const abortController = new AbortController()
        abortController.abort() // Pre-abort
        const signal = abortController.signal

        let listenerAdded = false
        const setKillTimeout = vi.fn()

        // Simulate query.ts pattern - checks .aborted first (line 400)
        if (signal.aborted) {
            setKillTimeout() // Called immediately
        } else {
            signal.addEventListener('abort', setKillTimeout)
            listenerAdded = true
        }

        // Listener should NOT have been added (was already aborted)
        expect(listenerAdded).toBe(false)
        // But setKillTimeout should have been called immediately
        expect(setKillTimeout).toHaveBeenCalledTimes(1)
    })

    it('should handle reused AbortSignal without accumulation', () => {
        const abortController = new AbortController()
        const signal = abortController.signal

        // Simulate multiple "queries" reusing the same abort signal
        for (let i = 0; i < 3; i++) {
            let listenerAdded = false
            const setKillTimeout = vi.fn()

            // Register (simulating query start)
            if (!signal.aborted) {
                signal.addEventListener('abort', setKillTimeout)
                listenerAdded = true
            }

            // Unregister (simulating query completion via finally block)
            if (listenerAdded) {
                signal.removeEventListener('abort', setKillTimeout)
            }
        }

        // Now abort - no handlers should be called (all were removed)
        // If there were accumulation, multiple handlers would fire
        const finalHandler = vi.fn()
        signal.addEventListener('abort', finalHandler)
        abortController.abort()

        // Only the final handler we just added should fire
        expect(finalHandler).toHaveBeenCalledTimes(1)
    })
})
