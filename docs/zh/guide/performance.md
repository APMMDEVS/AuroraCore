# 性能优化

优化 AMMF3-Core 组件性能的综合指南，包括 Logger 和 FileWatcher 的最佳实践。

## 🚀 Logger 性能优化

### 缓冲区管理

#### 调整缓冲区大小

```cpp
// 为高频日志设置更大的缓冲区
LoggerConfig config;
config.buffer_size = 1024 * 1024;  // 1MB 缓冲区
config.flush_interval = 5000;       // 5秒刷新间隔

Logger logger(config);
```

#### 批量写入优化

```cpp
// 使用批量日志记录
std::vector<std::string> logs;
logs.reserve(1000);  // 预分配空间

// 收集日志
for (int i = 0; i < 1000; ++i) {
    logs.push_back("Log message " + std::to_string(i));
}

// 批量写入
logger.log_batch(logs);
```

### 守护进程模式性能

#### 启用高性能模式

```cpp
// 配置高性能守护进程
LoggerDaemonConfig daemon_config;
daemon_config.thread_pool_size = 4;        // 多线程处理
daemon_config.queue_size = 10000;          // 大队列
daemon_config.batch_size = 100;            // 批处理大小
daemon_config.compression_enabled = true;   // 启用压缩

LoggerDaemon daemon(daemon_config);
```

#### 内存映射文件

```cpp
// 使用内存映射提高 I/O 性能
LoggerConfig config;
config.use_mmap = true;
config.mmap_size = 64 * 1024 * 1024;  // 64MB 映射
config.sync_interval = 10000;          // 10秒同步

Logger logger(config);
```

### 日志级别优化

```cpp
// 运行时动态调整日志级别
if (performance_critical_section) {
    logger.set_level(LogLevel::ERROR);  // 仅记录错误
} else {
    logger.set_level(LogLevel::INFO);   // 正常详细度
}

// 使用条件日志记录
if (logger.is_enabled(LogLevel::DEBUG)) {
    logger.debug("Expensive debug info: " + expensive_operation());
}
```

## 📁 FileWatcher 性能优化

### inotify 限制调整

#### 系统级别优化

```bash
# 增加 inotify 限制
echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches
echo 8192 | sudo tee /proc/sys/fs/inotify/max_user_instances

# 永久设置
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
echo "fs.inotify.max_user_instances=8192" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### 应用级别检查

```cpp
// 检查 inotify 限制
FileWatcherConfig config;
if (config.check_inotify_limits()) {
    std::cout << "inotify 限制足够" << std::endl;
} else {
    std::cerr << "警告：inotify 限制可能不足" << std::endl;
}
```

### 高效监视管理

#### 选择性监视

```cpp
// 仅监视必要的事件类型
FileWatcherConfig config;
config.events = FileEvent::CREATED | FileEvent::MODIFIED;
// 排除 ACCESSED 事件以减少噪音

// 使用文件过滤器
config.file_filter = [](const std::string& path) {
    return path.ends_with(".log") || path.ends_with(".txt");
};

FileWatcher watcher(config);
```

#### 目录层次优化

```cpp
// 避免深层递归监视
FileWatcherConfig config;
config.recursive = true;
config.max_depth = 3;  // 限制递归深度
config.exclude_patterns = {
    "*/\.git/*",      // 排除 git 目录
    "*/node_modules/*", // 排除 node_modules
    "*/\.cache/*"      // 排除缓存目录
};

FileWatcher watcher("/project/root", config);
```

### 回调函数优化

#### 异步处理

```cpp
// 使用线程池处理事件
class AsyncFileHandler {
private:
    std::thread_pool pool{4};
    
public:
    void handle_event(const FileEvent& event) {
        // 快速返回，异步处理
        pool.submit([event]() {
            // 耗时的文件处理逻辑
            process_file_change(event);
        });
    }
};

