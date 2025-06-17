# Installation Guide

This comprehensive guide will walk you through installing AuroraCore on your Android root environment, covering different installation methods and configuration options.

## System Requirements

### Hardware Requirements

- **Architecture**: ARM64 (aarch64) recommended, ARMv7 supported
- **RAM**: Minimum 512MB available, 1GB+ recommended
- **Storage**: 50MB for binaries, additional space for logs
- **Android Version**: Android 7.0 (API 24) or higher

### Software Requirements

- **Root Access**: Required for system-level operations
- **SELinux**: Permissive mode or appropriate policies
- **Kernel**: Linux kernel 3.10+ with inotify support

### Development Requirements (for building from source)

- **Android NDK**: r25c or higher
- **CMake**: 3.20 or higher
- **Compiler**: Clang with C++20 support
- **Build Tools**: Make, Ninja (optional)

## Installation Methods

### Method 1: Pre-built Binaries (Recommended)

#### Download Latest Release

```bash
# Download the latest release
wget https://github.com/APMMDEVS/AuroraCore/releases/latest/download/AuroraCore-arm64.tar.gz

# Extract the archive
tar -xzf AuroraCore-arm64.tar.gz
cd AuroraCore-arm64
```

#### Install System-wide

```bash
# Copy binaries to system directories
adb push lib/libAuroraCore_logger.so /system/lib64/
adb push lib/libAuroraCore_filewatcher.so /system/lib64/
adb push bin/AuroraCore_daemon /system/bin/
adb push include/* /system/include/AuroraCore/

# Set proper permissions
adb shell chmod 755 /system/bin/AuroraCore_daemon
adb shell chmod 644 /system/lib64/libAuroraCore_*.so
```

#### Install to Local Directory

```bash
# Create local installation directory
adb shell mkdir -p /data/local/tmp/AuroraCore

# Copy files
adb push lib/* /data/local/tmp/AuroraCore/lib/
adb push bin/* /data/local/tmp/AuroraCore/bin/
adb push include/* /data/local/tmp/AuroraCore/include/

# Set permissions
adb shell chmod -R 755 /data/local/tmp/AuroraCore/bin/
adb shell chmod -R 644 /data/local/tmp/AuroraCore/lib/
```

### Method 2: Building from Source

#### Clone Repository

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
git submodule update --init --recursive
```

#### Set Up Build Environment

```bash
# Set Android NDK path
export ANDROID_NDK_ROOT=/path/to/android-ndk

# Verify NDK installation
$ANDROID_NDK_ROOT/ndk-build --version
```

#### Configure Build for ARM64

```bash
# Create build directory
mkdir build-arm64
cd build-arm64

# Configure with CMake
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-24 \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DENABLE_TESTS=OFF
```

#### Build the Project

```bash
# Build with multiple cores
cmake --build . --parallel $(nproc)

