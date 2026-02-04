# Enable script execution (only once needed)
Set-ExecutionPolicy Bypass -Scope Process -Force

# --- CONFIG ---
$CUDA_URL = "https://developer.download.nvidia.com/compute/cuda/11.8.0/local_installers/cuda_11.8.0_522.06_windows.exe"
$CUDNN_URL = "https://github.com/nvidia/cudnn/releases/download/v8.6.0/cudnn-windows-x86_64-8.6.0.163_cuda11-archive.zip"
$INSTALL_DIR = "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8"

# --- Download CUDA ---
Write-Host "Downloading CUDA 11.8..."
$cudaInstaller = "$env:TEMP\cuda_installer.exe"
Invoke-WebRequest -Uri $CUDA_URL -OutFile $cudaInstaller
Write-Host "Installing CUDA 11.8..."
Start-Process -Wait -FilePath $cudaInstaller -ArgumentList "-s nvcc_11.8 cudart_11.8" -NoNewWindow

# --- Download cuDNN ---
Write-Host "Downloading cuDNN 8.6..."
$cudnnZip = "$env:TEMP\cudnn.zip"
Invoke-WebRequest -Uri $CUDNN_URL -OutFile $cudnnZip

# Extract cuDNN
Write-Host "Extracting cuDNN..."
Expand-Archive -Path $cudnnZip -DestinationPath "$env:TEMP\cudnn" -Force

# Copy cuDNN files into CUDA folder
Write-Host "Installing cuDNN..."
Copy-Item -Path "$env:TEMP\cudnn\cudnn-windows-x86_64-8.6.0.163_cuda11-archive\bin\*" -Destination "$INSTALL_DIR\bin" -Force
Copy-Item -Path "$env:TEMP\cudnn\cudnn-windows-x86_64-8.6.0.163_cuda11-archive\include\*" -Destination "$INSTALL_DIR\include" -Force
Copy-Item -Path "$env:TEMP\cudnn\cudnn-windows-x86_64-8.6.0.163_cuda11-archive\lib\x64\*" -Destination "$INSTALL_DIR\lib\x64" -Force

# --- Update PATH ---
Write-Host "Updating Environment Variables..."
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";$INSTALL_DIR\bin;$INSTALL_DIR\libnvvp", [EnvironmentVariableTarget]::Machine)

Write-Host "✅ CUDA 11.8 + cuDNN 8.6 installed! Restart your PC before testing."
