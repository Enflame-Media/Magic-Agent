import { logger } from '@/ui/logger';
import { uninstall as uninstallMac } from './mac/uninstall';
import { AppError, ErrorCodes } from '@/utils/errors';

export async function uninstall(): Promise<void> {
    if (process.platform !== 'darwin') {
        throw new AppError(ErrorCodes.UNSUPPORTED_OPERATION, 'Daemon uninstallation is currently only supported on macOS');
    }

    if (process.getuid && process.getuid() !== 0) {
        throw new AppError(ErrorCodes.UNSUPPORTED_OPERATION, 'Daemon uninstallation requires sudo privileges. Please run with sudo.');
    }
    
    logger.info('Uninstalling Happy CLI daemon for macOS...');
    await uninstallMac();
}