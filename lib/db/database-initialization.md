根据 `schema.ts` 中定义的模式创建所有必要的表，包括：
- User 表：用户信息
- Chat 表：聊天记录
- Message_v2 表：消息内容
- Vote_v2 表：投票记录
- Document 表：文档存储
- Suggestion 表：建议记录

 `drizzle.config.ts` 配置文件包含了所有必要的内容：
1. 导入了 dotenv 配置来读取环境变量
2. 设置了 schema 文件路径
3. 设置了 migrations 输出目录
4. 设置了数据库方言为 postgresql
5. 配置了数据库连接 URL

完成数据库迁移：
`npx drizzle-kit push`
查看当前数据库的表结构：
`npx drizzle-kit studio`
