# Advanced Configuration Examples

This guide demonstrates advanced configuration scenarios and integration patterns for AuroraCore, including complex logging setups, sophisticated file monitoring, and performance optimization techniques.

## Example 1: Multi-Component Logging System

A comprehensive logging setup for applications with multiple components, each with different logging requirements.

### Code

```cpp
// advanced_logger_system.cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <memory>
#include <unordered_map>
#include <thread>
#include <chrono>

class ComponentLogger {
public:
    ComponentLogger(const std::string& component_name, 
                   const std::string& log_directory) 
        : component_name_(component_name) {
        
        // Create component-specific configuration
        LoggerAPI::InternalLogger::Config config;
        config.log_path = log_directory + "/" + component_name + ".log";
        config.max_file_size = 5 * 1024 * 1024; // 5MB per component
        config.max_files = 10;
        config.buffer_size = 128 * 1024; // 128KB buffer
        config.flush_interval_ms = 2000; // 2 second flush interval
        config.auto_flush = true;
        
        // Custom log format with component name
        config.log_format = "{timestamp} [{level}] [" + component_name + "] [{thread_id}] {message}";
        
        // Set different log levels for different components
        if (component_name == "database") {
            config.min_log_level = LoggerAPI::LogLevel::DEBUG;
        } else if (component_name == "network") {
            config.min_log_level = LoggerAPI::LogLevel::INFO;
        } else if (component_name == "security") {
            config.min_log_level = LoggerAPI::LogLevel::WARNING;
        } else {
            config.min_log_level = LoggerAPI::LogLevel::INFO;
        }
        
        logger_ = std::make_unique<LoggerAPI::InternalLogger>(config);
    }
    
    void log(LoggerAPI::LogLevel level, const std::string& message) {
        logger_->log(level, message);
    }
    
    void trace(const std::string& message) { log(LoggerAPI::LogLevel::TRACE, message); }
    void debug(const std::string& message) { log(LoggerAPI::LogLevel::DEBUG, message); }
    void info(const std::string& message) { log(LoggerAPI::LogLevel::INFO, message); }
    void warning(const std::string& message) { log(LoggerAPI::LogLevel::WARNING, message); }
    void error(const std::string& message) { log(LoggerAPI::LogLevel::ERROR, message); }
    void fatal(const std::string& message) { log(LoggerAPI::LogLevel::FATAL, message); }
    
private:
    std::string component_name_;
    std::unique_ptr<LoggerAPI::InternalLogger> logger_;
};

class LoggerManager {
public:
    static LoggerManager& getInstance() {
        static LoggerManager instance;
        return instance;
    }
    
    ComponentLogger& getLogger(const std::string& component_name) {
        auto it = loggers_.find(component_name);
        if (it == loggers_.end()) {
            auto logger = std::make_unique<ComponentLogger>(component_name, log_directory_);
            auto* logger_ptr = logger.get();
            loggers_[component_name] = std::move(logger);
            return *logger_ptr;
        }
        return *it->second;
    }
    
    void setLogDirectory(const std::string& directory) {
        log_directory_ = directory;
    }
    
private:
    LoggerManager() : log_directory_("/data/local/tmp/logs") {}
    
    std::string log_directory_;
    std::unordered_map<std::string, std::unique_ptr<ComponentLogger>> loggers_;
};

// Convenience macros for component logging
#define LOG_COMPONENT(component) LoggerManager::getInstance().getLogger(component)
#define LOG_TRACE(component, msg) LOG_COMPONENT(component).trace(msg)
#define LOG_DEBUG(component, msg) LOG_COMPONENT(component).debug(msg)
#define LOG_INFO(component, msg) LOG_COMPONENT(component).info(msg)
#define LOG_WARNING(component, msg) LOG_COMPONENT(component).warning(msg)
#define LOG_ERROR(component, msg) LOG_COMPONENT(component).error(msg)
#define LOG_FATAL(component, msg) LOG_COMPONENT(component).fatal(msg)

// Example application components
class DatabaseComponent {
public:
    void connect() {
        LOG_INFO("database", "Attempting database connection");
        
        try {
            // Simulate connection logic
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
            
            if (rand() % 10 == 0) {
                throw std::runtime_error("Connection timeout");
            }
            
            LOG_INFO("database", "Database connection established");
            connected_ = true;
        } catch (const std::exception& e) {
            LOG_ERROR("database", "Failed to connect to database: " + std::string(e.what()));
            connected_ = false;
        }
    }
    
    void executeQuery(const std::string& query) {
        if (!connected_) {
            LOG_ERROR("database", "Cannot execute query: not connected");
            return;
        }
        
        LOG_DEBUG("database", "Executing query: " + query);
        
        // Simulate query execution
        auto start = std::chrono::high_resolution_clock::now();
        std::this_thread::sleep_for(std::chrono::milliseconds(100 + rand() % 200));
        auto end = std::chrono::high_resolution_clock::now();
        
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
        LOG_DEBUG("database", "Query completed in " + std::to_string(duration.count()) + "ms");
    }
    
private:
    bool connected_ = false;
};

class NetworkComponent {
public:
    void sendRequest(const std::string& url) {
        LOG_INFO("network", "Sending HTTP request to: " + url);
        
        try {
            // Simulate network request
            std::this_thread::sleep_for(std::chrono::milliseconds(200 + rand() % 300));
            
            if (rand() % 15 == 0) {
                throw std::runtime_error("Network timeout");
            }
            
            int status_code = 200 + (rand() % 5) * 100;
            LOG_INFO("network", "HTTP response received: " + std::to_string(status_code));
            
            if (status_code >= 400) {
                LOG_WARNING("network", "HTTP error response: " + std::to_string(status_code));
            }
        } catch (const std::exception& e) {
            LOG_ERROR("network", "Network request failed: " + std::string(e.what()));
        }
    }
};

class SecurityComponent {
public:
    void authenticateUser(const std::string& username) {
        LOG_INFO("security", "Authentication attempt for user: " + username);
        
        // Simulate authentication logic
        if (username.empty()) {
            LOG_WARNING("security", "Authentication failed: empty username");
            return;
        }
        
        if (username == "admin" && rand() % 3 == 0) {
            LOG_WARNING("security", "Suspicious admin login attempt detected");
        }
        
        // Simulate authentication delay
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        bool success = rand() % 10 != 0; // 90% success rate
        if (success) {
            LOG_INFO("security", "User authenticated successfully: " + username);
        } else {
            LOG_WARNING("security", "Authentication failed for user: " + username);
        }
    }
    
    void logSecurityEvent(const std::string& event) {
        LOG_WARNING("security", "Security event: " + event);
    }
};

int main() {
    // Initialize logging system
    LoggerManager::getInstance().setLogDirectory("/data/local/tmp/advanced_logs");
    
    LOG_INFO("main", "Advanced logging system started");
    
    // Create application components
    DatabaseComponent db;
    NetworkComponent network;
    SecurityComponent security;
    
    // Simulate application workflow
    for (int i = 0; i < 10; ++i) {
        LOG_INFO("main", "Starting workflow iteration " + std::to_string(i + 1));
        
        // Database operations
        if (i == 0) {
            db.connect();
        }
        db.executeQuery("SELECT * FROM users WHERE id = " + std::to_string(i + 1));
        
        // Network operations
        network.sendRequest("https://api.example.com/data/" + std::to_string(i + 1));
        
        // Security operations
        security.authenticateUser("user" + std::to_string(i + 1));
        
        if (i == 5) {
            security.logSecurityEvent("Unusual activity pattern detected");
        }
        
        // Small delay between iterations
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    LOG_INFO("main", "Advanced logging system completed");
    
    return 0;
}
```

