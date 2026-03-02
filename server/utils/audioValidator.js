import path from 'path';

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function audioValidator(filename, fileSize) {
    const ext = path.extname(filename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `不支持的文件格式: ${ext}，仅支持 ${ALLOWED_EXTENSIONS.join(', ')}` };
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
        return { valid: false, error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    return { valid: true };
}

export default audioValidator;