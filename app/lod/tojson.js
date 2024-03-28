import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 将 markdown 转为 LOD 分层 json
 * @param {*} markdown 
 * @returns 
 */
function markdownToLodJson(markdown) {
  const lines = markdown.split('\n');
  const root = {};
  let currentObj = root;
  let objStack = [root];
  let lastLevel = 0;

  lines.forEach(line => {
    const lineMatch = line.match(/^(\d+(\.\d+)*)\s(.*)/);
    if (lineMatch) {
      const level = (lineMatch[1].match(/\./g) || []).length;
      const text = lineMatch[3];
      if (level > lastLevel) {
        // deeper level, push currentObj to stack
        objStack.push(currentObj);
      } else if (level < lastLevel) {
        // higher level, pop from stack
        objStack.pop();
      }
      currentObj = objStack[objStack.length - 1];
      if (!currentObj[lineMatch[1]]) {
        currentObj[lineMatch[1]] = {};
      }
      currentObj = currentObj[lineMatch[1]];
      currentObj['text'] = (currentObj['text'] || '') + text;
      lastLevel = level;
    } else {
      // Continuation of previous line
      currentObj['text'] = (currentObj['text'] || '') + '\n' + line;
    }
  });

  // Function to clean up the structure, removing empty objects
  function cleanStructure(obj) {
    if (typeof obj === 'string') {
      return obj;
    }
    const cleanObj = {};
    Object.keys(obj).forEach(key => {
      if (key === 'text' && typeof obj[key] === 'string') {
        cleanObj[key] = obj[key].trim();
      } else {
        const value = cleanStructure(obj[key]);
        if (Object.keys(value).length > 0 || typeof value === 'string') {
          cleanObj[key] = value;
        }
      }
    });
    return cleanObj;
  }

  return cleanStructure(root);
}

// Example usage with a file read operation
const markdownContent = String(fs.readFileSync(path.join(__dirname, 'source.md'), 'utf8'));

const jsonResult = markdownToLodJson(markdownContent);
console.log(JSON.stringify(jsonResult, null, 2));

// Optionally, write the JSON to a file
fs.writeFileSync(path.join(__dirname, 'source.json'), JSON.stringify(jsonResult, null, 2));
