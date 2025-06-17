# FileWatcher API Reference

The FileWatcher API provides efficient, low-power file system monitoring capabilities for Android root environments. Built on Linux inotify, it offers real-time file change detection with customizable event handling.

## Overview

The FileWatcher API enables applications to monitor file system changes with minimal CPU usage and power consumption. It supports:

- **Real-time monitoring**: inotify-based event detection
- **Custom callbacks**: User-defined event handlers
- **Power efficiency**: Smart polling with sleep mechanisms
- **Multiple watch points**: Monitor multiple files/directories simultaneously
- **Event filtering**: Configurable event types

## Core Classes

### FileWatcher

The main class for file system monitoring.

```cpp
class FileWatcher {
public:
    FileWatcher();
    ~FileWatcher();
    
    bool add_watch(const std::string& path, EventCallback callback, 
                   uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE);
    void start();
    void stop();
    bool is_running() const;
};
```

## Event Types

### EventType Enum

```cpp
enum class EventType {
    MODIFY = IN_MODIFY,    // File was modified
    CREATE = IN_CREATE,    // File/directory was created
    DELETE = IN_DELETE,    // File/directory was deleted
    MOVE   = IN_MOVE,      // File/directory was moved
    ATTRIB = IN_ATTRIB,    // Metadata changed (permissions, timestamps, etc.)
    ACCESS = IN_ACCESS     // File was accessed (read)
};
```

### Event Descriptions

| Event Type | Description | Use Cases |
|------------|-------------|----------|
| `MODIFY` | File content changed | Configuration file updates, log file changes |
| `CREATE` | New file/directory created | New file detection, directory monitoring |
| `DELETE` | File/directory deleted | Cleanup detection, file removal monitoring |
| `MOVE` | File/directory moved/renamed | File organization tracking |
| `ATTRIB` | Metadata changed | Permission changes, timestamp updates |
| `ACCESS` | File accessed (read) | Usage tracking, security monitoring |

## Event Structure

### FileEvent

```cpp
struct FileEvent {
    std::string path;        // Path being watched
    std::string filename;    // Name of the affected file (empty for directory events)
    EventType type;          // Type of event that occurred
    uint32_t mask;          // Raw inotify event mask
};
```

**Example Event:**
```cpp
FileEvent {
    path = "/data/config",
    filename = "app.conf",
    type = EventType::MODIFY,
    mask = IN_MODIFY
}
```

## Callback Functions

### EventCallback Type

```cpp
using EventCallback = std::function<void(const FileEvent&)>;
```

**Example Callback:**
```cpp
auto callback = [](const FileWatcherAPI::FileEvent& event) {
    std::cout << "File " << event.filename 
              << " was " << FileWatcherAPI::event_type_to_string(event.type)
              << " in " << event.path << std::endl;
};
```

## Constructor and Destructor

### FileWatcher()

```cpp
FileWatcher();
```

Creates a new FileWatcher instance and initializes the inotify file descriptor.

**Example:**
```cpp
FileWatcherAPI::FileWatcher watcher;
```

### ~FileWatcher()

```cpp
~FileWatcher();
```

Automatically stops monitoring and cleans up resources.

## Core Methods

### add_watch()

```cpp
bool add_watch(const std::string& path, EventCallback callback, 
               uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE);
```

Adds a watch point for the specified path.

**Parameters:**
- `path`: File or directory path to monitor
- `callback`: Function to call when events occur
- `events`: Bitmask of events to monitor (optional)