# Verify build
ls -la src/*/lib*.so
ls -la examples/
```

#### Install Built Binaries

```bash
# Install to device
cmake --install . --prefix /data/local/tmp/AuroraCore

# Or create distribution package
cpack -G TGZ
```

### Method 3: Package Manager Installation

#### Using Termux (if available)

```bash
# Add AuroraCore repository
echo "deb https://APMMDEVS.github.io/termux-packages/ termux main" >> $PREFIX/etc/apt/sources.list

# Update package list
apt update

# Install AuroraCore
apt install AuroraCore
```

#### Using Custom Package Manager

```bash
# Download package manager
wget https://github.com/APMMDEVS/AuroraCore/releases/latest/download/AuroraCore-installer.sh
chmod +x AuroraCore-installer.sh

# Run installer
./AuroraCore-installer.sh --install --prefix=/data/local/tmp/AuroraCore
```

## Configuration

### Environment Setup

#### Set Library Path

```bash
# Add to shell profile (.bashrc, .zshrc, etc.)
export LD_LIBRARY_PATH=/data/local/tmp/AuroraCore/lib:$LD_LIBRARY_PATH
export PATH=/data/local/tmp/AuroraCore/bin:$PATH

# For system-wide installation
export LD_LIBRARY_PATH=/system/lib64:$LD_LIBRARY_PATH
export PATH=/system/bin:$PATH
```

#### Create Configuration Directory

```bash
# Create config directory
mkdir -p /data/local/tmp/AuroraCore/config

# Set permissions
chmod 755 /data/local/tmp/AuroraCore/config
```

### Logger Configuration

#### Create Logger Config File

```bash
cat > /data/local/tmp/AuroraCore/config/logger.conf << 'EOF'
# AuroraCore Logger Configuration

[General]
log_level = INFO
log_format = "{timestamp} [{level}] [{thread_id}] {message}"
auto_flush = true
flush_interval_ms = 1000

[Files]
log_path = "/data/local/tmp/logs/app.log"
max_file_size = 10485760  # 10MB
max_files = 5
compress_rotated = true

[Performance]
buffer_size = 65536  # 64KB
worker_threads = 2
memory_mapped_io = true

[Daemon]
enable_daemon = false
socket_path = "/data/local/tmp/AuroraCore/logger.sock"
max_clients = 10
EOF
```

#### Create Log Directory

```bash
# Create log directory
mkdir -p /data/local/tmp/logs
chmod 755 /data/local/tmp/logs

# Create initial log file
touch /data/local/tmp/logs/app.log
chmod 644 /data/local/tmp/logs/app.log
```

### FileWatcher Configuration

#### Create FileWatcher Config File

```bash
cat > /data/local/tmp/AuroraCore/config/filewatcher.conf << 'EOF'
# AuroraCore FileWatcher Configuration

[General]
event_buffer_size = 4096
max_watches = 1000
recursive_watch = true

[Events]
watch_modify = true
watch_create = true
watch_delete = true
watch_move = true
watch_attrib = false
watch_access = false

[Performance]
poll_timeout_ms = 1000
batch_events = true
max_batch_size = 100

[Filters]
ignore_hidden_files = true
ignore_temp_files = true
file_extensions = [".log", ".conf", ".txt"]
EOF
```

### SELinux Configuration (if needed)

#### Check SELinux Status

```bash
# Check current SELinux mode
getenforce

# Check file contexts
ls -Z /data/local/tmp/AuroraCore/
```

#### Set SELinux Contexts

```bash
# Set appropriate contexts for binaries
chcon u:object_r:system_file:s0 /data/local/tmp/AuroraCore/bin/*
chcon u:object_r:system_lib_file:s0 /data/local/tmp/AuroraCore/lib/*

# Set contexts for config files
chcon u:object_r:system_data_file:s0 /data/local/tmp/AuroraCore/config/*
```

#### Create SELinux Policy (if needed)

```bash
# Create custom policy file
cat > AuroraCore.te << 'EOF'
policy_module(AuroraCore, 1.0)

type AuroraCore_exec_t;
type AuroraCore_lib_t;
type AuroraCore_data_t;

allow untrusted_app AuroraCore_exec_t:file execute;
allow untrusted_app AuroraCore_lib_t:file { read open };
allow untrusted_app AuroraCore_data_t:file { read write create };
EOF

# Compile and load policy
checkmodule -M -m -o AuroraCore.mod AuroraCore.te
semodule_package -o AuroraCore.pp -m AuroraCore.mod
semodule -i AuroraCore.pp
```

## Verification

### Test Logger Installation

```bash
# Test logger API
cat > test_logger.cpp << 'EOF'
#include <AuroraCore/logger_api.hpp>
#include <iostream>

int main() {
    try {
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/logs/test.log";
        
        LoggerAPI::InternalLogger logger(config);
        logger.log(LoggerAPI::LogLevel::INFO, "Logger test successful!");
        
        std::cout << "Logger test passed!" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Logger test failed: " << e.what() << std::endl;
        return 1;
    }
}
EOF

# Compile and run test
g++ -std=c++20 -I/data/local/tmp/AuroraCore/include \
    -L/data/local/tmp/AuroraCore/lib -lAuroraCore_logger \
    test_logger.cpp -o test_logger

./test_logger
```

### Test FileWatcher Installation

```bash
# Test FileWatcher API
cat > test_filewatcher.cpp << 'EOF'
#include <AuroraCore/filewatcher_api.hpp>
#include <iostream>
#include <chrono>
#include <thread>

int main() {
    try {
        FileWatcherAPI::FileWatcher watcher;
        
        bool event_received = false;
        watcher.add_watch("/data/local/tmp", 
            [&event_received](const FileWatcherAPI::FileEvent& event) {
                std::cout << "Event: " << event.filename << std::endl;
                event_received = true;
            });
        
        watcher.start();
        
        // Create test file
        system("touch /data/local/tmp/test_file");
        
        // Wait for event
        std::this_thread::sleep_for(std::chrono::seconds(2));
        
        watcher.stop();
        
        if (event_received) {
            std::cout << "FileWatcher test passed!" << std::endl;
            return 0;
        } else {
            std::cout << "FileWatcher test failed: No events received" << std::endl;
            return 1;
        }
    } catch (const std::exception& e) {
        std::cerr << "FileWatcher test failed: " << e.what() << std::endl;
        return 1;
    }
}
EOF

# Compile and run test
g++ -std=c++20 -I/data/local/tmp/AuroraCore/include \
    -L/data/local/tmp/AuroraCore/lib -lAuroraCore_filewatcher \
    test_filewatcher.cpp -o test_filewatcher

./test_filewatcher
```

### System Integration Test

```bash
# Run comprehensive test suite
/data/local/tmp/AuroraCore/bin/AuroraCore_test --all

# Check system resources
ps aux | grep AuroraCore
lsof | grep AuroraCore

# Verify file permissions
ls -la /data/local/tmp/AuroraCore/
ls -la /data/local/tmp/logs/
```

## Troubleshooting

### Common Issues

#### Permission Denied Errors

```bash
# Check file permissions
ls -la /data/local/tmp/AuroraCore/

# Fix permissions
chmod -R 755 /data/local/tmp/AuroraCore/bin/
chmod -R 644 /data/local/tmp/AuroraCore/lib/
```

#### Library Not Found Errors

```bash
# Check library path
echo $LD_LIBRARY_PATH

# Add library path
export LD_LIBRARY_PATH=/data/local/tmp/AuroraCore/lib:$LD_LIBRARY_PATH

# Verify libraries
ldd /data/local/tmp/AuroraCore/bin/AuroraCore_daemon
```

#### SELinux Denials

```bash
# Check for denials
dmesg | grep avc

# Temporarily set permissive mode
setenforce 0

# Test functionality
# Then create appropriate policies
```

#### inotify Limits

```bash
# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances

# Increase limits (requires root)
echo 524288 > /proc/sys/fs/inotify/max_user_watches
echo 128 > /proc/sys/fs/inotify/max_user_instances
```

### Log Analysis

```bash
# Check installation logs
tail -f /data/local/tmp/logs/AuroraCore_install.log

# Check runtime logs
tail -f /data/local/tmp/logs/app.log

# Check system logs
logcat | grep AuroraCore
```

### Performance Verification

```bash
# Run performance benchmarks
/data/local/tmp/AuroraCore/bin/AuroraCore_benchmark --logger --filewatcher

# Monitor resource usage
top -p $(pgrep AuroraCore)

# Check memory usage
cat /proc/$(pgrep AuroraCore)/status | grep -E "VmSize|VmRSS"
```

## Uninstallation

### Remove Binaries

```bash
# Remove local installation
rm -rf /data/local/tmp/AuroraCore/

# Remove system installation
rm -f /system/lib64/libAuroraCore_*.so
rm -f /system/bin/AuroraCore_daemon
rm -rf /system/include/AuroraCore/
```

### Clean Configuration

```bash
# Remove configuration files
rm -rf /data/local/tmp/AuroraCore/config/

# Remove log files (optional)
rm -rf /data/local/tmp/logs/
```

### Reset Environment

```bash
# Remove environment variables
unset LD_LIBRARY_PATH
unset PATH

# Remove from shell profile
sed -i '/AuroraCore/d' ~/.bashrc
```

This installation guide provides comprehensive coverage of different installation methods and configurations, ensuring AuroraCore can be successfully deployed in various Android root environments.