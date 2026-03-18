import io
from minio import Minio
from minio.error import S3Error
from config import (
    MINIO_ENDPOINT,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    MINIO_BUCKET,
    MINIO_SECURE,
)

_client = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=MINIO_SECURE,
        )
    return _client


def ensure_bucket():
    client = get_client()
    try:
        if not client.bucket_exists(MINIO_BUCKET):
            client.make_bucket(MINIO_BUCKET)
            print(f"[storage] Created bucket: {MINIO_BUCKET}")
    except S3Error as e:
        print(f"[storage] Bucket setup error: {e}")


def upload_file(
    key: str, data: bytes, content_type: str = "application/octet-stream"
) -> bool:
    try:
        client = get_client()
        client.put_object(
            MINIO_BUCKET, key, io.BytesIO(data), len(data), content_type=content_type
        )
        return True
    except S3Error as e:
        print(f"[storage] Upload error: {e}")
        return False


def get_presigned_url(key: str, expires_seconds: int = 3600) -> str | None:
    try:
        from datetime import timedelta

        client = get_client()
        return client.presigned_get_object(
            MINIO_BUCKET, key, expires=timedelta(seconds=expires_seconds)
        )
    except S3Error as e:
        print(f"[storage] Presign error: {e}")
        return None


def delete_file(key: str) -> bool:
    try:
        client = get_client()
        client.remove_object(MINIO_BUCKET, key)
        return True
    except S3Error as e:
        print(f"[storage] Delete error: {e}")
        return False
