const fs = require('fs');
const path = './frontend/assets/index-DiIpccgm.js';

// Read the bundle
let content = fs.readFileSync(path, 'utf8');

// The notification icon is rendered roughly here:
// `(0,I.jsx)(`button`,{style:{background:`none`,border:`none`,color:`#7d8590`,cursor:`pointer`},children:(0,I.jsx)(eo,{size:18})})`

// We want to add an onClick handler to this button to test if modification works.
const target = 'children:[(0,I.jsx)(`button`,{style:{background:`none`,border:`none`,color:`#7d8590`,cursor:`pointer`},children:(0,I.jsx)(eo,{size:18})}),';
const replacement = 'children:[(0,I.jsx)(`button`,{onClick:()=>alert("Notification Icon Clicked!"),style:{background:`none`,border:`none`,color:`#7d8590`,cursor:`pointer`},children:(0,I.jsx)(eo,{size:18})}),';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ Successfully patched notification icon in index-DiIpccgm.js');
} else {
    console.error('❌ Could not find the target string in index-DiIpccgm.js. Target:', target);
}
