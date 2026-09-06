import { closeDatabase, query } from '../server/db.js';

if (!process.env.DATABASE_URL) {
  console.error('Seed requires DATABASE_URL');
  process.exit(1);
}

const code = process.env.INSTITUTION_CODE || 'NORTHERN-STAR';
const name = process.env.INSTITUTION_NAME || 'Northern Star College';
const email = process.env.ADMIN_EMAIL || 'ccms-admin@northernstar.ca';
const configuredId = process.env.INSTITUTION_ID || null;
try {
  const institution = await query(`INSERT INTO institutions (id, code, name, jurisdiction) VALUES (COALESCE($1::uuid, gen_random_uuid()),$2,$3,$4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id, code, name`, [configuredId, code, name, 'Canada']);
  const tenant = institution.rows[0];
  if (configuredId && tenant.id !== configuredId) throw new Error(`INSTITUTION_ID ${configuredId} does not match the existing institution for code ${code}`);
  await query(`INSERT INTO users (institution_id, oidc_subject, email, display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (institution_id, oidc_subject) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name`, [tenant.id, `seed:${email}`, email, 'CCMS Administrator']);
  for (const unit of [['BUSINESS', 'School of Business', 'School', '2024-01-01'], ['TECHNOLOGY', 'School of Technology', 'School', '2025-09-01'], ['HEALTH', 'School of Health Sciences', 'School', '2023-01-01']]) {
    await query(`INSERT INTO academic_units (institution_id, code, name, unit_type, effective_from) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (institution_id, code, effective_from) DO UPDATE SET name = EXCLUDED.name, status = 'Active'`, [tenant.id, ...unit]);
  }
  const reviewer = await query(`INSERT INTO users (institution_id, oidc_subject, email, display_name) VALUES ($1,$2,$3,$4) ON CONFLICT (institution_id, oidc_subject) DO UPDATE SET email = EXCLUDED.email, display_name = EXCLUDED.display_name RETURNING id`, [tenant.id, 'seed:morgan.lee@northernstar.ca', 'morgan.lee@northernstar.ca', 'Morgan Lee']);
  for (const committee of [['COM-00001', 'Department Curriculum Committee', 'Academic Unit', 50], ['COM-00002', 'Faculty Curriculum Committee', 'Faculty / School', 50], ['COM-00003', 'Academic Programs Committee', 'Institution', 60], ['COM-00004', 'Senate', 'Institution', 50]]) {
    const record = await query(`INSERT INTO committees (institution_id, code, name, scope, quorum_percent) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (institution_id, code) DO UPDATE SET name = EXCLUDED.name, scope = EXCLUDED.scope, quorum_percent = EXCLUDED.quorum_percent, status = 'Active' RETURNING id`, [tenant.id, ...committee]);
    await query(`INSERT INTO committee_memberships (institution_id, committee_id, user_id, role, voting, effective_from) VALUES ($1,$2,$3,'Member',true,CURRENT_DATE) ON CONFLICT (committee_id, user_id, effective_from) DO NOTHING`, [tenant.id, record.rows[0].id, reviewer.rows[0].id]);
  }
  console.log(JSON.stringify({ seeded: true, institutionId: tenant.id, institutionCode: tenant.code, adminEmail: email }));
} finally {
  await closeDatabase();
}
