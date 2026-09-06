CREATE TABLE workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  proposal_id uuid NOT NULL UNIQUE REFERENCES proposals(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','REJECTED')),
  current_step integer NOT NULL DEFAULT 1,
  current_stage text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflow_step_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  workflow_instance_id uuid NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  committee_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('IN_PROGRESS','PENDING','WAITING','APPROVED','RETURNED','REJECTED')),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE (workflow_instance_id, sequence)
);

CREATE TABLE approval_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  workflow_step_instance_id uuid NOT NULL REFERENCES workflow_step_instances(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES proposals(id),
  committee_name text NOT NULL,
  assignee_user_id uuid REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('PENDING','IN_PROGRESS','WAITING','COMPLETED','RETURNED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (workflow_step_instance_id, assignee_user_id)
);

CREATE INDEX idx_workflow_steps_active ON workflow_step_instances (institution_id, committee_name, status);
CREATE INDEX idx_approval_work_items_queue ON approval_work_items (institution_id, committee_name, status);
