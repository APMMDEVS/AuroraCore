# Integration Examples

This guide demonstrates how to integrate AuroraCore with various systems, frameworks, and platforms commonly used in Android development and system administration.

## Example 1: Android NDK Integration

Integrating AuroraCore into an Android NDK application with JNI bindings.

### JNI Wrapper Implementation

```cpp
// AuroraCore_jni.cpp
#include <jni.h>
#include <android/log.h>
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <memory>
#include <unordered_map>
#include <mutex>

// Global instances
static std::unique_ptr<LoggerAPI::InternalLogger> g_logger;
static std::unique_ptr<FileWatcherAPI::FileWatcher> g_watcher;
static std::unordered_map<std::string, jobject> g_callbacks;
static std::mutex g_callbacks_mutex;
static JavaVM* g_jvm = nullptr;

// Helper function to get JNI environment
JNIEnv* getJNIEnv() {
    JNIEnv* env = nullptr;
    if (g_jvm) {
        g_jvm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6);
    }
    return env;
}

// Logger JNI functions
extern "C" {

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}

JNIEXPORT jboolean JNICALL
Java_com_example_AuroraCore_Logger_initLogger(JNIEnv* env, jobject thiz,
                                        jstring log_path,
                                        jlong max_file_size,
                                        jint max_files,
                                        jlong buffer_size,
                                        jint flush_interval_ms,
                                        jint min_log_level) {
    try {
        const char* path_str = env->GetStringUTFChars(log_path, nullptr);
        
        LoggerAPI::InternalLogger::Config config;
        config.log_path = std::string(path_str);
        config.max_file_size = static_cast<size_t>(max_file_size);
        config.max_files = static_cast<int>(max_files);
        config.buffer_size = static_cast<size_t>(buffer_size);
        config.flush_interval_ms = static_cast<int>(flush_interval_ms);
        config.min_log_level = static_cast<LoggerAPI::LogLevel>(min_log_level);
        config.auto_flush = true;
        
        g_logger = std::make_unique<LoggerAPI::InternalLogger>(config);
        
        env->ReleaseStringUTFChars(log_path, path_str);
        
        __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "Logger initialized successfully");
        return JNI_TRUE;
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, "AuroraCore", "Failed to initialize logger: %s", e.what());
        return JNI_FALSE;
    }
}

JNIEXPORT void JNICALL
Java_com_example_AuroraCore_Logger_log(JNIEnv* env, jobject thiz,
                                 jint level, jstring message) {
    if (!g_logger) {
        __android_log_print(ANDROID_LOG_ERROR, "AuroraCore", "Logger not initialized");
        return;
    }
    
    const char* msg_str = env->GetStringUTFChars(message, nullptr);
    
    try {
        g_logger->log(static_cast<LoggerAPI::LogLevel>(level), std::string(msg_str));
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, "AuroraCore", "Logging failed: %s", e.what());
    }
    
    env->ReleaseStringUTFChars(message, msg_str);
}

JNIEXPORT void JNICALL
Java_com_example_AuroraCore_Logger_destroyLogger(JNIEnv* env, jobject thiz) {
    g_logger.reset();
    __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "Logger destroyed");
}

// FileWatcher JNI functions
JNIEXPORT jboolean JNICALL
Java_com_example_AuroraCore_FileWatcher_initWatcher(JNIEnv* env, jobject thiz) {
    try {
        g_watcher = std::make_unique<FileWatcherAPI::FileWatcher>();
        __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "FileWatcher initialized successfully");
        return JNI_TRUE;
    } catch (const std::exception& e) {
        __android_log_print(ANDROID_LOG_ERROR, "AuroraCore", "Failed to initialize FileWatcher: %s", e.what());
        return JNI_FALSE;
    }
}

JNIEXPORT jboolean JNICALL
Java_com_example_AuroraCore_FileWatcher_addWatch(JNIEnv* env, jobject thiz,
                                          jstring path, jobject callback) {
    if (!g_watcher) {
        __android_log_print(ANDROID_LOG_ERROR, "AuroraCore", "FileWatcher not initialized");
        return JNI_FALSE;
    }
    
    const char* path_str = env->GetStringUTFChars(path, nullptr);
    std::string watch_path(path_str);
    
    // Store global reference to callback
    jobject global_callback = env->NewGlobalRef(callback);
    {
        std::lock_guard<std::mutex> lock(g_callbacks_mutex);
        g_callbacks[watch_path] = global_callback;
    }
    
    bool success = g_watcher->add_watch(watch_path, 
        [watch_path](const FileWatcherAPI::FileEvent& event) {
            JNIEnv* env = getJNIEnv();
            if (!env) return;
            
            std::lock_guard<std::mutex> lock(g_callbacks_mutex);
            auto it = g_callbacks.find(watch_path);
            if (it != g_callbacks.end()) {
                // Get callback class and method
                jclass callback_class = env->GetObjectClass(it->second);
                jmethodID on_event_method = env->GetMethodID(callback_class, 
                    "onFileEvent", "(Ljava/lang/String;Ljava/lang/String;I)V");
                
                if (on_event_method) {
                    jstring j_path = env->NewStringUTF(event.path.c_str());
                    jstring j_filename = env->NewStringUTF(event.filename.c_str());
                    jint j_type = static_cast<jint>(event.type);
                    
                    env->CallVoidMethod(it->second, on_event_method, j_path, j_filename, j_type);
                    
                    env->DeleteLocalRef(j_path);
                    env->DeleteLocalRef(j_filename);
                }
                
                env->DeleteLocalRef(callback_class);
            }
        });
    
    env->ReleaseStringUTFChars(path, path_str);
    
    if (!success) {
        // Clean up callback reference on failure
        std::lock_guard<std::mutex> lock(g_callbacks_mutex);
        auto it = g_callbacks.find(watch_path);
        if (it != g_callbacks.end()) {
            env->DeleteGlobalRef(it->second);
            g_callbacks.erase(it);
        }
    }
    
    return success ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_example_AuroraCore_FileWatcher_start(JNIEnv* env, jobject thiz) {
    if (g_watcher) {
        g_watcher->start();
        __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "FileWatcher started");
    }
}

JNIEXPORT void JNICALL
Java_com_example_AuroraCore_FileWatcher_stop(JNIEnv* env, jobject thiz) {
    if (g_watcher) {
        g_watcher->stop();
        __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "FileWatcher stopped");
    }
}

JNIEXPORT void JNICALL
Java_com_example_AuroraCore_FileWatcher_destroyWatcher(JNIEnv* env, jobject thiz) {
    // Clean up all callback references
    {
        std::lock_guard<std::mutex> lock(g_callbacks_mutex);
        for (auto& [path, callback] : g_callbacks) {
            env->DeleteGlobalRef(callback);
        }
        g_callbacks.clear();
    }
    
    g_watcher.reset();
    __android_log_print(ANDROID_LOG_INFO, "AuroraCore", "FileWatcher destroyed");
}

} // extern "C"
```

