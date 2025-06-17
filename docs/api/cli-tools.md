# Command Line Tools Reference

AMMF3-Core provides powerful command-line tools for system-wide logging and file monitoring. These tools are designed for Android root environments and offer high-performance, daemon-based logging solutions.

## Overview

The command-line tools include:

- **logger_daemon**: High-performance logging daemon with automatic rotation
- **logger_client**: Lightweight client for sending log messages to the daemon
- **filewatcher**: Standalone file monitoring tool with custom command execution

## logger_daemon

The logging daemon provides centralized, high-performance log management with automatic file rotation and intelligent buffering.

### Synopsis

```bash
logger_daemon [OPTIONS]
```

### Options

| Option | Description | Default | Example |
|--------|-------------|---------|----------|
| `-f, --file <path>` | Log file path (required) | - | `-f /data/local/tmp/app.log` |
| `-s, --size <bytes>` | Maximum file size in bytes | 10485760 (10MB) | `-s 5242880` (5MB) |
| `-n, --number <count>` | Maximum number of log files | 5 | `-n 3` |
| `-b, --buffer <bytes>` | Buffer size in bytes | 65536 (64KB) | `-b 131072` (128KB) |
| `-p, --socket <path>` | Unix socket path | `/tmp/logger_daemon` | `-p /data/local/tmp/logger.sock` |
| `-d, --daemon` | Run as daemon (background) | false | `-d` |
| `-v, --verbose` | Enable verbose output | false | `-v` |
| `-h, --help` | Show help message | - | `-h` |

### Basic Usage

#### Start Basic Daemon

```bash
# Start daemon with default settings
./logger_daemon -f /data/local/tmp/app.log
```

#### Start with Custom Configuration

```bash
# Start with custom file size and count
./logger_daemon \
  -f /data/local/tmp/myapp.log \
  -s 20971520 \
  -n 10 \
  -b 131072 \
  -p /data/local/tmp/myapp.sock
```

#### Run as Background Daemon

```bash
# Start as background daemon
./logger_daemon -d \
  -f /data/local/tmp/service.log \
  -s 50331648 \
  -n 5
```

### Advanced Configuration

#### High-Performance Setup

```bash
# Optimized for high-throughput logging
./logger_daemon \
  -f /data/local/tmp/highperf.log \
  -s 104857600 \    # 100MB per file
  -n 20 \           # Keep 20 files (2GB total)
  -b 1048576 \      # 1MB buffer
  -p /data/local/tmp/highperf.sock
```

#### Memory-Constrained Setup

```bash
# Optimized for low memory usage
./logger_daemon \
  -f /data/local/tmp/lowmem.log \
  -s 1048576 \      # 1MB per file
  -n 3 \            # Keep only 3 files
  -b 16384 \        # 16KB buffer
  -p /data/local/tmp/lowmem.sock
```

### File Rotation

The daemon automatically rotates log files when they reach the specified size:

```
app.log         (current, active log file)
app.log.1       (previous log file)
app.log.2       (older log file)
app.log.3       (oldest log file)
```

**Rotation Process:**
1. When `app.log` reaches max size, it's renamed to `app.log.1`
2. Previous `app.log.1` becomes `app.log.2`, etc.
3. Files beyond the max count are deleted
4. New `app.log` is created for current logging

### Process Management

#### Check if Daemon is Running

```bash
# Check process
ps aux | grep logger_daemon

# Check socket
ls -la /tmp/logger_daemon
```

#### Stop the Daemon

```bash
# Send SIGTERM for graceful shutdown
killall logger_daemon

# Or find PID and kill
pkill -f logger_daemon
```

#### Restart the Daemon

```bash
# Stop existing daemon
killall logger_daemon
sleep 1

# Start new daemon
./logger_daemon -f /data/local/tmp/app.log -d
```

## logger_client

Lightweight client for sending log messages to the daemon.

### Synopsis

```bash
logger_client [OPTIONS] <message>
logger_client [OPTIONS] -m <message>
```

### Options

| Option | Description | Default | Example |
|--------|-------------|---------|----------|
| `-m, --message <text>` | Log message to send | - | `-m "Application started"` |
| `-p, --socket <path>` | Unix socket path | `/tmp/logger_daemon` | `-p /data/local/tmp/app.sock` |
| `-t, --timeout <ms>` | Connection timeout in milliseconds | 5000 | `-t 10000` |
| `-v, --verbose` | Enable verbose output | false | `-v` |
| `-h, --help` | Show help message | - | `-h` |

### Basic Usage

#### Send Simple Message

```bash
# Send message (positional argument)
./logger_client "Application started successfully"

# Send message (with flag)
./logger_client -m "User login: admin"
```

#### Send to Custom Socket

```bash
# Send to specific daemon instance
./logger_client \
  -p /data/local/tmp/myapp.sock \
  -m "Custom daemon message"
```

#### Send with Timeout

```bash
# Send with custom timeout
./logger_client \
  -t 10000 \
  -m "Message with 10 second timeout"
```