**Returns:**
- `true`: Watch added successfully
- `false`: Failed to add watch (path doesn't exist, permission denied, etc.)

**Example:**
```cpp
// Watch for file modifications
bool success = watcher.add_watch("/data/config/app.conf", 
    [](const FileWatcherAPI::FileEvent& event) {
        std::cout << "Config file changed!" << std::endl;
    },
    static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
);

if (!success) {
    std::cerr << "Failed to add watch" << std::endl;
}
```

### start()

```cpp
void start();
```

Starts the file monitoring in a background thread. Safe to call multiple times.

**Example:**
```cpp
watcher.start();
std::cout << "File monitoring started" << std::endl;
```

### stop()

```cpp
void stop();
```

Stops file monitoring and waits for the background thread to finish. Safe to call multiple times.

**Example:**
```cpp
watcher.stop();
std::cout << "File monitoring stopped" << std::endl;
```

### is_running()

```cpp
bool is_running() const;
```

Checks if the file watcher is currently running.

**Returns:**
- `true`: Watcher is active
- `false`: Watcher is stopped

**Example:**
```cpp
if (watcher.is_running()) {
    std::cout << "Watcher is active" << std::endl;
} else {
    std::cout << "Watcher is stopped" << std::endl;
}
```

## Utility Functions

### make_event_mask()

```cpp
uint32_t make_event_mask(std::initializer_list<EventType> events);
```

Creates an event mask from a list of event types.

**Parameters:**
- `events`: List of EventType values

**Returns:**
- Combined event mask for use with `add_watch()`

**Example:**
```cpp
auto mask = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::CREATE,
    FileWatcherAPI::EventType::DELETE,
    FileWatcherAPI::EventType::MODIFY
});

watcher.add_watch("/data/logs", callback, mask);
```

### event_type_to_string()

```cpp
std::string event_type_to_string(EventType type);
```

Converts an EventType to its string representation.

**Parameters:**
- `type`: EventType to convert

**Returns:**
- String representation of the event type

**Example:**
```cpp
std::string event_name = FileWatcherAPI::event_type_to_string(FileWatcherAPI::EventType::MODIFY);
// event_name = "MODIFY"
```

## Usage Patterns

### Basic File Monitoring

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>

int main() {
    FileWatcherAPI::FileWatcher watcher;
    
    // Monitor a configuration file
    watcher.add_watch("/data/config/app.conf", 
        [](const FileWatcherAPI::FileEvent& event) {
            if (event.type == FileWatcherAPI::EventType::MODIFY) {
                std::cout << "Configuration file updated!" << std::endl;
                // Reload configuration
            }
        },
        static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
    );
    
    watcher.start();
    
    // Keep the application running
    std::cout << "Press Enter to stop monitoring..." << std::endl;
    std::cin.get();
    
    watcher.stop();
    return 0;
}
```

### Directory Monitoring

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>

class DirectoryMonitor {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    void startMonitoring(const std::string& directory) {
        // Monitor all file operations in directory
        auto events = FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::CREATE,
            FileWatcherAPI::EventType::DELETE,
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::MOVE
        });
        
        watcher_.add_watch(directory, 
            [this](const FileWatcherAPI::FileEvent& event) {
                handleFileEvent(event);
            }, events);
        
        watcher_.start();
        std::cout << "Monitoring directory: " << directory << std::endl;
    }
    
    void stopMonitoring() {
        watcher_.stop();
        std::cout << "Directory monitoring stopped" << std::endl;
    }
    
private:
    void handleFileEvent(const FileWatcherAPI::FileEvent& event) {
        std::string action = FileWatcherAPI::event_type_to_string(event.type);
        
        if (!event.filename.empty()) {
            std::cout << "File " << event.filename 
                      << " was " << action 
                      << " in " << event.path << std::endl;
        } else {
            std::cout << "Directory event: " << action 
                      << " in " << event.path << std::endl;
        }
        
        // Handle specific events
        switch (event.type) {
            case FileWatcherAPI::EventType::CREATE:
                onFileCreated(event.path + "/" + event.filename);
                break;
            case FileWatcherAPI::EventType::DELETE:
                onFileDeleted(event.path + "/" + event.filename);
                break;
            case FileWatcherAPI::EventType::MODIFY:
                onFileModified(event.path + "/" + event.filename);
                break;
            default:
                break;
        }
    }
    
    void onFileCreated(const std::string& filepath) {
        std::cout << "New file detected: " << filepath << std::endl;
    }
    
    void onFileDeleted(const std::string& filepath) {
        std::cout << "File removed: " << filepath << std::endl;
    }
    
    void onFileModified(const std::string& filepath) {
        std::cout << "File updated: " << filepath << std::endl;
    }
};
```

### Multiple Watch Points

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <vector>

class MultiWatcher {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    void setupWatches() {
        // Watch configuration files
        watcher_.add_watch("/data/config", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[CONFIG] " << event.filename 
                          << " " << FileWatcherAPI::event_type_to_string(event.type) 
                          << std::endl;
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE
            })
        );
        
        // Watch log directory
        watcher_.add_watch("/data/logs", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[LOGS] " << event.filename 
                          << " " << FileWatcherAPI::event_type_to_string(event.type) 
                          << std::endl;
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::CREATE)
        );
        
        // Watch specific important file
        watcher_.add_watch("/data/important.dat", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[CRITICAL] Important file was modified!" << std::endl;
                // Take immediate action
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
        );
        
        watcher_.start();
    }
    
    void shutdown() {
        watcher_.stop();
    }
};
```

## Performance Considerations

### Power Efficiency

The FileWatcher is designed for minimal power consumption:

- **Event-driven**: Only activates when file system events occur
- **Smart polling**: Uses 1-second timeout with 100ms sleep for power saving
- **Efficient I/O**: Non-blocking inotify operations

### Memory Usage

- **Minimal overhead**: Small memory footprint per watch point
- **Efficient buffering**: 4KB event buffer for batch processing
- **Automatic cleanup**: Resources freed when watcher is destroyed

### CPU Usage

- **Low CPU impact**: inotify-based monitoring is very efficient
- **Background processing**: Events processed in separate thread
- **Optimized polling**: Minimal CPU usage during idle periods

## Error Handling

The FileWatcher handles various error conditions gracefully:

### Common Errors

1. **Path doesn't exist**: `add_watch()` returns `false`
2. **Permission denied**: `add_watch()` returns `false`
3. **Too many watches**: System limit reached, `add_watch()` returns `false`
4. **inotify initialization failed**: Constructor handles gracefully

### Best Practices

```cpp
// Always check return value of add_watch()
if (!watcher.add_watch(path, callback)) {
    std::cerr << "Failed to add watch for: " << path << std::endl;
    // Handle error appropriately
}

