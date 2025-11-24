# Update server via web interface
Write-Host "Updating server via web interface..." -ForegroundColor Cyan
Write-Host ""

$serverUrl = "http://35.232.108.72"

# Get token from localStorage or ask user
Write-Host "This script needs your authentication token." -ForegroundColor Yellow
Write-Host ""
Write-Host "To get your token:" -ForegroundColor Gray
Write-Host "1. Open http://35.232.108.72 in browser" -ForegroundColor Gray
Write-Host "2. Login" -ForegroundColor Gray
Write-Host "3. Open browser console (F12)" -ForegroundColor Gray
Write-Host "4. Type: localStorage.getItem('token')" -ForegroundColor Gray
Write-Host "5. Copy the token" -ForegroundColor Gray
Write-Host ""

$token = Read-Host "Paste your token here (or press Enter to skip)"

if (-not $token) {
    Write-Host ""
    Write-Host "Token not provided. Skipping web update." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Update server manually via SSH or Google Cloud Console" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "1. Checking if server needs update..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $statusUrl = "$serverUrl/api/admin/update-status"
    $statusResponse = Invoke-RestMethod -Uri $statusUrl -Method GET -Headers $headers -TimeoutSec 10
    
    if ($statusResponse.updated) {
        Write-Host "   Server is ALREADY UPDATED!" -ForegroundColor Green
        Write-Host "   If data still doesn't show, try refreshing the page (Ctrl+F5)" -ForegroundColor Gray
        exit 0
    } else {
        Write-Host "   Server needs update" -ForegroundColor Red
    }
} catch {
    Write-Host "   Could not check status (might need to update endpoint first)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Starting server update..." -ForegroundColor Yellow

try {
    $updateUrl = "$serverUrl/api/admin/update-server"
    $updateResponse = Invoke-RestMethod -Uri $updateUrl -Method POST -Headers $headers -TimeoutSec 10
    
    if ($updateResponse.success) {
        Write-Host "   Update started!" -ForegroundColor Green
        Write-Host "   This will take 2-3 minutes..." -ForegroundColor Gray
        Write-Host ""
        Write-Host "   Please wait and then:" -ForegroundColor Yellow
        Write-Host "   1. Wait 2-3 minutes" -ForegroundColor Gray
        Write-Host "   2. Refresh the page (Ctrl+F5)" -ForegroundColor Gray
        Write-Host "   3. Check if data appears in modal" -ForegroundColor Gray
    } else {
        Write-Host "   Update failed: $($updateResponse.error)" -ForegroundColor Red
    }
} catch {
    $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 'unknown' }
    Write-Host "   ERROR ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
    
    if ($statusCode -eq 404) {
        Write-Host ""
        Write-Host "   Endpoint not found. Server might not have this feature yet." -ForegroundColor Yellow
        Write-Host "   You need to update server manually via SSH or Google Cloud Console" -ForegroundColor Yellow
    }
}