### Advanced Usage

#### Scripted Logging

```bash
#!/bin/bash
# log_script.sh

LOG_SOCKET="/data/local/tmp/script.sock"

log_info() {
    ./logger_client -p "$LOG_SOCKET" -m "[INFO] $1"
}

log_error() {
    ./logger_client -p "$LOG_SOCKET" -m "[ERROR] $1"
}

# Usage
log_info "Script started"
log_error "Something went wrong"
log_info "Script completed"
```

#### Batch Logging

```bash
# Send multiple messages
for i in {1..10}; do
    ./logger_client "Processing item $i"
    sleep 0.1
done
```

#### Conditional Logging

```bash
# Log based on conditions
if [ $? -eq 0 ]; then
    ./logger_client "Operation successful"
else
    ./logger_client "Operation failed with code $?"
fi
```

### Error Handling

The client handles various error conditions:

#### Connection Errors

```bash
# If daemon is not running
$ ./logger_client "test message"
Error: Failed to connect to daemon socket

# Check daemon status
$ ps aux | grep logger_daemon
```

#### Socket Permission Errors

```bash
# If socket has wrong permissions
$ ./logger_client "test message"
Error: Permission denied

# Fix socket permissions
$ chmod 666 /tmp/logger_daemon
```

#### Timeout Errors

```bash
# If daemon is unresponsive
$ ./logger_client -t 1000 "test message"
Error: Connection timeout after 1000ms
```

## filewatcher

Standalone file monitoring tool with custom command execution.

### Synopsis

```bash
filewatcher <path> <command> [OPTIONS]
```

### Arguments

| Argument | Description | Example |
|----------|-------------|----------|
| `<path>` | File or directory to watch | `/data/config` |
| `<command>` | Command to execute on file events | `"echo 'File changed: %f'"` |

### Options

| Option | Description | Default | Example |
|--------|-------------|---------|----------|
| `-e, --events <mask>` | Event mask (comma-separated) | `modify,create,delete` | `-e modify,create` |
| `-r, --recursive` | Watch subdirectories recursively | false | `-r` |
| `-d, --daemon` | Run as daemon (background) | false | `-d` |
| `-v, --verbose` | Enable verbose output | false | `-v` |
| `-h, --help` | Show help message | - | `-h` |

### Event Types

| Event | Description | Use Case |
|-------|-------------|----------|
| `modify` | File content changed | Configuration updates |
| `create` | File/directory created | New file detection |
| `delete` | File/directory deleted | Cleanup monitoring |
| `move` | File/directory moved | File organization |
| `attrib` | Attributes changed | Permission changes |
| `access` | File accessed | Usage tracking |

### Command Placeholders

The command string supports these placeholders:

| Placeholder | Description | Example |
|-------------|-------------|----------|
| `%f` | Full file path | `/data/config/app.conf` |
| `%d` | Directory path | `/data/config` |
| `%n` | File name only | `app.conf` |
| `%e` | Event type | `modify` |

### Basic Usage

#### Watch Single File

```bash
# Watch configuration file
./filewatcher /data/config/app.conf "echo 'Config changed: %f'"
```

#### Watch Directory

```bash
# Watch entire directory
./filewatcher /data/logs "echo 'Log event: %e on %n'"
```

#### Custom Events

```bash
# Watch only for file creation
./filewatcher \
  /data/incoming \
  "process_file.sh %f" \
  -e create
```

### Advanced Usage

#### Recursive Directory Monitoring

```bash
# Watch directory tree recursively
./filewatcher \
  /data/project \
  "echo 'Project file %e: %f'" \
  -r -v
```

#### Background Monitoring

```bash
# Run as daemon
./filewatcher \
  /data/critical \
  "alert_system.sh '%f was %e'" \
  -d -e modify,delete
```

#### Complex Command Execution

```bash
# Execute complex shell commands
./filewatcher \
  /data/uploads \
  "if [ '%e' = 'create' ]; then process_upload.sh '%f'; fi" \
  -e create
```

#### Log File Monitoring

```bash
# Monitor log files and send alerts
./filewatcher \
  /var/log \
  "./logger_client 'Log file %n was %e'" \
  -e modify,create
```

### Integration Examples

#### System Configuration Monitor

```bash
#!/bin/bash
# config_monitor.sh

# Start logger daemon
./logger_daemon -f /data/local/tmp/config_monitor.log -d

# Monitor system configuration
./filewatcher \
  /data/config \
  "./logger_client 'Config change detected: %f (%e)'" \
  -r -d

echo "Configuration monitoring started"
```

#### Backup Trigger

```bash
# Trigger backup when important files change
./filewatcher \
  /data/important \
  "backup_script.sh '%d' && ./logger_client 'Backup triggered by %f'" \
  -e modify,create -r
```

#### Security Monitoring

```bash
# Monitor sensitive directories
./filewatcher \
  /data/secure \
  "./logger_client 'SECURITY: %f was %e at $(date)'" \
  -e create,delete,modify,attrib -v
```

## Integration Patterns

