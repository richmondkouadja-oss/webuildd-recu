-- Table des utilisateurs/rôles (extension de auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'comptable', 'commercial', 'lecteur')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des clients
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  nationality TEXT DEFAULT 'Ivoirienne',
  address TEXT,
  client_type TEXT DEFAULT 'Particulier' CHECK (client_type IN ('Particulier', 'Entreprise', 'Diaspora')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des sites / lotissements
CREATE TABLE sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  commune TEXT,
  quartier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des lots
CREATE TABLE lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID REFERENCES sites(id),
  lot_number TEXT NOT NULL,
  ilot_number TEXT NOT NULL,
  superficie NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'disponible' CHECK (status IN ('disponible', 'réservé', 'vendu', 'en_cours')),
  title_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des reçus (table principale)
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_id UUID REFERENCES clients(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('terrain', 'maison')),
  superficie NUMERIC,
  localisation_quartier TEXT,
  localisation_commune TEXT,
  localisation_ville TEXT,
  lotissement_name TEXT,
  property_description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid_words TEXT NOT NULL,
  status TEXT DEFAULT 'partiel' CHECK (status IN ('partiel', 'soldé', 'annulé')),
  cancel_reason TEXT,
  pdf_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des lignes de lots par reçu
CREATE TABLE receipt_lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id),
  ilot_number TEXT NOT NULL,
  lot_number TEXT NOT NULL,
  superficie NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 1
);

-- Table des envois (traçabilité)
CREATE TABLE receipt_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'download', 'print')),
  recipient TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES profiles(id)
);

-- Séquence pour numérotation automatique
CREATE SEQUENCE receipt_seq START 1;

-- Fonction de génération du numéro de reçu
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  seq_val INTEGER;
  year_val TEXT;
BEGIN
  seq_val := nextval('receipt_seq');
  year_val := EXTRACT(YEAR FROM NOW())::TEXT;
  RETURN 'WFI-' || year_val || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_manage_profiles" ON profiles
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE POLICY "authenticated_read_clients" ON clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_manage_clients" ON clients
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_sites" ON sites
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_lots" ON lots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_manage_lots" ON lots
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "commerciaux_own_receipts" ON receipts
  FOR ALL USING (
    created_by = auth.uid() OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'comptable', 'lecteur')
  );

CREATE POLICY "receipt_lots_via_receipt" ON receipt_lots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM receipts WHERE receipts.id = receipt_lots.receipt_id
      AND (receipts.created_by = auth.uid() OR
           (SELECT role FROM profiles WHERE id = auth.uid()) IN ('super_admin', 'comptable', 'lecteur'))
    )
  );

CREATE POLICY "receipt_sends_via_receipt" ON receipt_sends
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX idx_receipts_client ON receipts(client_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_lots_site ON lots(site_id);
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_receipt_lots_receipt ON receipt_lots(receipt_id);
