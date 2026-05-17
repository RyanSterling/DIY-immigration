# AWS Configuration

## IAM Setup

Create an IAM user for the backend with programmatic access (Access Key + Secret Key).

### Steps

1. Go to **AWS Console > IAM > Users > Create User**
2. Name: `visaflow-backend`
3. Select **Programmatic access** (Access key)
4. Attach the policy below
5. Save the Access Key ID and Secret Access Key to your `.env`

### IAM Policy

This policy grants access to both S3 (document storage) and Textract (document analysis):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DocumentAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Sid": "TextractAnalysis",
      "Effect": "Allow",
      "Action": [
        "textract:StartDocumentAnalysis",
        "textract:GetDocumentAnalysis",
        "textract:AnalyzeID"
      ],
      "Resource": "*"
    }
  ]
}
```

**Notes:**

- Replace `your-bucket-name` with your actual S3 bucket name
- Textract requires `Resource: "*"` because it doesn't support resource-level permissions
- Textract reads from S3 using its own service-linked role, so no special bucket policy is needed

## S3 Bucket Setup

### CORS Configuration

The S3 bucket needs CORS configured to allow direct uploads from the browser using pre-signed URLs.

Go to **AWS Console > S3 > Your Bucket > Permissions > CORS** and add:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://your-production-domain.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

**Notes:**

- `AllowedOrigins`: Add your frontend URLs (local dev and production)
- `AllowedMethods`: `PUT` is required for uploads, `GET` for downloads
- `AllowedHeaders`: `*` allows Content-Type and other headers needed for uploads
- `ExposeHeaders`: `ETag` is useful for verifying uploads completed successfully

## Environment Variables

Add these to your backend `.env`:

```
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```
