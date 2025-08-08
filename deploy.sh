#!/bin/bash

# ---- CONFIG ----
S3_BUCKET="efference.ai"
CLOUDFRONT_DIST_ID="EGCSL8TK4NKYP"     # ← replace this with your actual CloudFront Distribution ID
LOCAL_DIR="."          # ← replace with your local folder name
SITE_URL="https://efference.ai"       # ← optional: for preview
# ----------------

echo "Syncing files to S3..."
aws s3 sync "$LOCAL_DIR" "s3://$S3_BUCKET" --delete

echo "Creating CloudFront cache invalidation..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DIST_ID" \
  --paths "/*"

echo "Deploy complete (wait a few minutes for CDN to update)."
