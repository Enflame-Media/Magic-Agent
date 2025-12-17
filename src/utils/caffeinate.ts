/**
 * Caffeinate utility for preventing macOS from sleeping
 * Uses the built-in macOS caffeinate command to keep the system awake
 */

import { spawn, ChildProcess } from 'child_process'
import { logger } from '@/ui/logger'
import { configuration } from '@/configuration'

let caffeinateProcess: ChildProcess | null = null

/**
 * Start caffeinate to prevent system sleep
 * Only works on macOS, silently does nothing on other platforms
 * 
 * @returns true if caffeinate was started, false otherwise
 */
export function startCaffeinate(): boolean {
    // Check if caffeinate is disabled via configuration
    if (configuration.disableCaffeinate) {
        logger.debug('[caffeinate] Caffeinate disabled via HAPPY_DISABLE_CAFFEINATE environment variable')
        return false
    }

    // Only run on macOS
    if (process.platform !== 'darwin') {
        logger.debug('[caffeinate] Not on macOS, skipping caffeinate')
        return false
    }

    // Don't start if already running
    if (caffeinateProcess && !caffeinateProcess.killed) {
        logger.debug('[caffeinate] Caffeinate already running')
        return true
    }

    try {
        // Spawn caffeinate with flags:
        // -i: Prevent system from idle sleeping  
        // -m: Prevent disk from sleeping
        caffeinateProcess = spawn('caffeinate', ['-im'], {
            stdio: 'ignore',
            detached: false
        })

        caffeinateProcess.on('error', (error) => {
            logger.debug('[caffeinate] Error starting caffeinate:', error)
            caffeinateProcess = null
        })

        caffeinateProcess.on('exit', (code, signal) => {
            logger.debug(`[caffeinate] Process exited with code ${code}, signal ${signal}`)
            caffeinateProcess = null
        })

        logger.debug(`[caffeinate] Started with PID ${caffeinateProcess.pid}`)
        
        // Set up cleanup handlers
        setupCleanupHandlers()
        
        return true
    } catch (error) {
        logger.debug('[caffeinate] Failed to start caffeinate:', error)
        return false
    }
}

let isStopping = false

/**
 * Stop the caffeinate process
 */
export async function stopCaffeinate(): Promise<void> {
    // Prevent re-entrant calls during cleanup
    if (isStopping) {
        logger.debug('[caffeinate] Already stopping, skipping')
        return
    }
    
    if (caffeinateProcess && !caffeinateProcess.killed) {
        isStopping = true
        logger.debug(`[caffeinate] Stopping caffeinate process PID ${caffeinateProcess.pid}`)
        
        try {
            caffeinateProcess.kill('SIGTERM')
            
            // Give it a moment to terminate gracefully
            await new Promise(resolve => setTimeout(resolve, 1000))

            if (caffeinateProcess && !caffeinateProcess.killed) {
                logger.debug('[caffeinate] Force killing caffeinate process')
                caffeinateProcess.kill('SIGKILL')
            }
            caffeinateProcess = null
            isStopping = false
        } catch (error) {
            logger.debug('[caffeinate] Error stopping caffeinate:', error)
            isStopping = false
        }
    }
}


/**
 * Get the PID of the running caffeinate process.
 * Used to persist the PID to daemon state for crash recovery.
 */
export function getCaffeinatePid(): number | undefined {
    return caffeinateProcess?.pid
}

/**
 * Synchronously kill the caffeinate process.
 * This is used for exit handlers where async operations are not allowed.
 */
function killCaffeinateSync(): void {
    if (caffeinateProcess && !caffeinateProcess.killed) {
        try {
            caffeinateProcess.kill('SIGTERM')
            caffeinateProcess = null
        } catch {
            // Ignore errors during cleanup - process may already be dead
        }
    }
}

/**
 * Set up cleanup handlers to ensure caffeinate is stopped on exit
 */
let cleanupHandlersSet = false

function setupCleanupHandlers(): void {
    if (cleanupHandlersSet) {
        return
    }

    cleanupHandlersSet = true

    // Synchronous cleanup for exit event (async not allowed in 'exit' handler)
    process.on('exit', killCaffeinateSync)

    // Signal handlers - use once() to avoid handler accumulation
    // These need to exit the process after cleanup
    process.once('SIGINT', () => {
        logger.debug('[caffeinate] SIGINT received, cleaning up')
        killCaffeinateSync()
        process.exit(130) // Standard exit code for SIGINT
    })

    process.once('SIGTERM', () => {
        logger.debug('[caffeinate] SIGTERM received, cleaning up')
        killCaffeinateSync()
        process.exit(143) // Standard exit code for SIGTERM
    })

    process.once('SIGUSR1', () => {
        logger.debug('[caffeinate] SIGUSR1 received, cleaning up')
        killCaffeinateSync()
    })

    process.once('SIGUSR2', () => {
        logger.debug('[caffeinate] SIGUSR2 received, cleaning up')
        killCaffeinateSync()
    })

    // Exception handlers - cleanup but let the error propagate
    process.on('uncaughtException', (error) => {
        logger.debug('[caffeinate] Uncaught exception, cleaning up:', error)
        killCaffeinateSync()
        // Don't swallow the exception - let Node's default handler deal with it
    })

    process.on('unhandledRejection', (reason) => {
        logger.debug('[caffeinate] Unhandled rejection, cleaning up:', reason)
        killCaffeinateSync()
        // Don't swallow the rejection - let Node's default handler deal with it
    })
}