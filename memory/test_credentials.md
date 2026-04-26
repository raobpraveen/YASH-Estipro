# Test Credentials

## Admin (Default)
- **Email:** admin@yash.com
- **Password:** password
- **Role:** admin
- **Active:** true

## Notes
- Password reset via `PUT /api/users/me/password` (requires current password)
- Admin can reset any user's password via `PUT /api/users/{id}/password`
- JWT expires after 24 hours; auto-logout after 15 min idle (Phase 5)
