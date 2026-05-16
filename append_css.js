const fs = require('fs');
const path = require('path');

const cssAppends = {
  'client/src/styles/components/misc.css': `
/* Mobile Responsiveness Added */
@media (max-width: 1024px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }
  .content {
    padding: 24px 20px 24px;
  }
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .intelligence-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .bento-grid, .stats-grid, .two-col, .inline-grid, .dashboard-bento {
    grid-template-columns: 1fr;
  }
  .bento-large, .bento-medium, .bento-full {
    grid-column: span 1;
  }
  .stats-row {
    grid-template-columns: 1fr;
  }
  .hero-welcome-v2 {
    padding: 32px 20px;
  }
  .hero-main-content h2 {
    font-size: 2rem;
  }
  .hero-stat-blob {
    flex-direction: column;
    padding: 20px;
    gap: 16px;
  }
  .v-line {
    width: 100%;
    height: 1px;
  }
  .wizard-steps {
    justify-content: center;
  }
}
`,
  'client/src/styles/components/sidebar.css': `
/* Mobile Responsiveness Added */
@media (max-width: 1024px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    width: 260px;
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
`,
  'client/src/styles/components/topbar.css': `
/* Mobile Responsiveness Added */
@media (max-width: 1024px) {
  .topbar {
    padding: 12px 16px;
  }
  .topbar-meta {
    gap: 16px;
  }
  .topbar-search {
    max-width: 240px;
  }
}

@media (max-width: 768px) {
  .topbar-search {
    display: none; /* Hide global search on mobile by default */
  }
  .action-buttons {
    gap: 8px;
  }
}
`,
  'client/src/styles/components/forms.css': `
/* Mobile Responsiveness Added */
@media (max-width: 1024px) {
  .menu-btn {
    display: flex;
  }
}
`,
  'client/src/styles/components/cards.css': `
/* Mobile Responsiveness Added */
@media (max-width: 768px) {
  .card {
    padding: 16px;
  }
  .card-header {
    flex-wrap: wrap;
  }
}
`,
  'client/src/styles/utilities.css': `
/* Mobile Responsiveness Added */
@media (max-width: 768px) {
  .hide-mobile {
    display: none !important;
  }
  .show-mobile {
    display: block !important;
  }
  .flex-col-mobile {
    flex-direction: column !important;
  }
}
@media (min-width: 769px) {
  .show-mobile {
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
