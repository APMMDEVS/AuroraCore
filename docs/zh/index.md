---
layout: home

hero:
  name: "AMMF3-Core"
  text: "Android Root 日志系统与文件监听工具"
  tagline: 专为Android root环境设计的高性能日志记录和文件监控解决方案
  image:
    src: /logo.svg
    alt: AMMF3-Core
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/Aurora-Nasa-1/AMMF3-Core
    - theme: alt
      text: English Docs
      link: /

features:
  - icon: ⚡
    title: 高性能与省电设计
    details: 针对Android root环境优化，采用智能缓冲、批量I/O操作和智能轮询机制，最大限度减少CPU使用率和功耗。
    
  - icon: 📝
    title: 先进的日志系统
    details: 守护进程-客户端架构，支持自动日志轮转、可配置缓冲区大小和开发者友好的API。支持多种日志级别和自定义格式。
    
  - icon: 👁️
    title: 智能文件监听
    details: 基于inotify的文件监控，支持自定义命令执行、回调机制和省电设计。完美适用于实时文件系统监控。
    
  - icon: 🛠️
    title: 开发者友好的API
    details: 现代C++20头文件库，接口直观易用。可轻松集成到现有的Android应用程序和系统服务中。
    
  - icon: 🔧
    title: 灵活的配置选项
    details: 全面的配置选项，包括文件大小、轮转策略、缓冲区管理和监控事件。适应各种使用场景。
    
  - icon: 📱
    title: Android 原生支持
    details: 专为Android使用NDK构建，完全支持ARM64和ARMv7架构。针对Android的独特约束和要求进行优化。
---

## 快速示例

### Logger API 使用方法

```cpp
#include "loggerAPI/logger_api.hpp"

int main() {
    // 配置日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "app.log";
    config.max_file_size = 10 * 1024 * 1024; // 10MB
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    
    LoggerAPI::init_logger(config);
    
    // 开始记录日志
    LoggerAPI::info("应用程序已启动");
    LoggerAPI::debug("调试信息");
    LoggerAPI::error("发生错误");
    
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### FileWatcher API 使用方法

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"

int main() {
    FileWatcherAPI::FileWatcher watcher;
    
    // 添加文件监听和回调
    watcher.add_watch("/data/config", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::cout << "文件 " << event.filename 
                      << " 被 " << FileWatcherAPI::event_type_to_string(event.type) 
                      << std::endl;
        },
        FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::CREATE
        })
    );
    
    watcher.start();
    // ... 你的应用程序逻辑
    watcher.stop();
    
    return 0;
}
```

## 为什么选择 AMMF3-Core？

- **🎯 专门构建**: 专为Android root环境约束而设计
- **⚡ 高性能**: 优化以实现最小的CPU使用率和功耗
- **🔒 可靠性**: 经过实战测试的守护进程-客户端架构，具有强大的错误处理能力
- **📚 文档完善**: 提供全面的文档，包含示例和最佳实践
- **🚀 易于集成**: 头文件API，可无缝集成到现有项目中

## 开始使用

准备将AMMF3-Core集成到你的Android项目中？查看我们的[快速开始指南](/zh/guide/getting-started)或浏览[API参考](/zh/api/logger-api)获取详细文档。

## 社区与支持

- 📖 [文档](/zh/guide/introduction)
- 🐛 [问题跟踪](https://github.com/Aurora-Nasa-1/AMMF3-Core/issues)
- 💬 [讨论区](https://github.com/Aurora-Nasa-1/AMMF3-Core/discussions)
- 📧 [联系我们](mailto:support@Aurora-Nasa-1.com)