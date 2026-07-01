const fs = require('fs');
const path = './frontend/assets/index-DiIpccgm.js';

// Read the bundle
let content = fs.readFileSync(path, 'utf8');

const target = 'e?.alerts?.list?.map((e,t)=>(0,I.jsxs)(`div`,{style:{backgroundColor:`rgba(248, 81, 73, 0.1)`,border:`2px solid #f85149`,padding:`1.25rem 1.5rem`,display:`flex`,alignItems:`center`,gap:`1.25rem`,color:`#f85149`},children:[(0,I.jsx)(yo,{size:28}),(0,I.jsxs)(`div`,{style:{flex:1},children:[(0,I.jsxs)(`p`,{style:{fontWeight:`900`,fontSize:`0.85rem`,textTransform:`uppercase`,letterSpacing:`0.1em`,marginBottom:`0.15rem`},children:[`STOCK ALERT: `,e.type,` LOW`]}),(0,I.jsx)(`p`,{style:{fontSize:`1.05rem`,fontWeight:`700`},children:e.message})]}),(0,I.jsx)(`button`,{onClick:()=>window.location.href=`#/inventory`,style:{backgroundColor:`#f85149`,color:`#fff`,border:`none`,padding:`0.6rem 1.2rem`,fontSize:`0.85rem`,fontWeight:`800`,cursor:`pointer`},children:`RESTOCK NOW`})]},t))';

const replacement = 'e?.alerts?.list?.map((e,t)=>{const act=window.bizHelpers?window.bizHelpers.getAlertAction(e):{label:"View",href:"#"};return (0,I.jsxs)(`div`,{style:{backgroundColor:`var(--bg-secondary)`,borderLeft:`4px solid var(--danger)`,padding:`1rem 1.25rem`,display:`flex`,alignItems:`center`,gap:`1rem`,color:`var(--text-primary)`,borderRadius:`4px`,boxShadow:`0 2px 4px rgba(0,0,0,0.1)`},children:[(0,I.jsx)("div",{style:{color:"var(--danger)",display:"flex"},children:(0,I.jsx)(yo,{size:24})}),(0,I.jsxs)(`div`,{style:{flex:1},children:[(0,I.jsx)(`p`,{style:{fontSize:`0.95rem`,fontWeight:`600`,margin:`0`},children:e.message})]}),(0,I.jsx)(`button`,{onClick:()=>window.location.href=act.href,style:{backgroundColor:`var(--bg-secondary)`,color:`var(--text-primary)`,border:`1px solid var(--border)`,padding:`0.4rem 0.8rem`,fontSize:`0.8rem`,fontWeight:`600`,cursor:`pointer`,borderRadius:`4px`,transition:"background 0.2s"},onMouseOver:ev=>ev.target.style.background="var(--bg-hover)",onMouseOut:ev=>ev.target.style.background="var(--bg-secondary)",children:act.label})]},t)})';

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('✅ Successfully patched alerts in index-DiIpccgm.js');
} else {
    console.error('❌ Could not find the target string in index-DiIpccgm.js');
}
