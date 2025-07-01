import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.CONTABO_ENDPOINT,
  region: process.env.CONTABO_REGION,
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY_ID,
    secretAccessKey: process.env.CONTABO_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export async function uploadBackupFileToS3(zipBuffer, bucket, key) {
  const uploadParams = {
    Bucket: bucket,
    Key: key,
    Body: zipBuffer,
    ContentType: "application/zip",
  };

  await s3.send(new PutObjectCommand(uploadParams));
  return `${process.env.CONTABO_PUBLIC_BASE}/${process.env.CONTABO_BUCKET_ADDRESS}:${bucket}/${key}`;
}

export async function deleteBackupFileFromS3(s3Key) {
  const Bucket = process.env.CONTABO_BACKUP_BUCKET_NAME;
  const command = new DeleteObjectCommand({ Bucket, Key: s3Key });
  try {
    await s3.send(command);
    console.log(`S3: Deleted file ${s3Key}`);
  } catch (err) {
    console.error(`S3 Delete Error (${s3Key}):`, err.message);
  }
}
