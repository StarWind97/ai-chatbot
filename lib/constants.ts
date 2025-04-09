export const isProductionEnvironment = process.env.NODE_ENV === 'production';

export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

/**

环境变量配置说明
这些环境变量不一定都需要在.env文件中手动配置，具体情况如下：
1. NODE_ENV ：
   - 这个环境变量通常不需要在.env文件中手动配置
   - 在开发过程中，它会被开发工具(如Next.js, Create React App等)自动设置
   - 在开发环境中通常为'development'
   - 在构建或部署生产版本时，构建工具会自动将其设置为'production'
2. Playwright相关的环境变量：
   - PLAYWRIGHT_TEST_BASE_URL 、 PLAYWRIGHT 和 CI_PLAYWRIGHT
   - 这些变量主要在运行Playwright测试时使用
   - 通常在测试运行时由测试框架自动设置，或在CI/CD环境中配置
   - 如果你需要在本地测试中自定义这些值，可以在.env.test文件或测试配置中设置
如果你想手动控制这些环境变量，可以在项目根目录创建以下文件：
- .env.development - 开发环境配置
- .env.production - 生产环境配置
- .env.test - 测试环境配置
但在大多数情况下，这些环境变量会由框架或工具自动管理，无需手动配置。

 */
