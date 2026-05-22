const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Simple replace that avoids double adding
            // Splitting by '<TextInput'
            const parts = content.split('<TextInput');
            for (let i = 1; i < parts.length; i++) {
                // Look at the opening tag to see if it already has placeholderTextColor
                const tagEnd = parts[i].indexOf('>');
                if (tagEnd !== -1) {
                    const tagContent = parts[i].substring(0, tagEnd);
                    if (!tagContent.includes('placeholderTextColor')) {
                        parts[i] = ' placeholderTextColor="#94A3B8"' + parts[i];
                        modified = true;
                    }
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, parts.join('<TextInput'), 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'apps/mobile/src/screens'));
processDir(path.join(__dirname, 'apps/mobile/src/components'));
