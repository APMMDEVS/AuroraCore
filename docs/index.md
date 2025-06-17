---
layout: home

hero:
  name: "AMMF3-Core"
  text: "Android Root Logger & File Watcher"
  tagline: High-performance logging and file monitoring solution designed specifically for Android root environment
  image:
    src: /logo.svg
    alt: AMMF3-Core
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/Aurora-Nasa-1/AMMF3-Core
    - theme: alt
      text: 中文文档
      link: /zh/

features:
  - icon: ⚡
    title: High Performance & Power Efficient
    details: Optimized for Android root environment with intelligent buffering, batch I/O operations, and smart polling mechanisms to minimize CPU usage and power consumption.
    
  - icon: 📝
    title: Advanced Logger System
    details: Daemon-client architecture with automatic log rotation, configurable buffer sizes, and developer-friendly API. Supports multiple log levels and custom formatting.
    
  - icon: 👁️
    title: Intelligent File Watcher
    details: inotify-based file monitoring with custom command execution, callback mechanisms, and power-saving design. Perfect for real-time file system monitoring.
    
  - icon: 🛠️
    title: Developer-Friendly APIs
    details: Modern C++20 header-only libraries with intuitive interfaces. Easy integration into existing Android applications and system services.
    
  - icon: 🔧
    title: Flexible Configuration
    details: Comprehensive configuration options for file sizes, rotation policies, buffer management, and monitoring events. Adaptable to various use cases.
    
  - icon: 📱
    title: Android Native
    details: Built specifically for Android using NDK, with full support for ARM64 and ARMv7 architectures. Optimized for Android's unique constraints and requirements.
---

## Quick Example

### Logger API Usage

```cpp
#include "loggerAPI/logger_api.hpp"

int main() {
    // Configure logger
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "app.log";
    config.max_file_size = 10 * 1024 * 1024; // 10MB
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    
    LoggerAPI::init_logger(config);
    
    // Start logging
    LoggerAPI::info("Application started");
    LoggerAPI::debug("Debug information");
    LoggerAPI::error("Error occurred");
    
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### FileWatcher API Usage

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"

int main() {
    FileWatcherAPI::FileWatcher watcher;
    
    // Add file watch with callback
    watcher.add_watch("/data/config", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::cout << "File " << event.filename 
                      << " was " << FileWatcherAPI::event_type_to_string(event.type) 
                      << std::endl;
        },
        FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::CREATE
        })
    );
    
    watcher.start();
    // ... your application logic
    watcher.stop();
    
    return 0;
}
```

## Why AMMF3-Core?

- **🎯 Purpose-Built**: Specifically designed for Android root environment constraints
- **⚡ Performance**: Optimized for minimal CPU usage and power consumption
- **🔒 Reliable**: Battle-tested daemon-client architecture with robust error handling
- **📚 Well-Documented**: Comprehensive documentation with examples and best practices
- **🚀 Easy Integration**: Header-only APIs for seamless integration into existing projects

## Getting Started

Ready to integrate AMMF3-Core into your Android project? Check out our [Getting Started Guide](/guide/getting-started) or explore the [API Reference](/api/logger-api) for detailed documentation.

## Community & Support

- 📖 [Documentation](/guide/introduction)
- 🐛 [Issue Tracker](https://github.com/Aurora-Nasa-1/AMMF3-Core/issues)
- 💬 [Discussions](https://github.com/Aurora-Nasa-1/AMMF3-Core/discussions)
- 📧 [Contact Us](mailto:support@Aurora-Nasa-1.com)