### Java Interface Classes

```java
// Logger.java
package com.example.AuroraCore;

public class Logger {
    // Log levels matching C++ enum
    public static final int TRACE = 0;
    public static final int DEBUG = 1;
    public static final int INFO = 2;
    public static final int WARNING = 3;
    public static final int ERROR = 4;
    public static final int FATAL = 5;
    
    static {
        System.loadLibrary("AuroraCore_jni");
    }
    
    public native boolean initLogger(String logPath, long maxFileSize, int maxFiles,
                                   long bufferSize, int flushIntervalMs, int minLogLevel);
    
    public native void log(int level, String message);
    
    public native void destroyLogger();
    
    // Convenience methods
    public void trace(String message) { log(TRACE, message); }
    public void debug(String message) { log(DEBUG, message); }
    public void info(String message) { log(INFO, message); }
    public void warning(String message) { log(WARNING, message); }
    public void error(String message) { log(ERROR, message); }
    public void fatal(String message) { log(FATAL, message); }
}

// FileWatcher.java
package com.example.AuroraCore;

public class FileWatcher {
    // Event types matching C++ enum
    public static final int MODIFY = 2;
    public static final int CREATE = 256;
    public static final int DELETE = 512;
    public static final int MOVE = 192;
    public static final int ATTRIB = 4;
    public static final int ACCESS = 1;
    
    public interface FileEventCallback {
        void onFileEvent(String path, String filename, int eventType);
    }
    
    static {
        System.loadLibrary("AuroraCore_jni");
    }
    
    public native boolean initWatcher();
    public native boolean addWatch(String path, FileEventCallback callback);
    public native void start();
    public native void stop();
    public native void destroyWatcher();
}
```

### Android Application Example

