# LifeOS Google Cloud Run Deployment Script
param (
    [string]$ProjectId = "",
    [string]$Region = "us-central1",
    [string]$ServiceName = "lifeos"
)

if (-not $ProjectId) {
    $ProjectId = Read-Host "Please enter your Google Cloud Project ID"
}

if (-not $ProjectId) {
    Write-Error "Google Cloud Project ID is required to deploy."
    exit 1
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Deploying LifeOS to Google Cloud Run" -ForegroundColor Cyan
Write-Host "Project ID:   $ProjectId" -ForegroundColor Yellow
Write-Host "Region:       $Region" -ForegroundColor Yellow
Write-Host "Service Name: $ServiceName" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# Step 1: Submit build to Google Cloud Build
Write-Host "`n[1/2] Building container via Google Cloud Build..." -ForegroundColor Green
gcloud builds submit --project $ProjectId --tag "gcr.io/$ProjectId/$ServiceName" .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Build failed. Please ensure Cloud Build API is enabled on your project."
    exit $LASTEXITCODE
}

# Step 2: Deploy container to Cloud Run
Write-Host "`n[2/2] Deploying container image to Cloud Run..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --project $ProjectId `
    --image "gcr.io/$ProjectId/$ServiceName" `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --set-env-vars "CORS_ORIGINS=*"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloud Run deployment failed. Please check permissions."
    exit $LASTEXITCODE
}

Write-Host "`n Deployment successful!" -ForegroundColor Green
$url = gcloud run services describe $ServiceName --project $ProjectId --region $Region --format 'value(status.url)'
Write-Host "Your live Cloud Run URL is: $url" -ForegroundColor Cyan
