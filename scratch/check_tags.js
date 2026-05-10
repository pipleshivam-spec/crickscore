const fs = require('fs');
const content = fs.readFileSync('c:/Users/shivam/Desktop/lazycricscore/app/match-setup.tsx', 'utf8');

let views = 0;

const lines = content.split(/\r?\n/);
for (let l = 0; l < 307; l++) {
    const line = lines[l];
    let pos = 0;
    while ((pos = line.indexOf('<View', pos)) !== -1) { 
        views++; 
        console.log(`[+] Line ${l+1}: Views: ${views} | ${line.trim().substring(0, 50)}`);
        pos += 5; 
    }
    pos = 0;
    while ((pos = line.indexOf('</View>', pos)) !== -1) { 
        views--; 
        console.log(`[-] Line ${l+1}: Views: ${views} | ${line.trim().substring(0, 50)}`);
        pos += 7; 
    }
}
