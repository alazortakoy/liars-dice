-- Profiles tablosu: Kullanıcı adları
-- Supabase Dashboard → SQL Editor → New Query → Bu SQL'i çalıştır

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Username'e index (arama için)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- RLS aktif et
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Herkes profilleri okuyabilir (oyun içinde username göstermek için)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Kullanıcı sadece kendi profilini oluşturabilir
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Kullanıcı sadece kendi profilini güncelleyebilir
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
