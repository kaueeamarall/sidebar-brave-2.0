$name = 'ContextCommanderBridge'
Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
Get-CimInstance Win32_Process -Filter "Name='python.exe' OR Name='pythonw.exe'" | Where-Object { $_.CommandLine -match 'bridge\server\.py|server\.py' -and $_.CommandLine -match 'bridge' -or $_.CommandLine -eq 'python server.py' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Write-Host "Tarefa removida."
