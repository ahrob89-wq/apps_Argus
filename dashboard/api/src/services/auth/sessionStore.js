import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export class SessionStore {
  constructor({ ttlSeconds, maxEntries, encryptionKey, filePath, now = Date.now }) {
    this.ttlMs = ttlSeconds * 1000;
    this.maxEntries = maxEntries;
    this.encryptionKey = encryptionKey;
    this.filePath = filePath;
    this.now = now;
    this.sessions = new Map();
    if (!encryptionKey) return;
    this.load();
  }

  load() {
    let contents;
    try {
      contents = readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }

    const stored = JSON.parse(contents);
    if (stored.version !== 1 || typeof stored.iv !== 'string' ||
        typeof stored.tag !== 'string' || typeof stored.data !== 'string') {
      throw new Error('The encrypted dashboard session store has an unsupported format.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(stored.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(stored.tag, 'base64'));
    const records = JSON.parse(Buffer.concat([
      decipher.update(Buffer.from(stored.data, 'base64')),
      decipher.final()
    ]).toString('utf8'));
    if (!Array.isArray(records)) throw new Error('The dashboard session store is invalid.');

    for (const [sessionId, session] of records) {
      if (typeof sessionId === 'string' && /^[A-Za-z0-9_-]{43}$/.test(sessionId) &&
          session && typeof session.expiresAt === 'number' && session.expiresAt > this.now() &&
          typeof session.accessToken === 'string' && session.user && typeof session.user.id === 'string') {
        this.sessions.set(sessionId, Object.freeze(session));
      }
    }
    if (this.sessions.size !== records.length) this.persist();
  }

  persist() {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify([...this.sessions]), 'utf8'),
      cipher.final()
    ]);
    const contents = JSON.stringify({
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64')
    });
    mkdirSync(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      writeFileSync(temporaryPath, contents, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      renameSync(temporaryPath, this.filePath);
    } catch (error) {
      try {
        unlinkSync(temporaryPath);
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          throw new AggregateError([error, cleanupError], 'Could not save dashboard sessions or clean up the temporary store.');
        }
      }
      throw error;
    }
  }

  create({ user, accessToken, refreshToken, accessTokenExpiresAt }) {
    const previousSessions = new Map(this.sessions);
    try {
      this.pruneExpired();
      while (this.sessions.size >= this.maxEntries) {
        const oldestSessionId = this.sessions.keys().next().value;
        if (!oldestSessionId) break;
        this.sessions.delete(oldestSessionId);
      }

      const sessionId = randomBytes(32).toString('base64url');
      const expiresAt = this.now() + this.ttlMs;
      const session = Object.freeze({ user, accessToken, refreshToken, accessTokenExpiresAt, expiresAt });
      this.sessions.set(sessionId, session);
      this.persist();
      return { sessionId, session };
    } catch (error) {
      this.sessions = previousSessions;
      throw error;
    }
  }

  get(sessionId) {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.expiresAt <= this.now()) {
      this.sessions.delete(sessionId);
      this.persist();
      return null;
    }
    return session;
  }

  delete(sessionId) {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId) || null;
    this.sessions.delete(sessionId);
    if (session) {
      try {
        this.persist();
      } catch (error) {
        this.sessions.set(sessionId, session);
        throw error;
      }
    }
    return session;
  }

  update(sessionId, session) {
    if (!this.sessions.has(sessionId)) return null;
    const previousSession = this.sessions.get(sessionId);
    const updatedSession = Object.freeze(session);
    this.sessions.set(sessionId, updatedSession);
    try {
      this.persist();
    } catch (error) {
      this.sessions.set(sessionId, previousSession);
      throw error;
    }
    return updatedSession;
  }

  pruneExpired() {
    const now = this.now();
    const previousSessions = new Map(this.sessions);
    let changed = false;
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionId);
        changed = true;
      }
    }
    if (changed) {
      try {
        this.persist();
      } catch (error) {
        this.sessions = previousSessions;
        throw error;
      }
    }
  }
}
