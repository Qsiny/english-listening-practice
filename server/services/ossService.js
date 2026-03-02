import OSS from 'ali-oss';
import path from 'path';
import fs from 'fs';

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`缺少环境变量：${name}`);
  return v;
}

function createOssClient() {
  const region = mustEnv('OSS_REGION'); // 例如 oss-cn-shenzhen
  const bucket = mustEnv('OSS_BUCKET');

  return new OSS({
    region,
    bucket,
    accessKeyId: mustEnv('OSS_ACCESS_KEY_ID'),
    accessKeySecret: mustEnv('OSS_ACCESS_KEY_SECRET'),
    authorizationV4: true,
    securityToken: process.env.OSS_SECURITY_TOKEN || undefined,
  });
}

function forceHttps(url) {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

function guessContentTypeByExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

/**
 * 上传本地文件到 OSS
 * @returns {Promise<{ objectKey: string, publicUrl?: string, etag?: string }>}
 */
export async function uploadAudioToOSS(localFilePath, options = {}) {
  const client = createOssClient();

  const prefix = options.prefix ?? 'english-listening-practice/uploads/';
  const privateAcl = options.privateAcl ?? true;

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`本地文件不存在：${localFilePath}`);
  }

  const baseName = path.basename(localFilePath);
  const safeName = baseName.replace(/[^\w.\-()]+/g, '_');
  const objectKey = `${prefix}${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;

  const headers = {
    'Content-Type': guessContentTypeByExt(baseName),
    'x-oss-object-acl': privateAcl ? 'private' : 'public-read',
    'x-oss-storage-class': 'Standard',
    // 可选：下载时的文件名（不影响 ASR 拉取）
    // 'Content-Disposition': `attachment; filename="${safeName}"`,
  };

  const result = await client.put(objectKey, localFilePath, { headers });

  // 注意：result.url 可能是 http
  const publicUrl = forceHttps(result.url);

  console.log('OSS 上传成功:', {
    objectKey,
    publicUrl,
    etag: result.etag,
    status: result?.res?.status,
    requestId: result?.res?.headers?.['x-oss-request-id'],
  });

  return {
    objectKey,
    publicUrl,
    etag: result.etag,
  };
}

/**
 * 生成具有时效的下载 URL（提供给百炼 asr）
 * @returns {Promise<string>} https signed url
 */
export async function signOSSUrl(objectKey, expiresSeconds = 3600) {
  const client = createOssClient();
  const signed = client.signatureUrl(objectKey, { expires: expiresSeconds });
  return forceHttps(signed);
}

export async function deleteOSSObject(objectKey) {
  const client = createOssClient();
  await client.delete(objectKey);
}

export async function transcribe(filePath) {
  // ...校验 DASHSCOPE_API_KEY / fs.existsSync...

  const { objectKey } = await uploadAudioToOSS(filePath, {
    prefix: 'english-listening-practice/audio/',
    privateAcl: true,
  });

  const signedUrl = await signOSSUrl(objectKey, 2 * 60 * 60);

  const taskId = await submitTranscriptionTask(signedUrl);
  const taskResult = await pollTaskResult(taskId);

  const parsed = parseTranscriptionResult(taskResult);
  if (parsed.needFetch && parsed.transcriptionUrl) {
    return await fetchTranscriptionDetail(parsed.transcriptionUrl);
  }
  return parsed;
}