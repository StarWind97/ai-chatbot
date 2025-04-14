# 文档功能

文档功能允许您在聊天界面旁边拥有一个工作区接口。这类似于 [ChatGPT 的 Canvas](https://openai.com/index/introducing-canvas) 和 [Claude 的 Artifacts](https://www.anthropic.com/news/artifacts)。

该模板已经包含以下文档类型：

- **文本文档**：允许您处理文本内容，如起草文章和电子邮件。
- **代码文档**：允许您编写和执行代码。
- **表格文档**：允许您处理表格数据，如创建、编辑和分析数据。

## 文档系统工作原理

文档系统采用简单的模式，允许用户使用 AI 创建和更新文档。当用户请求生成某种类型的文档时，系统会：

1. 创建一个新的文档
2. 将文档的内容流式传输到用户界面
3. 允许用户查看和交互文档

## 技术实现

系统主要使用以下组件：

1. `create-document.ts` - 处理创建新文档的工具
2. `update-document.ts` - 处理更新现有文档的工具
3. `request-suggestions.ts` - 提供对文档内容的建议

文档内容在客户端由以下组件渲染：

1. `document.tsx` - 定义文档工具调用和结果组件
2. `data-stream-handler.tsx` - 处理从服务器流式传输的数据

## 文档类型

系统支持三种文档类型：

```typescript
type DocumentKind = 'text' | 'code' | 'sheet';
```

每种类型使用特定的编辑器组件进行渲染：

- `text` - 使用普通的文本编辑器
- `code` - 使用具有语法高亮的代码编辑器
- `sheet` - 使用表格编辑器

## 数据模型

文档在数据库中以以下模式存储：

```typescript
export const document = pgTable(
  "Document",
  {
    id: uuid("id").notNull().defaultRandom(),
    createdAt: timestamp("createdAt").notNull(),
    title: text("title").notNull(),
    content: text("content"),
    kind: varchar("kind", { enum: ['text', 'code', 'sheet'] })
      .notNull()
      .default("text"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);
```

## 使用文档功能

要在聊天中使用文档功能，只需要请求 AI 创建一个文档。例如：

- "请帮我写一篇关于人工智能的文章"
- "创建一个电子表格来跟踪我的每月预算"
- "为我编写一个简单的 React 组件"

系统会自动检测您的请求并创建相应类型的文档。 