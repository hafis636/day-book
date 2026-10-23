const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toPublicImageUrl,
  validateImageFile,
} = require('./projectImageStorageService');

test('accepts supported images with matching file signatures', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const result = validateImageFile({
    mimetype: 'image/png',
    originalname: 'cover.png',
    size: png.length,
    buffer: png,
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.value, { contentType: 'image/png', extension: 'png' });
});

test('rejects images with a mismatched file signature and oversized files', () => {
  assert.match(
    validateImageFile({
      mimetype: 'image/png',
      originalname: 'fake.png',
      size: 4,
      buffer: Buffer.from('text'),
    }).error,
    /not a valid image\/png/
  );

  assert.match(
    validateImageFile({
      mimetype: 'image/png',
      originalname: 'large.png',
      size: 5 * 1024 * 1024 + 1,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    }).error,
    /5 MB per-file limit/
  );
});

test('uses public object URLs and keeps existing public URLs unchanged', () => {
  assert.equal(
    toPublicImageUrl('https://example.supabase.co/storage/v1/object/bucket/projects/1/cover.png'),
    'https://example.supabase.co/storage/v1/object/public/bucket/projects/1/cover.png'
  );
  assert.equal(
    toPublicImageUrl('https://example.supabase.co/storage/v1/object/public/bucket/projects/1/cover.png'),
    'https://example.supabase.co/storage/v1/object/public/bucket/projects/1/cover.png'
  );
});