### Compilation

```bash
g++ -std=c++20 -I/data/local/tmp/AuroraCore/include \
    -L/data/local/tmp/AuroraCore/lib -lAuroraCore_logger \
    advanced_logger_system.cpp -o advanced_logger_system
```

## Example 2: Real-time Configuration Monitoring

A sophisticated file monitoring system that watches configuration files and automatically reloads application settings.

### Code

```cpp
// config_monitor.cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"
#include <iostream>
#include <fstream>
#include <unordered_map>
#include <mutex>
#include <functional>
#include <thread>
#include <chrono>
#include <atomic>

class ConfigurationManager {
public:
    using ConfigChangeCallback = std::function<void(const std::string&, const std::unordered_map<std::string, std::string>&)>;
    
    ConfigurationManager() {
        // Initialize logger for configuration manager
        LoggerAPI::InternalLogger::Config log_config;
        log_config.log_path = "/data/local/tmp/logs/config_manager.log";
        log_config.min_log_level = LoggerAPI::LogLevel::DEBUG;
        logger_ = std::make_unique<LoggerAPI::InternalLogger>(log_config);
        
        logger_->log(LoggerAPI::LogLevel::INFO, "ConfigurationManager initialized");
    }
    
    ~ConfigurationManager() {
        stopWatching();
        logger_->log(LoggerAPI::LogLevel::INFO, "ConfigurationManager destroyed");
    }
    
    bool addConfigFile(const std::string& file_path, ConfigChangeCallback callback) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Adding config file: " + file_path);
        
        // Load initial configuration
        auto config = loadConfigFile(file_path);
        if (config.empty()) {
            logger_->log(LoggerAPI::LogLevel::ERROR, "Failed to load config file: " + file_path);
            return false;
        }
        
        // Store configuration and callback
        configs_[file_path] = config;
        callbacks_[file_path] = callback;
        
        // Set up file watching
        if (!setupFileWatch(file_path)) {
            logger_->log(LoggerAPI::LogLevel::ERROR, "Failed to setup file watch: " + file_path);
            return false;
        }
        
        // Call initial callback
        callback(file_path, config);
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Config file added successfully: " + file_path);
        return true;
    }
    
    void startWatching() {
        if (watching_.exchange(true)) {
            return; // Already watching
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Starting configuration monitoring");
        watcher_.start();
    }
    
    void stopWatching() {
        if (!watching_.exchange(false)) {
            return; // Not watching
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Stopping configuration monitoring");
        watcher_.stop();
    }
    
    std::unordered_map<std::string, std::string> getConfig(const std::string& file_path) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = configs_.find(file_path);
        return (it != configs_.end()) ? it->second : std::unordered_map<std::string, std::string>{};
    }
    
private:
    std::unordered_map<std::string, std::string> loadConfigFile(const std::string& file_path) {
        std::unordered_map<std::string, std::string> config;
        std::ifstream file(file_path);
        
        if (!file.is_open()) {
            logger_->log(LoggerAPI::LogLevel::ERROR, "Cannot open config file: " + file_path);
            return config;
        }
        
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
            if (equals_pos == std::string::npos) {
                logger_->log(LoggerAPI::LogLevel::WARNING, 
                           "Invalid config line " + std::to_string(line_number) + 
                           " in " + file_path + ": " + line);
                continue;
            }
            
            std::string key = line.substr(0, equals_pos);
            std::string value = line.substr(equals_pos + 1);
            
            // Trim whitespace
            key.erase(0, key.find_first_not_of(" \t"));
            key.erase(key.find_last_not_of(" \t") + 1);
            value.erase(0, value.find_first_not_of(" \t"));
            value.erase(value.find_last_not_of(" \t") + 1);
            
            config[key] = value;
            logger_->log(LoggerAPI::LogLevel::DEBUG, 
                       "Loaded config: " + key + " = " + value);
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, 
                   "Loaded " + std::to_string(config.size()) + 
                   " configuration entries from " + file_path);
        
        return config;
    }
    
    bool setupFileWatch(const std::string& file_path) {
        // Extract directory from file path
        size_t last_slash = file_path.find_last_of('/');
        if (last_slash == std::string::npos) {
            return false;
        }
        
        std::string directory = file_path.substr(0, last_slash);
        std::string filename = file_path.substr(last_slash + 1);
        
        return watcher_.add_watch(directory, 
            [this, file_path, filename](const FileWatcherAPI::FileEvent& event) {
                if (event.filename == filename && event.type == FileWatcherAPI::EventType::MODIFY) {
                    handleConfigChange(file_path);
                }
            }, IN_MODIFY);
    }
    
    void handleConfigChange(const std::string& file_path) {
        logger_->log(LoggerAPI::LogLevel::INFO, "Config file changed: " + file_path);
        
        // Small delay to ensure file write is complete
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Reload configuration
        auto new_config = loadConfigFile(file_path);
        if (new_config.empty()) {
            logger_->log(LoggerAPI::LogLevel::ERROR, "Failed to reload config: " + file_path);
            return;
        }
        
        // Check for changes
        auto& old_config = configs_[file_path];
        bool has_changes = false;
        
        // Check for modified or new keys
        for (const auto& [key, value] : new_config) {
            auto it = old_config.find(key);
            if (it == old_config.end() || it->second != value) {
                logger_->log(LoggerAPI::LogLevel::INFO, 
                           "Config changed: " + key + " = " + value + 
                           (it == old_config.end() ? " (new)" : " (was: " + it->second + ")"));
                has_changes = true;
            }
        }
        
        // Check for removed keys
        for (const auto& [key, value] : old_config) {
            if (new_config.find(key) == new_config.end()) {
                logger_->log(LoggerAPI::LogLevel::INFO, "Config removed: " + key);
                has_changes = true;
            }
        }
        
        if (has_changes) {
            // Update stored configuration
            configs_[file_path] = new_config;
            
            // Call callback
            auto callback_it = callbacks_.find(file_path);
            if (callback_it != callbacks_.end()) {
                callback_it->second(file_path, new_config);
            }
            
            logger_->log(LoggerAPI::LogLevel::INFO, "Configuration reloaded: " + file_path);
        } else {
            logger_->log(LoggerAPI::LogLevel::DEBUG, "No configuration changes detected: " + file_path);
        }
    }
    
    FileWatcherAPI::FileWatcher watcher_;
    std::unique_ptr<LoggerAPI::InternalLogger> logger_;
    std::atomic<bool> watching_{false};
    std::mutex mutex_;
    std::unordered_map<std::string, std::unordered_map<std::string, std::string>> configs_;
    std::unordered_map<std::string, ConfigChangeCallback> callbacks_;
};

// Example application that uses configuration monitoring
class ConfigurableApplication {
public:
    ConfigurableApplication() {
        // Initialize logger
        LoggerAPI::InternalLogger::Config log_config;
        log_config.log_path = "/data/local/tmp/logs/app.log";
        logger_ = std::make_unique<LoggerAPI::InternalLogger>(log_config);
        
        // Setup configuration monitoring
        config_manager_.addConfigFile("/data/local/tmp/config/app.conf", 
            [this](const std::string& file, const auto& config) {
                onConfigChanged(file, config);
            });
        
        config_manager_.addConfigFile("/data/local/tmp/config/database.conf", 
            [this](const std::string& file, const auto& config) {
                onDatabaseConfigChanged(file, config);
            });
        
        config_manager_.startWatching();
        
        logger_->log(LoggerAPI::LogLevel::INFO, "ConfigurableApplication initialized");
    }
    
    void run() {
        logger_->log(LoggerAPI::LogLevel::INFO, "Application started");
        
        // Simulate application work
        for (int i = 0; i < 30; ++i) {
            performWork();
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Application finished");
    }
    
private:
    void onConfigChanged(const std::string& file, const std::unordered_map<std::string, std::string>& config) {
        logger_->log(LoggerAPI::LogLevel::INFO, "Application configuration updated from: " + file);
        
        // Update application settings
        auto it = config.find("log_level");
        if (it != config.end()) {
            logger_->log(LoggerAPI::LogLevel::INFO, "Log level changed to: " + it->second);
        }
        
        it = config.find("worker_threads");
        if (it != config.end()) {
            worker_threads_ = std::stoi(it->second);
            logger_->log(LoggerAPI::LogLevel::INFO, "Worker threads changed to: " + it->second);
        }
        
        it = config.find("enable_debug");
        if (it != config.end()) {
            debug_enabled_ = (it->second == "true" || it->second == "1");
            logger_->log(LoggerAPI::LogLevel::INFO, "Debug mode: " + (debug_enabled_ ? "enabled" : "disabled"));
        }
    }
    
    void onDatabaseConfigChanged(const std::string& file, const std::unordered_map<std::string, std::string>& config) {
        logger_->log(LoggerAPI::LogLevel::INFO, "Database configuration updated from: " + file);
        
        auto it = config.find("connection_string");
        if (it != config.end()) {
            db_connection_string_ = it->second;
            logger_->log(LoggerAPI::LogLevel::INFO, "Database connection string updated");
        }
        
        it = config.find("max_connections");
        if (it != config.end()) {
            max_db_connections_ = std::stoi(it->second);
            logger_->log(LoggerAPI::LogLevel::INFO, "Max database connections: " + it->second);
        }
    }
    
    void performWork() {
        if (debug_enabled_) {
            logger_->log(LoggerAPI::LogLevel::DEBUG, "Performing work with " + 
                       std::to_string(worker_threads_) + " threads");
        }
        
        // Simulate work based on current configuration
        logger_->log(LoggerAPI::LogLevel::INFO, "Work completed");
    }
    
    ConfigurationManager config_manager_;
    std::unique_ptr<LoggerAPI::InternalLogger> logger_;
    
    // Application settings (updated by configuration)
    int worker_threads_ = 1;
    bool debug_enabled_ = false;
    std::string db_connection_string_;
    int max_db_connections_ = 10;
};

int main() {
    // Create configuration files
    system("mkdir -p /data/local/tmp/config");
    
    // Create initial app.conf
    std::ofstream app_conf("/data/local/tmp/config/app.conf");
    app_conf << "# Application Configuration\n";
    app_conf << "log_level=INFO\n";
    app_conf << "worker_threads=2\n";
    app_conf << "enable_debug=false\n";
    app_conf.close();
    
    // Create initial database.conf
    std::ofstream db_conf("/data/local/tmp/config/database.conf");
    db_conf << "# Database Configuration\n";
    db_conf << "connection_string=sqlite:///data/local/tmp/app.db\n";
    db_conf << "max_connections=5\n";
    db_conf.close();
    
    try {
        ConfigurableApplication app;
        
        // Start application in a separate thread
        std::thread app_thread([&app]() {
            app.run();
        });
        
        // Simulate configuration changes
        std::this_thread::sleep_for(std::chrono::seconds(5));
        
        // Update app configuration
        std::ofstream app_conf_update("/data/local/tmp/config/app.conf");
        app_conf_update << "# Application Configuration\n";
        app_conf_update << "log_level=DEBUG\n";
        app_conf_update << "worker_threads=4\n";
        app_conf_update << "enable_debug=true\n";
        app_conf_update.close();
        
        std::this_thread::sleep_for(std::chrono::seconds(10));
        
        // Update database configuration
        std::ofstream db_conf_update("/data/local/tmp/config/database.conf");
        db_conf_update << "# Database Configuration\n";
        db_conf_update << "connection_string=postgresql://localhost:5432/app\n";
        db_conf_update << "max_connections=20\n";
        db_conf_update.close();
        
        app_thread.join();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
```

