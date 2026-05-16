const fs = require('fs');
const path = require('path');

const cssAppends = {
  'client/src/styles/components/sidebar.css': `
@media (min-width: 1025px) {
  .sidebar-backdrop, .sidebar-backdrop.open {
    display: none !important;
  }
}
`
};

for (const key in cssAppends) {
  const contentToAppend = cssAppends[key];
  const fullPath = path.join(__dirname, key);
  if (fs.existsSync(fullPath)) {
    fs.appendFileSync(fullPath, contentToAppend, 'utf8');
    console.log("Appended to " + key);
  } else {
    console.error("File not found: " + key);
  }
}