```java
// MainActivity.java
package com.example.AuroraCoredemo;

import android.app.Activity;
import android.os.Bundle;
import android.os.Environment;
import android.util.Log;
import android.widget.Button;
import android.widget.TextView;
import com.example.AuroraCore.Logger;
import com.example.AuroraCore.FileWatcher;
import java.io.File;

public class MainActivity extends Activity {
    private static final String TAG = "AuroraCoreDemo";
    private Logger logger;
    private FileWatcher fileWatcher;
    private TextView statusText;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        statusText = findViewById(R.id.status_text);
        Button initButton = findViewById(R.id.init_button);
        Button logButton = findViewById(R.id.log_button);
        Button watchButton = findViewById(R.id.watch_button);
        
        initButton.setOnClickListener(v -> initializeAuroraCore());
        logButton.setOnClickListener(v -> testLogging());
        watchButton.setOnClickListener(v -> testFileWatching());
    }
    
    private void initializeAuroraCore() {
        try {
            // Initialize logger
            logger = new Logger();
            String logPath = getExternalFilesDir(null) + "/app.log";
            boolean success = logger.initLogger(
                logPath,
                10 * 1024 * 1024, // 10MB max file size
                5,                 // 5 files max
                64 * 1024,         // 64KB buffer
                1000,              // 1 second flush interval
                Logger.INFO        // INFO level minimum
            );
            
            if (success) {
                logger.info("AuroraCore Logger initialized successfully");
                updateStatus("Logger initialized");
            } else {
                updateStatus("Logger initialization failed");
                return;
            }
            
            // Initialize file watcher
            fileWatcher = new FileWatcher();
            if (fileWatcher.initWatcher()) {
                logger.info("AuroraCore FileWatcher initialized successfully");
                updateStatus("Logger and FileWatcher initialized");
            } else {
                updateStatus("FileWatcher initialization failed");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize AuroraCore", e);
            updateStatus("Initialization failed: " + e.getMessage());
        }
    }
    
    private void testLogging() {
        if (logger == null) {
            updateStatus("Logger not initialized");
            return;
        }
        
        try {
            logger.info("Test log message from Android");
            logger.debug("Debug message with timestamp: " + System.currentTimeMillis());
            logger.warning("Warning message example");
            logger.error("Error message example");
            
            updateStatus("Test logs written");
        } catch (Exception e) {
            Log.e(TAG, "Logging failed", e);
            updateStatus("Logging failed: " + e.getMessage());
        }
    }
    
    private void testFileWatching() {
        if (fileWatcher == null) {
            updateStatus("FileWatcher not initialized");
            return;
        }
        
        try {
            String watchPath = getExternalFilesDir(null).getAbsolutePath();
            
            boolean success = fileWatcher.addWatch(watchPath, 
                new FileWatcher.FileEventCallback() {
                    @Override
                    public void onFileEvent(String path, String filename, int eventType) {
                        String eventName = getEventTypeName(eventType);
                        String message = "File event: " + filename + " (" + eventName + ")";
                        
                        runOnUiThread(() -> updateStatus(message));
                        
                        if (logger != null) {
                            logger.info("FileWatcher: " + message);
                        }
                    }
                });
            
            if (success) {
                fileWatcher.start();
                updateStatus("FileWatcher started, monitoring: " + watchPath);
                
                // Create a test file to trigger an event
                new Thread(() -> {
                    try {
                        Thread.sleep(1000);
                        File testFile = new File(getExternalFilesDir(null), "test_file.txt");
                        testFile.createNewFile();
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to create test file", e);
                    }
                }).start();
                
            } else {
                updateStatus("Failed to add file watch");
            }
            
        } catch (Exception e) {
            Log.e(TAG, "FileWatcher test failed", e);
            updateStatus("FileWatcher test failed: " + e.getMessage());
        }
    }
    
    private String getEventTypeName(int eventType) {
        switch (eventType) {
            case FileWatcher.MODIFY: return "MODIFY";
            case FileWatcher.CREATE: return "CREATE";
            case FileWatcher.DELETE: return "DELETE";
            case FileWatcher.MOVE: return "MOVE";
            case FileWatcher.ATTRIB: return "ATTRIB";
            case FileWatcher.ACCESS: return "ACCESS";
            default: return "UNKNOWN";
        }
    }
    
    private void updateStatus(String status) {
        runOnUiThread(() -> {
            statusText.setText(status);
            Log.i(TAG, status);
        });
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        
        if (fileWatcher != null) {
            fileWatcher.stop();
            fileWatcher.destroyWatcher();
        }
        
        if (logger != null) {
            logger.info("Application shutting down");
            logger.destroyLogger();
        }
    }
}
```

