# API Reference

Comprehensive API documentation for AMMF3-Core components.

## 📚 Available APIs

### Core Components

- **[Logger API](./logger-api)** - High-performance logging system
  - Synchronous and asynchronous logging
  - Multiple output formats and destinations
  - Log rotation and compression
  - Daemon mode for system-wide logging

- **[FileWatcher API](./filewatcher-api)** - Real-time file system monitoring
  - inotify-based file watching
  - Recursive directory monitoring
  - Event filtering and batching
  - High-performance event processing

- **[CLI Tools](./cli-tools)** - Command-line utilities
  - Logger daemon management
  - File monitoring tools
  - Configuration utilities
  - Performance testing tools

## 🚀 Quick Start

### Basic Logger Usage

```cpp
#include "ammf3/logger_api.hpp"

// Initialize logger
LoggerConfig config;
config.log_dir = "/sdcard/logs";
config.max_file_size = 10 * 1024 * 1024;  // 10MB

Logger logger(config);

// Log messages
logger.info("Application started");
logger.error("Error occurred: {}", error_message);
```

### Basic FileWatcher Usage

```cpp
#include "ammf3/filewatcher_api.hpp"

// Setup file watcher
FileWatcherConfig config;
config.recursive = true;
config.events = FileEvent::CREATED | FileEvent::MODIFIED;

FileWatcher watcher("/path/to/watch", config);

// Set callback
watcher.set_callback([](const FileEvent& event) {
    std::cout << "File " << event.path << " was " << event.type << std::endl;
});

watcher.start();
```

## 📖 API Categories

### Logging APIs

| Component | Description | Use Case |
|-----------|-------------|----------|
| Logger | Core logging functionality | Application logging |
| LoggerDaemon | System-wide logging service | Centralized logging |
| LoggerClient | Client for daemon communication | Multi-process logging |

### File Monitoring APIs

| Component | Description | Use Case |
|-----------|-------------|----------|
| FileWatcher | File system event monitoring | Real-time file tracking |
| WatcherCore | Low-level inotify wrapper | Custom monitoring solutions |

### Utility APIs

| Component | Description | Use Case |
|-----------|-------------|----------|
| BufferManager | Memory buffer management | High-performance I/O |
| FileManager | File operations and rotation | Log file management |
| IPCClient | Inter-process communication | Daemon communication |

## 🔧 Configuration

### Logger Configuration

```cpp
struct LoggerConfig {
    std::string log_dir = "/tmp/logs";
    size_t max_file_size = 10 * 1024 * 1024;
    int max_files = 5;
    LogLevel min_level = LogLevel::INFO;
    bool async_mode = true;
    size_t buffer_size = 1024 * 1024;
    int flush_interval = 5000;
};
```

### FileWatcher Configuration

```cpp
struct FileWatcherConfig {
    bool recursive = false;
    int max_depth = -1;
    FileEventMask events = FileEvent::ALL;
    std::vector<std::string> exclude_patterns;
    std::function<bool(const std::string&)> file_filter;
};
```

## 📊 Performance Considerations

### Logger Performance

- **Buffer Size**: Larger buffers reduce I/O frequency
- **Async Mode**: Non-blocking logging for better performance
- **Compression**: Reduces disk usage but increases CPU load
- **Daemon Mode**: Centralizes logging overhead

### FileWatcher Performance

- **Event Filtering**: Reduce unnecessary events
- **Batch Processing**: Handle multiple events together
- **Recursive Limits**: Avoid deep directory structures
- **inotify Limits**: System-level watch limits

## 🔗 Related Documentation

- [Getting Started Guide](/guide/getting-started)
- [Performance Optimization](/guide/performance)
- [Building from Source](/guide/building)
- [FAQ](/guide/faq)
- [Basic Usage Examples](/examples/basic-usage)

## 📞 Support

For API-specific questions:

- Check the detailed API documentation for each component
- Review the [FAQ](/guide/faq) for common issues
- Browse [examples](/examples/basic-usage) for usage patterns
- Submit issues on [GitHub](https://github.com/your-username/AMMF3-Core/issues)