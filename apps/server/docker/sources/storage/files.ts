import * as Minio from 'minio';

// Support OpenAPI spec generation without S3 connection
// When OPENAPI_SPEC_ONLY is set, export typed placeholders that won't connect
const isSpecOnly = process.env.OPENAPI_SPEC_ONLY === 'true';

const s3Host = process.env.S3_HOST ?? 'localhost';
const s3Port = process.env.S3_PORT ? parseInt(process.env.S3_PORT, 10) : undefined;
const s3UseSSL = process.env.S3_USE_SSL ? process.env.S3_USE_SSL === 'true' : true;

export const s3client = isSpecOnly
    ? ({} as Minio.Client)  // Typed placeholder for spec generation
    : new Minio.Client({
        endPoint: s3Host,
        port: s3Port,
        useSSL: s3UseSSL,
        accessKey: process.env.S3_ACCESS_KEY!,
        secretKey: process.env.S3_SECRET_KEY!,
    });

export const s3bucket = process.env.S3_BUCKET ?? '';

export const s3host = process.env.S3_HOST ?? '';

export const s3public = process.env.S3_PUBLIC_URL ?? '';

export async function loadFiles() {
    await s3client.bucketExists(s3bucket); // Throws if bucket does not exist or is not accessible
}

export function getPublicUrl(path: string) {
    return `${s3public}/${path}`;
}

export type ImageRef = {
    width: number;
    height: number;
    thumbhash: string;
    path: string;
}
