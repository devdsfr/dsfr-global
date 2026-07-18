# Data model (current + planned)

## users (implemented)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | varchar(120) | |
| email | varchar(255) unique | login identity |
| password_hash | varchar(255) | bcrypt |
| country / language / role | varchar | profile |
| target_role / target_country | varchar | goal |
| english_level | A1–C2 | self-reported; refined by AI |
| created_at / updated_at | timestamptz | |

## Redis keys (implemented)
| key | value | TTL |
|---|---|---|
| refresh:{token} | user id | 7d, rotated on use |
| pwdreset:{token} | user id | 30min, single-use |

## Planned tables
- `resumes` (id, user_id, s3_key, raw_text, parsed jsonb, status)
- `jobs` (id, user_id, source, raw_text, parsed jsonb)
- `gap_analyses` (id, user_id, resume_id, job_id, overall %, technical %, linguistic %, gaps jsonb)
- `missions` (id, user_id, type, content jsonb, status, xp)
- `interviews` (id, user_id, type, transcript jsonb, feedback jsonb, grade)
- `scores` (id, user_id, dimension, value, recorded_at) — append-only history
- `achievements`, `streaks`, `xp_events` — gamification
