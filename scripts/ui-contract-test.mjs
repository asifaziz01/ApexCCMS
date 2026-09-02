import fs from 'node:fs/promises';

const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const required = ['ACADEMIC / CURRICULUM', 'PROPOSALS', 'GOVERNANCE', 'QUALITY / EXTERNAL', 'PUBLICATIONS', 'CONSUMER', 'OVERSIGHT', 'CURRICULUM INTELLIGENCE', 'ADMINISTRATION', 'Curriculum Home', 'Create Proposal', 'Create Course Proposal', 'My Reviews', 'Publication Queue', 'Search & Browse', 'Compliance & Issues', 'Intelligence Home', 'Users & Roles', 'locale-toggle', 'skip-link', 'main-content', '__CCMS_GET_ACCESS_TOKEN__', 'Bearer ${token}', 'frenchSectionLabels', 'sectionLabel(heading, locale)', 'icon-btn', 'Help and support', 'Notifications', 'Aisha Khan, Curriculum Administrator', 'aria-current', 'aria-expanded', 'year-menu', "setActive('Programs')", "setActive('Compliance & Issues')", "setActive('Curriculum Changes')", "onAction={()=>setActive('Create Proposal')", 'function Courses({setActive}'];
const missing = required.filter(value => !source.includes(value));
if (missing.length) throw new Error(`Missing shell contract entries: ${missing.join(', ')}`);
console.log(JSON.stringify({ ok: true, checks: required.length, shell: 'canonical', bilingual: true, keyboardSkipLink: true }));
