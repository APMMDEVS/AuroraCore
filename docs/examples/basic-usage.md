# Basic Usage Examples

This page provides practical examples of how to integrate and use AMMF3-Core in real-world scenarios. Each example includes complete, runnable code with explanations.

## Example 1: Simple Application Logging

A basic example showing how to add logging to an existing application.

### Code

```cpp
// simple_app.cpp
#include "loggerAPI/logger_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <vector>

class SimpleApplication {
public:
    SimpleApplication() {
        // Configure logger for this application
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/simple_app.log";
        config.max_file_size = 2 * 1024 * 1024; // 2MB per file
        config.max_files = 3;                   // Keep 3 files
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        config.flush_interval_ms = 500;         // Flush every 500ms
        
        LoggerAPI::init_logger(config);
        LoggerAPI::info("SimpleApplication initialized");
    }
    
    ~SimpleApplication() {
        LoggerAPI::info("SimpleApplication shutting down");
        LoggerAPI::shutdown_logger();
    }
    
    void run() {
        LoggerAPI::info("Application started");
        
        // Simulate application work
        processData();
        handleUserInput();
        performCleanup();
        
        LoggerAPI::info("Application finished successfully");
    }
    
private:
    void processData() {
        LoggerAPI::info("Starting data processing");
        
        std::vector<int> data = {1, 2, 3, 4, 5};
        
        for (size_t i = 0; i < data.size(); ++i) {
            LoggerAPI::debug("Processing item " + std::to_string(i) + 
                           " with value " + std::to_string(data[i]));
            
            // Simulate processing time
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        LoggerAPI::info("Data processing completed");
    }
    
    void handleUserInput() {
        LoggerAPI::info("Handling user input");
        
        // Simulate user interaction
        try {
            // Simulate potential error
            if (rand() % 2 == 0) {
                throw std::runtime_error("Simulated user input error");
            }
            
            LoggerAPI::info("User input processed successfully");
        } catch (const std::exception& e) {
            LoggerAPI::error("Error handling user input: " + std::string(e.what()));
        }
    }
    
    void performCleanup() {
        LoggerAPI::info("Performing cleanup operations");
        
        // Simulate cleanup tasks
        LoggerAPI::debug("Cleaning temporary files");
        LoggerAPI::debug("Releasing resources");
        LoggerAPI::debug("Saving state");
        
        LoggerAPI::info("Cleanup completed");
    }
};

int main() {
    try {
        SimpleApplication app;
        app.run();
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
```

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.20)
project(SimpleApp)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add AMMF3-Core
add_subdirectory(../AMMF3-Core AMMF3-Core)

# Create executable
add_executable(simple_app simple_app.cpp)

# Link logger API
target_link_libraries(simple_app PRIVATE loggerAPI)

# Include AMMF3-Core headers
target_include_directories(simple_app PRIVATE ../AMMF3-Core/src)
```

### Building and Running

```bash
# Build
cmake -B build -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-21
cmake --build build

# Deploy and run
adb push build/simple_app /data/local/tmp/
adb shell chmod +x /data/local/tmp/simple_app
adb shell /data/local/tmp/simple_app

# Check logs
adb shell cat /data/local/tmp/simple_app.log
```

## Example 2: Configuration File Monitor

Monitor configuration files and reload settings when they change.

### Code

```cpp
// config_monitor.cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"
#include <iostream>
#include <fstream>
#include <map>
#include <string>
#include <atomic>
#include <signal.h>

class ConfigurationManager {
private:
    std::map<std::string, std::string> config_;
    std::string config_file_;
    FileWatcherAPI::FileWatcher watcher_;
    std::atomic<bool> running_;
    
public:
    ConfigurationManager(const std::string& config_file) 
        : config_file_(config_file), running_(true) {
        
        // Initialize logger
        LoggerAPI::InternalLogger::Config log_config;
        log_config.log_path = "/data/local/tmp/config_monitor.log";
        log_config.min_log_level = LoggerAPI::LogLevel::DEBUG;
        LoggerAPI::init_logger(log_config);
        
        // Load initial configuration
        loadConfiguration();
        
        // Setup file watcher
        setupFileWatcher();
        
        LoggerAPI::info("ConfigurationManager initialized");
    }
    
    ~ConfigurationManager() {
        stop();
        LoggerAPI::shutdown_logger();
    }
    
    void start() {
        watcher_.start();
        LoggerAPI::info("Configuration monitoring started");
        
        // Keep running until stopped
        while (running_) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }
    
