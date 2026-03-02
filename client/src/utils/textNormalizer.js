/**
 * 文本标准化工具
 * 用于拼写比较前的文本预处理
 */

/**
 * 标准化文本：转小写、去除首尾空格
 * @param {string} text
 * @returns {string}
 */
export function textNormalizer(text) {
    if (!text) return '';
    return text.trim().toLowerCase();
}

/**
 * 从文本中提取单词数组
 * 去除标点符号，按空格分割
 * @param {string} text
 * @returns {string[]}
 */
export function extractWords(text) {
    if (!text) return [];
    return text
        .replace(/[.,!?;:'"()\-—]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0);
}

/**
 * 比较两个单词是否匹配（忽略大小写、去除首尾空格）
 * @param {string} input - 用户输入
 * @param {string} target - 目标单词
 * @returns {boolean}
 */
export function isWordMatch(input, target) {
    return textNormalizer(input) === textNormalizer(target);
}