### CMakeLists.txt for Android

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.18.1)
project("AuroraCore_jni")

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_library(log-lib log)
find_library(android-lib android)

# Include AuroraCore
set(AuroraCore_ROOT "/path/to/AuroraCore")
include_directories(${AuroraCore_ROOT}/src)

# Add AuroraCore libraries
add_library(AuroraCore_logger SHARED IMPORTED)
set_target_properties(AuroraCore_logger PROPERTIES
    IMPORTED_LOCATION ${AuroraCore_ROOT}/lib/${ANDROID_ABI}/libAuroraCore_logger.so)

add_library(AuroraCore_filewatcher SHARED IMPORTED)
set_target_properties(AuroraCore_filewatcher PROPERTIES
    IMPORTED_LOCATION ${AuroraCore_ROOT}/lib/${ANDROID_ABI}/libAuroraCore_filewatcher.so)

# Create JNI library
add_library(AuroraCore_jni SHARED AuroraCore_jni.cpp)

# Link libraries
target_link_libraries(AuroraCore_jni
    AuroraCore_logger
    AuroraCore_filewatcher
    ${log-lib}
    ${android-lib})
```

## Example 2: Unity Plugin Integration

Integrating AuroraCore as a Unity plugin for game development.

### Unity Plugin Wrapper

```cpp
// unity_plugin.cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <memory>
#include <functional>
#include <unordered_map>

// Unity plugin interface
extern "C" {

// Callback type for Unity
typedef void (*UnityLogCallback)(int level, const char* message);
typedef void (*UnityFileEventCallback)(const char* path, const char* filename, int event_type);

static std::unique_ptr<LoggerAPI::InternalLogger> g_unity_logger;
static std::unique_ptr<FileWatcherAPI::FileWatcher> g_unity_watcher;
static UnityLogCallback g_log_callback = nullptr;
static UnityFileEventCallback g_file_callback = nullptr;

// Logger functions
int InitUnityLogger(const char* log_path, int max_file_size, int max_files) {
    try {
        LoggerAPI::InternalLogger::Config config;
        config.log_path = std::string(log_path);
        config.max_file_size = max_file_size;
        config.max_files = max_files;
        config.buffer_size = 256 * 1024; // 256KB
        config.flush_interval_ms = 500;
        config.auto_flush = true;
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        
        g_unity_logger = std::make_unique<LoggerAPI::InternalLogger>(config);
        return 1; // Success
    } catch (...) {
        return 0; // Failure
    }
}

void UnityLog(int level, const char* message) {
    if (g_unity_logger) {
        g_unity_logger->log(static_cast<LoggerAPI::LogLevel>(level), std::string(message));
    }
    
    // Also call Unity callback if set
    if (g_log_callback) {
        g_log_callback(level, message);
    }
}

void SetUnityLogCallback(UnityLogCallback callback) {
    g_log_callback = callback;
}

void DestroyUnityLogger() {
    g_unity_logger.reset();
}

// FileWatcher functions
int InitUnityFileWatcher() {
    try {
        g_unity_watcher = std::make_unique<FileWatcherAPI::FileWatcher>();
        return 1; // Success
    } catch (...) {
        return 0; // Failure
    }
}

int AddUnityWatch(const char* path) {
    if (!g_unity_watcher) {
        return 0;
    }
    
    return g_unity_watcher->add_watch(std::string(path), 
        [](const FileWatcherAPI::FileEvent& event) {
            if (g_file_callback) {
                g_file_callback(event.path.c_str(), event.filename.c_str(), 
                              static_cast<int>(event.type));
            }
        }) ? 1 : 0;
}

void SetUnityFileEventCallback(UnityFileEventCallback callback) {
    g_file_callback = callback;
}

void StartUnityFileWatcher() {
    if (g_unity_watcher) {
        g_unity_watcher->start();
    }
}

void StopUnityFileWatcher() {
    if (g_unity_watcher) {
        g_unity_watcher->stop();
    }
}

void DestroyUnityFileWatcher() {
    g_unity_watcher.reset();
}

} // extern "C"
```

### Unity C# Interface

```csharp
// AuroraCoreUnity.cs
using System;
using System.Runtime.InteropServices;
using UnityEngine;

public class AuroraCoreUnity : MonoBehaviour
{
    // Log levels
    public enum LogLevel
    {
        Trace = 0,
        Debug = 1,
        Info = 2,
        Warning = 3,
        Error = 4,
        Fatal = 5
    }
    
