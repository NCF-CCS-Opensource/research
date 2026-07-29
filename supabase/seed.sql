insert into public.categories (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Software Engineering'),
  ('10000000-0000-0000-0000-000000000002', 'Data Science');

insert into public.institutions (id, name) values
  ('50000000-0000-0000-0000-000000000001', 'Naga College Foundation');

insert into public.programs (id, name, institution_id) values
  (
    '60000000-0000-0000-0000-000000000001',
    'Bachelor of Science in Computer Science',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.keywords (id, name) values
  ('20000000-0000-0000-0000-000000000001', 'Accessibility'),
  ('20000000-0000-0000-0000-000000000002', 'Machine Learning');

insert into public.authors (id, name, email) values
  ('30000000-0000-0000-0000-000000000001', 'Ada Lovelace', 'ada@example.edu'),
  ('30000000-0000-0000-0000-000000000002', 'Grace Hopper', 'grace@example.edu'),
  ('30000000-0000-0000-0000-000000000003', 'Hidden Researcher', null);

insert into public.researches (
  id, title, abstract, publish_date, status, upload_complete, view_count, download_count, citation_export_count
) values
  (
    '40000000-0000-0000-0000-000000000001',
    'Accessible Research Discovery',
    'A public computing archive designed for inclusive discovery.',
    '2026-01-15',
    'approved',
    true,
    12,
    4,
    2
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    'Ethical Machine Learning',
    'Practical safeguards for responsible data science.',
    '2026-02-01',
    'approved',
    true,
    8,
    2,
    1
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    'Pending Private Draft',
    'This pending record must not be discoverable.',
    '2026-02-15',
    'pending',
    true,
    0,
    0,
    0
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'Rejected Private Draft',
    'This rejected record must not be discoverable.',
    '2026-03-15',
    'rejected',
    true,
    0,
    0,
    0
  );

insert into public.research_authors (research_id, author_id) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003');

insert into public.research_categories (research_id, category_id) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002');

insert into public.research_keywords (research_id, keyword_id) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002');
