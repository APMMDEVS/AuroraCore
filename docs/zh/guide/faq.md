# 常见问题

关于 AMMF3-Core 使用过程中常见问题的解答和解决方案。

## 📦 安装和设置

### Q: 如何安装 AMMF3-Core？

**A:** AMMF3-Core 需要从源码编译安装：

```bash
# 克隆仓库
git clone https://github.com/your-username/AMMF3-Core.git
cd AMMF3-Core

# 创建构建目录
mkdir build && cd build

# 配置和编译
cmake .. -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
         -DANDROID_ABI=arm64-v8a \
         -DANDROID_PLATFORM=android-21
make -j$(nproc)
```

详细说明请参考[构建指南](/zh/guide/building)。

### Q: 支持哪些 Android 版本？

**A:** AMMF3-Core 支持：
- **最低版本**: Android 5.0 (API 21)
- **推荐版本**: Android 8.0+ (API 26+)
- **架构支持**: ARM64、ARMv7、x86_64

### Q: 需要什么权限？

**A:** 根据使用的功能，可能需要以下权限：

```xml
<!-- Android 清单文件 -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<!-- Android 13+ 需要细分权限 -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

## 🔧 Logger 相关问题

### Q: 日志文件没有创建怎么办？

**A:** 检查以下几个方面：

1. **权限检查**：
```cpp
// 检查目录写入权限
if (!logger.check_write_permission("/sdcard/logs")) {
    std::cerr << "没有写入权限" << std::endl;
}
```

2. **目录存在性**：
```cpp
// 确保目录存在
LoggerConfig config;
config.log_dir = "/sdcard/logs";
config.create_dir_if_not_exists = true;
Logger logger(config);
```

3. **SELinux 策略**：
```bash
# 检查 SELinux 状态
getenforce
# 如果是 Enforcing，可能需要调整策略
```

### Q: 日志写入性能很慢怎么办？

**A:** 尝试以下优化方法：

1. **增加缓冲区大小**：
```cpp
LoggerConfig config;
config.buffer_size = 1024 * 1024;  // 1MB 缓冲区
config.flush_interval = 5000;       // 5秒刷新
```

2. **使用异步模式**：
```cpp
config.async_mode = true;
config.thread_pool_size = 2;
```

3. **批量写入**：
```cpp
std::vector<std::string> logs = {"log1", "log2", "log3"};
logger.log_batch(logs);
```

详细优化指南请参考[性能优化](/zh/guide/performance)。

### Q: 如何实现日志轮转？

**A:** 配置自动日志轮转：

```cpp
LoggerConfig config;
config.max_file_size = 10 * 1024 * 1024;  // 10MB
config.max_files = 5;                      // 保留 5 个文件
config.rotation_policy = RotationPolicy::SIZE_BASED;

Logger logger(config);
```

### Q: 守护进程模式如何使用？

**A:** 启动和配置守护进程：

```cpp
// 启动守护进程
LoggerDaemonConfig daemon_config;
daemon_config.socket_path = "/tmp/logger.sock";
daemon_config.max_clients = 10;

LoggerDaemon daemon(daemon_config);
daemon.start();

// 客户端连接
LoggerClient client("/tmp/logger.sock");
client.log(LogLevel::INFO, "Hello from client");
```

## 📁 FileWatcher 相关问题

### Q: FileWatcher 不能监视某些目录？

**A:** 可能的原因和解决方案：

1. **权限问题**：
```cpp
// 检查目录访问权限
if (access("/path/to/dir", R_OK) != 0) {
    perror("目录访问权限不足");
}
```

2. **inotify 限制**：
```bash
# 检查当前限制
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances

# 增加限制
echo 524288 | sudo tee /proc/sys/fs/inotify/max_user_watches
```

3. **文件系统不支持**：
```cpp
// 检查文件系统类型
FileWatcherConfig config;
if (!config.check_filesystem_support("/path")) {
    std::cerr << "文件系统不支持 inotify" << std::endl;
}
```

### Q: 收到太多重复事件怎么办？

**A:** 实现事件过滤和去重：

```cpp
// 事件过滤
FileWatcherConfig config;
config.events = FileEvent::CREATED | FileEvent::MODIFIED;  // 只监视创建和修改
config.ignore_events = FileEvent::ACCESSED;                // 忽略访问事件

// 文件类型过滤
config.file_filter = [](const std::string& path) {
    return path.ends_with(".log") || path.ends_with(".txt");
};