    // Event types
    public enum FileEventType
    {
        Modify = 2,
        Create = 256,
        Delete = 512,
        Move = 192,
        Attrib = 4,
        Access = 1
    }
    
    // Delegates for callbacks
    public delegate void LogCallback(int level, string message);
    public delegate void FileEventCallback(string path, string filename, int eventType);
    
    // Events
    public static event LogCallback OnLogMessage;
    public static event FileEventCallback OnFileEvent;
    
    // Native function imports
    [DllImport("AuroraCore_unity")]
    private static extern int InitUnityLogger(string logPath, int maxFileSize, int maxFiles);
    
    [DllImport("AuroraCore_unity")]
    private static extern void UnityLog(int level, string message);
    
    [DllImport("AuroraCore_unity")]
    private static extern void SetUnityLogCallback(LogCallback callback);
    
    [DllImport("AuroraCore_unity")]
    private static extern void DestroyUnityLogger();
    
    [DllImport("AuroraCore_unity")]
    private static extern int InitUnityFileWatcher();
    
    [DllImport("AuroraCore_unity")]
    private static extern int AddUnityWatch(string path);
    
    [DllImport("AuroraCore_unity")]
    private static extern void SetUnityFileEventCallback(FileEventCallback callback);
    
    [DllImport("AuroraCore_unity")]
    private static extern void StartUnityFileWatcher();
    
    [DllImport("AuroraCore_unity")]
    private static extern void StopUnityFileWatcher();
    
    [DllImport("AuroraCore_unity")]
    private static extern void DestroyUnityFileWatcher();
    
    // Static callbacks for native code
    [AOT.MonoPInvokeCallback(typeof(LogCallback))]
    private static void LogCallbackHandler(int level, string message)
    {
        OnLogMessage?.Invoke(level, message);
    }
    
    [AOT.MonoPInvokeCallback(typeof(FileEventCallback))]
    private static void FileEventCallbackHandler(string path, string filename, int eventType)
    {
        OnFileEvent?.Invoke(path, filename, eventType);
    }
    
    // Public API
    public static bool InitializeLogger(string logPath, int maxFileSize = 10 * 1024 * 1024, int maxFiles = 5)
    {
        SetUnityLogCallback(LogCallbackHandler);
        return InitUnityLogger(logPath, maxFileSize, maxFiles) == 1;
    }
    
    public static void Log(LogLevel level, string message)
    {
        UnityLog((int)level, message);
    }
    
    public static void LogTrace(string message) => Log(LogLevel.Trace, message);
    public static void LogDebug(string message) => Log(LogLevel.Debug, message);
    public static void LogInfo(string message) => Log(LogLevel.Info, message);
    public static void LogWarning(string message) => Log(LogLevel.Warning, message);
    public static void LogError(string message) => Log(LogLevel.Error, message);
    public static void LogFatal(string message) => Log(LogLevel.Fatal, message);
    
    public static bool InitializeFileWatcher()
    {
        SetUnityFileEventCallback(FileEventCallbackHandler);
        return InitUnityFileWatcher() == 1;
    }
    
    public static bool AddWatch(string path)
    {
        return AddUnityWatch(path) == 1;
    }
    
    public static void StartFileWatcher()
    {
        StartUnityFileWatcher();
    }
    
    public static void StopFileWatcher()
    {
        StopUnityFileWatcher();
    }
    
    // Unity lifecycle
    private void Start()
    {
        // Initialize AuroraCore when the GameObject starts
        string logPath = Application.persistentDataPath + "/game.log";
        
        if (InitializeLogger(logPath))
        {
            Debug.Log("AuroraCore Logger initialized");
            LogInfo("Unity game started");
        }
        else
        {
            Debug.LogError("Failed to initialize AuroraCore Logger");
        }
        
        if (InitializeFileWatcher())
        {
            Debug.Log("AuroraCore FileWatcher initialized");
            
            // Watch the persistent data path
            if (AddWatch(Application.persistentDataPath))
            {
                StartFileWatcher();
                LogInfo("FileWatcher started");
            }
        }
        else
        {
            Debug.LogError("Failed to initialize AuroraCore FileWatcher");
        }
        
        // Subscribe to events
        OnLogMessage += HandleLogMessage;
        OnFileEvent += HandleFileEvent;
    }
    
