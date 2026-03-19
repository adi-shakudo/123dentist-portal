import os

# Claude
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-sonnet-4-6"

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:////tmp/dentist_portal.db",
)

# Keycloak / OIDC
KEYCLOAK_URL = os.environ.get(
    "KEYCLOAK_URL",
    "http://keycloak.hyperplane-core.svc.cluster.local:8080",
)
KEYCLOAK_REALM = os.environ.get("KEYCLOAK_REALM", "master")
KEYCLOAK_CLIENT_ID = os.environ.get("KEYCLOAK_CLIENT_ID", "123dentist-portal")
KEYCLOAK_CLIENT_SECRET = os.environ.get("KEYCLOAK_CLIENT_SECRET", "")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:8787")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "change-me-in-production-abc123")

# MinIO
MINIO_ENDPOINT = os.environ.get(
    "MINIO_ENDPOINT", "minio.hyperplane-minio.svc.cluster.local:9000"
)
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "123dentist-portal")
MINIO_SECURE = os.environ.get("MINIO_SECURE", "false").lower() == "true"

# Mailgun
MAILGUN_API_KEY = os.environ.get("MAILGUN_API_KEY", "")
MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN", "mg.shakudo.io")
MAILGUN_FROM = os.environ.get(
    "MAILGUN_FROM", "123Dentist Onboarding <noreply@mg.shakudo.io>"
)

# OIDC endpoints (computed)
KEYCLOAK_ISSUER = f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}"
KEYCLOAK_AUTH_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/auth"
KEYCLOAK_TOKEN_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/token"
KEYCLOAK_USERINFO_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo"
KEYCLOAK_LOGOUT_URL = f"{KEYCLOAK_ISSUER}/protocol/openid-connect/logout"
REDIRECT_URI = f"{APP_BASE_URL}/auth/callback"