### Compilation

```bash
g++ -std=c++20 -I/data/local/tmp/AuroraCore/include \
    -L/data/local/tmp/AuroraCore/lib -lAuroraCore_logger -lAuroraCore_filewatcher \
    config_monitor.cpp -o config_monitor
```

## Example 3: High-Performance Log Aggregation

A system that aggregates logs from multiple sources with different priorities and routing rules.

### Code

```cpp
// log_aggregator.cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <fstream>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <chrono>
#include <regex>

struct LogEntry {
    std::chrono::system_clock::time_point timestamp;
    LoggerAPI::LogLevel level;
    std::string source;
    std::string message;
    
    LogEntry(LoggerAPI::LogLevel lvl, const std::string& src, const std::string& msg)
        : timestamp(std::chrono::system_clock::now()), level(lvl), source(src), message(msg) {}
};

class LogAggregator {
public:
    LogAggregator() : running_(false) {
        // Initialize main logger
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/logs/aggregated.log";
        config.max_file_size = 50 * 1024 * 1024; // 50MB
        config.max_files = 20;
        config.buffer_size = 1024 * 1024; // 1MB buffer
        config.flush_interval_ms = 500;
        main_logger_ = std::make_unique<LoggerAPI::InternalLogger>(config);
        
        // Initialize error logger
        LoggerAPI::InternalLogger::Config error_config;
        error_config.log_path = "/data/local/tmp/logs/errors.log";
        error_config.min_log_level = LoggerAPI::LogLevel::ERROR;
        error_logger_ = std::make_unique<LoggerAPI::InternalLogger>(error_config);
        
        // Initialize security logger
        LoggerAPI::InternalLogger::Config security_config;
        security_config.log_path = "/data/local/tmp/logs/security.log";
        security_logger_ = std::make_unique<LoggerAPI::InternalLogger>(security_config);
    }
    
    ~LogAggregator() {
        stop();
    }
    
    void start() {
        if (running_.exchange(true)) {
            return;
        }
        
        main_logger_->log(LoggerAPI::LogLevel::INFO, "Log aggregator started");
        
        // Start processing thread
        processor_thread_ = std::thread(&LogAggregator::processLogs, this);
        
        // Start file monitoring
        setupFileMonitoring();
        watcher_.start();
    }
    
    void stop() {
        if (!running_.exchange(false)) {
            return;
        }
        
        main_logger_->log(LoggerAPI::LogLevel::INFO, "Log aggregator stopping");
        
        // Stop file monitoring
        watcher_.stop();
        
        // Signal processing thread to stop
        condition_.notify_all();
        
        if (processor_thread_.joinable()) {
            processor_thread_.join();
        }
        
        main_logger_->log(LoggerAPI::LogLevel::INFO, "Log aggregator stopped");
    }
    
    void addLogEntry(LoggerAPI::LogLevel level, const std::string& source, const std::string& message) {
        if (!running_) {
            return;
        }
        
        {
            std::lock_guard<std::mutex> lock(queue_mutex_);
            log_queue_.emplace(level, source, message);
        }
        condition_.notify_one();
    }
    
private:
    void setupFileMonitoring() {
        // Monitor application log directories
        std::vector<std::string> watch_dirs = {
            "/data/local/tmp/app_logs",
            "/data/local/tmp/system_logs",
            "/data/local/tmp/service_logs"
        };
        
        for (const auto& dir : watch_dirs) {
            watcher_.add_watch(dir, 
                [this, dir](const FileWatcherAPI::FileEvent& event) {
                    if (event.type == FileWatcherAPI::EventType::MODIFY && 
                        event.filename.find(".log") != std::string::npos) {
                        processLogFile(dir + "/" + event.filename);
                    }
                }, IN_MODIFY);
        }
    }
    
    void processLogFile(const std::string& file_path) {
        std::ifstream file(file_path);
        if (!file.is_open()) {
            return;
        }
        
        // Read new lines (simplified - in practice, you'd track file position)
        std::string line;
        while (std::getline(file, line)) {
            parseAndAddLogLine(file_path, line);
        }
    }
    
    void parseAndAddLogLine(const std::string& source_file, const std::string& line) {
        // Parse log line format: TIMESTAMP [LEVEL] MESSAGE
        std::regex log_regex(R"((\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\] (.+))");
        std::smatch matches;
        
        if (std::regex_match(line, matches, log_regex)) {
            std::string level_str = matches[2].str();
            std::string message = matches[3].str();
            
            LoggerAPI::LogLevel level = LoggerAPI::LogLevel::INFO;
            if (level_str == "DEBUG") level = LoggerAPI::LogLevel::DEBUG;
            else if (level_str == "INFO") level = LoggerAPI::LogLevel::INFO;
            else if (level_str == "WARNING") level = LoggerAPI::LogLevel::WARNING;
            else if (level_str == "ERROR") level = LoggerAPI::LogLevel::ERROR;
            else if (level_str == "FATAL") level = LoggerAPI::LogLevel::FATAL;
            
            addLogEntry(level, source_file, message);
        }
    }
    
    void processLogs() {
        while (running_) {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            condition_.wait(lock, [this] { return !log_queue_.empty() || !running_; });
            
            while (!log_queue_.empty()) {
                LogEntry entry = log_queue_.front();
                log_queue_.pop();
                lock.unlock();
                
                routeLogEntry(entry);
                
                lock.lock();
            }
        }
    }
    
    void routeLogEntry(const LogEntry& entry) {
        // Format timestamp
        auto time_t = std::chrono::system_clock::to_time_t(entry.timestamp);
        std::string timestamp_str = std::to_string(time_t);
        
        // Create formatted message
        std::string formatted_message = timestamp_str + " [" + 
            std::string(level_to_string(entry.level)) + "] [" + 
            entry.source + "] " + entry.message;
        
        // Route to appropriate loggers
        main_logger_->log(entry.level, formatted_message);
        
        // Route errors to error logger
        if (entry.level >= LoggerAPI::LogLevel::ERROR) {
            error_logger_->log(entry.level, formatted_message);
        }
        
        // Route security-related logs
        if (entry.message.find("security") != std::string::npos ||
            entry.message.find("auth") != std::string::npos ||
            entry.message.find("login") != std::string::npos) {
            security_logger_->log(entry.level, formatted_message);
        }
        
        // Update statistics
        updateStatistics(entry.level);
    }
    
    void updateStatistics(LoggerAPI::LogLevel level) {
        std::lock_guard<std::mutex> lock(stats_mutex_);
        stats_[level]++;
        
        // Log statistics every 1000 entries
        static int total_count = 0;
        if (++total_count % 1000 == 0) {
            logStatistics();
        }
    }
    
    void logStatistics() {
        std::string stats_msg = "Log statistics: ";
        for (const auto& [level, count] : stats_) {
            stats_msg += std::string(level_to_string(level)) + "=" + std::to_string(count) + " ";
        }
        main_logger_->log(LoggerAPI::LogLevel::INFO, stats_msg);
    }
    
    const char* level_to_string(LoggerAPI::LogLevel level) {
        switch (level) {
            case LoggerAPI::LogLevel::TRACE: return "TRACE";
            case LoggerAPI::LogLevel::DEBUG: return "DEBUG";
            case LoggerAPI::LogLevel::INFO: return "INFO";
            case LoggerAPI::LogLevel::WARNING: return "WARNING";
            case LoggerAPI::LogLevel::ERROR: return "ERROR";
            case LoggerAPI::LogLevel::FATAL: return "FATAL";
            default: return "UNKNOWN";
        }
    }
    
    FileWatcherAPI::FileWatcher watcher_;
    std::unique_ptr<LoggerAPI::InternalLogger> main_logger_;
    std::unique_ptr<LoggerAPI::InternalLogger> error_logger_;
    std::unique_ptr<LoggerAPI::InternalLogger> security_logger_;
    
    std::atomic<bool> running_;
    std::thread processor_thread_;
    
    std::queue<LogEntry> log_queue_;
    std::mutex queue_mutex_;
    std::condition_variable condition_;
    
    std::unordered_map<LoggerAPI::LogLevel, int> stats_;
    std::mutex stats_mutex_;
};

int main() {
    // Create log directories
    system("mkdir -p /data/local/tmp/app_logs");
    system("mkdir -p /data/local/tmp/system_logs");
    system("mkdir -p /data/local/tmp/service_logs");
    
    try {
        LogAggregator aggregator;
        aggregator.start();
        
        // Simulate log generation
        std::thread log_generator([&aggregator]() {
            for (int i = 0; i < 1000; ++i) {
                aggregator.addLogEntry(LoggerAPI::LogLevel::INFO, "app1", "Processing request " + std::to_string(i));
                
                if (i % 10 == 0) {
                    aggregator.addLogEntry(LoggerAPI::LogLevel::WARNING, "app1", "High memory usage detected");
                }
                
                if (i % 50 == 0) {
                    aggregator.addLogEntry(LoggerAPI::LogLevel::ERROR, "app2", "Database connection failed");
                }
                
                if (i % 100 == 0) {
                    aggregator.addLogEntry(LoggerAPI::LogLevel::INFO, "security", "User authentication successful");
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
            }
        });
        
        log_generator.join();
        
        // Let aggregator process remaining logs
        std::this_thread::sleep_for(std::chrono::seconds(2));
        
        aggregator.stop();
        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
```

