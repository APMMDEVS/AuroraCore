import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AuroraCore',
  description: 'Advanced Multi-Modal Framework 3 Core - High-performance logging and file monitoring for Android',
  
  // 多语言配置
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'AuroraCore',
      description: 'Android Root Logger & File Watcher - High-performance logging and file monitoring for Android root environment',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API Reference', link: '/api/logger-api' },
          { text: 'Examples', link: '/examples/basic-usage' },
          { text: 'GitHub', link: 'https://github.com/APMMDEVS/AuroraCore' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Introduction', link: '/guide/introduction' },
                { text: 'Installation', link: '/guide/installation' },
                { text: 'Quick Start', link: '/guide/getting-started' },
                { text: 'Building from Source', link: '/guide/building' }
              ]
            },
            {
              text: 'Core Concepts',
              items: [
                { text: 'Logger System', link: '/guide/logger-concepts' },
                { text: 'File Watcher', link: '/guide/filewatcher-concepts' },
                { text: 'Performance & Power', link: '/guide/performance' }
              ]
            }
          ],
          '/api/': [
            {
              text: 'API Reference',
              items: [
                { text: 'Logger API', link: '/api/logger-api' },
                { text: 'FileWatcher API', link: '/api/filewatcher-api' },
                { text: 'Command Line Tools', link: '/api/cli-tools' }
              ]
            }
          ],
          '/examples/': [
            {
              text: 'Examples',
              items: [
                { text: 'Basic Usage', link: '/examples/basic-usage' },
                { text: 'Advanced Configuration', link: '/examples/advanced-config' },
                { text: 'Integration Examples', link: '/examples/integration' }
              ]
            }
          ]
        }
      }
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      title: 'AuroraCore',
      description: 'Android Root 日志系统与文件监听工具 - 专为Android root环境设计的高性能日志记录和文件监控解决方案',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: 'API 参考', link: '/zh/api/logger-api' },
          { text: '示例', link: '/zh/examples/basic-usage' },
          { text: 'GitHub', link: 'https://github.com/APMMDEVS/AuroraCore' }
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '开始使用',
              items: [
                { text: '介绍', link: '/zh/guide/introduction' },
                { text: '安装', link: '/zh/guide/installation' },
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '从源码构建', link: '/zh/guide/building' }
              ]
            },
            {
              text: '核心概念',
              items: [
                { text: '日志系统', link: '/zh/guide/logger-concepts' },
                { text: '文件监听', link: '/zh/guide/filewatcher-concepts' },
                { text: '性能与功耗', link: '/zh/guide/performance' }
              ]
            }
          ],
          '/zh/api/': [
            {
              text: 'API 参考',
              items: [
                { text: 'Logger API', link: '/zh/api/logger-api' },
                { text: 'FileWatcher API', link: '/zh/api/filewatcher-api' },
                { text: '命令行工具', link: '/zh/api/cli-tools' }
              ]
            }
          ],
          '/zh/examples/': [
            {
              text: '示例',
              items: [
                { text: '基础用法', link: '/zh/examples/basic-usage' },
                { text: '高级配置', link: '/zh/examples/advanced-config' },
                { text: '集成示例', link: '/zh/examples/integration' }
              ]
            }
          ]
        }
      }
    }
  },
  
  // 主题配置
  themeConfig: {
    logo: './public/logo.svg',
    siteTitle: 'AuroraCore',
    
    // 搜索
    search: {
      provider: 'local'
    },
    
    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/APMMDEVS/AuroraCore' }
    ],
    
    // 页脚
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 AuroraCore Team'
    },
    
    // 编辑链接
    editLink: {
      pattern: 'https://github.com/APMMDEVS/AuroraCore/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    // 最后更新时间
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },
  
  // 构建配置
  base: '/AuroraCore/',
  cleanUrls: true,
  
  // Markdown 配置
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },
  
  // Head 配置
  head: [
    ['link', { rel: 'icon', href: '/AuroraCore/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'AuroraCore | Android Root Logger & File Watcher' }],
    ['meta', { property: 'og:site_name', content: 'AuroraCore' }],
    ['meta', { property: 'og:url', content: 'https://APMMDEVS.github.io/AuroraCore/' }]
  ]
})