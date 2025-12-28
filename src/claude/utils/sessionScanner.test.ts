import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSessionScanner } from './sessionScanner'
import { RawJSONLines } from '../types'
import { mkdir, writeFile, appendFile, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { existsSync } from 'node:fs'

/**
 * Polling helper to replace fixed timeouts.
 * Waits for a condition to become true with configurable timeout and polling interval.
 * This eliminates flakiness from race conditions with file system events and debouncing.
 *
 * @see HAP-609: Fix flaky sessionScanner.test.ts timing issues
 */
async function waitFor(
    condition: () => boolean,
    opts: { timeout: number; interval: number } = { timeout: 2000, interval: 20 }
): Promise<void> {
    const start = Date.now()
    while (!condition()) {
        if (Date.now() - start > opts.timeout) {
            throw new Error(`waitFor timeout after ${opts.timeout}ms`)
        }
        await new Promise(r => setTimeout(r, opts.interval))
    }
}

describe('sessionScanner', () => {
  let testDir: string
  let projectDir: string
  let collectedMessages: RawJSONLines[]
  let scanner: Awaited<ReturnType<typeof createSessionScanner>> | null = null
  
  beforeEach(async () => {
    testDir = join(tmpdir(), `scanner-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
    
    const projectName = testDir.replace(/\//g, '-')
    projectDir = join(homedir(), '.claude', 'projects', projectName)
    await mkdir(projectDir, { recursive: true })
    
    collectedMessages = []
  })
  
  afterEach(async () => {
    // Clean up scanner
    if (scanner) {
      await scanner.cleanup()
      scanner = null
    }
    
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true })
    }
    if (existsSync(projectDir)) {
      await rm(projectDir, { recursive: true, force: true })
    }
  })
  
  it('should process initial session and resumed session correctly', async () => {
    // TEST SCENARIO:
    // Phase 1: User says "lol" → Assistant responds "lol" → Session closes
    // Phase 2: User resumes with NEW session ID → User says "run ls tool" → Assistant runs LS tool → Shows files
    //
    // Key point: When resuming, Claude creates a NEW session file with:
    // - Summary line
    // - Complete history from previous session (with NEW session ID)
    // - New messages
    //
    // FIX HAP-609: Use reduced debounce (10ms vs default 100ms) and polling-based waits
    // to eliminate flakiness from timing races with file system events.
    scanner = await createSessionScanner({
      sessionId: null,
      workingDirectory: testDir,
      onMessage: (msg) => collectedMessages.push(msg),
      watcherOptions: { debounceMs: 10 }
    })

    // PHASE 1: Initial session (0-say-lol-session.jsonl)
    const fixture1 = await readFile(join(__dirname, '__fixtures__', '0-say-lol-session.jsonl'), 'utf-8')
    const lines1 = fixture1.split('\n').filter(line => line.trim())

    const sessionId1 = '93a9705e-bc6a-406d-8dce-8acc014dedbd'
    const sessionFile1 = join(projectDir, `${sessionId1}.jsonl`)

    // Write first line
    await writeFile(sessionFile1, lines1[0] + '\n')
    scanner.onNewSession(sessionId1)
    // FIX HAP-609: Use polling instead of fixed timeout to handle variable timing
    await waitFor(() => collectedMessages.length >= 1)

    expect(collectedMessages).toHaveLength(1)
    const msg0 = collectedMessages[0];
    expect(msg0.type).toBe('user')
    // Type assertion safe here because we just checked the type
    const content0 = (msg0 as any).message.content
    const text0 = typeof content0 === 'string' ? content0 : content0[0].text
    expect(text0).toBe('say lol')
    
    // Write second line
    await appendFile(sessionFile1, lines1[1] + '\n')
    // FIX HAP-609: Use polling instead of fixed timeout
    await waitFor(() => collectedMessages.length >= 2)

    expect(collectedMessages).toHaveLength(2)
    const msg1 = collectedMessages[1];
    expect(msg1.type).toBe('assistant')
    // Type assertion safe here because we just checked the type
    expect(((msg1 as any).message.content as any)[0].text).toBe('lol')
    
    // PHASE 2: Resumed session (1-continue-run-ls-tool.jsonl)
    const fixture2 = await readFile(join(__dirname, '__fixtures__', '1-continue-run-ls-tool.jsonl'), 'utf-8')
    const lines2 = fixture2.split('\n').filter(line => line.trim())
    
    const sessionId2 = '789e105f-ae33-486d-9271-0696266f072d'
    const sessionFile2 = join(projectDir, `${sessionId2}.jsonl`)
    
    // Reset collected messages count for clarity
    const phase1Count = collectedMessages.length
    
    // Write summary + historical messages (lines 0-2) - NOT line 3 which is new
    let initialContent = ''
    for (let i = 0; i <= 2; i++) {
      initialContent += lines2[i] + '\n'
    }
    await writeFile(sessionFile2, initialContent)

    scanner.onNewSession(sessionId2)
    // FIX HAP-609: Use polling instead of fixed timeout
    await waitFor(() => collectedMessages.length >= phase1Count + 1)

    // Should have added only 1 new message (summary)
    // The historical user + assistant messages (lines 1-2) are deduplicated because they have same UUIDs
    expect(collectedMessages).toHaveLength(phase1Count + 1)
    expect(collectedMessages[phase1Count].type).toBe('summary')
    
    // Write new messages (user asks for ls tool) - this is line 3
    const countBeforeUserMsg = collectedMessages.length
    await appendFile(sessionFile2, lines2[3] + '\n')
    // FIX HAP-609: Use polling instead of fixed timeout
    await waitFor(() => collectedMessages.length > countBeforeUserMsg)

    // Find the user message we just added
    const userMessages = collectedMessages.filter(m => m.type === 'user')
    const lastUserMsg = userMessages[userMessages.length - 1]
    expect(lastUserMsg).toBeDefined()
    expect(lastUserMsg.type).toBe('user')
    // Type assertion safe here because we just checked type and defined
    expect((lastUserMsg as any).message.content).toBe('run ls tool ')
    
    // Write remaining lines (assistant tool use, tool result, final assistant message) - starting from line 4
    // We expect 5 messages total for session 2: 1 summary + 4 new messages (user + tool_use + tool_result + assistant)
    for (let i = 4; i < lines2.length; i++) {
      await appendFile(sessionFile2, lines2[i] + '\n')
    }
    // FIX HAP-609: Use polling to wait for all remaining messages to be processed
    await waitFor(() => collectedMessages.slice(phase1Count).length >= 5)

    // Final count check
    const finalMessages = collectedMessages.slice(phase1Count)

    // Should have: 1 summary + 0 history (deduplicated) + 4 new messages = 5 total for session 2
    expect(finalMessages.length).toBeGreaterThanOrEqual(5)
    
    // Verify last message is assistant with the file listing
    const lastAssistantMsg = collectedMessages[collectedMessages.length - 1]
    expect(lastAssistantMsg.type).toBe('assistant')
    // Type assertion safe here because we just checked the type
    const lastContent = ((lastAssistantMsg as any).message.content as any)[0].text
    expect(lastContent).toContain('0-say-lol-session.jsonl')
    expect(lastContent).toContain('readme.md')
  })
  
  it.todo('should not process duplicate assistant messages with same message ID');
})