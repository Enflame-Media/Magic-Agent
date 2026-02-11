import { logger } from '@/ui/logger';
import { install as installMac } from './mac/install';
import { AppError, ErrorCodes } from '@/utils/errors';

export async function install(): Promise<void> {
    if (process.platform !== 'darwin') {
        throw new AppError(ErrorCodes.UNSUPPORTED_OPERATION, 'Daemon installation is currently only supported on macOS');
    }

    if (process.getuid && process.getuid() !== 0) {
        throw new AppError(ErrorCodes.UNSUPPORTED_OPERATION, 'Daemon installation requires sudo privileges. Please run with sudo.');
    }
    
    logger.info('Installing Happy CLI daemon for macOS...');
    await installMac();
}