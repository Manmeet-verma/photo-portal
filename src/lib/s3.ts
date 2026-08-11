import "server-only";
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAdminDb } from "@/lib/firebase-admin";

export type S3Connection = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
};

function envConnection(): S3Connection | null {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.S3_BUCKET) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "ap-south-1",
      bucket: process.env.S3_BUCKET,
    };
  }
  return null;
}

export async function getConnection(uid?: string): Promise<S3Connection | null> {
  if (uid) {
    try {
      const snap = await getAdminDb().collection("s3-connections").doc(uid).get();
      if (snap.exists) {
        const d = snap.data() || {};
        if (d.accessKeyId && d.secretAccessKey && d.bucket) {
          return {
            accessKeyId: d.accessKeyId,
            secretAccessKey: d.secretAccessKey,
            region: d.region || "ap-south-1",
            bucket: d.bucket,
          };
        }
      }
    } catch {}
  }
  return envConnection();
}

export async function saveConnection(uid: string, conn: S3Connection) {
  await getAdminDb().collection("s3-connections").doc(uid).set({ ...conn, updatedAt: Date.now() });
}

export async function clearConnection(uid: string) {
  await getAdminDb().collection("s3-connections").doc(uid).delete().catch(() => {});
}

function clientFor(conn: S3Connection): S3Client {
  return new S3Client({
    region: conn.region,
    credentials: { accessKeyId: conn.accessKeyId, secretAccessKey: conn.secretAccessKey },
  });
}

export async function testConnection(conn: S3Connection): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await clientFor(conn).send(new HeadBucketCommand({ Bucket: conn.bucket }));
    return { ok: true };
  } catch (e: any) {
    const name: string = e?.name || "";
    const status: number = e?.$metadata?.httpStatusCode || 0;
    let error = e?.message || "Connection failed.";
    if (name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch" || status === 403) {
      error = status === 403 ? "Access denied — check the IAM user has AmazonS3ReadOnlyAccess." : "Invalid AWS credentials.";
    } else if (status === 404 || name === "NotFound") {
      error = "Bucket not found — check the bucket name and region.";
    } else if (name === "ExpiredToken" || name === "TokenRefreshRequired") {
      error = "Your AWS credentials have expired — create a new access key.";
    }
    return { ok: false, error };
  }
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "avif", "bmp", "tiff", "svg"]);

export type S3File = { key: string; name: string; url: string };

export async function listS3Files(conn: S3Connection, prefix: string, token: string): Promise<{ files: S3File[]; nextToken: string }> {
  const res = await clientFor(conn).send(
    new ListObjectsV2Command({
      Bucket: conn.bucket,
      Prefix: prefix || undefined,
      ContinuationToken: token || undefined,
      MaxKeys: 100,
    })
  );
  const objects = (res.Contents || [])
    .filter((o) => {
      const key = o.Key || "";
      const ext = key.split(".").pop()?.toLowerCase() || "";
      return IMAGE_EXTS.has(ext) && (o.Size ?? 0) > 0;
    })
    .slice(0, 100);

  const files = await Promise.all(
    objects.map(async (o) => {
      const key = o.Key || "";
      return {
        key,
        name: key.split("/").pop() || key,
        url: await presignUrl(conn, key),
      };
    })
  );

  return {
    files,
    nextToken: res.IsTruncated && res.NextContinuationToken ? res.NextContinuationToken : "",
  };
}

export async function presignUrl(conn: S3Connection, key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(clientFor(conn), new GetObjectCommand({ Bucket: conn.bucket, Key: key }), { expiresIn });
}

export async function s3HeadExists(conn: S3Connection, key: string): Promise<boolean> {
  try {
    await clientFor(conn).send(new GetObjectCommand({ Bucket: conn.bucket, Key: key, Range: "bytes=0-0" }));
    return true;
  } catch {
    return false;
  }
}
