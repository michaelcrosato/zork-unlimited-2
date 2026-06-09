# PowerShell Monitor Scheduler for AdventureForge Loop
# Enforces the specified monitoring cadence.

Write-Host "========================================="
Write-Host "Starting monitor schedule..."
Write-Host "========================================="

$Schedule = @(
    @{ Interval = 60;  Repeat = 5;  Label = "60-second interval" },
    @{ Interval = 300; Repeat = 6;  Label = "5-minute interval" },
    @{ Interval = 900; Repeat = 2;  Label = "15-minute interval" },
    @{ Interval = 3600; Repeat = 24; Label = "Hourly interval" }
)

$Iteration = 1
foreach ($Phase in $Schedule) {
    $interval = $Phase.Interval
    $repeat = $Phase.Repeat
    $label = $Phase.Label
    
    Write-Host "Moving to Phase: $label ($repeat iterations, spacing: $($interval)s)"
    
    for ($i = 1; $i -le $repeat; $i++) {
        Write-Host ""
        Write-Host "--- Check #$Iteration (Phase iteration $i/$repeat) ---"
        
        # Run monitor command
        pnpm monitor
        $status = $LASTEXITCODE
        
        if ($status -ne 0) {
            Write-Host "ANOMALY DETECTED: Monitor exited with non-zero code ($status)."
            Write-Host "Halting loop monitoring script. Action required!"
            Exit $status
        }
        
        Write-Host "Check #$Iteration successful. Sleeping for $($interval)s..."
        Start-Sleep -Seconds $interval
        $Iteration++
    }
}

Write-Host "========================================="
Write-Host "Loop monitoring schedule completed successfully!"
Write-Host "========================================="
