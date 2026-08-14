-- ============================================================
-- CBT APP - SUPABASE SCHEMA
-- Jalankan seluruh file ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- Aktifkan extension untuk uuid
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. QUESTIONS (Bank Soal)
-- ------------------------------------------------------------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default 'Umum',
  question text not null,
  image_url text,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  option_e text,
  answer_key text not null check (answer_key in ('A','B','C','D','E')),
  created_at timestamptz not null default now()
);

create index if not exists idx_questions_teacher on questions(teacher_id);
create index if not exists idx_questions_subject on questions(subject);

-- ------------------------------------------------------------
-- 2. EXAMS (Ujian)
-- ------------------------------------------------------------
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text not null,
  class text not null,
  duration_minutes int not null default 30,
  total_questions int not null default 20,
  mode text not null default 'acak' check (mode in ('acak','paket')),
  shuffle_options boolean not null default true,
  is_active boolean not null default true,
  access_code text unique, -- kode pendek yang diberikan ke siswa, contoh: STARTER01
  created_at timestamptz not null default now()
);

create index if not exists idx_exams_teacher on exams(teacher_id);
create unique index if not exists idx_exams_access_code on exams(access_code);

-- ------------------------------------------------------------
-- 3. EXAM PACKAGES (Paket A/B/C/D - opsional, hanya dipakai jika mode = 'paket')
-- ------------------------------------------------------------
create table if not exists exam_packages (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  name text not null, -- "Paket A", "Paket B", dst
  created_at timestamptz not null default now()
);

create table if not exists package_questions (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references exam_packages(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  position int not null default 0
);

-- ------------------------------------------------------------
-- 4. STUDENTS (Siswa - tanpa akun, dibuat otomatis saat mulai ujian)
-- ------------------------------------------------------------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. ATTEMPTS (Snapshot pengerjaan - dipakai untuk auto-save & anti-perubahan bank soal saat ujian berlangsung)
-- ------------------------------------------------------------
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  questions jsonb not null, -- snapshot array soal: [{id, question, image_url, options:{A,B,C,D,E}, answer_key}]
  answers jsonb not null default '{}'::jsonb, -- {question_id: "A"}
  status text not null default 'in_progress' check (status in ('in_progress','submitted','timeout')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  time_limit_seconds int not null
);

create index if not exists idx_attempts_exam on attempts(exam_id);
create index if not exists idx_attempts_student on attempts(student_id);

-- ------------------------------------------------------------
-- 6. RESULTS (Nilai akhir)
-- ------------------------------------------------------------
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete set null,
  student_id uuid not null references students(id) on delete cascade,
  exam_id uuid not null references exams(id) on delete cascade,
  student_name text not null,
  student_class text not null,
  exam_title text not null,
  score numeric(5,2) not null,
  correct int not null,
  wrong int not null,
  total_questions int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_results_exam on results(exam_id);
create index if not exists idx_results_class on results(student_class);

-- ============================================================
-- ROW LEVEL SECURITY
-- Guru login pakai Supabase Auth (auth.uid()).
-- Siswa TIDAK login -> akses lewat anon key, jadi kita batasi
-- kolom & operasi yang boleh dilakukan anon user.
-- ============================================================

alter table questions enable row level security;
alter table exams enable row level security;
alter table exam_packages enable row level security;
alter table package_questions enable row level security;
alter table students enable row level security;
alter table attempts enable row level security;
alter table results enable row level security;

-- ---- QUESTIONS: hanya pemilik (guru) yang boleh CRUD ----
create policy "teacher manage own questions" on questions
  for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Siswa perlu baca soal secara TIDAK LANGSUNG saja (lewat snapshot di attempts),
-- jadi tabel questions tidak perlu policy select untuk anon.

-- ---- EXAMS: guru CRUD penuh; anon (siswa) hanya boleh SELECT exam yang aktif ----
create policy "teacher manage own exams" on exams
  for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

create policy "public can view active exams" on exams
  for select
  to anon
  using (is_active = true);

-- ---- EXAM PACKAGES & PACKAGE QUESTIONS: hanya guru ----
create policy "teacher manage packages" on exam_packages
  for all
  using (exists (select 1 from exams e where e.id = exam_packages.exam_id and e.teacher_id = auth.uid()))
  with check (exists (select 1 from exams e where e.id = exam_packages.exam_id and e.teacher_id = auth.uid()));

create policy "teacher manage package questions" on package_questions
  for all
  using (exists (
    select 1 from exam_packages p join exams e on e.id = p.exam_id
    where p.id = package_questions.package_id and e.teacher_id = auth.uid()
  ))
  with check (exists (
    select 1 from exam_packages p join exams e on e.id = p.exam_id
    where p.id = package_questions.package_id and e.teacher_id = auth.uid()
  ));

-- ---- STUDENTS: anon boleh insert (isi nama+kelas), guru boleh baca semua ----
create policy "anon can create student" on students
  for insert
  to anon
  with check (true);

create policy "anon can read own student row" on students
  for select
  to anon
  using (true);

create policy "teacher can read students" on students
  for select
  to authenticated
  using (true);

-- ---- ATTEMPTS: anon boleh insert & update punya sendiri (dicek by id di client) ----
create policy "anon can create attempt" on attempts
  for insert
  to anon
  with check (true);

create policy "anon can read attempt" on attempts
  for select
  to anon
  using (true);

create policy "anon can update own attempt" on attempts
  for update
  to anon
  using (status = 'in_progress')
  with check (true);

create policy "teacher can read attempts" on attempts
  for select
  to authenticated
  using (exists (select 1 from exams e where e.id = attempts.exam_id and e.teacher_id = auth.uid()));

-- ---- RESULTS: anon boleh insert (submit nilai) & baca hasil miliknya sendiri; guru baca semua miliknya ----
create policy "anon can insert result" on results
  for insert
  to anon
  with check (true);

create policy "anon can read result" on results
  for select
  to anon
  using (true);

create policy "teacher can read own results" on results
  for select
  to authenticated
  using (exists (select 1 from exams e where e.id = results.exam_id and e.teacher_id = auth.uid()));

create policy "teacher can delete own results" on results
  for delete
  to authenticated
  using (exists (select 1 from exams e where e.id = results.exam_id and e.teacher_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKET untuk gambar soal
-- Jalankan bagian ini juga, atau buat manual lewat Dashboard > Storage
-- ============================================================
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "public read question images"
  on storage.objects for select
  to public
  using (bucket_id = 'question-images');

create policy "teacher upload question images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'question-images');

create policy "teacher update own question images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'question-images');

create policy "teacher delete own question images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'question-images');
