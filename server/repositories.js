import { query, withTransaction } from './db.js';
import { createHash } from 'node:crypto';

function institutionScope(institutionId) {
  if (!institutionId) throw Object.assign(new Error('institutionId is required'), { statusCode: 400 });
  return institutionId;
}

export async function getInstitution(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query('SELECT id, code, name, jurisdiction, timezone, created_at AS "createdAt" FROM institutions WHERE id = $1', [scope]);
  return rows[0] || null;
}

export async function listAcademicUnits(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, code, name, unit_type AS "unitType", status, effective_from AS "effectiveFrom", effective_to AS "effectiveTo", parent_id AS "parentId" FROM academic_units WHERE institution_id = $1 ORDER BY name`, [scope]);
  return rows;
}

export async function renameAcademicUnit(institutionId, unitId, name, effectiveFrom) {
  const scope = institutionScope(institutionId);
  if (!uuid(unitId)) throw Object.assign(new Error('Academic Unit id must be a database UUID'), { statusCode: 400 });
  return withTransaction(async client => {
    const currentResult = await client.query(`SELECT id, code, name, unit_type, status, effective_from, parent_id FROM academic_units WHERE institution_id = $1 AND id = $2 AND effective_to IS NULL FOR UPDATE`, [scope, unitId]);
    if (!currentResult.rows[0]) return null;
    const current = currentResult.rows[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || new Date(`${effectiveFrom}T00:00:00Z`) <= new Date(current.effective_from)) {
      throw Object.assign(new Error('effectiveFrom must be a later YYYY-MM-DD date than the current Academic Unit version'), { statusCode: 400 });
    }
    await client.query(`UPDATE academic_units SET effective_to = ($3::date - INTERVAL '1 day')::date WHERE institution_id = $1 AND id = $2`, [scope, unitId, effectiveFrom]);
    const inserted = await client.query(`INSERT INTO academic_units (institution_id, code, name, unit_type, status, effective_from, parent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, code, name, unit_type AS "unitType", status, effective_from AS "effectiveFrom", effective_to AS "effectiveTo", parent_id AS "parentId"`, [scope, current.code, name, current.unit_type, name === current.name ? 'Active' : 'Renamed', effectiveFrom, current.parent_id]);
    return { ...inserted.rows[0], previousId: current.id, previousName: current.name };
  });
}

export async function listUsers(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, oidc_subject AS "oidcSubject", email, display_name AS "displayName", status FROM users WHERE institution_id = $1 ORDER BY display_name`, [scope]);
  return rows;
}

function uuid(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null; }

export async function createProposal({ institutionId, actorSubject, proposalType, title, academicUnitId, effectiveTerm, details = {} }) {
  const scope = institutionScope(institutionId);
  const actor = await query('SELECT id FROM users WHERE institution_id = $1 AND oidc_subject = $2 AND status = $3', [scope, actorSubject, 'Active']);
  if (!actor.rows[0]) throw Object.assign(new Error('Authenticated user is not provisioned for this institution'), { statusCode: 403 });
  if (!uuid(academicUnitId)) throw Object.assign(new Error('academicUnitId must be a database Academic Unit UUID'), { statusCode: 400 });
  const unit = await query('SELECT id FROM academic_units WHERE institution_id = $1 AND id = $2 AND effective_to IS NULL', [scope, academicUnitId]);
  if (!unit.rows[0]) throw Object.assign(new Error('Academic Unit is not in the institution scope'), { statusCode: 400 });
  const itemType = proposalType.toLowerCase().includes('program') ? 'Program' : proposalType.toLowerCase().includes('credential') ? 'Credential' : 'Course';
  return withTransaction(async client => {
    const item = await client.query(`INSERT INTO curriculum_items (institution_id, item_type, stable_code, owning_unit_id) VALUES ($1,$2,$3,$4) RETURNING id`, [scope, itemType, `PENDING-${randomCode()}`, uuid(academicUnitId)]);
    const version = await client.query(`INSERT INTO curriculum_versions (institution_id, curriculum_item_id, version_no, lifecycle_state, title, effective_term, payload, created_by) VALUES ($1,$2,1,'Proposed',$3,$4,$5,$6) RETURNING id`, [scope, item.rows[0].id, title, effectiveTerm, JSON.stringify(details), actor.rows[0].id]);
    const proposal = await client.query(`INSERT INTO proposals (institution_id, proposal_no, proposal_type, curriculum_item_id, proposed_version_id, status, current_stage, created_by, submitted_at) VALUES ($1,$2,$3,$4,$5,'Submitted','Department Curriculum Committee',$6,now()) RETURNING id, proposal_no, proposal_type, status, current_stage, created_by, submitted_at, proposed_version_id`, [scope, `PROP-${randomCode()}`, proposalType, item.rows[0].id, version.rows[0].id, actor.rows[0].id]);
    return { ...proposal.rows[0], id: proposal.rows[0].id, title, academicUnitId, effectiveTerm, details, proposedVersion: 'v1.0' };
  });
}

