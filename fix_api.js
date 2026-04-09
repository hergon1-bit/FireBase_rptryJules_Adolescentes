const fs = require('fs');
const path = './services/api.ts';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\{ id: doc\.id, \.\.\.doc\.data\(\) \}/g, '{ ...doc.data(), id: doc.id }');
fs.writeFileSync(path, content);
console.log('Done');
