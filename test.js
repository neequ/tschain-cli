import fs from 'fs';
import utils from './utils/index';

var obj = utils.parseMarkdownToTree(fs.readFileSync('./app/index.md', 'utf-8'));

console.info(obj);