function randomCode() { return Math.random().toString(36).slice(2, 10).toUpperCase(); }

export async function advanceProposal(institutionId, proposalId) {
  const scope = institutionScope(institutionId);
  const stages = ['Department Curriculum Committee', 'Faculty Curriculum Committee', 'Academic Programs Committee', 'Senate Curriculum Committee', 'Senate'];
  return withTransaction(async client => {
    const current = await client.query(`SELECT * FROM proposals WHERE institution_id = $1 AND id = $2 FOR UPDATE`, [scope, proposalId]);
    if (!current.rows[0]) return null;
    const proposal = current.rows[0];
    const index = stages.indexOf(proposal.current_stage);
    if (index < 0 || index + 1 >= stages.length) {
      await client.query(`UPDATE proposals SET current_stage = 'Final Approval Complete', status = 'Approved', completed_at = now() WHERE id = $1 AND institution_id = $2`, [proposalId, scope]);
      return { ...proposal, current_stage: 'Final Approval Complete', status: 'Approved' };
    }
    const next = stages[index + 1];
    const updated = await client.query(`UPDATE proposals SET current_stage = $2, status = 'Under Review' WHERE id = $1 AND institution_id = $3 RETURNING *`, [proposalId, next, scope]);
    return updated.rows[0];
  });
}

export async function promoteProposal(institutionId, proposalId) {
  const scope = institutionScope(institutionId);
  return withTransaction(async client => {
    const current = await client.query(`SELECT * FROM proposals WHERE institution_id = $1 AND id = $2 FOR UPDATE`, [scope, proposalId]);
    if (!current.rows[0]) return null;
    if (current.rows[0].status !== 'Approved') throw Object.assign(new Error('Final approval is required before promotion'), { statusCode: 409 });
    await client.query(`UPDATE curriculum_versions SET lifecycle_state = 'Official' WHERE id = $1 AND institution_id = $2`, [current.rows[0].proposed_version_id, scope]);
    const updated = await client.query(`UPDATE proposals SET status = 'Official' WHERE id = $1 AND institution_id = $2 RETURNING *`, [proposalId, scope]);
    return updated.rows[0];
  });
}

export async function listProposals(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, proposal_no, proposal_type, status, current_stage, created_by, submitted_at, completed_at FROM proposals WHERE institution_id = $1 ORDER BY submitted_at DESC NULLS LAST`, [scope]);
  return rows;
}

export async function getProposal(institutionId, proposalId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT * FROM proposals WHERE institution_id = $1 AND id = $2`, [scope, proposalId]);
  return rows[0] || null;
}

export async function listPublications(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, curriculum_version_id, status, visibility, channels, scheduled_at, queued_at, published_at FROM publications WHERE institution_id = $1 ORDER BY queued_at DESC`, [scope]);
  return rows;
}

export async function listPublishedConsumerRecords(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT p.id AS "publicationId", cv.id AS "officialVersionId", cv.title, cv.version_no AS "versionNo", cv.effective_term AS "effectiveTerm", p.channels, p.status, p.visibility, p.published_at AS "publishedAt" FROM publications p JOIN curriculum_versions cv ON cv.id = p.curriculum_version_id WHERE p.institution_id = $1 AND p.status = 'Published' AND p.visibility = 'Public' AND cv.lifecycle_state = 'Official' ORDER BY p.published_at DESC`, [scope]);
  return rows.map(row => ({ ...row, proposalId: null, officialVersion: `v${row.versionNo}` }));
}

export async function queuePublication({ institutionId, proposalId, channels = [] }) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`INSERT INTO publications (institution_id, curriculum_version_id, channels) SELECT p.institution_id, p.proposed_version_id, $3::jsonb FROM proposals p JOIN curriculum_versions cv ON cv.id = p.proposed_version_id WHERE p.institution_id = $1 AND p.id = $2 AND p.status = 'Official' AND cv.lifecycle_state = 'Official' ON CONFLICT (institution_id, curriculum_version_id) DO UPDATE SET channels = EXCLUDED.channels RETURNING id, curriculum_version_id AS "curriculumVersionId", channels, status, visibility, queued_at AS "queuedAt", published_at AS "publishedAt"`, [scope, proposalId, JSON.stringify(channels)]);
  if (!rows[0]) throw Object.assign(new Error('Only an Official Curriculum Version may enter the publication queue'), { statusCode: 409 });
  return { ...rows[0], proposalId, officialVersion: 'v1.0' };
}