### Pattern 1: Application Logging

```bash
# Start dedicated daemon for application
./logger_daemon \
  -f /data/local/tmp/myapp.log \
  -s 10485760 \
  -n 5 \
  -p /data/local/tmp/myapp.sock \
  -d

# Application sends logs
./logger_client -p /data/local/tmp/myapp.sock "App started"
./logger_client -p /data/local/tmp/myapp.sock "Processing request"
./logger_client -p /data/local/tmp/myapp.sock "App finished"
```

### Pattern 2: System Monitoring

```bash
# Start system logger
./logger_daemon \
  -f /data/local/tmp/system.log \
  -s 52428800 \
  -n 10 \
  -p /data/local/tmp/system.sock \
  -d

# Monitor multiple directories
./filewatcher \
  /data/config \
  "./logger_client -p /data/local/tmp/system.sock 'Config: %f %e'" \
  -r -d

./filewatcher \
  /data/critical \
  "./logger_client -p /data/local/tmp/system.sock 'CRITICAL: %f %e'" \
  -d
```

### Pattern 3: Service Management

```bash
#!/bin/bash
# service_manager.sh

SERVICE_NAME="myservice"
LOG_PATH="/data/local/tmp/${SERVICE_NAME}.log"
SOCK_PATH="/data/local/tmp/${SERVICE_NAME}.sock"

start_service() {
    # Start logger daemon
    ./logger_daemon \
        -f "$LOG_PATH" \
        -s 20971520 \
        -n 7 \
        -p "$SOCK_PATH" \
        -d
    
    # Log service start
    ./logger_client -p "$SOCK_PATH" "Service $SERVICE_NAME started"
    
    # Start file monitoring
    ./filewatcher \
        "/data/config/${SERVICE_NAME}.conf" \
        "./logger_client -p '$SOCK_PATH' 'Config reloaded'" \
        -e modify -d
}

stop_service() {
    ./logger_client -p "$SOCK_PATH" "Service $SERVICE_NAME stopping"
    killall logger_daemon
    killall filewatcher
}

case "$1" in
    start) start_service ;;
    stop) stop_service ;;
    *) echo "Usage: $0 {start|stop}" ;;
esac
```

## Performance Tuning

### High-Throughput Logging

```bash
# Optimized for high message volume
./logger_daemon \
  -f /data/local/tmp/highvolume.log \
  -s 209715200 \    # 200MB files
  -n 50 \           # Keep 50 files (10GB total)
  -b 2097152 \      # 2MB buffer
  -p /data/local/tmp/highvolume.sock
```

### Low-Latency Logging

```bash
# Optimized for low latency
./logger_daemon \
  -f /data/local/tmp/lowlatency.log \
  -s 10485760 \     # 10MB files
  -n 5 \            # Keep 5 files
  -b 32768 \        # 32KB buffer (smaller for faster flush)
  -p /data/local/tmp/lowlatency.sock
```

### Memory-Constrained Environment

```bash
# Optimized for low memory usage
./logger_daemon \
  -f /data/local/tmp/lowmem.log \
  -s 1048576 \      # 1MB files
  -n 2 \            # Keep only 2 files
  -b 8192 \         # 8KB buffer
  -p /data/local/tmp/lowmem.sock
```

## Troubleshooting

### Common Issues

#### Daemon Won't Start

```bash
# Check if socket already exists
ls -la /tmp/logger_daemon

# Remove stale socket
rm -f /tmp/logger_daemon

# Check permissions
ls -la /data/local/tmp/

# Start with verbose output
./logger_daemon -f /data/local/tmp/test.log -v
```

#### Client Can't Connect

```bash
# Check if daemon is running
ps aux | grep logger_daemon

# Check socket permissions
ls -la /tmp/logger_daemon

# Test with verbose output
./logger_client -v "test message"
```

#### File Watcher Not Working

```bash
# Check if path exists
ls -la /data/config

# Test with verbose output
./filewatcher /data/config "echo test" -v

# Check inotify limits
cat /proc/sys/fs/inotify/max_user_watches
```

### Debug Mode

```bash
# Run daemon in foreground with verbose output
./logger_daemon -f /data/local/tmp/debug.log -v

# Run file watcher with verbose output
./filewatcher /data/test "echo %f" -v

# Test client connection
./logger_client -v "debug message"
```

## Best Practices

1. **Use absolute paths** for all file and socket paths
2. **Set appropriate buffer sizes** based on your logging volume
3. **Monitor disk space** when using large log files
4. **Use daemon mode** for production deployments
5. **Implement log rotation** monitoring to prevent disk full
6. **Test socket permissions** in your deployment environment
7. **Use meaningful log messages** with context information
8. **Monitor daemon health** with process monitoring tools

## See Also

- [Logger API](/api/logger-api) - Programmatic logging interface
- [FileWatcher API](/api/filewatcher-api) - Programmatic file monitoring
- [Examples](/examples/basic-usage) - Complete integration examples
- [Performance Guide](/guide/performance) - Optimization strategies