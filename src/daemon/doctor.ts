/**
 * Daemon doctor utilities
 * 
 * Process discovery and cleanup functions for the daemon
 * Helps diagnose and fix issues with hung or orphaned processes
 */

import psList from 'ps-list';
import spawn from 'cross-spawn';
import { AppError, ErrorCodes } from '@/utils/errors';

/**
 * Find all Happy CLI processes (including current process)
 */
export async function findAllHappyProcesses(): Promise<Array<{ pid: number, command: string, type: string }>> {
  try {
    const processes = await psList();
    const allProcesses: Array<{ pid: number, command: string, type: string }> = [];

    for (const proc of processes) {
      const cmd = proc.cmd || '';
      const name = proc.name || '';

      // Check if it's a Happy process
      const isHappy = name.includes('happy') ||
                      name === 'node' && (cmd.includes('happy-cli') || cmd.includes('dist/index.mjs')) ||
                      cmd.includes('happy.mjs') ||
                      cmd.includes('happy-coder') ||
                      (cmd.includes('tsx') && cmd.includes('src/index.ts') && cmd.includes('happy-cli'));

      if (!isHappy) continue;

      // Classify process type
      let type = 'unknown';
      if (proc.pid === process.pid) {
        type = 'current';
      } else if (cmd.includes('--version')) {
        type = cmd.includes('tsx') ? 'dev-daemon-version-check' : 'daemon-version-check';
      } else if (cmd.includes('daemon start-sync') || cmd.includes('daemon start')) {
        type = cmd.includes('tsx') ? 'dev-daemon' : 'daemon';
      } else if (cmd.includes('--started-by daemon')) {
        type = cmd.includes('tsx') ? 'dev-daemon-spawned' : 'daemon-spawned-session';
      } else if (cmd.includes('doctor')) {
        type = cmd.includes('tsx') ? 'dev-doctor' : 'doctor';
      } else if (cmd.includes('--yolo')) {
        type = 'dev-session';
      } else {
        type = cmd.includes('tsx') ? 'dev-related' : 'user-session';
      }

      allProcesses.push({ pid: proc.pid, command: cmd || name, type });
    }

    return allProcesses;
  } catch {
    return [];
  }
}

/**
 * Find all runaway Happy CLI processes that should be killed
 */
export async function findRunawayHappyProcesses(): Promise<Array<{ pid: number, command: string }>> {
  const allProcesses = await findAllHappyProcesses();
  
  // Filter to just runaway processes (excluding current process)
  return allProcesses
    .filter(p => 
      p.pid !== process.pid && (
        p.type === 'daemon' ||
        p.type === 'dev-daemon' ||
        p.type === 'daemon-spawned-session' ||
        p.type === 'dev-daemon-spawned' ||
        p.type === 'daemon-version-check' ||
        p.type === 'dev-daemon-version-check'
      )
    )
    .map(p => ({ pid: p.pid, command: p.command }));
}

/**
 * Kill all runaway Happy CLI processes
 */
export async function killRunawayHappyProcesses(): Promise<{ killed: number, errors: Array<{ pid: number, error: string }> }> {
  const runawayProcesses = await findRunawayHappyProcesses();
  const errors: Array<{ pid: number, error: string }> = [];
  let killed = 0;
  
  for (const { pid, command } of runawayProcesses) {
    try {
      console.log(`Killing runaway process PID ${pid}: ${command}`);
      
      if (process.platform === 'win32') {
        // Windows: use taskkill
        const result = spawn.sync('taskkill', ['/F', '/PID', pid.toString()], { stdio: 'pipe' });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new AppError(ErrorCodes.OPERATION_FAILED, `taskkill exited with code ${result.status}`);
      } else {
        // Unix: try SIGTERM first
        process.kill(pid, 'SIGTERM');
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if still alive
        const processes = await psList();
        const stillAlive = processes.find(p => p.pid === pid);
        if (stillAlive) {
          console.log(`Process PID ${pid} ignored SIGTERM, using SIGKILL`);
          process.kill(pid, 'SIGKILL');
        }
      }
      
      console.log(`Successfully killed runaway process PID ${pid}`);
      killed++;
    } catch (error) {
      const errorMessage = (error as Error).message;
      errors.push({ pid, error: errorMessage });
      console.log(`Failed to kill process PID ${pid}: ${errorMessage}`);
    }
  }

  return { killed, errors };
}


/**
 * Kill orphaned caffeinate process if one exists in daemon state.
 * This handles the case where the daemon crashed and left caffeinate running.
 */