export async function publishPublication(institutionId, publicationId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`UPDATE publications p SET status = 'Published', visibility = 'Public', published_at = now() FROM curriculum_versions cv WHERE p.curriculum_version_id = cv.id AND p.institution_id = $1 AND p.id = $2 AND cv.lifecycle_state = 'Official' RETURNING p.id, p.curriculum_version_id AS "curriculumVersionId", p.channels, p.status, p.visibility, p.queued_at AS "queuedAt", p.published_at AS "publishedAt"`, [scope, publicationId]);
  return rows[0] || null;
}

export async function listAuditEvents(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, actor_user_id AS "actorUserId", event_type AS "eventType", entity_type AS "entityType", entity_id AS "entityId", before_state AS "beforeState", after_state AS "afterState", correlation_id AS "correlationId", privacy_classification AS "privacyClassification", previous_hash AS "previousHash", event_hash AS "eventHash", hash_version AS "hashVersion", created_at AS "occurredAt" FROM audit_events WHERE institution_id = $1 ORDER BY created_at DESC`, [scope]);
  return rows;
}

export async function listEvidenceItems(institutionId) {
  const scope = institutionScope(institutionId);
  const { rows } = await query(`SELECT id, title, evidence_type AS "evidenceType", storage_key AS "storageKey", content_type AS "contentType", byte_size AS "byteSize", checksum, malware_scan_status AS "malwareScanStatus", retention_until AS "retentionUntil", encryption_key_ref AS "encryptionKeyRef", privacy_classification AS "privacyClassification", status, created_by AS "createdBy", created_at AS "createdAt" FROM evidence_items WHERE institution_id = $1 ORDER BY created_at DESC`, [scope]);
  return rows;
}

export async function createEvidenceItem({ institutionId, title, evidenceType, storageKey, contentType, byteSize, checksum, retentionUntil, encryptionKeyRef, privacyClassification = 'Internal', createdBy }) {
  const scope = institutionScope(institutionId);
  const actorUuid = typeof createdBy === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(createdBy) ? createdBy : null;
  const { rows } = await query(`INSERT INTO evidence_items (institution_id, title, evidence_type, storage_key, content_type, byte_size, checksum, retention_until, encryption_key_ref, privacy_classification, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, title, evidence_type AS "evidenceType", storage_key AS "storageKey", content_type AS "contentType", byte_size AS "byteSize", checksum, malware_scan_status AS "malwareScanStatus", retention_until AS "retentionUntil", privacy_classification AS "privacyClassification", status, created_by AS "createdBy", created_at AS "createdAt"`, [scope, title, evidenceType, storageKey, contentType, byteSize ?? null, checksum || null, retentionUntil || null, encryptionKeyRef || null, privacyClassification, actorUuid]);
  return rows[0];
}

export async function appendAuditEvent({ institutionId, actorUserId, eventType, entityType, entityId, beforeState, afterState, correlationId, privacyClassification = 'Internal' }) {
  const scope = institutionScope(institutionId);
  const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
  const previous = await query(`SELECT event_hash FROM audit_events WHERE institution_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`, [scope]);
  const previousHash = previous.rows[0]?.event_hash || 'GENESIS';
  const actorUuid = uuid(actorUserId);
  const entityUuid = uuid(entityId);
  const correlationUuid = uuid(correlationId);
  const eventHash = createHash('sha256').update(JSON.stringify({ institutionId: scope, actorUserId: actorUuid, eventType, entityType, entityId: entityUuid, beforeState: beforeState || null, afterState: afterState || null, correlationId: correlationUuid, privacyClassification, previousHash })).digest('hex');
  const { rows } = await query(`INSERT INTO audit_events (institution_id, actor_user_id, event_type, entity_type, entity_id, before_state, after_state, correlation_id, previous_hash, event_hash, hash_version, privacy_classification) VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,gen_random_uuid()),$9,$10,2,$11) RETURNING *`, [uuid(scope), actorUuid, eventType, entityType, entityUuid, beforeState || null, afterState || null, correlationUuid, previousHash, eventHash, privacyClassification]);
  return rows[0];
}
