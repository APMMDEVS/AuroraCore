# FileWatcher System Core Concepts

The AMMF3-Core FileWatcher is a high-performance, event-driven file system monitoring solution built specifically for Android environments. This guide explores the core concepts and architecture of the FileWatcher component.

## Architecture Overview

The FileWatcher system is built on Linux's inotify mechanism, providing real-time file system event monitoring:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  FileWatcher    │───▶│   Event Queue    │───▶│  Event Callback │
│     API         │    │                  │    │   Dispatcher    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         └─────────────▶│  inotify Core    │    │  User Callbacks │
                        └──────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
                        ┌──────────────────┐    ┌─────────────────┐
                        │  Kernel Events   │    │  Application    │
                        └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. FileWatcher API

The main interface for monitoring file system events.

**Key Features:**
- Real-time event notification
- Multiple event type support
- Recursive directory monitoring
- Custom event filtering
- Thread-safe operations

**Supported Event Types:**
```cpp
enum class EventType {
    MODIFY = IN_MODIFY,     // File content modified
    CREATE = IN_CREATE,     // File/directory created
    DELETE = IN_DELETE,     // File/directory deleted
    MOVE   = IN_MOVE,       // File/directory moved
    ATTRIB = IN_ATTRIB,     // Attributes changed
    ACCESS = IN_ACCESS      // File accessed
};
```

### 2. Event Processing System

**Event Structure:**
```cpp
struct FileEvent {
    std::string path;       // Full path to the watched directory
    std::string filename;   // Name of the affected file
    EventType type;         // Type of event that occurred
    uint32_t mask;          // Raw inotify event mask
};
```

**Event Flow:**
1. **Kernel Detection**: Linux kernel detects file system changes
2. **inotify Notification**: Kernel sends notification to inotify file descriptor
3. **Event Parsing**: FileWatcher parses raw inotify events
4. **Event Filtering**: Apply user-defined filters
5. **Callback Execution**: Execute registered callback functions

### 3. Watch Management

**Watch Registration:**
```cpp
bool add_watch(const std::string& path, 
               EventCallback callback, 
               uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE);
```

**Watch Lifecycle:**
- **Registration**: Add path to monitoring list
- **Active Monitoring**: Continuously monitor for events
- **Event Delivery**: Deliver events to registered callbacks
- **Cleanup**: Remove watch when no longer needed

## Event Types and Use Cases

### File Modification Events

**IN_MODIFY**
- Triggered when file content changes
- Use cases: Configuration file monitoring, log file tailing
- Performance: High frequency for active files

**IN_ATTRIB**
- Triggered when file attributes change (permissions, timestamps)
- Use cases: Security monitoring, backup systems
- Performance: Lower frequency than content modifications

### File Creation and Deletion Events

**IN_CREATE**
- Triggered when files or directories are created
- Use cases: Hot folder processing, automatic file processing
- Performance: Moderate frequency

**IN_DELETE**
- Triggered when files or directories are deleted
- Use cases: Cleanup monitoring, security auditing
- Performance: Lower frequency

### File Movement Events

**IN_MOVE**
- Triggered when files are moved or renamed
- Use cases: File organization monitoring, backup synchronization
- Performance: Variable frequency

**IN_ACCESS**
- Triggered when files are accessed (read)
- Use cases: Access logging, usage analytics
- Performance: Very high frequency (use with caution)

## Performance Characteristics

### Throughput Metrics

| Event Type | Max Events/sec | CPU Usage | Memory Usage |
|------------|----------------|-----------|-------------|
| MODIFY | ~10,000 | Low | Minimal |
| CREATE/DELETE | ~5,000 | Low | Minimal |
| ACCESS | ~50,000 | Medium | Low |
| ATTRIB | ~2,000 | Very Low | Minimal |

### Resource Management

**File Descriptor Usage:**
- One inotify instance per FileWatcher
- One watch descriptor per monitored path
- Automatic cleanup on destruction

**Memory Efficiency:**
- Event structures use minimal memory
- No persistent event storage
- Efficient string handling for paths

## Power Management

The FileWatcher is designed with Android's power constraints in mind:

### Polling Strategy

```cpp
// Power-efficient polling with timeout
struct pollfd pfd = {inotify_fd_, POLLIN, 0};
int poll_result = poll(&pfd, 1, 1000); // 1 second timeout
```

**Benefits:**
- **CPU Efficiency**: Sleeps when no events are pending
- **Battery Life**: Reduces unnecessary wake-ups
- **Responsive**: Quick response to actual events

### Event Batching

- **Burst Handling**: Efficiently processes multiple events
- **Reduced Wake-ups**: Minimizes CPU wake-up frequency
- **Configurable Timeouts**: Adjustable based on application needs

## Thread Safety and Concurrency

### Thread Model

**Single Worker Thread:**
- One dedicated thread for event processing
- Non-blocking event reading
- Asynchronous callback execution

