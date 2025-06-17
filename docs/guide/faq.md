# Frequently Asked Questions (FAQ)

Common questions and solutions for AMMF3-Core usage in Android root environments.

## 🔧 Installation & Setup

### Q: What are the minimum system requirements?

**A:** AMMF3-Core requires:
- Android NDK r21 or higher
- CMake 3.10 or higher
- Linux kernel 2.6.13+ (for inotify support)
- Root privileges for system-level operations
- ARM64 or ARMv7 architecture

### Q: How do I verify that AMMF3-Core is working correctly?

**A:** Run the test programs after building:

```bash
# Test logger functionality
./tests/test_logger_api

# Test file watcher functionality
./tests/test_filewatcher_api

# Test command-line tools
./logger_daemon -f /tmp/test.log &
./logger_client "Test message"
cat /tmp/test.log
```

### Q: Can I use AMMF3-Core without root privileges?

**A:** Limited functionality is available without root:
- Logger API works in user directories (e.g., `/data/local/tmp/`)
- FileWatcher works for user-accessible paths
- System-level monitoring requires root privileges

## 📝 Logger Issues

### Q: Logger daemon fails to start with "Permission denied" error

**A:** This usually indicates insufficient permissions:

```bash
# Ensure the binary has execute permissions
chmod 755 ./logger_daemon

# Check if the log directory is writable
ls -la /data/local/tmp/

# Try running with explicit permissions
su -c "./logger_daemon -f /data/local/tmp/app.log"
```

### Q: Log files are not being created

**A:** Check the following:

1. **Directory permissions**:
   ```bash
   mkdir -p /data/local/tmp/logs
   chmod 777 /data/local/tmp/logs
   ```

2. **Disk space**:
   ```bash
   df -h /data/local/tmp/
   ```

3. **SELinux policies** (if applicable):
   ```bash
   getenforce
   setenforce 0  # Temporarily disable for testing
   ```

### Q: Logger performance is slow

**A:** Optimize configuration:

```cpp
// Increase buffer size
config.buffer_size = 1024 * 1024;  // 1MB

// Reduce flush frequency
config.flush_interval_ms = 5000;   // 5 seconds

// Use appropriate log level
config.min_log_level = LoggerAPI::LogLevel::INFO;
```

### Q: Log files become too large

**A:** Configure automatic rotation:

```cpp
config.max_file_size = 10 * 1024 * 1024;  // 10MB per file
config.max_file_count = 5;                 // Keep 5 files
config.auto_rotate = true;
```

## 📁 FileWatcher Issues

### Q: FileWatcher stops receiving events

**A:** This often happens due to inotify limits:

```bash
# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances

# Increase limits
echo 524288 > /proc/sys/fs/inotify/max_user_watches
echo 8192 > /proc/sys/fs/inotify/max_user_instances
```

### Q: Getting "No space left on device" error

**A:** This indicates inotify watch limit exceeded:

```bash
# Temporary fix
sudo sysctl fs.inotify.max_user_watches=524288

# Permanent fix (add to /etc/sysctl.conf)
echo 'fs.inotify.max_user_watches=524288' >> /etc/sysctl.conf
```

### Q: FileWatcher consumes too much CPU

**A:** Optimize event filtering:

```cpp
// Use specific event types
auto mask = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::MODIFY,
    FileWatcherAPI::EventType::CREATE
    // Avoid ATTRIB and ACCESS events
});

// Watch parent directories instead of individual files
watcher.add_watch("/data/config", callback, mask);
```

### Q: Missing file events

**A:** Check for:

1. **Event queue overflow**:
   ```bash
   echo 16384 > /proc/sys/fs/inotify/max_queued_events
   ```

2. **Callback processing time**:
   ```cpp
   // Keep callbacks fast
   watcher.add_watch(path, [](const FileEvent& event) {
       // Queue for background processing
       event_queue.push(event);
   }, mask);
   ```

## 🔗 Integration Issues

### Q: How do I integrate AMMF3-Core with my existing Android app?

**A:** Use the API headers in your CMakeLists.txt:

```cmake
# Add AMMF3-Core to your project
add_subdirectory(path/to/AMMF3-Core)

# Link against the libraries
target_link_libraries(your_app
    loggerAPI
    filewatcherAPI
)

# Include headers
target_include_directories(your_app PRIVATE
    path/to/AMMF3-Core/src/loggerAPI
    path/to/AMMF3-Core/src/filewatcherAPI
)
```

### Q: Can I use AMMF3-Core with other logging frameworks?

**A:** Yes, AMMF3-Core can complement existing frameworks:

```cpp
// Use as a high-performance backend
class MyLogger {
public:
    void log(const std::string& message) {
        // Your existing logic
        existing_logger->log(message);
        
        // Also log to AMMF3-Core for system monitoring
        LoggerAPI::info(message);
    }
};
```

### Q: Thread safety concerns

**A:** AMMF3-Core is thread-safe:

