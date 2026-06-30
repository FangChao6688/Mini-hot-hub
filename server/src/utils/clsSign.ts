import { createHash } from 'node:crypto';

/** 财联社 API 签名：SHA1(排序后的参数字符串) → MD5 */
export function createClsSign(params: Record<string, string | number>): string {
  const query = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const sha1 = createHash('sha1').update(query).digest('hex');
  return createHash('md5').update(sha1).digest('hex');
}