    private void OnDestroy()
    {
        // Cleanup
        OnLogMessage -= HandleLogMessage;
        OnFileEvent -= HandleFileEvent;
        
        StopFileWatcher();
        DestroyUnityFileWatcher();
        
        LogInfo("Unity game shutting down");
        DestroyUnityLogger();
    }
    
    private void HandleLogMessage(int level, string message)
    {
        // Forward to Unity console
        switch ((LogLevel)level)
        {
            case LogLevel.Trace:
            case LogLevel.Debug:
            case LogLevel.Info:
                Debug.Log($"[AuroraCore] {message}");
                break;
            case LogLevel.Warning:
                Debug.LogWarning($"[AuroraCore] {message}");
                break;
            case LogLevel.Error:
            case LogLevel.Fatal:
                Debug.LogError($"[AuroraCore] {message}");
                break;
        }
    }
    
    private void HandleFileEvent(string path, string filename, int eventType)
    {
        FileEventType type = (FileEventType)eventType;
        Debug.Log($"File event: {filename} ({type}) in {path}");
        LogInfo($"File event detected: {filename} ({type})");
    }
}
```

### Unity Usage Example

```csharp
// GameManager.cs
using UnityEngine;

public class GameManager : MonoBehaviour
{
    private void Start()
    {
        // AuroraCoreUnity will be initialized automatically
        
        // Log game events
        AuroraCoreUnity.LogInfo("Game started");
        AuroraCoreUnity.LogDebug($"Unity version: {Application.unityVersion}");
        AuroraCoreUnity.LogInfo($"Platform: {Application.platform}");
    }
    
    private void Update()
    {
        // Log performance metrics periodically
        if (Time.frameCount % 300 == 0) // Every 5 seconds at 60 FPS
        {
            float fps = 1.0f / Time.deltaTime;
            AuroraCoreUnity.LogDebug($"FPS: {fps:F1}, Memory: {System.GC.GetTotalMemory(false) / 1024 / 1024}MB");
        }
    }
    
    public void OnPlayerAction(string action)
    {
        AuroraCoreUnity.LogInfo($"Player action: {action}");
    }
    
    public void OnGameEvent(string eventName, string details)
    {
        AuroraCoreUnity.LogInfo($"Game event: {eventName} - {details}");
    }
    
    private void OnApplicationPause(bool pauseStatus)
    {
        if (pauseStatus)
        {
            AuroraCoreUnity.LogInfo("Game paused");
        }
        else
        {
            AuroraCoreUnity.LogInfo("Game resumed");
        }
    }
    
    private void OnApplicationFocus(bool hasFocus)
    {
        AuroraCoreUnity.LogInfo($"Game focus changed: {hasFocus}");
    }
}
```

## Example 3: System Service Integration

Integrating AuroraCore into a system service for system-wide monitoring.

### System Service Implementation

```cpp
// system_service.cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <signal.h>
#include <unistd.h>
#include <sys/stat.h>
#include <fstream>
#include <thread>
#include <atomic>
#include <chrono>

class SystemMonitorService {
public:
    SystemMonitorService() : running_(false) {
        // Initialize logger for system service
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/system_monitor.log";
        config.max_file_size = 100 * 1024 * 1024; // 100MB
        config.max_files = 10;
        config.buffer_size = 1024 * 1024; // 1MB buffer
        config.flush_interval_ms = 1000;
        config.auto_flush = true;
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        
        logger_ = std::make_unique<LoggerAPI::InternalLogger>(config);
        logger_->log(LoggerAPI::LogLevel::INFO, "SystemMonitorService initialized");
    }
    
    ~SystemMonitorService() {
        stop();
        logger_->log(LoggerAPI::LogLevel::INFO, "SystemMonitorService destroyed");
    }
    
