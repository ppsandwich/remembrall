#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------
# GCS setup for Brall file attachments.
# Requires: gcloud CLI authenticated with a GCP project.
# ------------------------------------------------------------------

PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
BUCKET_NAME="${GCS_BUCKET_NAME:-remembrall-attachments}"
SA_NAME="remembrall-edge-fn"
SA_DISPLAY="Remembrall Edge Function (signed URLs)"
LOCATION="${GCS_LOCATION:-us-central1}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1. Enable required APIs ==="
gcloud services enable storage.googleapis.com --project "$PROJECT_ID"

echo "=== 2. Create GCS bucket: $BUCKET_NAME ==="
if gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
  echo "  Bucket already exists, skipping."
else
  gsutil mb -p "$PROJECT_ID" -l "$LOCATION" -b on "gs://$BUCKET_NAME"
  echo "  Bucket created."
fi

echo "=== 3. Apply CORS configuration ==="
gsutil cors set "$SCRIPT_DIR/gcs-cors.json" "gs://$BUCKET_NAME"
echo "  CORS applied."

echo "=== 4. Create service account: $SA_NAME ==="
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" &>/dev/null; then
  echo "  Service account already exists, skipping."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name "$SA_DISPLAY" \
    --project "$PROJECT_ID"
  echo "  Service account created."
fi

echo "=== 5. Grant storage.objectAdmin on the bucket ==="
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_NAME" \
  --member "serviceAccount:$SA_EMAIL" \
  --role "roles/storage.objectAdmin" \
  --project "$PROJECT_ID"

echo "=== 6. Generate service account key ==="
KEY_FILE="$SCRIPT_DIR/../.gcs-sa-key.json"
if [ -f "$KEY_FILE" ]; then
  echo "  Key file already exists at $KEY_FILE — skipping. Delete it to regenerate."
else
  gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account "$SA_EMAIL" \
    --project "$PROJECT_ID"
  echo "  Key saved to $KEY_FILE"
  echo "  ⚠️  Keep this file secret. It is already in .gitignore."
fi

echo ""
echo "=== Done ==="
echo "Bucket:    gs://$BUCKET_NAME"
echo "SA email:  $SA_EMAIL"
echo "Key file:  $KEY_FILE"
echo ""
echo "Next steps:"
echo "  1. Set the Supabase Edge Function secret:"
echo "     supabase secrets set GCS_SERVICE_ACCOUNT_KEY=\$(cat $KEY_FILE)"
echo "     supabase secrets set GCS_BUCKET_NAME=$BUCKET_NAME"
echo "  2. Add NEXT_PUBLIC_GCS_BUCKET=$BUCKET_NAME to apps/web/.env.local"
