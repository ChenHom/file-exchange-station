import { generateToken, hashToken } from '../../shared/crypto.js';

export { hashToken };

export type TokenRecord = {
  token: string;
  hash: string;
};

export function createToken(): TokenRecord {
  const token = generateToken();
  return { token, hash: hashToken(token) };
}

export function verifyToken(token: string, expectedHash: string): boolean {
  return hashToken(token) === expectedHash;
}
