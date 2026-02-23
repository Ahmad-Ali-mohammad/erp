## Summary

- What changed:
- Why:

## Validation

- [ ] `backend/manage.py check` passed
- [ ] `backend/manage.py makemigrations --check --dry-run` passed
- [ ] `backend/manage.py test core finance procurement projects` passed
- [ ] `frontend npm run lint` passed
- [ ] `frontend npm run check:permission-map` passed
- [ ] `frontend npm run build` passed
- [ ] Docker smoke checks passed for PostgreSQL and SQLite modes

## Quality Gate

- [ ] GitHub `Quality Gate` check is green
- [ ] No pending migration files
- [ ] No permission-map coverage regressions
