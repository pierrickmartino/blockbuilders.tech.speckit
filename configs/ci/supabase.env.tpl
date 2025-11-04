# Template for Supabase secrets used by CI workflows and deployment targets.
# Copy this file outside of version control, populate the values, and pass the
# resulting path to `configs/scripts/sync_supabase_secrets.sh --from-file`.

NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_ISSUER=https://your-project-id.supabase.co/auth/v1
SUPABASE_JWKS_PATH=/auth/v1/jwks
SUPABASE_JWKS_URL=
SUPABASE_JWT_CACHE_TTL=900
SUPABASE_REDIRECT_URLS=http://localhost:3000/auth/callback,https://staging.example.com/auth/callback,https://app.example.com/auth/callback
SUPABASE_EMAIL_TEMPLATE_VERIFY=
