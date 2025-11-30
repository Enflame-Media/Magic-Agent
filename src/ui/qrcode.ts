import chalk from 'chalk';
import qrcode from 'qrcode-terminal';
import { AppError, ErrorCodes } from '@/utils/errors';

/**
 * Display a QR code in the terminal for the given data.
 * Includes input validation and error handling for robust operation.
 *
 * @param data - The data to encode in the QR code (typically a URL)
 * @throws {Error} If data is empty/invalid or exceeds QR code capacity (2953 bytes)
 */
export function displayQRCode(data: string): void {
  // Validate input data
  if (!data?.trim()) {
    throw new AppError(ErrorCodes.INVALID_INPUT, 'Cannot display QR code: data is empty or invalid');
  }

  // QR code capacity limit: version 40, binary mode, low error correction = 2953 bytes
  // Using conservative limit to ensure compatibility across error correction levels
  const QR_CODE_MAX_BYTES = 2953;
  if (data.length > QR_CODE_MAX_BYTES) {
    throw new AppError(ErrorCodes.INVALID_INPUT, `QR code data exceeds maximum capacity (${data.length} bytes, max ${QR_CODE_MAX_BYTES} bytes)`);
  }

  console.log('='.repeat(80));
  console.log('📱 To authenticate, scan this QR code with your mobile device:');
  console.log('='.repeat(80));

  try {
    qrcode.generate(data, { small: true }, (qr) => {
      try {
        if (!qr) {
          console.error(chalk.red('✗ Failed to generate QR code'));
          return;
        }
        for (const line of qr.split('\n')) {
          console.log(' '.repeat(10) + line);
        }
      } catch (callbackError) {
        const errorMessage = callbackError instanceof Error ? callbackError.message : String(callbackError);
        console.error(chalk.red('✗ QR code rendering error: ' + errorMessage));
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red('✗ QR code generation error: ' + errorMessage));
  }

  console.log('='.repeat(80));
} 