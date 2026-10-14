import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Injectable } from '@nestjs/common';
import { validateEnv } from '../../config/env.js';
import type { Readable } from 'node:stream';
import type { PaperFileStorage } from './storage.js';

@Injectable()
export class S3PaperFileStorage implements PaperFileStorage {
  private readonly env = validateEnv();
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: this.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: this.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: this.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  async put(key: string, body: Readable) {
    await new Upload({
      client: this.client,
      params: { Bucket: this.env.R2_BUCKET, Key: key, Body: body },
      queueSize: 1,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    }).done();
  }
  async get(key: string) {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
    );
    if (!result.Body) throw new Error('Stored PDF has no body');
    return result.Body as Readable;
  }
  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
    );
  }
}
