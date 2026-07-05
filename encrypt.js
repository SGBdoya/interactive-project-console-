const fs = require('fs');
const crypto = require('crypto');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node encrypt.js <password>');
  process.exit(1);
}

function encryptFile(inputFile, outputFile) {
  if (!fs.existsSync(inputFile)) {
    console.log(`Skipping ${inputFile} (not found)`);
    return;
  }
  const plaintext = fs.readFileSync(inputFile, 'utf8');

  // Derive key using PBKDF2
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

  // Encrypt using AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format payload: salt (16 bytes) + iv (12 bytes) + authTag (16 bytes) + ciphertext (remaining)
  const payload = Buffer.concat([salt, iv, authTag, ciphertext]);
  fs.writeFileSync(outputFile, payload);
  console.log(`Encrypted ${inputFile} -> ${outputFile}`);
}

encryptFile('faq.json', 'faq.enc');
encryptFile('fun_faq.json', 'fun_faq.enc');
console.log('Database encryption completed successfully!');