// Ensure proper cleanup
class SafeWatcher {
    FileWatcherAPI::FileWatcher watcher_;
public:
    ~SafeWatcher() {
        watcher_.stop();  // Automatic cleanup
    }
};
```

## Thread Safety

The FileWatcher API is designed with thread safety in mind:

- **Thread-safe operations**: `start()`, `stop()`, and `add_watch()` are thread-safe
- **Callback execution**: Callbacks are executed in the watcher's background thread
- **Concurrent access**: Multiple threads can safely interact with the same watcher instance

**Important Note**: Callbacks should be thread-safe if they access shared data.

## Integration with Logger API

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"

class MonitoredApplication {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    MonitoredApplication() {
        // Initialize logger
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "monitor.log";
        LoggerAPI::init_logger(config);
        
        // Setup file monitoring with logging
        setupFileMonitoring();
    }
    
private:
    void setupFileMonitoring() {
        watcher_.add_watch("/data/config", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::string message = "File event: " + 
                    FileWatcherAPI::event_type_to_string(event.type) + 
                    " on " + event.path;
                
                if (!event.filename.empty()) {
                    message += "/" + event.filename;
                }
                
                LoggerAPI::info(message);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::DELETE
            })
        );
        
        watcher_.start();
        LoggerAPI::info("File monitoring started");
    }
    
public:
    ~MonitoredApplication() {
        watcher_.stop();
        LoggerAPI::info("File monitoring stopped");
        LoggerAPI::shutdown_logger();
    }
};
```

## Limitations

1. **Linux/Android only**: Uses Linux inotify, not portable to other platforms
2. **Root permissions**: May require root access for certain system directories
3. **Watch limits**: System-imposed limits on number of inotify watches
4. **Recursive monitoring**: Doesn't automatically watch subdirectories (must add each directory separately)
5. **Network filesystems**: May not work reliably with network-mounted filesystems

## See Also

- [Logger API](/api/logger-api) - Logging capabilities
- [Command Line Tools](/api/cli-tools) - External file watcher tool
- [Examples](/examples/basic-usage) - Complete usage examples
- [Performance Guide](/guide/performance) - Optimization tips