export async function killOrphanedCaffeinate(): Promise<{ killed: boolean, error?: string }> {
  // Dynamically import to avoid circular dependencies
  const { readDaemonState } = await import('@/persistence');
  
  try {
    const daemonState = await readDaemonState();
    
    if (!daemonState?.caffeinatePid) {
      return { killed: false };
    }
    
    const caffeinatePid = daemonState.caffeinatePid;
    
    // Check if the caffeinate process is still running
    try {
      process.kill(caffeinatePid, 0);
    } catch {
      // Process doesn't exist, nothing to kill
      return { killed: false };
    }
    
    // Verify it's actually a caffeinate process before killing
    let processes;
    try {
      processes = await psList();
    } catch (error) {
      // Cannot verify process name - safer to not kill
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { killed: false, error: `Cannot verify process name: ${errorMessage}` };
    }

    const caffeinateProc = processes.find(p => p.pid === caffeinatePid);

    if (!caffeinateProc || !caffeinateProc.name?.includes('caffeinate')) {
      // PID exists but it's not caffeinate - might have been reused
      // Don't kill it
      return { killed: false };
    }
    
    // Kill the orphaned caffeinate process
    console.log(`Killing orphaned caffeinate process PID ${caffeinatePid}`);
    process.kill(caffeinatePid, 'SIGTERM');
    
    // Wait and verify it's dead
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      process.kill(caffeinatePid, 0);
      // Still alive, force kill
      console.log(`Caffeinate PID ${caffeinatePid} ignored SIGTERM, using SIGKILL`);
      process.kill(caffeinatePid, 'SIGKILL');
    } catch {
      // Process is dead
    }
    
    console.log(`Successfully killed orphaned caffeinate process PID ${caffeinatePid}`);
    return { killed: true };
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.log(`Failed to kill orphaned caffeinate: ${errorMessage}`);
    return { killed: false, error: errorMessage };
  }
}


/**
 * Clean up orphaned Codex temp directories if any exist in daemon state.
 * This handles the case where the daemon crashed and left temp directories
 * containing auth.json files lingering in /tmp.
 * 
 * Security note: These directories may contain OAuth tokens in auth.json files.
 * While HAP-221 ensures these files have 0o600 permissions (owner-only access),
 * cleaning them up on daemon restart provides defense-in-depth by reducing
 * the window of exposure.
 */
export async function cleanupOrphanedCodexTempDirs(): Promise<{ cleaned: number, errors: string[] }> {
  // Dynamically import to avoid circular dependencies
  const { readDaemonState } = await import('@/persistence');
  const { rm, stat } = await import('node:fs/promises');
  
  const errors: string[] = [];
  let cleaned = 0;
  
  try {
    const daemonState = await readDaemonState();
    
    if (!daemonState?.codexTempDirs || daemonState.codexTempDirs.length === 0) {
      return { cleaned: 0, errors: [] };
    }
    
    const tempDirs = daemonState.codexTempDirs;
    console.log(`Found ${tempDirs.length} orphaned Codex temp directories to clean up`);
    
    for (const dirPath of tempDirs) {
      try {
        // Verify the directory exists before attempting removal
        const stats = await stat(dirPath);
        
        if (!stats.isDirectory()) {
          // Not a directory - skip but log
          console.log(`Skipping ${dirPath}: not a directory`);
          continue;
        }
        
        // Security check: Only clean up paths that look like temp directories
        // This prevents accidental deletion of user data if state file is corrupted
        if (!dirPath.includes('/tmp/') && !dirPath.includes('\\temp\\')) {
          console.log(`Skipping ${dirPath}: not in temp directory`);
          errors.push(`Skipping ${dirPath}: not in temp directory`);
          continue;
        }
        
        // Remove the directory and all contents (recursive)
        await rm(dirPath, { recursive: true, force: true });
        console.log(`Cleaned up orphaned Codex temp directory: ${dirPath}`);
        cleaned++;
      } catch (error) {
        // ENOENT means directory doesn't exist - that's fine, it was already cleaned up
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.log(`Codex temp directory already removed: ${dirPath}`);
          continue;
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Failed to clean up Codex temp directory ${dirPath}: ${errorMessage}`);
        errors.push(`${dirPath}: ${errorMessage}`);
      }
    }
    
    return { cleaned, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Failed to read daemon state for temp dir cleanup: ${errorMessage}`);
    return { cleaned: 0, errors: [errorMessage] };
  }
}
