-- AI Newsroom: articles table
-- Run once in Supabase SQL Editor

CREATE TABLE articles (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL,
  summary      TEXT,
  source       TEXT        NOT NULL,
  url          TEXT        UNIQUE NOT NULL,
  published_at TIMESTAMPTZ,
  category     TEXT        NOT NULL DEFAULT 'General',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX articles_published_at_idx ON articles (published_at DESC NULLS LAST);
CREATE INDEX articles_category_idx     ON articles (category);
CREATE INDEX articles_created_at_idx   ON articles (created_at  DESC);

-- Row Level Security: public read, no public write
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access"
  ON articles FOR SELECT TO anon USING (true);
