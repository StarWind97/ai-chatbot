# DashScope API 测试工具

本工具用于测试阿里云灵积模型服务(DashScope)的API，包括身份验证测试和图像生成功能测试。

## 测试内容

1. **Flux图像生成API** - 测试阿里云Flux模型的文生图功能
2. **通义万相V2模型API** - 测试阿里云通义万相V2系列模型的文生图功能

## 文件结构

```
scripts/dashscope-tests/
├── dashscope-api-utils.ts    # 共享的API工具函数
├── dashscope-test-runner.ts  # 测试运行入口
├── flux-image-test.ts        # Flux图像生成测试模块
├── wanx-image-test.ts        # 通义万相图像生成测试模块
├── reports/                  # 测试报告目录
│   ├── api-summary-report.txt   # 简明测试摘要
│   ├── flux-status-report.html  # Flux测试HTML报告
│   ├── flux-test-results.json   # Flux测试JSON数据
│   ├── wanx-status-report.html  # 通义万相测试HTML报告
│   ├── wanx-test-results.json   # 通义万相测试JSON数据
│   └── temp/                    # 临时文件存储目录
├── README.md                 # 本说明文档
```

## 使用方法

### 运行测试

测试工具支持以下运行模式:

```bash
# 运行所有测试
pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts

# 仅测试Flux图像生成API
pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts flux

# 仅测试通义万相V2模型API
pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts wanx
```

### 测试结果

测试完成后，将生成以下输出：

1. **控制台输出** - 显示测试过程和简要结论
2. **测试摘要** - `reports/api-summary-report.txt` 包含所有测试的简明总结和可用性结论
3. **详细报告** - 各模型的详细HTML报告和JSON数据存储在 `reports` 目录

## 环境配置

测试工具需要在 `.env.local` 文件中配置以下环境变量:

```
ALIYUN_API_KEY=your_api_key_here
ALIYUN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1
REQUEST_TIMEOUT=60000
RETRY_COUNT=10
```

## API测试状态和错误处理

### Flux图像生成API

- **模型**: flux-schnell
- **认证**: 测试API密钥有效性
- **图像生成**: 测试是否可以成功生成图像

### 通义万相V2模型API

- **模型**: wanx2.1-t2i-turbo, wanx2.1-t2i-plus, wanx2.0-t2i-turbo
- **图像生成**: 测试各模型是否可以成功接受任务并生成图像

## 常见问题

1. **任务超时错误**: 通义万相V2模型需要较长时间处理，如果出现"处理中"状态，这是正常的。

2. **图像尺寸错误**: API只接受特定的图像尺寸。有效的尺寸包括：
   - `512*512`
   - `768*768` 
   - `1024*1024` (推荐)

3. **API密钥问题**: 如果出现认证错误，请确保在 `.env.local` 文件中设置了正确的API密钥。 