// 事件去重
class EventDeduplicator {
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

### Q: 监视大目录时性能下降？

**A:** 优化大目录监视：

```cpp
// 限制递归深度
FileWatcherConfig config;
config.recursive = true;
config.max_depth = 3;

// 排除不必要的目录
config.exclude_patterns = {
    "*/\.git/*",
    "*/node_modules/*",
    "*/\.cache/*",
    "*/build/*"
};

// 使用多个监视器分担负载
std::vector<std::unique_ptr<FileWatcher>> watchers;
for (const auto& subdir : subdirectories) {
    auto watcher = std::make_unique<FileWatcher>(subdir, config);
    watchers.push_back(std::move(watcher));
}
```

## 🔗 集成问题

### Q: 如何在 Android 应用中集成？

**A:** 通过 JNI 集成：

1. **添加 native 库**：
```gradle
// app/build.gradle
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
}
```

2. **JNI 接口**：
```cpp
// native-lib.cpp
#include <jni.h>
#include "ammf3/logger.h"

extern "C" JNIEXPORT void JNICALL
Java_com_example_MainActivity_initLogger(JNIEnv *env, jobject thiz, jstring log_dir) {
    const char* dir = env->GetStringUTFChars(log_dir, nullptr);
    
    LoggerConfig config;
    config.log_dir = dir;
    Logger::initialize(config);
    
    env->ReleaseStringUTFChars(log_dir, dir);
}
```

3. **Java 调用**：
```java
// MainActivity.java
public class MainActivity extends AppCompatActivity {
    static {
        System.loadLibrary("ammf3-core");
    }
    
    public native void initLogger(String logDir);
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        String logDir = getExternalFilesDir(null) + "/logs";
        initLogger(logDir);
    }
}
```

### Q: 如何在 Unity 中使用？

**A:** 通过插件方式集成：

1. **创建 Unity 插件**：
```cpp
// unity_plugin.cpp
extern "C" {
    void UNITY_INTERFACE_EXPORT UNITY_INTERFACE_API
    InitLogger(const char* log_dir) {
        LoggerConfig config;
        config.log_dir = log_dir;
        Logger::initialize(config);
    }
    
    void UNITY_INTERFACE_EXPORT UNITY_INTERFACE_API
    LogMessage(int level, const char* message) {
        Logger::instance().log(static_cast<LogLevel>(level), message);
    }
}
```

2. **C# 接口**：
```csharp
// LoggerPlugin.cs
using System.Runtime.InteropServices;

public class LoggerPlugin {
    [DllImport("ammf3-core")]
    private static extern void InitLogger(string logDir);
    
    [DllImport("ammf3-core")]
    private static extern void LogMessage(int level, string message);
    
    public static void Initialize(string logDir) {
        InitLogger(logDir);
    }
    
    public static void Log(LogLevel level, string message) {
        LogMessage((int)level, message);
    }
}
```

### Q: 如何与现有日志系统集成？

**A:** 实现适配器模式：

```cpp
// 与 Android Log 集成
class AndroidLogAdapter : public LoggerSink {
public:
    void write(LogLevel level, const std::string& message) override {
        android_LogPriority priority;
        switch (level) {
            case LogLevel::DEBUG: priority = ANDROID_LOG_DEBUG; break;
            case LogLevel::INFO:  priority = ANDROID_LOG_INFO; break;
            case LogLevel::WARN:  priority = ANDROID_LOG_WARN; break;
            case LogLevel::ERROR: priority = ANDROID_LOG_ERROR; break;
        }
        __android_log_print(priority, "AMMF3", "%s", message.c_str());
    }
};

// 添加到 Logger
Logger logger;
logger.add_sink(std::make_unique<AndroidLogAdapter>());
```

## 🚀 性能问题

### Q: 内存使用量过高怎么办？

**A:** 内存优化策略：

1. **调整缓冲区大小**：
```cpp
LoggerConfig config;
config.buffer_size = 256 * 1024;  // 减少到 256KB
config.flush_interval = 1000;      // 更频繁刷新
```

2. **启用压缩**：
```cpp
config.compression_enabled = true;
config.compression_level = 6;  // 平衡压缩率和性能
```

3. **限制文件监视数量**：
```cpp
FileWatcherConfig config;
config.max_watches = 1000;  // 限制监视数量
```

### Q: CPU 使用率过高？

**A:** CPU 优化方法：

1. **降低事件频率**：
```cpp
// FileWatcher 事件限流
FileWatcherConfig config;
config.event_rate_limit = 100;  // 每秒最多 100 个事件
```

2. **使用异步处理**：
```cpp
// 异步事件处理
watcher.set_callback([](const FileEvent& event) {
    std::async(std::launch::async, [event]() {
        process_event(event);
    });
});
```

3. **优化回调函数**：
```cpp
// 避免在回调中执行耗时操作
watcher.set_callback([&queue](const FileEvent& event) {
    queue.push(event);  // 快速入队
});

// 在单独线程中处理
std::thread processor([&queue]() {
    while (true) {
        if (!queue.empty()) {
            auto event = queue.pop();
            process_event(event);  // 耗时处理
        }
    }
});
```

## 🐛 调试问题

### Q: 如何启用调试日志？

**A:** 启用详细调试信息：

```cpp
// 编译时启用调试
#define AMMF3_DEBUG 1
#include "ammf3/logger.h"

// 运行时设置调试级别
LoggerConfig config;
config.debug_level = DebugLevel::VERBOSE;
config.debug_output = DebugOutput::CONSOLE | DebugOutput::FILE;

Logger logger(config);
```

### Q: 如何追踪性能瓶颈？

**A:** 使用内置性能分析：

```cpp
// 启用性能统计
LoggerConfig config;
config.enable_profiling = true;

Logger logger(config);

// 获取性能统计
auto stats = logger.get_performance_stats();
std::cout << "平均写入延迟: " << stats.avg_write_latency_ms << "ms" << std::endl;
std::cout << "吞吐量: " << stats.throughput_logs_per_sec << " logs/s" << std::endl;
```

### Q: 如何检查组件状态？

**A:** 使用健康检查接口：

```cpp
// Logger 健康检查
if (logger.is_healthy()) {
    std::cout << "Logger 运行正常" << std::endl;
} else {
    auto issues = logger.get_health_issues();
    for (const auto& issue : issues) {
        std::cerr << "问题: " << issue << std::endl;
    }
}

// FileWatcher 健康检查
if (watcher.is_healthy()) {
    std::cout << "FileWatcher 运行正常" << std::endl;
} else {
    std::cerr << "FileWatcher 状态异常" << std::endl;
}
```

## 📱 Android 特定问题

### Q: 在 Android 11+ 上访问外部存储失败？

**A:** 适配分区存储：

```xml
<!-- 在 AndroidManifest.xml 中 -->
<application
    android:requestLegacyExternalStorage="true"
    android:preserveLegacyExternalStorage="true">
</application>
```

```java
// 使用应用专用目录
File logDir = new File(getExternalFilesDir(null), "logs");
if (!logDir.exists()) {
    logDir.mkdirs();
}
```

### Q: 应用后台时功能停止工作？

**A:** 处理后台限制：

```java
// 申请后台运行权限
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    Intent intent = new Intent();
    String packageName = getPackageName();
    PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
    if (!pm.isIgnoringBatteryOptimizations(packageName)) {
        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        intent.setData(Uri.parse("package:" + packageName));
        startActivity(intent);
    }
}
```

### Q: 在某些设备上崩溃？

**A:** 增加兼容性检查：

```cpp
// 检查设备兼容性
class CompatibilityChecker {
public:
    static bool check_device_compatibility() {
        // 检查 Android 版本
        if (get_android_api_level() < 21) {
            return false;
        }
        
        // 检查架构
        std::string arch = get_cpu_architecture();
        if (arch != "arm64" && arch != "armv7") {
            return false;
        }
        
        // 检查可用内存
        if (get_available_memory() < 100 * 1024 * 1024) {  // 100MB
            return false;
        }
        
        return true;
    }
};

// 在初始化前检查
if (!CompatibilityChecker::check_device_compatibility()) {
    std::cerr << "设备不兼容" << std::endl;
    return;
}
```

## 🔨 构建问题

### Q: CMake 配置失败？

**A:** 常见解决方案：

```bash
# 清理构建目录
rm -rf build/
mkdir build && cd build

# 检查 NDK 路径
echo $ANDROID_NDK
ls $ANDROID_NDK/build/cmake/android.toolchain.cmake

# 使用正确的 CMake 版本
cmake --version  # 应该 >= 3.10

# 详细输出调试
cmake .. --debug-output
```

### Q: 链接错误？

**A:** 检查依赖和链接：

```cmake
# CMakeLists.txt 中确保正确链接
target_link_libraries(your_target
    ammf3-logger
    ammf3-filewatcher
    log  # Android log 库
    pthread
)
```

### Q: 找不到头文件？

**A:** 检查包含路径：

```cmake
# 添加包含目录
target_include_directories(your_target PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)
```

## 📞 获取帮助

如果以上解答没有解决您的问题，可以通过以下方式获取帮助：

### 🔍 自助资源

1. **查看文档**：
   - [入门指南](/zh/guide/getting-started)
   - [构建指南](/zh/guide/building)
   - [性能优化](/zh/guide/performance)
   - [API 参考](/zh/api/)

2. **搜索已知问题**：
   - [GitHub Issues](https://github.com/your-username/AMMF3-Core/issues)
   - [讨论区](https://github.com/your-username/AMMF3-Core/discussions)

### 💬 社区支持

1. **提交 Issue**：
   - 详细描述问题
   - 提供复现步骤
   - 包含环境信息
   - 附上相关日志

2. **参与讨论**：
   - 加入 GitHub Discussions
   - 分享使用经验
   - 帮助其他用户

### 📧 联系方式

- **邮箱**: support@ammf3-core.com
- **GitHub**: [@your-username](https://github.com/your-username)
- **文档**: [https://your-username.github.io/AMMF3-Core](https://your-username.github.io/AMMF3-Core)

---

**提示**: 在寻求帮助时，请提供尽可能详细的信息，包括：
- 操作系统和版本
- Android NDK 版本
- 设备型号和 Android 版本
- 完整的错误消息
- 最小复现代码