AsyncFileHandler handler;
watcher.set_callback([&handler](const FileEvent& event) {
    handler.handle_event(event);
});
```

#### 事件去重

```cpp
// 实现事件去重机制
class DeduplicatingHandler {
private:
    std::unordered_map<std::string, std::chrono::steady_clock::time_point> last_events;
    std::chrono::milliseconds debounce_time{100};
    
public:
    bool should_process(const FileEvent& event) {
        auto now = std::chrono::steady_clock::now();
        auto& last_time = last_events[event.path];
        
        if (now - last_time > debounce_time) {
            last_time = now;
            return true;
        }
        return false;
    }
};
```

## ⚙️ 系统级优化

### CPU 亲和性设置

```cpp
// 设置线程 CPU 亲和性
#include <pthread.h>
#include <sched.h>

void set_thread_affinity(std::thread& t, int cpu_id) {
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(cpu_id, &cpuset);
    
    pthread_setaffinity_np(t.native_handle(), sizeof(cpu_set_t), &cpuset);
}

// 为 Logger 守护进程设置专用 CPU
std::thread logger_thread([]() {
    LoggerDaemon daemon;
    daemon.run();
});
set_thread_affinity(logger_thread, 2);  // 使用 CPU 2
```

### I/O 调度优化

```bash
# 设置 I/O 调度器为 deadline（适合日志写入）
echo deadline | sudo tee /sys/block/sda/queue/scheduler

# 调整 I/O 优先级
ionice -c 1 -n 4 ./ammf3_logger_daemon
```

### 内存管理

#### 内存池使用

```cpp
// 使用内存池减少分配开销
class MemoryPool {
private:
    std::vector<std::unique_ptr<char[]>> blocks;
    std::stack<char*> free_blocks;
    size_t block_size;
    
public:
    MemoryPool(size_t block_size, size_t initial_blocks) 
        : block_size(block_size) {
        for (size_t i = 0; i < initial_blocks; ++i) {
            auto block = std::make_unique<char[]>(block_size);
            free_blocks.push(block.get());
            blocks.push_back(std::move(block));
        }
    }
    
    char* allocate() {
        if (free_blocks.empty()) {
            auto block = std::make_unique<char[]>(block_size);
            char* ptr = block.get();
            blocks.push_back(std::move(block));
            return ptr;
        }
        
        char* ptr = free_blocks.top();
        free_blocks.pop();
        return ptr;
    }
    
    void deallocate(char* ptr) {
        free_blocks.push(ptr);
    }
};

// 在 Logger 中使用内存池
static MemoryPool log_pool(1024, 100);
```

#### 大页内存

```bash
# 启用大页内存
echo 1024 | sudo tee /proc/sys/vm/nr_hugepages

# 在应用中使用大页
mmap(nullptr, size, PROT_READ | PROT_WRITE, 
     MAP_PRIVATE | MAP_ANONYMOUS | MAP_HUGETLB, -1, 0);
```

## 📊 性能监控

### 内置性能指标

```cpp
// Logger 性能统计
LoggerStats stats = logger.get_stats();
std::cout << "日志写入速率: " << stats.logs_per_second << " logs/s" << std::endl;
std::cout << "平均延迟: " << stats.average_latency_ms << " ms" << std::endl;
std::cout << "缓冲区使用率: " << stats.buffer_usage_percent << "%" << std::endl;

// FileWatcher 性能统计
FileWatcherStats fw_stats = watcher.get_stats();
std::cout << "事件处理速率: " << fw_stats.events_per_second << " events/s" << std::endl;
std::cout << "监视的文件数: " << fw_stats.watched_files_count << std::endl;
std::cout << "队列深度: " << fw_stats.queue_depth << std::endl;
```

### 系统监控

```bash
# 监控 CPU 使用率
top -p $(pgrep ammf3)

# 监控内存使用
ps -o pid,vsz,rss,comm -p $(pgrep ammf3)

# 监控 I/O 统计
iostat -x 1

# 监控 inotify 使用
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l
```

### 性能分析工具

```bash
# 使用 perf 进行性能分析
perf record -g ./ammf3_app
perf report

# 使用 valgrind 检查内存性能
valgrind --tool=callgrind ./ammf3_app
kcachegrind callgrind.out.*

# 使用 strace 分析系统调用
strace -c -p $(pgrep ammf3)
```

## 🔧 故障排除

### 常见性能问题

#### 高 CPU 使用率

```cpp
// 检查回调函数效率
auto start = std::chrono::high_resolution_clock::now();
callback_function(event);
auto end = std::chrono::high_resolution_clock::now();
auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);