    void start() {
        if (running_.exchange(true)) {
            return;
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Starting system monitor service");
        
        // Setup file monitoring
        setupSystemMonitoring();
        watcher_.start();
        
        // Start monitoring threads
        monitor_thread_ = std::thread(&SystemMonitorService::monitorLoop, this);
        
        logger_->log(LoggerAPI::LogLevel::INFO, "System monitor service started");
    }
    
    void stop() {
        if (!running_.exchange(false)) {
            return;
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Stopping system monitor service");
        
        watcher_.stop();
        
        if (monitor_thread_.joinable()) {
            monitor_thread_.join();
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "System monitor service stopped");
    }
    
    bool isRunning() const {
        return running_;
    }
    
private:
    void setupSystemMonitoring() {
        // Monitor system configuration directories
        std::vector<std::string> system_paths = {
            "/system/etc",
            "/data/system",
            "/data/local/tmp",
            "/proc/sys"
        };
        
        for (const auto& path : system_paths) {
            if (access(path.c_str(), R_OK) == 0) {
                watcher_.add_watch(path, 
                    [this, path](const FileWatcherAPI::FileEvent& event) {
                        handleSystemEvent(path, event);
                    }, IN_MODIFY | IN_CREATE | IN_DELETE | IN_ATTRIB);
                
                logger_->log(LoggerAPI::LogLevel::INFO, "Monitoring system path: " + path);
            } else {
                logger_->log(LoggerAPI::LogLevel::WARNING, "Cannot access system path: " + path);
            }
        }
    }
    
    void handleSystemEvent(const std::string& base_path, const FileWatcherAPI::FileEvent& event) {
        std::string event_type;
        LoggerAPI::LogLevel log_level = LoggerAPI::LogLevel::INFO;
        
        switch (event.type) {
            case FileWatcherAPI::EventType::MODIFY:
                event_type = "MODIFY";
                log_level = LoggerAPI::LogLevel::INFO;
                break;
            case FileWatcherAPI::EventType::CREATE:
                event_type = "CREATE";
                log_level = LoggerAPI::LogLevel::WARNING;
                break;
            case FileWatcherAPI::EventType::DELETE:
                event_type = "DELETE";
                log_level = LoggerAPI::LogLevel::WARNING;
                break;
            case FileWatcherAPI::EventType::ATTRIB:
                event_type = "ATTRIB";
                log_level = LoggerAPI::LogLevel::INFO;
                break;
            default:
                event_type = "UNKNOWN";
                log_level = LoggerAPI::LogLevel::WARNING;
        }
        
        std::string message = "System event: " + event_type + " - " + 
                             event.path + "/" + event.filename;
        
        logger_->log(log_level, message);
        
        // Special handling for critical system files
        if (event.filename.find("passwd") != std::string::npos ||
            event.filename.find("shadow") != std::string::npos ||
            event.filename.find("sudoers") != std::string::npos) {
            logger_->log(LoggerAPI::LogLevel::ERROR, 
                       "SECURITY ALERT: Critical system file modified: " + event.filename);
        }
    }
    
    void monitorLoop() {
        logger_->log(LoggerAPI::LogLevel::INFO, "Monitor loop started");
        
        while (running_) {
            // Monitor system resources
            monitorSystemResources();
            
            // Monitor process list
            monitorProcesses();
            
            // Monitor network connections
            monitorNetwork();
            
            // Sleep for monitoring interval
            std::this_thread::sleep_for(std::chrono::seconds(30));
        }
        
        logger_->log(LoggerAPI::LogLevel::INFO, "Monitor loop stopped");
    }
    
    void monitorSystemResources() {
        // Read memory information
        std::ifstream meminfo("/proc/meminfo");
        if (meminfo.is_open()) {
            std::string line;
            while (std::getline(meminfo, line)) {
                if (line.find("MemAvailable:") == 0) {
                    logger_->log(LoggerAPI::LogLevel::DEBUG, "Memory: " + line);
                    break;
                }
            }
        }
        
        // Read CPU information
        std::ifstream loadavg("/proc/loadavg");
        if (loadavg.is_open()) {
            std::string load;
            std::getline(loadavg, load);
            logger_->log(LoggerAPI::LogLevel::DEBUG, "Load average: " + load);
        }
    }
    
    void monitorProcesses() {
        // Simple process monitoring (in practice, you'd use more sophisticated methods)
        FILE* ps = popen("ps aux | wc -l", "r");
        if (ps) {
            char buffer[128];
            if (fgets(buffer, sizeof(buffer), ps)) {
                std::string process_count(buffer);
                process_count.erase(process_count.find_last_not_of(" \n\r\t") + 1);
                logger_->log(LoggerAPI::LogLevel::DEBUG, "Process count: " + process_count);
            }
            pclose(ps);
        }
    }
    
    void monitorNetwork() {
        // Monitor network connections
        std::ifstream netstat("/proc/net/tcp");
        if (netstat.is_open()) {
            std::string line;
            int connection_count = 0;
            while (std::getline(netstat, line)) {
                connection_count++;
            }
            logger_->log(LoggerAPI::LogLevel::DEBUG, 
                       "TCP connections: " + std::to_string(connection_count - 1)); // -1 for header
        }
    }
    
    FileWatcherAPI::FileWatcher watcher_;
    std::unique_ptr<LoggerAPI::InternalLogger> logger_;
    std::atomic<bool> running_;
    std::thread monitor_thread_;
};

// Global service instance
static std::unique_ptr<SystemMonitorService> g_service;

// Signal handler for graceful shutdown
void signalHandler(int signal) {
    if (g_service) {
        std::cout << "Received signal " << signal << ", shutting down..." << std::endl;
        g_service->stop();
    }
}

// Daemon setup functions
void daemonize() {
    pid_t pid = fork();
    
    if (pid < 0) {
        exit(EXIT_FAILURE);
    }
    
    if (pid > 0) {
        exit(EXIT_SUCCESS); // Parent process exits
    }
    
    // Child process continues
    if (setsid() < 0) {
        exit(EXIT_FAILURE);
    }
    
    // Change working directory
    chdir("/");
    
    // Close standard file descriptors
    close(STDIN_FILENO);
    close(STDOUT_FILENO);
    close(STDERR_FILENO);
}

void writePidFile(const std::string& pid_file) {
    std::ofstream file(pid_file);
    if (file.is_open()) {
        file << getpid() << std::endl;
        file.close();
    }
}

int main(int argc, char* argv[]) {
    bool daemon_mode = false;
    std::string pid_file = "/data/local/tmp/system_monitor.pid";
    
    // Parse command line arguments
    for (int i = 1; i < argc; ++i) {
        if (std::string(argv[i]) == "-d" || std::string(argv[i]) == "--daemon") {
            daemon_mode = true;
        } else if (std::string(argv[i]) == "-p" || std::string(argv[i]) == "--pid-file") {
            if (i + 1 < argc) {
                pid_file = argv[++i];
            }
        }
    }
    
    try {
        // Daemonize if requested
        if (daemon_mode) {
            daemonize();
        }
        
        // Write PID file
        writePidFile(pid_file);
        
        // Setup signal handlers
        signal(SIGTERM, signalHandler);
        signal(SIGINT, signalHandler);
        signal(SIGHUP, signalHandler);
        
        // Create and start service
        g_service = std::make_unique<SystemMonitorService>();
        g_service->start();
        
        // Main loop
        while (g_service->isRunning()) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        // Cleanup
        g_service.reset();
        unlink(pid_file.c_str());
        
    } catch (const std::exception& e) {
        std::cerr << "Service error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
```

### Service Control Script

```bash
#!/bin/bash
# system_monitor_service.sh

SERVICE_NAME="system_monitor"
SERVICE_BINARY="/data/local/tmp/AuroraCore/bin/system_monitor"
PID_FILE="/data/local/tmp/system_monitor.pid"
LOG_FILE="/data/local/tmp/logs/system_monitor.log"

start_service() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Service is already running (PID: $PID)"
            return 1
        else
            echo "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    
    echo "Starting $SERVICE_NAME service..."
    "$SERVICE_BINARY" --daemon --pid-file="$PID_FILE"
    
    sleep 2
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Service started successfully (PID: $PID)"
            return 0
        fi
    fi
    
    echo "Failed to start service"
    return 1
}

stop_service() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Service is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if ! kill -0 "$PID" 2>/dev/null; then
        echo "Service is not running (removing stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
    
    echo "Stopping $SERVICE_NAME service (PID: $PID)..."
    kill -TERM "$PID"
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 "$PID" 2>/dev/null; then
            echo "Service stopped successfully"
            rm -f "$PID_FILE"
            return 0
        fi
        sleep 1
    done
    
    # Force kill if necessary
    echo "Force killing service..."
    kill -KILL "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    echo "Service force stopped"
    return 0
}

status_service() {
    if [ ! -f "$PID_FILE" ]; then
        echo "Service is not running"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    
    if kill -0 "$PID" 2>/dev/null; then
        echo "Service is running (PID: $PID)"
        return 0
    else
        echo "Service is not running (removing stale PID file)"
        rm -f "$PID_FILE"
        return 1
    fi
}

restart_service() {
    stop_service
    sleep 2
    start_service
}

show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        echo "Log file not found: $LOG_FILE"
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
        restart_service
        ;;
    status)
        status_service
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac

exit $?
```

These integration examples demonstrate how AuroraCore can be seamlessly integrated into various platforms and frameworks, providing consistent logging and file monitoring capabilities across different environments and use cases.