const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024;
const IMAGE_FORMATS = {
  'image/jpeg': {
    extension: 'jpg',
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/gif': {
    extension: 'gif',
    matches: (buffer) => {
      const signature = buffer.subarray(0, 6).toString('ascii');
      return signature === 'GIF87a' || signature === 'GIF89a';
    },
  },
  'image/webp': {
    extension: 'webp',
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

let client;

const getStorageConfig = () => {
  const { SUPABASE_S3_ENDPOINT, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_URL } = process.env;
  const requiredSettings = {
    SUPABASE_URL,
    SUPABASE_S3_ENDPOINT,
    SUPABASE_STORAGE_BUCKET,
    SUPABASE_S3_ACCESS_KEY_ID,
    SUPABASE_S3_SECRET_ACCESS_KEY,
  };
  const missingSettings = Object.entries(requiredSettings)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missingSettings.length > 0) {
    throw new Error(
      `Supabase Storage S3 credentials and bucket configuration are required for project file uploads. Missing: ${missingSettings.join(', ')}`
    );
  }

  return {
    endpoint: SUPABASE_S3_ENDPOINT,
    accessKeyId: SUPABASE_S3_ACCESS_KEY_ID,
    secretAccessKey: SUPABASE_S3_SECRET_ACCESS_KEY,
    bucket: SUPABASE_STORAGE_BUCKET,
    supabaseUrl: SUPABASE_URL.replace(/\/+$/, ''),
    region: process.env.SUPABASE_S3_REGION || 'us-east-1',
  };
};

const getClient = (config) => {
  if (!client) {
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return client;
};

const validateImageFile = (file) => {
  if (!file || !IMAGE_FORMATS[file.mimetype]) {
    return { error: 'Only JPEG, PNG, GIF, and WebP images are supported' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { error: `${file.originalname} exceeds the 5 MB per-file limit` };
  }

  const format = IMAGE_FORMATS[file.mimetype];
  if (!format.matches(file.buffer)) {
    return { error: `${file.originalname} is not a valid ${file.mimetype} image` };
  }

  return { value: { contentType: file.mimetype, extension: format.extension } };
};

const toPublicImageUrl = (imageUrl) => {
  const objectPath = '/storage/v1/object/';
  const publicObjectPath = `${objectPath}public/`;

  if (imageUrl.includes(publicObjectPath)) return imageUrl;
  return imageUrl.replace(objectPath, publicObjectPath);
};

const uploadProjectImage = async (projectId, file) => {
  const config = getStorageConfig();
  const validation = validateImageFile(file);
  if (validation.error) {
    const error = new Error(validation.error);
    error.status = 400;
    throw error;
  }

  const key = `projects/${projectId}/${randomUUID()}.${validation.value.extension}`;
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: validation.value.contentType,
    })
  );

  return {
    key,
    imageUrl: `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
  };
};

const uploadProjectDocument = async (projectId, file) => {
  const config = getStorageConfig();
  const extension = file.originalname.match(/\.[a-zA-Z0-9]{1,10}$/)?.[0].toLowerCase() || '';
  const key = `projects/${projectId}/documents/${randomUUID()}${extension}`;
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/octet-stream',
    })
  );

  return {
    key,
    fileUrl: `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`,
  };
};

const deleteProjectImage = async (key) => {
  const config = getStorageConfig();
  await getClient(config).send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key,
    })
  );
};

const deleteProjectImageByUrl = async (imageUrl) => {
  const config = getStorageConfig();
  const image = new URL(imageUrl);
  const storage = new URL(config.supabaseUrl);
  if (image.origin !== storage.origin) {
    throw new Error('Project image URL does not belong to configured storage');
  }

  const segments = image.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const objectIndex = segments.findIndex(
    (segment, index) =>
      segment === 'storage' &&
      segments[index + 1] === 'v1' &&
      segments[index + 2] === 'object'
  );
  if (objectIndex < 0) throw new Error('Invalid project image URL');

  let bucketIndex = objectIndex + 3;
  if (segments[bucketIndex] === 'public') bucketIndex += 1;
  if (segments[bucketIndex] !== config.bucket || bucketIndex + 1 >= segments.length) {
    throw new Error('Project image URL does not belong to configured storage bucket');
  }

  await deleteProjectImage(segments.slice(bucketIndex + 1).join('/'));
};

module.exports = {
  IMAGE_FORMATS,
  MAX_DOCUMENT_SIZE,
  MAX_IMAGE_SIZE,
  deleteProjectImage,
  deleteProjectImageByUrl,
  toPublicImageUrl,
  uploadProjectDocument,
  uploadProjectImage,
  validateImageFile,
};
