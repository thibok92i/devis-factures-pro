/**
 * Database Encryption Layer
 * AES-256-GCM encryption for the SQLite database at rest.
 * The encryption key is derived from the machine's hardware ID
 * using PBKDF2, making the database file useless if copied to another machine.
 */

import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'crypto'
import { machineIdSync } from '../services/machine-id'

// Constants
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32
const PBKDF2_ITERATIONS = 100000
const MAGIC_HEADER = Buffer.from('DPRO') // Magic bytes to identify encrypted files

/**
 * Derives an encryption key from the machine ID.
 * Uses PBKDF2 with a random salt for key derivation.
 */
function deriveKey(salt: Buffer): Buffer {
  const machineId = getMachineSecret()
  return pbkdf2Sync(machineId, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Gets the machine-specific secret used for key derivation.
 * Combines machine ID with an app-specific string.
 */
function getMachineSecret(): string {
  try {
    const machineId = machineIdSync()
    return `DevisPro-v1-${machineId}-database-key`
  } catch {
    // Fallback: less secure but prevents data loss
    return `DevisPro-v1-fallback-${process.platform}-${process.arch}`
  }
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * Output format: MAGIC(4) + SALT(32) + IV(16) + AUTH_TAG(16) + ENCRYPTED_DATA
 */
export function encryptBuffer(plainData: Buffer): Buffer {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plainData), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine: MAGIC + SALT + IV + AUTH_TAG + ENCRYPTED_DATA
  return Buffer.concat([MAGIC_HEADER, salt, iv, authTag, encrypted])
}

/**
 * Decrypts a buffer that was encrypted with encryptBuffer().
 * Returns null if the data is not encrypted (for migration from plain DB).
 */
export function decryptBuffer(encryptedData: Buffer): Buffer | null {
  // Check if file starts with our magic header
  if (encryptedData.length < MAGIC_HEADER.length + SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
    return null // Too short to be encrypted, likely plain SQLite
  }

  const magic = encryptedData.subarray(0, MAGIC_HEADER.length)
  if (!magic.equals(MAGIC_HEADER)) {
    return null // Not encrypted (plain SQLite file starts with "SQLite format 3")
  }

  let offset = MAGIC_HEADER.length
  const salt = encryptedData.subarray(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH
  const iv = encryptedData.subarray(offset, offset + IV_LENGTH)
  offset += IV_LENGTH
  const authTag = encryptedData.subarray(offset, offset + AUTH_TAG_LENGTH)
  offset += AUTH_TAG_LENGTH
  const encrypted = encryptedData.subarray(offset)

  const key = deriveKey(salt)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  } catch {
    throw new Error('Impossible de déchiffrer la base de données. Fichier corrompu ou machine différente.')
  }
}

/**
 * Checks if a buffer is an encrypted database file.
 */
export function isEncrypted(data: Buffer): boolean {
  if (data.length < MAGIC_HEADER.length) return false
  return data.subarray(0, MAGIC_HEADER.length).equals(MAGIC_HEADER)
}
