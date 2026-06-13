-- Deba Technologies Database Schema
-- Run this once to set up all tables

-- Create database if not exists (run manually):
-- CREATE DATABASE deba_technologies;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id                   SERIAL PRIMARY KEY,
  order_id             VARCHAR(20) UNIQUE NOT NULL,
  client_name          VARCHAR(100) NOT NULL,
  client_email         VARCHAR(255) NOT NULL,
  client_company       VARCHAR(100),
  client_country       VARCHAR(60) NOT NULL,
  service_type         VARCHAR(100) NOT NULL,
  project_description  TEXT NOT NULL,
  estimated_hours      VARCHAR(20) DEFAULT '10-20',
  preferred_start_date DATE,
  hourly_rate_inr      INTEGER NOT NULL CHECK (hourly_rate_inr >= 80),
  referral_source      VARCHAR(50) DEFAULT 'Other',
  additional_notes     TEXT,
  status               VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new','reviewed','in_progress','completed','cancelled')),
  admin_notes          TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  replied    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table (for dynamic service management)
CREATE TABLE IF NOT EXISTS services (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(10) DEFAULT '🔧',
  tags        TEXT[],
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_email    ON orders (client_email);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_email  ON contacts (email);

-- Insert default services
INSERT INTO services (name, description, icon, tags, sort_order) VALUES
  ('IT Support & Helpdesk', 'Remote desktop support, troubleshooting, user management', '🖥️', ARRAY['Remote Support','Windows','Mac'], 1),
  ('Network Infrastructure Setup', 'Cisco, Meraki, UniFi setup and configuration', '🌐', ARRAY['Cisco','Meraki','VLAN','OSPF'], 2),
  ('Microsoft 365 Administration', 'M365 tenant, Exchange, Teams, Intune, Azure AD', '☁️', ARRAY['Exchange','Teams','Intune','Azure AD'], 3),
  ('Cybersecurity & Monitoring', 'Firewall, SIEM, DLP, threat detection using Fortinet', '🛡️', ARRAY['Fortinet','SIEM','DLP'], 4),
  ('DevOps & Deployment', 'Docker, Kubernetes, GitHub Actions CI/CD pipelines', '🐳', ARRAY['Docker','Kubernetes','CI/CD'], 5),
  ('System Administration', 'Windows Server, Active Directory, GPO, backup', '🖧', ARRAY['Windows Server','Active Directory'], 6),
  ('ManageEngine & DLP', 'Deploy ManageEngine solutions and DLP policies', '📊', ARRAY['ManageEngine','DLP','ITSM'], 7),
  ('Technical Consulting', 'IT strategy, architecture review, vendor evaluation', '🔧', ARRAY['Strategy','Architecture'], 8)
ON CONFLICT DO NOTHING;

-- View: Order summary
CREATE OR REPLACE VIEW order_summary AS
SELECT
  status,
  COUNT(*) as total_orders,
  AVG(hourly_rate_inr) as avg_rate_inr,
  MAX(created_at) as latest_order
FROM orders
GROUP BY status;