```cpp
// Safe to call from multiple threads
std::thread t1([]() {
    LoggerAPI::info("Thread 1 message");
});

std::thread t2([]() {
    LoggerAPI::info("Thread 2 message");
});

t1.join();
t2.join();
```

## 🚀 Performance Questions

### Q: What's the maximum logging throughput?

**A:** Performance depends on configuration:

| Configuration | Throughput | Notes |
|---------------|------------|-------|
| Default | ~10,000 msg/sec | Balanced performance |
| Optimized | ~25,000 msg/sec | Large buffers, delayed flush |
| High-throughput | ~50,000 msg/sec | Memory-intensive |

### Q: How much memory does AMMF3-Core use?

**A:** Memory usage varies by configuration:

- **Logger**: 10-100MB (depending on buffer size)
- **FileWatcher**: 5-50MB (depending on watch count)
- **Minimal setup**: ~15MB total

### Q: Battery impact on Android devices?

**A:** AMMF3-Core is designed for efficiency:

- **Logger**: Minimal impact with proper buffering
- **FileWatcher**: Low CPU usage with inotify
- **Recommendations**: Use appropriate flush intervals and event filtering

## 🐛 Debugging Issues

### Q: How do I enable debug logging?

**A:** Set debug level and check output:

```cpp
// Enable debug logging
config.min_log_level = LoggerAPI::LogLevel::DEBUG;
config.enable_console_output = true;

LoggerAPI::init_logger(config);
LoggerAPI::debug("Debug message");
```

### Q: Logger daemon crashes on startup

**A:** Check for common issues:

```bash
# Run with strace to see system calls
strace -f ./logger_daemon -f /tmp/test.log

# Check for missing dependencies
ldd ./logger_daemon

# Verify file permissions
ls -la ./logger_daemon
```

### Q: Memory leaks detected

**A:** Use debugging tools:

```bash
# Run with AddressSanitizer (if built with -fsanitize=address)
export ASAN_OPTIONS=detect_leaks=1
./logger_daemon -f /tmp/test.log

# Use valgrind for detailed analysis
valgrind --tool=memcheck --leak-check=full ./logger_daemon -f /tmp/test.log
```

## 📱 Android-Specific Questions

### Q: Does AMMF3-Core work on all Android versions?

**A:** Compatibility:

- **Android 5.0+ (API 21+)**: Full support
- **Android 4.4 (API 19-20)**: Limited support
- **Older versions**: Not supported

### Q: How do I deploy to Android device?

**A:** Use ADB for deployment:

```bash
# Push binaries
adb push build/src/logger/logger_daemon /data/local/tmp/
adb push build/src/logger/logger_client /data/local/tmp/
adb push build/src/filewatcher/filewatcher /data/local/tmp/

# Set permissions
adb shell chmod 755 /data/local/tmp/logger_daemon
adb shell chmod 755 /data/local/tmp/logger_client
adb shell chmod 755 /data/local/tmp/filewatcher

# Test
adb shell "/data/local/tmp/logger_daemon -f /data/local/tmp/test.log &"
adb shell "/data/local/tmp/logger_client 'Hello Android'"
```

### Q: SELinux compatibility issues

**A:** Handle SELinux policies:

```bash
# Check SELinux status
adb shell getenforce

# Temporarily disable for testing
adb shell su -c "setenforce 0"

# Check for denials
adb shell dmesg | grep avc

# Create custom policy (advanced)
# Consult Android security documentation
```

## 🔧 Build Issues

### Q: CMake configuration fails

**A:** Common solutions:

```bash
# Ensure NDK path is correct
export ANDROID_NDK=/path/to/android-ndk

# Clear CMake cache
rm -rf build/
mkdir build && cd build

# Use correct toolchain
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21
```

### Q: Compilation errors with C++20 features

**A:** Ensure proper compiler support:

```cmake
# In CMakeLists.txt
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# For older NDK versions, use C++17
set(CMAKE_CXX_STANDARD 17)
```

### Q: Linking errors

**A:** Check library dependencies:

```cmake
# Ensure proper linking
target_link_libraries(your_target
    loggerAPI
    filewatcherAPI
    pthread  # Required for threading
)
```

## 📞 Getting Help

If you can't find the answer here:

1. **Check the documentation**: [API Reference](/api/)
2. **Review examples**: [Basic Usage](/examples/basic-usage)
3. **Search issues**: [GitHub Issues](https://github.com/your-username/AMMF3-Core/issues)
4. **Ask questions**: [GitHub Discussions](https://github.com/your-username/AMMF3-Core/discussions)

## 🔗 Related Documentation

- [Getting Started Guide](/guide/getting-started)
- [Performance Optimization](/guide/performance)
- [Building from Source](/guide/building)
- [Logger API Reference](/api/logger-api)
- [FileWatcher API Reference](/api/filewatcher-api)
- [Command Line Tools](/api/cli-tools)