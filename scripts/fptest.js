const path = require('path');
const os = require('os');

console.log(`Directory: `, __dirname);
console.log(`File: `, __filename)

const fullPath = path.join('/users', 'kevro', 'OneDrive - WORK')
console.log(`Path: `, fullPath)

console.log('Home directory:', os.homedir())