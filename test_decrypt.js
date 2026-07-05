const fs = require('fs');
const crypto = require('crypto');

const password = 'AOILab666';

function decryptFile(inputFile) {
  const payload = fs.readFileSync(inputFile);
  
  const salt = payload.slice(0, 16);
  const iv = payload.slice(16, 28);
  const authTag = payload.slice(28, 44);
  const ciphertext = payload.slice(44);
  
  console.log(`File: ${inputFile}, salt len: ${salt.length}, iv len: ${iv.length}, tag len: ${authTag.length}, cipher len: ${ciphertext.length}`);
  
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext);
  let final = decipher.final();
  return Buffer.concat([decrypted, final]).toString('utf8');
}

try {
  const faqStr = decryptFile('faq.enc');
  const faq = JSON.parse(faqStr);
  console.log('Successfully decrypted faq.enc! Found', faq.length, 'questions.');
  
  const funFaqStr = decryptFile('fun_faq.enc');
  const funFaq = JSON.parse(funFaqStr);
  console.log('Successfully decrypted fun_faq.enc! Found', funFaq.questions.length, 'questions.');
  console.log('First fun question:', funFaq.questions[0].question);
} catch (e) {
  console.error('Decryption test failed:', e.message);
}