    void stop() {
        running_ = false;
        watcher_.stop();
        LoggerAPI::info("Configuration monitoring stopped");
    }
    
    std::string getConfig(const std::string& key) const {
        auto it = config_.find(key);
        return (it != config_.end()) ? it->second : "";
    }
    
    void printConfig() const {
        std::cout << "Current configuration:" << std::endl;
        for (const auto& pair : config_) {
            std::cout << "  " << pair.first << " = " << pair.second << std::endl;
        }
    }
    
private:
    void setupFileWatcher() {
        // Extract directory from file path
        size_t last_slash = config_file_.find_last_of('/');
        std::string config_dir = (last_slash != std::string::npos) 
            ? config_file_.substr(0, last_slash) 
            : ".";
        
        // Watch the directory containing the config file
        bool success = watcher_.add_watch(config_dir,
            [this](const FileWatcherAPI::FileEvent& event) {
                handleFileEvent(event);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE
            })
        );
        
        if (!success) {
            LoggerAPI::error("Failed to setup file watcher for: " + config_dir);
        } else {
            LoggerAPI::info("File watcher setup for: " + config_dir);
        }
    }
    
    void handleFileEvent(const FileWatcherAPI::FileEvent& event) {
        // Check if the event is for our config file
        std::string full_path = event.path + "/" + event.filename;
        
        if (full_path == config_file_ || event.filename.empty()) {
            LoggerAPI::info("Configuration file event detected: " + 
                          FileWatcherAPI::event_type_to_string(event.type));
            
            if (event.type == FileWatcherAPI::EventType::MODIFY ||
                event.type == FileWatcherAPI::EventType::CREATE) {
                
                // Small delay to ensure file write is complete
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                
                reloadConfiguration();
            }
        }
    }
    
    void loadConfiguration() {
        LoggerAPI::debug("Loading configuration from: " + config_file_);
        
        std::ifstream file(config_file_);
        if (!file.is_open()) {
            LoggerAPI::warn("Configuration file not found, using defaults");
            setDefaultConfiguration();
            return;
        }
        
        config_.clear();
        std::string line;
        int line_number = 0;
        
        while (std::getline(file, line)) {
            line_number++;
            
            // Skip empty lines and comments
            if (line.empty() || line[0] == '#') {
                continue;
            }
            
            // Parse key=value pairs
            size_t equals_pos = line.find('=');
            if (equals_pos != std::string::npos) {
                std::string key = line.substr(0, equals_pos);
                std::string value = line.substr(equals_pos + 1);
                
                // Trim whitespace
                key.erase(0, key.find_first_not_of(" \t"));
                key.erase(key.find_last_not_of(" \t") + 1);
                value.erase(0, value.find_first_not_of(" \t"));
                value.erase(value.find_last_not_of(" \t") + 1);
                
                config_[key] = value;
                LoggerAPI::debug("Loaded config: " + key + " = " + value);
            } else {
                LoggerAPI::warn("Invalid config line " + std::to_string(line_number) + ": " + line);
            }
        }
        
        LoggerAPI::info("Configuration loaded successfully (" + 
                       std::to_string(config_.size()) + " entries)");
    }
    
    void reloadConfiguration() {
        LoggerAPI::info("Reloading configuration...");
        
        auto old_config = config_;
        loadConfiguration();
        
        // Check for changes
        bool changed = false;
        for (const auto& pair : config_) {
            auto old_it = old_config.find(pair.first);
            if (old_it == old_config.end() || old_it->second != pair.second) {
                LoggerAPI::info("Config changed: " + pair.first + " = " + pair.second);
                changed = true;
            }
        }
        
        for (const auto& pair : old_config) {
            if (config_.find(pair.first) == config_.end()) {
                LoggerAPI::info("Config removed: " + pair.first);
                changed = true;
            }
        }
        
        if (changed) {
            LoggerAPI::info("Configuration reloaded with changes");
            onConfigurationChanged();
        } else {
            LoggerAPI::debug("Configuration reloaded, no changes detected");
        }
    }
    
    void setDefaultConfiguration() {
        config_["app_name"] = "ConfigMonitor";
        config_["log_level"] = "INFO";
        config_["max_connections"] = "100";
        config_["timeout"] = "30";
        
        LoggerAPI::info("Default configuration set");
    }
    
    void onConfigurationChanged() {
        LoggerAPI::info("Applying configuration changes...");
        
        // Example: Update log level based on config
        std::string log_level = getConfig("log_level");
        if (!log_level.empty()) {
            LoggerAPI::info("Log level set to: " + log_level);
            // In a real application, you would update the logger configuration here
        }
        
        // Example: Update other application settings
        std::string timeout = getConfig("timeout");
        if (!timeout.empty()) {
            LoggerAPI::info("Timeout set to: " + timeout + " seconds");
        }
        
        LoggerAPI::info("Configuration changes applied");
    }
};

