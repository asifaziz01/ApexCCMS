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
  console.log(JSON.stringify({ seeded: true, institutionId: tenant.id, institutionCode: tenant.code, adminEmail: email }));
} finally {
  await closeDatabase();
}
