# 基本用法示例

本文档提供了 AMMF3-Core 的实际集成示例，展示如何在真实项目中使用 Logger 和 FileWatcher API。

## 示例 1：简单应用程序日志记录

这个示例展示了如何在应用程序中集成基本的日志记录功能。

### C++ 代码

```cpp
// simple_app.cpp
#include "logger_api.hpp"
#include <iostream>
#include <vector>
#include <stdexcept>

class SimpleApplication {
private:
    std::unique_ptr<InternalLogger> logger_;
    
public:
    SimpleApplication() {
        // 配置日志记录器
        LoggerConfig config;
        config.log_path = "/data/local/tmp/simple_app.log";
        config.max_file_size = 5 * 1024 * 1024;  // 5MB
        config.max_file_count = 3;
        config.min_level = LogLevel::INFO;
        config.buffer_size = 32 * 1024;  // 32KB
        
        logger_ = std::make_unique<InternalLogger>(config);
        logger_->info("SimpleApplication 已初始化");
    }
    
    void run() {
        logger_->info("应用程序开始运行");
        
        try {
            // 模拟应用程序逻辑
            process_data();
            perform_calculations();
            save_results();
            
            logger_->info("应用程序成功完成所有任务");
        } catch (const std::exception& e) {
            logger_->errorf("应用程序执行失败：%s", e.what());
            throw;
        }
    }
    
    ~SimpleApplication() {
        logger_->info("SimpleApplication 正在关闭");
        logger_->flush();
    }
    
private:
    void process_data() {
        logger_->info("开始处理数据");
        
        std::vector<int> data = {1, 2, 3, 4, 5};
        logger_->infof("处理 %zu 个数据项", data.size());
        
        for (size_t i = 0; i < data.size(); ++i) {
            logger_->debugf("处理项目 %zu: 值 = %d", i, data[i]);
            
            if (data[i] < 0) {
                logger_->warnf("检测到负值：%d", data[i]);
            }
        }
        
        logger_->info("数据处理完成");
    }
    
    void perform_calculations() {
        logger_->info("开始执行计算");
        
        // 模拟一些计算
        int result = 42;
        logger_->infof("计算结果：%d", result);
        
        if (result > 100) {
            logger_->warn("计算结果异常高");
        }
        
        logger_->info("计算完成");
    }
    
    void save_results() {
        logger_->info("开始保存结果");
        
        // 模拟保存操作
        bool success = true;  // 模拟保存成功
        
        if (success) {
            logger_->info("结果保存成功");
        } else {
            logger_->error("结果保存失败");
            throw std::runtime_error("保存操作失败");
        }
    }
};

int main() {
    try {
        SimpleApplication app;
        app.run();
        
        std::cout << "应用程序执行成功" << std::endl;
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "应用程序错误：" << e.what() << std::endl;
        return -1;
    }
}
```

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.10)
project(SimpleApp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加 AMMF3-Core 路径
set(AMMF3_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../AMMF3-Core")
include_directories(${AMMF3_ROOT}/loggerAPI)
include_directories(${AMMF3_ROOT}/filewatcherAPI)

# 添加可执行文件
add_executable(simple_app simple_app.cpp)

# 链接 AMMF3-Core 库
target_link_libraries(simple_app 
    ${AMMF3_ROOT}/build/logger/liblogger.a
    ${AMMF3_ROOT}/build/loggerAPI/libloggerAPI.a
    pthread
)

# 设置输出目录
set_target_properties(simple_app PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)
```

### 构建和运行

```bash
# 创建构建目录
mkdir build && cd build

# 配置项目
cmake ..

# 编译
make

# 运行
./bin/simple_app
```

### 预期输出

日志文件 `/data/local/tmp/simple_app.log` 将包含：

```
[2024-01-15 14:30:25.123] [INFO] SimpleApplication 已初始化
[2024-01-15 14:30:25.124] [INFO] 应用程序开始运行
[2024-01-15 14:30:25.125] [INFO] 开始处理数据
[2024-01-15 14:30:25.126] [INFO] 处理 5 个数据项
[2024-01-15 14:30:25.127] [INFO] 数据处理完成
[2024-01-15 14:30:25.128] [INFO] 开始执行计算
[2024-01-15 14:30:25.129] [INFO] 计算结果：42
[2024-01-15 14:30:25.130] [INFO] 计算完成
[2024-01-15 14:30:25.131] [INFO] 开始保存结果
[2024-01-15 14:30:25.132] [INFO] 结果保存成功
[2024-01-15 14:30:25.133] [INFO] 应用程序成功完成所有任务
[2024-01-15 14:30:25.134] [INFO] SimpleApplication 正在关闭
```

## 示例 2：配置文件监控器

这个示例展示了如何使用 FileWatcher API 监控配置文件的变化并自动重新加载。

### C++ 代码

```cpp
// config_monitor.cpp
#include "logger_api.hpp"
#include "filewatcher_api.hpp"
#include <iostream>
#include <fstream>
#include <map>
#include <thread>
#include <chrono>
#include <atomic>

class ConfigurationManager {
private:
    std::unique_ptr<InternalLogger> logger_;
    std::unique_ptr<FileWatcher> watcher_;
    std::string config_path_;
    std::map<std::string, std::string> config_data_;
    std::atomic<bool> running_{false};
    
public:
    ConfigurationManager(const std::string& config_path) 
        : config_path_(config_path) {
        
        // 初始化日志记录器
        LoggerConfig log_config;
        log_config.log_path = "/data/local/tmp/config_monitor.log";
        log_config.max_file_size = 10 * 1024 * 1024;  // 10MB
        log_config.max_file_count = 5;
        log_config.min_level = LogLevel::INFO;
        
        logger_ = std::make_unique<InternalLogger>(log_config);
        logger_->info("ConfigurationManager 已初始化");
        
        // 初始化文件监控器
        watcher_ = std::make_unique<FileWatcher>();
        
        // 加载初始配置
        load_configuration();
    }
    
    bool start_monitoring() {
        logger_->infof("开始监控配置文件：%s", config_path_.c_str());
        
        // 添加文件监控
        bool watch_added = watcher_->add_watch(
            config_path_,
            EventType::MODIFY,
            [this](const FileEvent& event) {
                this->handle_config_change(event);
            }
        );
        
        if (!watch_added) {
            logger_->errorf("无法添加配置文件监控：%s", config_path_.c_str());
            return false;
        }
        
        // 启动监控
        if (watcher_->start()) {
            running_ = true;
            logger_->info("配置文件监控已启动");
            return true;
        } else {
            logger_->error("启动配置文件监控失败");
            return false;
        }
    }
    
    void stop_monitoring() {
        if (running_) {
            logger_->info("停止配置文件监控");
            watcher_->stop();
            running_ = false;
            logger_->info("配置文件监控已停止");
        }
    }
    
    std::string get_config_value(const std::string& key) const {
        auto it = config_data_.find(key);
        return (it != config_data_.end()) ? it->second : "";
    }
    
    void print_configuration() const {
        std::cout << "当前配置：" << std::endl;
        for (const auto& pair : config_data_) {
            std::cout << "  " << pair.first << " = " << pair.second << std::endl;
        }
    }
    
    bool is_running() const {
        return running_;
    }
    
    ~ConfigurationManager() {
        stop_monitoring();
        logger_->info("ConfigurationManager 已销毁");
    }
    
private:
    void load_configuration() {
        logger_->infof("加载配置文件：%s", config_path_.c_str());
        
        std::ifstream file(config_path_);
        if (!file.is_open()) {
            logger_->errorf("无法打开配置文件：%s", config_path_.c_str());
            return;
        }
        
        config_data_.clear();
        std::string line;
        int line_number = 0;
        
        while (std::getline(file, line)) {
            line_number++;
            
            // 跳过空行和注释
            if (line.empty() || line[0] == '#') {
                continue;
            }
            
            // 解析键值对
            size_t pos = line.find('=');
            if (pos != std::string::npos) {
                std::string key = line.substr(0, pos);
                std::string value = line.substr(pos + 1);
                
                // 去除空格
                key.erase(0, key.find_first_not_of(" \t"));
                key.erase(key.find_last_not_of(" \t") + 1);
                value.erase(0, value.find_first_not_of(" \t"));
                value.erase(value.find_last_not_of(" \t") + 1);
                
                config_data_[key] = value;
                logger_->debugf("配置项：%s = %s", key.c_str(), value.c_str());
            } else {
                logger_->warnf("配置文件第 %d 行格式错误：%s", line_number, line.c_str());
            }
        }
        
        logger_->infof("配置加载完成，共 %zu 个配置项", config_data_.size());
    }
    
    void handle_config_change(const FileEvent& event) {
        logger_->infof("检测到配置文件变化：%s", event.path.c_str());
        
        // 等待一小段时间，确保文件写入完成
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        
        // 重新加载配置
        load_configuration();
        
        logger_->info("配置文件已重新加载");
        
        // 通知应用程序配置已更改
        on_configuration_changed();
    }
    
    void on_configuration_changed() {
        logger_->info("配置已更改，通知应用程序");
        
        // 在这里可以添加配置更改的处理逻辑
        // 例如：重新初始化组件、更新运行参数等
        
        std::cout << "配置已更新！" << std::endl;
        print_configuration();
    }
};

class Application {
private:
    std::unique_ptr<ConfigurationManager> config_manager_;
    std::atomic<bool> should_run_{true};
    
public:
    Application(const std::string& config_path) {
        config_manager_ = std::make_unique<ConfigurationManager>(config_path);
    }
    
    void run() {
        std::cout << "启动应用程序..." << std::endl;
        
        // 启动配置监控
        if (!config_manager_->start_monitoring()) {
            std::cerr << "启动配置监控失败" << std::endl;
            return;
        }
        
        // 显示初始配置
        std::cout << "初始配置：" << std::endl;
        config_manager_->print_configuration();
        
        // 主循环
        std::cout << "应用程序正在运行...（按 Ctrl+C 退出）" << std::endl;
        
        while (should_run_) {
            // 模拟应用程序工作
            std::this_thread::sleep_for(std::chrono::seconds(1));
            
            // 使用配置值
            std::string app_name = config_manager_->get_config_value("app_name");
            std::string log_level = config_manager_->get_config_value("log_level");
            
            if (!app_name.empty()) {
                // 使用配置进行工作
            }
        }
        
        config_manager_->stop_monitoring();
        std::cout << "应用程序已退出" << std::endl;
    }
    
    void stop() {
        should_run_ = false;
    }
};

int main() {
    // 创建示例配置文件
    std::string config_path = "/data/local/tmp/app_config.conf";
    
    std::ofstream config_file(config_path);
    config_file << "# 应用程序配置文件\n";
    config_file << "app_name = MyApplication\n";
    config_file << "log_level = INFO\n";
    config_file << "max_connections = 100\n";
    config_file << "timeout = 30\n";
    config_file.close();
    
    try {
        Application app(config_path);
        
        // 设置信号处理（简化版本）
        std::thread app_thread([&app]() {
            app.run();
        });
        
        // 等待用户输入或信号
        std::cout << "按 Enter 键退出..." << std::endl;
        std::cin.get();
        
        app.stop();
        app_thread.join();
        
    } catch (const std::exception& e) {
        std::cerr << "应用程序错误：" << e.what() << std::endl;
        return -1;
    }
    
    return 0;
}
```

### 测试配置更改

在应用程序运行时，可以修改配置文件来测试自动重新加载：

```bash
# 修改配置文件
echo "app_name = UpdatedApplication" > /data/local/tmp/app_config.conf
echo "log_level = DEBUG" >> /data/local/tmp/app_config.conf
echo "max_connections = 200" >> /data/local/tmp/app_config.conf
echo "timeout = 60" >> /data/local/tmp/app_config.conf
```

## 示例 3：系统服务（组合使用）

这个示例展示了如何将 Logger 和 FileWatcher API 组合使用，创建一个完整的系统监控服务。

### C++ 代码

```cpp
// system_monitor.cpp
#include "logger_api.hpp"
#include "filewatcher_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <atomic>
#include <vector>
#include <map>
#include <signal.h>

class SystemMonitorService {
private:
    std::unique_ptr<InternalLogger> logger_;
    std::unique_ptr<FileWatcher> watcher_;
    std::atomic<bool> running_{false};
    std::thread monitor_thread_;
    
    // 监控统计
    std::map<std::string, int> event_counts_;
    std::chrono::steady_clock::time_point start_time_;
    
public:
    SystemMonitorService() {
        // 配置日志记录器
        LoggerConfig config;
        config.log_path = "/data/local/tmp/system_monitor.log";
        config.max_file_size = 50 * 1024 * 1024;  // 50MB
        config.max_file_count = 10;
        config.min_level = LogLevel::INFO;
        config.buffer_size = 128 * 1024;  // 128KB
        config.flush_interval_ms = 2000;  // 2秒
        
        logger_ = std::make_unique<InternalLogger>(config);
        logger_->info("SystemMonitorService 已初始化");
        
        // 初始化文件监控器
        watcher_ = std::make_unique<FileWatcher>();
        
        // 初始化统计
        start_time_ = std::chrono::steady_clock::now();
    }
    
    bool start() {
        logger_->info("启动系统监控服务");
        
        // 添加多个监控路径
        if (!setup_monitoring_paths()) {
            logger_->error("设置监控路径失败");
            return false;
        }
        
        // 启动文件监控
        if (!watcher_->start()) {
            logger_->error("启动文件监控失败");
            return false;
        }
        
        // 启动监控线程
        running_ = true;
        monitor_thread_ = std::thread(&SystemMonitorService::monitor_loop, this);
        
        logger_->info("系统监控服务已启动");
        return true;
    }
    
    void stop() {
        if (running_) {
            logger_->info("停止系统监控服务");
            
            running_ = false;
            
            if (monitor_thread_.joinable()) {
                monitor_thread_.join();
            }
            
            watcher_->stop();
            
            // 输出统计信息
            print_statistics();
            
            logger_->info("系统监控服务已停止");
        }
    }
    
    bool is_running() const {
        return running_;
    }
    
    ~SystemMonitorService() {
        stop();
        logger_->info("SystemMonitorService 已销毁");
    }
    
private:
    bool setup_monitoring_paths() {
        logger_->info("设置监控路径");
        
        // 监控路径配置
        std::vector<std::pair<std::string, uint32_t>> paths = {
            {"/data/config", make_event_mask(EventType::MODIFY, EventType::CREATE, EventType::DELETE)},
            {"/data/critical", make_event_mask(EventType::DELETE, EventType::MOVED_FROM)},
            {"/data/logs", make_event_mask(EventType::CREATE, EventType::MODIFY)},
            {"/data/temp", make_event_mask(EventType::CREATE, EventType::DELETE)}
        };
        
        for (const auto& path_config : paths) {
            const std::string& path = path_config.first;
            uint32_t mask = path_config.second;
            
            logger_->infof("添加监控路径：%s", path.c_str());
            
            bool success = watcher_->add_watch(path, mask,
                [this, path](const FileEvent& event) {
                    this->handle_file_event(event, path);
                });
            
            if (success) {
                logger_->infof("成功添加监控：%s", path.c_str());
            } else {
                logger_->warnf("添加监控失败：%s（路径可能不存在）", path.c_str());
            }
        }
        
        return true;
    }
    
    void handle_file_event(const FileEvent& event, const std::string& base_path) {
        std::string event_type_str = event_type_to_string(event.type);
        
        // 更新统计
        event_counts_[event_type_str]++;
        
        // 记录事件
        logger_->infof("文件事件 [%s]: %s (%s)", 
                      base_path.c_str(), event_type_str.c_str(), event.path.c_str());
        
        // 根据事件类型进行特殊处理
        switch (event.type) {
            case EventType::DELETE:
                handle_file_deletion(event, base_path);
                break;
                
            case EventType::CREATE:
                handle_file_creation(event, base_path);
                break;
                
            case EventType::MODIFY:
                handle_file_modification(event, base_path);
                break;
                
            default:
                break;
        }
    }
    
    void handle_file_deletion(const FileEvent& event, const std::string& base_path) {
        if (base_path == "/data/critical") {
            logger_->errorf("关键文件被删除：%s", event.path.c_str());
            
            // 发送警报（这里只是记录）
            logger_->fatal("检测到关键文件删除，需要立即关注！");
        } else {
            logger_->infof("文件删除：%s", event.path.c_str());
        }
    }
    
    void handle_file_creation(const FileEvent& event, const std::string& base_path) {
        logger_->infof("新文件创建：%s", event.path.c_str());
        
        if (base_path == "/data/logs") {
            logger_->infof("新日志文件：%s", event.path.c_str());
        }
    }
    
    void handle_file_modification(const FileEvent& event, const std::string& base_path) {
        if (base_path == "/data/config") {
            logger_->infof("配置文件已修改：%s", event.path.c_str());
            
            // 可以在这里触发配置重新加载
            logger_->info("建议重新加载相关配置");
        } else {
            logger_->debugf("文件修改：%s", event.path.c_str());
        }
    }
    
    void monitor_loop() {
        logger_->info("监控循环已启动");
        
        while (running_) {
            // 每分钟输出一次状态
            std::this_thread::sleep_for(std::chrono::minutes(1));
            
            if (running_) {
                log_status();
            }
        }
        
        logger_->info("监控循环已退出");
    }
    
    void log_status() {
        auto now = std::chrono::steady_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::minutes>(now - start_time_);
        
        logger_->infof("系统监控状态 - 运行时间：%ld 分钟", duration.count());
        
        // 记录事件统计
        if (!event_counts_.empty()) {
            logger_->info("事件统计：");
            for (const auto& pair : event_counts_) {
                logger_->infof("  %s: %d 次", pair.first.c_str(), pair.second);
            }
        } else {
            logger_->info("暂无文件事件");
        }
    }
    
    void print_statistics() {
        auto now = std::chrono::steady_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::minutes>(now - start_time_);
        
        logger_->infof("=== 监控服务统计 ===");
        logger_->infof("总运行时间：%ld 分钟", duration.count());
        
        int total_events = 0;
        for (const auto& pair : event_counts_) {
            total_events += pair.second;
            logger_->infof("%s 事件：%d 次", pair.first.c_str(), pair.second);
        }
        
        logger_->infof("总事件数：%d", total_events);
        
        if (duration.count() > 0) {
            double events_per_minute = static_cast<double>(total_events) / duration.count();
            logger_->infof("平均事件频率：%.2f 事件/分钟", events_per_minute);
        }
        
        logger_->info("=== 统计结束 ===");
    }
};

// 全局服务实例
std::unique_ptr<SystemMonitorService> g_service;

// 信号处理函数
void signal_handler(int signal) {
    std::cout << "\n收到信号 " << signal << "，正在关闭服务..." << std::endl;
    
    if (g_service) {
        g_service->stop();
    }
    
    exit(0);
}

int main() {
    std::cout << "启动系统监控服务..." << std::endl;
    
    // 设置信号处理
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    try {
        // 创建并启动服务
        g_service = std::make_unique<SystemMonitorService>();
        
        if (!g_service->start()) {
            std::cerr << "启动系统监控服务失败" << std::endl;
            return -1;
        }
        
        std::cout << "系统监控服务已启动" << std::endl;
        std::cout << "监控以下目录：" << std::endl;
        std::cout << "  - /data/config (配置文件)" << std::endl;
        std::cout << "  - /data/critical (关键文件)" << std::endl;
        std::cout << "  - /data/logs (日志文件)" << std::endl;
        std::cout << "  - /data/temp (临时文件)" << std::endl;
        std::cout << "按 Ctrl+C 停止服务" << std::endl;
        
        // 保持服务运行
        while (g_service->is_running()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
    } catch (const std::exception& e) {
        std::cerr << "服务错误：" << e.what() << std::endl;
        return -1;
    }
    
    std::cout << "系统监控服务已退出" << std::endl;
    return 0;
}
```

### 服务部署脚本

```bash
#!/bin/bash
# deploy_monitor.sh

SERVICE_NAME="system_monitor"
BINARY_PATH="./bin/system_monitor"
PID_FILE="/data/local/tmp/${SERVICE_NAME}.pid"
LOG_FILE="/data/local/tmp/${SERVICE_NAME}_service.log"

start_service() {
    echo "启动 $SERVICE_NAME 服务..."
    
    # 检查是否已经运行
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "服务已在运行 (PID: $PID)"
            return 1
        else
            echo "删除过期的 PID 文件"
            rm -f "$PID_FILE"
        fi
    fi
    
    # 创建必要的目录
    mkdir -p /data/config
    mkdir -p /data/critical
    mkdir -p /data/logs
    mkdir -p /data/temp
    
    # 启动服务
    nohup "$BINARY_PATH" > "$LOG_FILE" 2>&1 &
    PID=$!
    
    # 保存 PID
    echo $PID > "$PID_FILE"
    
    echo "服务已启动 (PID: $PID)"
    echo "日志文件：$LOG_FILE"
}

stop_service() {
    echo "停止 $SERVICE_NAME 服务..."
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill -TERM "$PID"
            
            # 等待服务停止
            for i in {1..10}; do
                if ! kill -0 "$PID" 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # 强制终止
            if kill -0 "$PID" 2>/dev/null; then
                echo "强制终止服务"
                kill -KILL "$PID"
            fi
            
            echo "服务已停止"
        else
            echo "服务未运行"
        fi
        
        rm -f "$PID_FILE"
    else
        echo "PID 文件不存在，服务可能未运行"
    fi
}

status_service() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "服务正在运行 (PID: $PID)"
            return 0
        else
            echo "服务未运行（PID 文件存在但进程不存在）"
            return 1
        fi
    else
        echo "服务未运行"
        return 1
    fi
}

case "$1" in
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        stop_service
        sleep 2
        start_service
        ;;
    status)
        status_service
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
```

### 构建和部署

```bash
# 构建项目
mkdir build && cd build
cmake ..
make

# 部署服务
cp ../deploy_monitor.sh .
chmod +x deploy_monitor.sh

# 启动服务
./deploy_monitor.sh start

# 检查状态
./deploy_monitor.sh status

# 查看日志
tail -f /data/local/tmp/system_monitor.log
```

## 关键要点

### 1. 错误处理

所有示例都包含适当的错误处理：
- 检查初始化结果
- 处理文件操作异常
- 优雅的资源清理

### 2. 资源管理

- 使用 RAII 原则
- 智能指针管理内存
- 析构函数中清理资源

### 3. 线程安全

- 使用原子变量控制线程状态
- 适当的同步机制
- 安全的线程退出

### 4. 配置管理

- 集中化配置
- 运行时配置更新
- 配置验证

### 5. 日志记录最佳实践

- 结构化日志消息
- 适当的日志级别
- 性能考虑

这些示例展示了如何在实际项目中有效地使用 AMMF3-Core 的功能，提供了从简单应用到复杂系统服务的完整解决方案。