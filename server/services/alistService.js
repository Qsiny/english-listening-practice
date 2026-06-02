import fs from 'fs';
import path from 'path';

const DEFAULT_UPLOAD_DIR = '/audios/';
let cachedToken = null;

function mustEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`缺少环境变量：${name}`);
  return value;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/u, '');
}

function normalizeUploadDir(value = DEFAULT_UPLOAD_DIR) {
  let dir = value.trim();
  if (!dir.startsWith('/')) dir = `/${dir}`;
  if (!dir.endsWith('/')) dir = `${dir}/`;
  return dir.replace(/\/{2,}/gu, '/');
}

function guessContentTypeByExt(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.m4a') return 'audio/mp4';
  return 'application/octet-stream';
}

function sanitizeRemoteFilename(filename) {
  const baseName = path.basename(filename || 'audio');
  const safeName = baseName.replace(/[^\w.\-()]+/gu, '_').replace(/^_+/u, '');
  return safeName || 'audio';
}

function buildRemotePath(localFilePath, uploadDir) {
  const safeName = sanitizeRemoteFilename(path.basename(localFilePath));
  const objectName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
  return `${normalizeUploadDir(uploadDir)}${objectName}`;
}

function encodeRemotePathForUrl(remotePath) {
  return remotePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function buildFallbackPublicUrl(remotePath) {
  const baseUrl = normalizeBaseUrl(process.env.ALIST_PUBLIC_BASE_URL || mustEnv('ALIST_BASE_URL'));
  const encodedPath = encodeRemotePathForUrl(remotePath).replace(/^\/+/u, '');
  return `${baseUrl}/d/${encodedPath}`;
}

function toPublicDownloadUrl(rawUrl) {
  if (!rawUrl) return null;

  const publicBase = process.env.ALIST_PUBLIC_BASE_URL;
  if (/^https?:\/\//iu.test(rawUrl)) {
    if (!publicBase) return rawUrl;

    const parsed = new URL(rawUrl);
    return `${normalizeBaseUrl(publicBase)}${parsed.pathname}${parsed.search}`;
  }

  const baseUrl = normalizeBaseUrl(publicBase || mustEnv('ALIST_BASE_URL'));
  if (rawUrl.startsWith('/')) return `${baseUrl}${rawUrl}`;
  return `${baseUrl}/${rawUrl}`;
}

function getAuthHeader(token, authPrefix) {
  if (!authPrefix) return token;
  return `${authPrefix} ${token}`;
}

async function readAlistResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function isSuccessCode(code) {
  return code === undefined || code === null || code === 0 || code === 200;
}

function hasResponseCode(data) {
  return data && Object.prototype.hasOwnProperty.call(data, 'code');
}

function isSuccessResponse(response, data) {
  return response.ok && (data === null || data === undefined || (hasResponseCode(data) && isSuccessCode(data.code)));
}

function describeAlistError(prefix, response, data) {
  const message = data?.message || data?.msg || JSON.stringify(data);
  return `${prefix}: HTTP ${response.status}${message ? `, ${message}` : ''}`;
}

async function loginToAList() {
  const baseUrl = normalizeBaseUrl(mustEnv('ALIST_BASE_URL'));
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: mustEnv('ALIST_USERNAME'),
      password: mustEnv('ALIST_PASSWORD'),
    }),
  });

  const data = await readAlistResponse(response);
  if (!isSuccessResponse(response, data)) {
    throw new Error(describeAlistError('AList 登录失败', response, data));
  }

  const token = data?.data?.token;
  if (!token) {
    throw new Error(`AList 登录成功但未返回 token: ${JSON.stringify(data)}`);
  }

  cachedToken = token;
  return token;
}

async function getAListToken(forceRefresh = false) {
  if (!forceRefresh && cachedToken) return cachedToken;
  return loginToAList();
}

async function uploadOnce(localFilePath, remotePath, token, authPrefix) {
  const baseUrl = normalizeBaseUrl(mustEnv('ALIST_BASE_URL'));
  const stat = fs.statSync(localFilePath);

  const response = await fetch(`${baseUrl}/api/fs/put`, {
    method: 'PUT',
    headers: {
      Authorization: getAuthHeader(token, authPrefix),
      'File-Path': encodeURI(remotePath),
      'Content-Type': guessContentTypeByExt(localFilePath),
      'Content-Length': String(stat.size),
    },
    body: fs.createReadStream(localFilePath),
    duplex: 'half',
  });

  const data = await readAlistResponse(response);
  return { response, data };
}

async function getFileInfoOnce(remotePath, token, authPrefix) {
  const baseUrl = normalizeBaseUrl(mustEnv('ALIST_BASE_URL'));

  const response = await fetch(`${baseUrl}/api/fs/get`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(token, authPrefix),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: remotePath }),
  });

  const data = await readAlistResponse(response);
  return { response, data };
}

function isAuthError(result) {
  const status = result.response.status;
  const code = result.data?.code;
  return status === 401 || status === 403 || code === 401 || code === 403;
}

function assertUploadSucceeded(result) {
  const { response, data } = result;
  if (!isSuccessResponse(response, data)) {
    throw new Error(describeAlistError('AList 上传失败', response, data));
  }
}

/**
 * 上传本地音频文件到 AList。
 *
 * @returns {Promise<{ remotePath: string, publicUrl: string }>}
 */
export async function uploadAudioToAList(localFilePath, options = {}) {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`本地文件不存在：${localFilePath}`);
  }

  const uploadDir = options.uploadDir || process.env.ALIST_UPLOAD_DIR || DEFAULT_UPLOAD_DIR;
  const remotePath = options.remotePath || buildRemotePath(localFilePath, uploadDir);
  const configuredAuthPrefix = process.env.ALIST_AUTH_PREFIX;
  let authPrefix = configuredAuthPrefix === undefined ? '' : configuredAuthPrefix.trim();

  let token = await getAListToken();
  let result = await uploadOnce(localFilePath, remotePath, token, authPrefix);

  if (isAuthError(result)) {
    token = await getAListToken(true);
    result = await uploadOnce(localFilePath, remotePath, token, authPrefix);
  }

  if (isAuthError(result) && configuredAuthPrefix === undefined) {
    authPrefix = 'Bearer';
    result = await uploadOnce(localFilePath, remotePath, token, authPrefix);
  }

  assertUploadSucceeded(result);

  const fileInfo = await getFileInfoOnce(remotePath, token, authPrefix);
  if (isAuthError(fileInfo) && configuredAuthPrefix === undefined) {
    authPrefix = authPrefix ? '' : 'Bearer';
    const retriedFileInfo = await getFileInfoOnce(remotePath, token, authPrefix);
    assertUploadSucceeded(retriedFileInfo);

    const publicUrl = toPublicDownloadUrl(retriedFileInfo.data?.data?.raw_url) || buildFallbackPublicUrl(remotePath);
    console.log('AList 上传成功:', {
      remotePath,
      publicUrl,
      status: result.response.status,
    });

    return {
      remotePath,
      publicUrl,
    };
  }

  assertUploadSucceeded(fileInfo);

  const publicUrl = toPublicDownloadUrl(fileInfo.data?.data?.raw_url) || buildFallbackPublicUrl(remotePath);
  console.log('AList 上传成功:', {
    remotePath,
    publicUrl,
    status: result.response.status,
  });

  return {
    remotePath,
    publicUrl,
  };
}