### Compilation

```bash
g++ -std=c++20 -I/data/local/tmp/AuroraCore/include \
    -L/data/local/tmp/AuroraCore/lib -lAuroraCore_logger -lAuroraCore_filewatcher \
    log_aggregator.cpp -o log_aggregator
```

## Performance Optimization Tips

### 1. Buffer Size Tuning

```cpp
// For high-throughput applications
config.buffer_size = 1024 * 1024; // 1MB buffer
config.flush_interval_ms = 100;    // Frequent flushes

// For low-latency applications
config.buffer_size = 64 * 1024;    // 64KB buffer
config.flush_interval_ms = 10;     // Very frequent flushes

// For batch processing
config.buffer_size = 4 * 1024 * 1024; // 4MB buffer
config.flush_interval_ms = 5000;      // Infrequent flushes
```

### 2. Log Level Optimization

```cpp
// Production configuration
config.min_log_level = LoggerAPI::LogLevel::INFO;

// Development configuration
config.min_log_level = LoggerAPI::LogLevel::DEBUG;

// Performance testing
config.min_log_level = LoggerAPI::LogLevel::WARNING;
```

### 3. File Watching Optimization

```cpp
// Watch only specific events
watcher.add_watch(path, callback, IN_MODIFY | IN_CREATE);

// Avoid watching high-frequency events in production
// watcher.add_watch(path, callback, IN_ACCESS); // Avoid this
```

These advanced examples demonstrate sophisticated usage patterns and optimization techniques for AuroraCore, enabling robust, high-performance logging and monitoring solutions in Android environments.