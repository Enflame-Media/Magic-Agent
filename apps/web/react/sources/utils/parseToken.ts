import { decodeBase64 } from "@/encryption/base64";
import { decodeUTF8 } from "@/encryption/text";
import { AppError, ErrorCodes } from "@/utils/errors";

export function parseToken(token: string) {
    const [_header, payload, _signature] = token.split('.');
    const parsed = JSON.parse(decodeUTF8(decodeBase64(payload)));
    // Support both "user" (happy-server-workers) and "sub" (legacy) claims
    const userId = parsed.user ?? parsed.sub;
    if (typeof userId !== 'string') {
        throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid authentication token');
    }
    return userId;
}