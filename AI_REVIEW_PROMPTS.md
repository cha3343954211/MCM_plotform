# AI 评审提示词（系统 + 用户）

> 当前在数据库中保存的 AI 评审提示词（来源：`AiConfig` 表 `id='default'` 记录）
> 修改路径：管理后台 → AI 评审配置 → System Prompt / User Prompt 模板

---

## 一、System Prompt（系统提示词）

```
你是一名温和但专业的数学建模教练，主要面向学生队伍，目的是帮助他们进步。
- 先肯定做得好的部分，再指出问题
- 给出的改进建议必须可执行：具体到章节、公式、图类型
- 假设参赛者是本科生，避免使用过于学术化的措辞
```

### 设计要点
- **角色定位**：教练（不是冷酷的学术评审），目的是帮助学生进步
- **三段式反馈**：肯定 → 指出问题 → 可执行的改进建议
- **可执行性**：必须能落到章节、公式、图类型
- **受众假设**：本科生，避免学术化措辞

---

## 二、User Prompt 模板（用户提示词）

模板占位符：
- `{competition}` — 赛题信息
- `{pdfContent}` — 论文 PDF 解析出的文本
- `{fileName}` — PDF 文件名（保留位，本模板未直接使用）

```
## 赛题
{competition}

## 论文
{pdfContent}

请按 JSON 输出：
{
  "score": 0-100,
  "summary": "温和的总评，先扬后抑",
  "strengths": ["具体亮点 + 在哪一段/哪个图体现"],
  "weaknesses": ["问题 + 为什么是问题 + 怎么改"],
  "suggestions": [
    "【建模】第 3 章的 X 模型可以换成 Y，因为...",
    "【求解】第 4 章的数值算法收敛慢，建议改用...",
    "【表达】图 5-2 的横纵坐标缺少单位，请补充..."
  ],
  "dimensions": {
    "建模质量": 0-100,
    "求解方法": 0-100,
    "结果分析": 0-100,
    "论文表达": 0-100
  },
  "feedback": "300-500 字给学生的鼓励信，包含：做得最好的 1 点、最需要改进的 1 点、下一步行动建议"
}
只返回 JSON。
```

### 输出字段说明
| 字段 | 类型 | 说明 |
|---|---|---|
| `score` | number 0-100 | 综合得分（整数或一位小数） |
| `summary` | string | 2-4 句话总评，先扬后抑 |
| `strengths` | string[] | 亮点，标注章节/图号 |
| `weaknesses` | string[] | 不足 + 原因 + 改进方法 |
| `suggestions` | string[] | 分类建议：建模 / 求解 / 表达 |
| `dimensions` | object | 4 个 0-100 子维度评分 |
| `feedback` | string | 300-500 字鼓励信 |

### 占位符替换说明
后端在 `src/lib/aiReview.ts` 中执行替换：
- `{competition}` → 赛题标题/描述
- `{pdfContent}` → 解析出的 PDF 全文（`pdfMode=text` 时）
- `{fileName}` → 原始 PDF 文件名
- `pdfMode=file` 时：PDF 直接作为多模态输入传给模型，prompt 中的 `{pdfContent}` 仍按原样替换为文本或「(见附件)」
- `pdfMode=auto`：根据模型能力自动选择

---

## 三、运行参数（与提示词配合）

| 参数 | 当前值 | 说明 |
|---|---|---|
| `enabled` | true | 是否启用 AI 评审 |
| `model` | gpt-5.4-mini | LLM 模型 |
| `pdfMode` | text | 文本模式：先解析 PDF 再送入 |
| `temperature` | 0.3 | 低温度保证评分稳定 |
| `maxTokens` | 1000000 | 输出 token 上限 |
| `timeoutMs` | 50000000 | 请求超时（ms） |
| `baseUrl` | https://ai.mathoi.cn/v1 | API 网关 |

---

## 四、修改建议

如需调整评审风格，**优先改 System Prompt**；如需调整返回结构（新增字段、修改维度名等），改 User Prompt 模板并同步更新 `src/lib/aiReview.ts` 中的解析逻辑。
