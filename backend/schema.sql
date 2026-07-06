-- Artly — Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- Each table is a simple (id text primary key, data jsonb) key/value shape that
-- mirrors the backend's in-memory dicts 1:1. The FastAPI backend talks to these
-- tables with the *service role* key, which bypasses Row Level Security — so no
-- RLS policies are needed (and RLS is left disabled). Browsers never touch
-- Supabase directly; all reads/writes go through the API.

create table if not exists public.ideas (
    id         text primary key,
    data       jsonb       not null,
    updated_at timestamptz not null default now()
);

create table if not exists public.categories (
    id   text primary key,
    data jsonb not null
);

-- settings is a single row (id = 'app').
create table if not exists public.settings (
    id   text primary key,
    data jsonb not null
);