if (duration.count() > 1000) {  // 超过 1ms
    std::cerr << "警告：回调函数执行时间过长: " << duration.count() << "μs" << std::endl;
}
```

#### 内存泄漏

```cpp
// 定期检查内存使用
class MemoryMonitor {
private:
    size_t baseline_memory;
    
public:
    MemoryMonitor() : baseline_memory(get_memory_usage()) {}
    
    void check_memory_growth() {
        size_t current = get_memory_usage();
        if (current > baseline_memory * 1.5) {  // 增长超过 50%
            std::cerr << "警告：内存使用量异常增长" << std::endl;
        }
    }
    
private:
    size_t get_memory_usage() {
        std::ifstream status("/proc/self/status");
        std::string line;
        while (std::getline(status, line)) {
            if (line.starts_with("VmRSS:")) {
                return std::stoul(line.substr(6));
            }
        }
        return 0;
    }
};
```

#### 磁盘 I/O 瓶颈

```bash
# 检查磁盘 I/O 等待
iostat -x 1 | grep -E "(Device|sda|await)"

# 如果 await 时间过高，考虑：
# 1. 使用 SSD 存储
# 2. 增加缓冲区大小
# 3. 减少同步频率
# 4. 使用异步 I/O
```

## 📈 性能基准测试

### Logger 基准测试

```cpp
// 日志写入性能测试
void benchmark_logger() {
    Logger logger;
    const int num_logs = 100000;
    
    auto start = std::chrono::high_resolution_clock::now();
    
    for (int i = 0; i < num_logs; ++i) {
        logger.info("Benchmark log message " + std::to_string(i));
    }
    
    logger.flush();  // 确保所有日志都写入
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    double logs_per_second = (double)num_logs / duration.count() * 1000;
    std::cout << "Logger 性能: " << logs_per_second << " logs/s" << std::endl;
}
```

### FileWatcher 基准测试

```cpp
// 文件监视性能测试
void benchmark_filewatcher() {
    FileWatcher watcher("/tmp/test_dir");
    std::atomic<int> event_count{0};
    
    watcher.set_callback([&event_count](const FileEvent& event) {
        event_count++;
    });
    
    watcher.start();
    
    auto start = std::chrono::high_resolution_clock::now();
    
    // 创建大量文件
    const int num_files = 10000;
    for (int i = 0; i < num_files; ++i) {
        std::ofstream file("/tmp/test_dir/file_" + std::to_string(i) + ".txt");
        file << "test content";
    }
    
    // 等待所有事件处理完成
    std::this_thread::sleep_for(std::chrono::seconds(5));
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);
    
    double events_per_second = (double)event_count / duration.count() * 1000;
    std::cout << "FileWatcher 性能: " << events_per_second << " events/s" << std::endl;
    std::cout << "处理的事件数: " << event_count << "/" << num_files << std::endl;
}
```

## 📝 最佳实践总结

### Logger 最佳实践

1. **使用适当的缓冲区大小**（1-4MB）
2. **启用批量写入**以减少系统调用
3. **在性能关键路径中降低日志级别**
4. **使用异步日志记录**避免阻塞主线程
5. **定期轮转日志文件**防止单个文件过大
6. **使用压缩**减少磁盘空间使用

### FileWatcher 最佳实践

1. **调整系统 inotify 限制**
2. **使用文件过滤器**减少不必要的事件
3. **限制递归监视深度**
4. **实现事件去重**避免重复处理
5. **使用异步回调处理**
6. **定期清理不再需要的监视器**

### 系统级最佳实践

1. **设置适当的线程优先级和 CPU 亲和性**
2. **使用高性能文件系统**（如 ext4、XFS）
3. **配置适当的 I/O 调度器**
4. **启用大页内存**（如果适用）
5. **监控系统资源使用情况**
6. **定期进行性能基准测试**

## 🔗 相关文档

- [入门指南](/zh/guide/getting-started)
- [构建指南](/zh/guide/building)
- [常见问题](/zh/guide/faq)
- [Logger API](/zh/api/logger-api)
- [FileWatcher API](/zh/api/filewatcher-api)