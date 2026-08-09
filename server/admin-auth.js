import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

function derivePassword(password, salt) {
  return scryptSync(password, Buffer.from(salt, 'hex'), 64).toString('hex');
}

export function createAdminCredentialStore(filePath, initialPassword) {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  let credential;

  try {
    credential = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    if (credential.version !== 1 || !credential.salt || !credential.hash) {
      throw new Error('Invalid admin credential store.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    update(initialPassword);
  }

  function persist() {
    const tempPath = `${resolvedPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(credential, null, 2));
    fs.renameSync(tempPath, resolvedPath);
  }

  function update(password) {
    const salt = randomBytes(16).toString('hex');
    credential = {
      version: 1,
      salt,
      hash: derivePassword(password, salt),
      updatedAt: new Date().toISOString(),
    };
    persist();
  }

  return {
    verify(password) {
      if (typeof password !== 'string' || password.length > 128) return false;
      const supplied = Buffer.from(derivePassword(password, credential.salt), 'hex');
      const expected = Buffer.from(credential.hash, 'hex');
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    },
    update,
  };
}
