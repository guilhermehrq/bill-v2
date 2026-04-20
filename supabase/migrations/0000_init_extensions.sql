-- Phase 0 · foundation extensions.
-- pgcrypto: gen_random_uuid() for table primary keys (prompt §4).
-- pg_trgm:  trigram similarity for full-text search and import duplicate detection (prompt §6.1, ADR 016).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
