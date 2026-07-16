const fs = require('fs');
const lines = fs.readFileSync('C:/Users/BRIAN/.gemini/antigravity/brain/68ff718c-89c7-424e-af4d-f31b26c9c9f3/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');
const firstUserInput = lines.find(l => l.includes('"USER_INPUT"') && l.includes('PROMPT 5'));
if(firstUserInput) {
    const obj = JSON.parse(firstUserInput);
    console.log(obj.content.substring(0, 5000));
}
