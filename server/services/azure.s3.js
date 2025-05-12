import AWS from "aws-sdk";

export const s3 = new AWS.S3({
  accessKeyId: process.env.CONTABO_ACCESS_KEY_ID,
  secretAccessKey: process.env.CONTABO_SECRET_ACCESS_KEY,
  endpoint: process.env.CONTABO_ENDPOINT,
  s3ForcePathStyle: true,
});