// Global flag for signal handling
std::atomic<bool> g_running{true};

void signal_handler(int signal) {
    LoggerAPI::info("Received signal " + std::to_string(signal) + ", shutting down...");
    g_running = false;
}

int main(int argc, char* argv[]) {
    // Setup signal handling
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // Default config file path
    std::string config_file = "/data/local/tmp/app.conf";
    
    // Parse command line arguments
    if (argc > 1) {
        config_file = argv[1];
    }
    
    std::cout << "Starting configuration monitor for: " << config_file << std::endl;
    std::cout << "Press Ctrl+C to stop..." << std::endl;
    
    try {
        ConfigurationManager manager(config_file);
        
        // Print initial configuration
        manager.printConfig();
        
        // Start monitoring in a separate thread
        std::thread monitor_thread([&manager]() {
            manager.start();
        });
        
        // Main loop
        while (g_running) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        // Stop monitoring
        manager.stop();
        
        if (monitor_thread.joinable()) {
            monitor_thread.join();
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    std::cout << "Configuration monitor stopped" << std::endl;
    return 0;
}
```

### Sample Configuration File

Create `/data/local/tmp/app.conf`:

```ini
# Application Configuration
app_name = MyApplication
log_level = DEBUG
max_connections = 50
timeout = 30
database_url = sqlite:///data/local/tmp/app.db

# Feature flags
enable_caching = true
enable_compression = false
```

### Testing the Configuration Monitor

```bash
# Build and deploy
cmake --build build
adb push build/config_monitor /data/local/tmp/
adb shell chmod +x /data/local/tmp/config_monitor

# Create initial config file
adb shell 'echo "app_name = TestApp" > /data/local/tmp/app.conf'
adb shell 'echo "log_level = INFO" >> /data/local/tmp/app.conf'

# Start the monitor
adb shell /data/local/tmp/config_monitor &

# Modify the config file to see live reloading
adb shell 'echo "timeout = 60" >> /data/local/tmp/app.conf'
adb shell 'echo "new_setting = value" >> /data/local/tmp/app.conf'

# Check the logs
adb shell cat /data/local/tmp/config_monitor.log
```

## Example 3: System Service with Both APIs

A complete example showing how to use both Logger and FileWatcher APIs together in a system service.

### Code

```cpp
// system_service.cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <fstream>
#include <thread>
#include <atomic>
#include <signal.h>
#include <unistd.h>
#include <sys/stat.h>

class SystemService {
private:
    FileWatcherAPI::FileWatcher watcher_;
    std::atomic<bool> running_;
    std::thread service_thread_;
    
public:
    SystemService() : running_(false) {
        // Configure logger for system service
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/system_service.log";
        config.max_file_size = 10 * 1024 * 1024; // 10MB
        config.max_files = 5;
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        config.flush_interval_ms = 1000;
        config.log_format = "{timestamp} [SERVICE] [{level}] {message}";
        
        LoggerAPI::init_logger(config);
        LoggerAPI::info("SystemService initializing...");
        
        setupFileWatchers();
        LoggerAPI::info("SystemService initialized successfully");
    }
    
    ~SystemService() {
        stop();
        LoggerAPI::info("SystemService destroyed");
        LoggerAPI::shutdown_logger();
    }
    
    void start() {
        if (running_.exchange(true)) {
            LoggerAPI::warn("Service already running");
            return;
        }
        
        LoggerAPI::info("Starting SystemService...");
        
        // Start file watcher
        watcher_.start();
        
        // Start service thread
        service_thread_ = std::thread(&SystemService::serviceLoop, this);
        
        LoggerAPI::info("SystemService started successfully");
    }
    
    void stop() {
        if (!running_.exchange(false)) {
            return; // Already stopped
        }
        
        LoggerAPI::info("Stopping SystemService...");
        
        // Stop file watcher
        watcher_.stop();
        
        // Wait for service thread to finish
        if (service_thread_.joinable()) {
            service_thread_.join();
        }
        
        LoggerAPI::info("SystemService stopped");
    }
    
    bool isRunning() const {
        return running_;
    }
    
private:
    void setupFileWatchers() {
        LoggerAPI::debug("Setting up file watchers...");
        
        // Watch system configuration directory
        if (!watcher_.add_watch("/data/local/tmp/config",
            [this](const FileWatcherAPI::FileEvent& event) {
                handleConfigEvent(event);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::DELETE
            }))) {
            LoggerAPI::warn("Failed to watch config directory");
        }
        
        // Watch system status files
        if (!watcher_.add_watch("/data/local/tmp/status",
            [this](const FileWatcherAPI::FileEvent& event) {
                handleStatusEvent(event);
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::CREATE) |
            static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY))) {
            LoggerAPI::warn("Failed to watch status directory");
        }
        
        // Watch critical system file
        if (!watcher_.add_watch("/data/local/tmp/critical.flag",
            [this](const FileWatcherAPI::FileEvent& event) {
                handleCriticalEvent(event);
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::CREATE) |
            static_cast<uint32_t>(FileWatcherAPI::EventType::DELETE))) {
            LoggerAPI::debug("Critical flag file not present (normal)");
        }
        
        LoggerAPI::info("File watchers configured");
    }
    
    void handleConfigEvent(const FileWatcherAPI::FileEvent& event) {
        std::string message = "Config event: " + 
            FileWatcherAPI::event_type_to_string(event.type);
        
        if (!event.filename.empty()) {
            message += " - " + event.filename;
        }
        
        LoggerAPI::info(message);
        
        // Handle specific config files
        if (event.filename == "service.conf" && 
            event.type == FileWatcherAPI::EventType::MODIFY) {
            reloadServiceConfiguration();
        } else if (event.filename.find(".conf") != std::string::npos) {
            LoggerAPI::debug("Configuration file updated: " + event.filename);
        }
    }
    
    void handleStatusEvent(const FileWatcherAPI::FileEvent& event) {
        LoggerAPI::info("Status event: " + 
                       FileWatcherAPI::event_type_to_string(event.type) + 
                       " - " + event.filename);
        
        // Process status files
        if (event.type == FileWatcherAPI::EventType::CREATE) {
            processStatusFile(event.path + "/" + event.filename);
        }
    }
    
    void handleCriticalEvent(const FileWatcherAPI::FileEvent& event) {
        if (event.type == FileWatcherAPI::EventType::CREATE) {
            LoggerAPI::fatal("CRITICAL FLAG DETECTED! System entering emergency mode");
            enterEmergencyMode();
        } else if (event.type == FileWatcherAPI::EventType::DELETE) {
            LoggerAPI::info("Critical flag cleared, resuming normal operation");
            exitEmergencyMode();
        }
    }
    
    void serviceLoop() {
        LoggerAPI::debug("Service loop started");
        
        int iteration = 0;
        while (running_) {
            // Perform periodic service tasks
            performHealthCheck();
            
            if (iteration % 10 == 0) { // Every 10 seconds
                performMaintenanceTasks();
            }
            
            if (iteration % 60 == 0) { // Every minute
                generateStatusReport();
            }
            
            iteration++;
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        LoggerAPI::debug("Service loop ended");
    }
    
    void performHealthCheck() {
        // Simulate health check
        static int health_counter = 0;
        health_counter++;
        
        if (health_counter % 30 == 0) { // Log every 30 seconds
            LoggerAPI::debug("Health check passed (iteration " + 
                           std::to_string(health_counter) + ")");
        }
        
        // Simulate occasional health issues
        if (health_counter % 100 == 0) {
            LoggerAPI::warn("Minor health issue detected, self-correcting...");
        }
    }
    
    void performMaintenanceTasks() {
        LoggerAPI::debug("Performing maintenance tasks...");
        
        // Simulate maintenance work
        cleanupTempFiles();
        checkDiskSpace();
        updateStatistics();
        
        LoggerAPI::debug("Maintenance tasks completed");
    }
    
    void generateStatusReport() {
        LoggerAPI::info("Generating status report...");
        
        // Create status report
        std::ofstream status_file("/data/local/tmp/status/service_status.txt");
        if (status_file.is_open()) {
            status_file << "SystemService Status Report\n";
            status_file << "Timestamp: " << time(nullptr) << "\n";
            status_file << "Status: Running\n";
            status_file << "Uptime: " << getUptime() << " seconds\n";
            status_file << "Memory Usage: " << getMemoryUsage() << " KB\n";
            status_file.close();
            
            LoggerAPI::info("Status report generated");
        } else {
            LoggerAPI::error("Failed to generate status report");
        }
    }
    
    void reloadServiceConfiguration() {
        LoggerAPI::info("Reloading service configuration...");
        
        // Simulate configuration reload
        std::ifstream config_file("/data/local/tmp/config/service.conf");
        if (config_file.is_open()) {
            std::string line;
            while (std::getline(config_file, line)) {
                LoggerAPI::debug("Config line: " + line);
            }
            config_file.close();
            LoggerAPI::info("Service configuration reloaded");
        } else {
            LoggerAPI::error("Failed to reload service configuration");
        }
    }
    
    void processStatusFile(const std::string& filepath) {
        LoggerAPI::debug("Processing status file: " + filepath);
        
        std::ifstream file(filepath);
        if (file.is_open()) {
            std::string content((std::istreambuf_iterator<char>(file)),
                              std::istreambuf_iterator<char>());
            file.close();
            
            LoggerAPI::info("Status file processed: " + 
                           std::to_string(content.length()) + " bytes");
        }
    }
    
    void enterEmergencyMode() {
        LoggerAPI::fatal("ENTERING EMERGENCY MODE");
        // Implement emergency procedures
        LoggerAPI::fatal("Emergency procedures activated");
    }
    
    void exitEmergencyMode() {
        LoggerAPI::info("Exiting emergency mode");
        // Resume normal operations
        LoggerAPI::info("Normal operations resumed");
    }
    
    void cleanupTempFiles() {
        // Simulate temp file cleanup
        LoggerAPI::debug("Cleaning up temporary files");
    }
    
    void checkDiskSpace() {
        // Simulate disk space check
        static int disk_check_counter = 0;
        disk_check_counter++;
        
        if (disk_check_counter % 5 == 0) {
            LoggerAPI::debug("Disk space check: OK");
        }
    }
    
    void updateStatistics() {
        // Simulate statistics update
        LoggerAPI::debug("Statistics updated");
    }
    
    int getUptime() const {
        static auto start_time = std::chrono::steady_clock::now();
        auto now = std::chrono::steady_clock::now();
        return std::chrono::duration_cast<std::chrono::seconds>(now - start_time).count();
    }
    
    int getMemoryUsage() const {
        // Simulate memory usage calculation
        return 1024 + (rand() % 512); // Random value between 1024-1536 KB
    }
};

// Global service instance for signal handling
std::unique_ptr<SystemService> g_service;

void signal_handler(int signal) {
    std::cout << "\nReceived signal " << signal << ", shutting down..." << std::endl;
    if (g_service) {
        g_service->stop();
    }
}

int main() {
    // Setup signal handling
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // Create necessary directories
    system("mkdir -p /data/local/tmp/config");
    system("mkdir -p /data/local/tmp/status");
    
    std::cout << "Starting SystemService..." << std::endl;
    std::cout << "Press Ctrl+C to stop" << std::endl;
    
    try {
        g_service = std::make_unique<SystemService>();
        g_service->start();
        
        // Keep running until stopped
        while (g_service->isRunning()) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
    } catch (const std::exception& e) {
        std::cerr << "Service error: " << e.what() << std::endl;
        return 1;
    }
    
    std::cout << "SystemService stopped" << std::endl;
    return 0;
}
```

### Testing the System Service

```bash
# Build and deploy
cmake --build build
adb push build/system_service /data/local/tmp/
adb shell chmod +x /data/local/tmp/system_service

# Start the service
adb shell /data/local/tmp/system_service &

# Test configuration changes
adb shell 'echo "debug_mode = true" > /data/local/tmp/config/service.conf'
adb shell 'echo "max_workers = 10" >> /data/local/tmp/config/service.conf'

# Test status file creation
adb shell 'echo "test status" > /data/local/tmp/status/test.status'

# Test critical flag
adb shell 'touch /data/local/tmp/critical.flag'
adb shell 'rm /data/local/tmp/critical.flag'

# Check logs and status
adb shell cat /data/local/tmp/system_service.log
adb shell cat /data/local/tmp/status/service_status.txt
```

## Key Takeaways

1. **Always initialize logging early** in your application lifecycle
2. **Use appropriate log levels** - DEBUG for development, INFO/WARN/ERROR for production
3. **Handle file watcher setup failures** gracefully
4. **Implement proper signal handling** for clean shutdown
5. **Create necessary directories** before starting file watchers
6. **Use atomic flags** for thread-safe shutdown coordination
7. **Combine both APIs** for comprehensive monitoring and logging solutions

These examples provide a solid foundation for integrating AMMF3-Core into your Android applications and system services.