**Thread Safety Features:**
- Atomic operations for state management
- Thread-safe callback registration
- Proper synchronization for start/stop operations

### Callback Execution

**Execution Context:**
- Callbacks execute in the worker thread context
- Non-blocking callback execution recommended
- Exception safety with proper error handling

**Best Practices:**
```cpp
// Fast, non-blocking callback
void fast_callback(const FileEvent& event) {
    // Quick processing only
    event_queue.push(event);
}

// Avoid blocking operations in callbacks
void bad_callback(const FileEvent& event) {
    // DON'T: Blocking I/O operations
    std::this_thread::sleep_for(std::chrono::seconds(1));
}
```

## Error Handling and Recovery

### Common Error Scenarios

**Watch Limit Exceeded:**
```cpp
// Check system limits
cat /proc/sys/fs/inotify/max_user_watches
```
- **Solution**: Increase system limits or optimize watch usage
- **Fallback**: Implement polling-based monitoring

**Permission Denied:**
- **Cause**: Insufficient permissions to watch path
- **Solution**: Run with appropriate privileges or watch parent directory

**Path Not Found:**
- **Cause**: Watched path doesn't exist
- **Solution**: Create path or wait for path creation

### Recovery Mechanisms

**Automatic Retry:**
```cpp
bool add_watch_with_retry(const std::string& path, 
                         EventCallback callback,
                         int max_retries = 3) {
    for (int i = 0; i < max_retries; ++i) {
        if (add_watch(path, callback)) {
            return true;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(100 * (i + 1)));
    }
    return false;
}
```

## Integration Patterns

### Observer Pattern

```cpp
class FileObserver {
public:
    virtual void on_file_changed(const FileEvent& event) = 0;
};

class ConfigMonitor : public FileObserver {
public:
    void on_file_changed(const FileEvent& event) override {
        if (event.type == EventType::MODIFY) {
            reload_configuration();
        }
    }
};
```

### Event Queue Pattern

```cpp
class EventProcessor {
private:
    std::queue<FileEvent> event_queue_;
    std::mutex queue_mutex_;
    
public:
    void enqueue_event(const FileEvent& event) {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        event_queue_.push(event);
    }
    
    void process_events() {
        std::lock_guard<std::mutex> lock(queue_mutex_);
        while (!event_queue_.empty()) {
            auto event = event_queue_.front();
            event_queue_.pop();
            handle_event(event);
        }
    }
};
```

### Filter Chain Pattern

```cpp
class EventFilter {
public:
    virtual bool should_process(const FileEvent& event) = 0;
};

class ExtensionFilter : public EventFilter {
private:
    std::vector<std::string> allowed_extensions_;
    
public:
    bool should_process(const FileEvent& event) override {
        auto ext = get_file_extension(event.filename);
        return std::find(allowed_extensions_.begin(), 
                        allowed_extensions_.end(), ext) != allowed_extensions_.end();
    }
};
```

## Use Case Examples

### Configuration File Monitoring

```cpp
// Monitor configuration changes
FileWatcher watcher;
watcher.add_watch("/data/local/tmp/config", 
    [](const FileEvent& event) {
        if (event.filename == "app.conf" && event.type == EventType::MODIFY) {
            reload_application_config();
        }
    }, IN_MODIFY);
```

### Log File Rotation Detection

```cpp
// Detect log file rotation
watcher.add_watch("/data/local/tmp/logs",
    [](const FileEvent& event) {
        if (event.type == EventType::CREATE && 
            event.filename.find(".log") != std::string::npos) {
            setup_new_log_file(event.path + "/" + event.filename);
        }
    }, IN_CREATE);
```

### Security Monitoring

```cpp
// Monitor sensitive directories
watcher.add_watch("/system/etc",
    [](const FileEvent& event) {
        if (event.type == EventType::MODIFY || event.type == EventType::DELETE) {
            log_security_event(event);
            alert_administrator(event);
        }
    }, IN_MODIFY | IN_DELETE | IN_ATTRIB);
```

## Best Practices

### Performance Optimization

1. **Selective Monitoring**: Only watch necessary paths and events
2. **Efficient Callbacks**: Keep callback functions lightweight
3. **Event Filtering**: Filter events at the source when possible
4. **Batch Processing**: Process multiple events together

### Resource Management

1. **Watch Cleanup**: Remove watches when no longer needed
2. **Limit Watch Count**: Stay within system limits
3. **Memory Management**: Avoid memory leaks in callbacks
4. **Thread Management**: Properly start and stop worker threads

### Reliability

1. **Error Handling**: Implement proper error handling and recovery
2. **Graceful Degradation**: Provide fallback mechanisms
3. **Testing**: Test with various file system scenarios
4. **Monitoring**: Monitor FileWatcher health and performance

The FileWatcher system provides a robust, efficient foundation for real-time file system monitoring in Android environments, enabling responsive applications that can react immediately to file system changes.