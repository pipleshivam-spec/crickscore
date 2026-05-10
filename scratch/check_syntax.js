const fs = require('fs');
const content = fs.readFileSync('c:/Users/shivam/Desktop/lazycricscore/app/match-setup.tsx', 'utf8');

let openBraces = 0;
let openParens = 0;

const lines = content.split(/\r?\n/);
for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '{') openBraces++;
        if (line[i] === '}') openBraces--;
        if (line[i] === '(') openParens++;
        if (line[i] === ')') openParens--;
    }
    if (l >= lines.length - 10) {
        console.log(`Line ${l+1}: Braces: ${openBraces}, Parens: ${openParens} | Content: ${line.trim()}`);
    }
}
