<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Next.js AI Chatbot</h1>
</a>

<p align="center">
  An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

# AI Chatbot

An advanced AI chatbot application with cloud-based API integration.

## Features

- Multi-model chat interface
- Support for attachments and images
- Document generation and editing
- Image generation with Aliyun DashScope API
- Real-time streaming responses
- Chat history and session management

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install
```

### Configuration

Create a `.env.local` file in the project root with your API keys and configuration:

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_api_key
OPENROUTER_API_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_APP_NAME=ai-chatbot

# Aliyun DashScope API Configuration
ALIYUN_API_KEY=your_aliyun_api_key
ALIYUN_API_BASE_URL=https://dashscope.aliyuncs.com/api/v1

# See .env.example for full configuration options
```

### Development

```bash
# Start development server
pnpm dev
```

## Testing and Monitoring

The project includes comprehensive test scripts for the Aliyun DashScope API integration:

```bash
# Run standard API tests (authentication and image generation)
pnpm tsx scripts/dashscope-tests/run-tests.ts

# Run Wanx model tests specifically
pnpm tsx scripts/dashscope-tests/run-wanx-tests.ts

# Get a summary of test results
pnpm tsx scripts/dashscope-tests/get-test-summary.ts
```

For scheduled monitoring:

- **Windows**: `powershell -ExecutionPolicy Bypass -File scripts/dashscope-tests/schedule-tests.ps1`
- **Linux/macOS**: `./scripts/dashscope-tests/schedule-tests.sh`

More details in [Scripts Documentation](./scripts/README.md).

## License

Copyright (c) 2023-2025 AI Chatbot Contributors

## Documentation

For more detailed documentation:

- [Scripts Documentation](./scripts/README.md)
- [DashScope Tests Documentation](./scripts/dashscope-tests/README.md)

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Vercel Postgres powered by Neon](https://vercel.com/storage/postgres) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Generate%20a%20random%20secret%20to%20use%20for%20authentication&envLink=https%3A%2F%2Fgenerate-secret.vercel.app%2F32&project-name=my-awesome-chatbot&repository-name=my-awesome-chatbot&demo-title=AI%20Chatbot&demo-description=An%20Open-Source%20AI%20Chatbot%20Template%20Built%20With%20Next.js%20and%20the%20AI%20SDK%20by%20Vercel&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22api-key%22%2C%22integrationSlug%22%3A%22groq%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).

## Deployment Notes (Learning Setup) / 部署注意事项 (学习配置)

**Important:** This project is currently configured to use the **same database** for both local development and Vercel deployment. This is done **for learning and demonstration purposes only** and is **not recommended for real-world applications**.

**关键提示：** 本项目当前配置为本地开发和 Vercel 部署使用**同一个数据库**。这**仅为学习和演示目的**，**不建议在实际项目中使用**。

### Migration Behavior / 迁移行为

To prevent errors from re-running migrations on the shared database during Vercel builds, the `build` script in `package.json` has been modified:

*   `"build": "next build"` (The automatic migration step `tsx lib/db/migrate &&` has been removed).

为防止在 Vercel 构建期间在共享数据库上重复运行迁移导致错误，`package.json` 中的 `build` 脚本已被修改：

*   `"build": "next build"` (自动迁移步骤 `tsx lib/db/migrate &&` 已被移除)。

### Required Action / 必要操作

**Before deploying any code that requires database schema changes:**

1.  Make your schema changes (e.g., in `lib/db/schema.ts`).
2.  Generate the migration file: `pnpm run db:generate`.
3.  **Manually apply the migration to the shared database locally:** `pnpm run db:migrate`.
4.  Commit your code changes (including the new migration file) and deploy to Vercel.

**在部署任何需要数据库结构更改的代码之前：**

1.  进行你的结构更改 (例如，在 `lib/db/schema.ts` 中)。
2.  生成迁移文件：`pnpm run db:generate`。
3.  **在本地手动将迁移应用到共享数据库：** `pnpm run db:migrate`。
4.  提交你的代码更改 (包括新的迁移文件) 并部署到 Vercel。

### Recommendation for Real Projects / 实际项目建议

For real projects, it is strongly recommended to:

*   Use separate database instances for development, preview, and production environments.
*   Configure your deployment pipeline (e.g., on Vercel) to handle database migrations automatically and safely against the correct environment's database.

对于实际项目，强烈建议：

*   为开发、预览和生产环境使用独立的数据库实例。
*   配置你的部署流水线 (例如，在 Vercel 上) 以自动且安全地针对正确环境的数据库处理数据库迁移。
