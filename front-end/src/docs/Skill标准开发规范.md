# Skill 标准开发规范

在本平台，Skill 为 AI 的数据分析与代码生成提供专业知识、方法、规则、示例和代码参考。AI 会按任务选择并阅读资料，包内脚本作为参考内容使用。作者只需说明自己负责的专业任务，无需了解平台的阶段划分、内部接口或流水线契约。

## 本平台的发布要求与评分

提交包含单个 Skill 目录的 ZIP，其中必须有 `SKILL.md`。正文说明用途、关键做法、必要输入条件和预期结果；可以把详细方法放在引用文件中。纯知识型 Skill、仅有 `SKILL.md` 的 Skill、面向特定数据集的 Skill 都可以获得高分。脚本、命令行入口、安装说明和退出码不是额外的评分门槛。

发布需要通过文件规范检查、完成 AI 名称与描述生成，并获得 **至少 80 分（含 80 分）**。总分 100，由以下五项相加：

| 维度 | 满分 | 作者需要说明什么 |
|---|---:|---|
| 用途是否明确 | 15 | 解决什么问题，在什么情况下使用，能力边界是什么。 |
| 方法是否具体有用 | 35 | 提供完成目标所需的关键方法、规则、算法、示例或代码。 |
| 内容是否准确一致 | 25 | 正文、代码、参数和示例相互一致，没有明显错误。 |
| 必要条件与结果是否清楚 | 15 | 写明必要的数据含义、条件、参数和预期产出。 |
| 资料是否容易理解和使用 | 10 | 核心信息容易找到，引用正确，内容清楚且没有明显冲突。 |

评审会综合 `SKILL.md` 以及 `.md/.txt/.py/.json/.yaml/.yml` 资料。较小的包完整读取，较大的包先阅读主要内容，再按需补读一次；报告显示实际阅读范围和分项依据。若核心材料不足以判断，本次不产生完整评分；系统未读到的内容不会直接当作作者缺失扣分。评审是内容分析，不代表运行测试。

AI 名称与描述根据资料的真实作用生成，用于后续检索与选择。例如，材料提供振动信号的 FFT、Welch 功率谱密度和频带能量方法，即使作者称其为 `case1`，名称也应表达“振动信号频域特征提取”。真实算法名、数据集名、设备型号和必要限制会保留，不能把特征提取扩大成未经说明的故障诊断能力。局部编号本身不扣分，但必要背景仍需写清。

只通过规范检查也可保存草稿。名称描述生成失败时，可在报告有效期内单独重试；原评分保持不变，有效期不延长。评分和生成均使用你选择的个人模型，通常有两次调用，补读或格式纠正可能增加调用。历史报告仍可查看，旧规则报告需要重新检测才能用于新发布。

## 通用 Skill 编写参考

下文保留通用 Skill 的目录、文档组织和客户端兼容性建议。其他客户端的执行、安装或扩展约定供需要跨客户端使用的作者参考，不是本平台的五维评分要求。

## 1. Skill 的定位

Skill 不是普通 README，也不是完整插件。它更像给 Agent 的“专业操作手册”，用于把重复的专业流程、领域知识和可复用资源封装成一个目录。

适合做成 Skill 的内容：

- 需要反复执行的多步骤流程，例如代码审查、报告生成、数据清洗、文档处理。
- Agent 不一定知道的领域规则，例如企业内部规范、行业指标、数据字典、API 约定。
- 容易出错且需要固定步骤的任务，例如文件格式转换、表单填写、发布检查。
- 需要按需加载的资料，例如长文档、模板、示例、校验脚本。

不适合做成 Skill 的内容：

- 一两句全局偏好，例如“回答要简洁”。
- 与具体任务无关的大段背景知识。
- 用户可直接问模型完成、且不需要特殊流程或上下文的简单任务。
- 隐藏执行副作用的自动化脚本，例如未经确认就删除文件、提交代码、调用生产接口。

## 2. 推荐目录结构

一个 Skill 是一个独立目录，最低要求是包含 `SKILL.md`。

```text
skill-name/
├── SKILL.md          # 必需：元数据 + 核心说明
├── scripts/          # 可选：可执行脚本或辅助程序
├── references/       # 可选：详细参考资料
├── assets/           # 可选：模板、图片、示例数据等静态资源
└── examples/         # 可选：项目约定目录；用于样例和测试，不保证所有客户端自动识别
```

最低可用结构：

```text
skill-name/
└── SKILL.md
```

目录命名建议：

- 使用小写英文、数字和连字符。
- 目录名与 `SKILL.md` 中的 `name` 保持一致。
- 名称表达能力边界，而不是泛泛而谈。

推荐：

- `pdf-processing`
- `api-code-review`
- `industrial-sensor-analysis`
- `brand-report-writing`

不推荐：

- `Skill1`
- `helper`
- `data`
- `my-awesome-skill`

## 3. `SKILL.md` 格式

`SKILL.md` 必须由 YAML frontmatter 和 Markdown 正文组成。

```markdown
---
name: skill-name
description: Use this skill when the user needs ...
---

# Skill Name

## Workflow

1. Identify the user's goal and required inputs.
2. Load referenced files only when needed.
3. Follow the task-specific workflow.
4. Validate the result before final response.
```

### 3.1 必需字段

`name`：

- 必填。
- 建议 1 到 64 个字符。
- 使用小写字母、数字和连字符。
- 不以连字符开头或结尾。
- 不使用连续连字符。
- 与 Skill 目录名一致。

`description`：

- 必填。
- 建议不超过 1024 字符。
- 同时说明“这个 Skill 做什么”和“什么时候使用它”。
- 这是 Agent 判断是否加载 Skill 的主要依据。

推荐：

```yaml
description: Use this skill when the user needs to analyze industrial sensor time-series data, detect abnormal production patterns, calculate quality metrics, or generate process diagnostics from CSV, Excel, or historian-exported files.
```

不推荐：

```yaml
description: Helps with data.
```

### 3.2 可选字段

本节字段写在 `SKILL.md` 顶部 YAML frontmatter 中，和 `name`、`description` 放在同一个 `---` 块内。不同 Agent 客户端对扩展字段的支持程度不同。为了最大化兼容性，跨客户端 Skill 默认只使用 `name` 和 `description`。

可选通用字段：

| 字段 | 用途 | 建议 |
| --- | --- | --- |
| `license` | 声明许可证 | 开源或组织共享时使用 |
| `compatibility` | 声明环境要求 | 有特定客户端、系统工具或网络要求时使用 |
| `metadata` | 附加元数据 | 用于作者、版本、组织等非关键运行信息 |
| `allowed-tools` | 声明预批准、免重复确认的工具 | 实验性字段，只有目标客户端支持时才使用；不应默认理解为 deny 规则 |

客户端扩展字段不要放进核心依赖。面向多个客户端分发时，应先保证只依赖最小通用字段也能完成任务；客户端专属字段只作为增强能力。常见客户端扩展字段见“附录 A：客户端扩展字段”。

示例：

```markdown
---
name: report-review
description: Use this skill when the user needs to review generated reports for structure, accuracy, missing evidence, and formatting issues.
license: MIT
compatibility: Works with clients that support SKILL.md and local file reads.
allowed-tools:
  - Read
---
```

### 3.3 兼容性矩阵

下表用于区分 Agent Skills 通用规范和常见客户端扩展。具体支持情况仍应以目标客户端当前文档为准。

| 能力 | Agent Skills 通用规范 | Codex | Claude Code |
| --- | --- | --- | --- |
| `SKILL.md` | 支持 | 支持 | 支持 |
| `name` | 必填 | 必填 | 可省略但建议写 |
| `description` | 必填 | 必填 | 推荐 |
| `scripts/` | 可选 | 支持 | 支持 |
| `references/` | 可选 | 支持 | 支持 |
| `assets/` | 可选 | 支持 | 支持 |
| `allowed-tools` | 实验性 | 需看具体环境 | 支持，但不是 deny 规则 |
| `agents/openai.yaml` | 非通用 | Codex Skill 级扩展配置 | 不适用 |
| `disable-model-invocation` | 非通用 | 不通用 | Claude Code 扩展 |

## 4. `description` 编写规则

`description` 决定 Skill 能否正确触发。它应当写给 Agent，而不是写给人类市场页。

好的 `description` 应该包含：

- 适用任务：用户想完成什么。
- 输入线索：文件类型、系统名、领域名、常见关键词。
- 能力边界：哪些相近任务不应该触发。
- 触发表达：即使用户没有直接说出 Skill 名称，也能匹配。

模板：

```yaml
description: Use this skill when the user needs to [task]. It is useful for [inputs/domains/workflows]. Do not use it for [near misses] unless the user specifically asks for [condition].
```

示例：

```yaml
description: Use this skill when the user needs to review backend API code for security, authorization, input validation, error handling, and database access risks. Use for pull requests, diffs, or source files involving HTTP endpoints. Do not use for general style-only proofreading.
```

常见问题：

- 太窄：只写了一个关键词，导致相关任务不触发。
- 太宽：写成“用于所有数据任务”，导致误触发。
- 太技术化：只描述内部脚本，不描述用户意图。
- 把使用时机写在正文里：正文只有触发后才加载，所以使用时机必须写进 `description`。

## 5. 正文编写规则

`SKILL.md` 正文应只放 Agent 每次使用 Skill 时都需要知道的核心内容。它不是用户手册，也不是完整知识库。

推荐包含：

- `Workflow`：执行步骤。
- `Inputs`：需要从用户或上下文确认的信息。
- `Output`：期望输出格式。
- `Validation`：如何检查结果。
- `Gotchas`：容易误判的特殊规则。
- `Resources`：什么时候读取哪些外部文件。

推荐结构：

```markdown
# Skill Name

## Workflow

1. Clarify missing required inputs only if they cannot be inferred.
2. Inspect the provided files or context.
3. Follow the domain-specific rules below.
4. Validate the output before finalizing.

## Output

Return:
- A concise summary.
- Key findings.
- Any generated artifact paths.

## Gotchas

- Do not assume missing values are zero.
- Distinguish observed facts from inferred causes.

## Resources

- Read `references/schema.md` when column names are unclear.
- Use `assets/report-template.md` when the user asks for a formal report.
```

写作原则：

- 用指令式表达，例如“Use...”“Read...”“Validate...”，少写背景介绍。
- 默认 Agent 已经很聪明，只补充它不知道或容易错的内容。
- 给明确默认方案，不要列一堆平级选择。
- 对脆弱流程写清楚顺序；对开放任务保留适当自由度。
- `SKILL.md` 建议控制在 500 行以内，超过时拆到 `references/`。

## 6. 渐进式加载

Agent Skills 的核心设计是渐进式加载：

1. 发现阶段：Agent 只读取 `name` 和 `description`。
2. 激活阶段：任务匹配后读取完整 `SKILL.md`。
3. 执行阶段：按需读取 `references/`、`assets/` 或运行 `scripts/`。

因此，长内容不要放进 `SKILL.md`。应该把详细资料拆成资源文件，并在 `SKILL.md` 中说明读取条件。

推荐：

```markdown
## Resources

- Read `references/api-errors.md` if an API response is non-2xx.
- Read `references/schema.md` when writing SQL or interpreting metric definitions.
- Use `assets/email-template.md` when drafting customer-facing emails.
```

不推荐：

```markdown
Read all files in references before starting.
```

也不推荐：

```markdown
See references/ for details.
```

## 7. 资源目录规范

### 7.1 `references/`

用于放 Agent 需要按需读取的详细知识。

适合内容：

- API 文档。
- 数据库 schema。
- 字段字典。
- 业务规则。
- 行业指标解释。
- 长示例和反例。

要求：

- 每个文件聚焦一个主题。
- 文件名可读，例如 `schema.md`、`error-handling.md`、`brand-rules.md`。
- 长文件顶部放目录。
- 在 `SKILL.md` 中明确什么时候读取该文件。

### 7.2 `scripts/`

用于放可执行辅助脚本。并非所有客户端都会自动执行脚本，但支持代码执行的 Agent 可以读取说明后运行它们。

适合内容：

- 校验器。
- 格式转换器。
- 解析器。
- 报告生成器。
- 可重复的数据处理逻辑。

要求：

- 脚本自包含，依赖清楚。
- 参数、输入、输出写在脚本注释或 `SKILL.md` 中。
- 失败时输出可理解的错误信息。
- 避免网络下载和危险写操作。
- 不把密钥、令牌、内部地址写进脚本。

如果 Skill 包含脚本，建议同时提供以下信息：

- Runtime：例如 Python 3.11+、Node.js 20+、Bash。
- Dependencies：例如 `requirements.txt`、`package.json`，或在 `SKILL.md` 中列出。
- Command：Agent 应该如何运行脚本。
- Inputs：脚本接受哪些参数、文件路径或 stdin。
- Outputs：脚本输出到 stdout、文件，还是指定目录。
- Exit codes：`0` 表示成功，非 `0` 表示失败。
- Failure behavior：失败时应输出可读错误，不要静默失败。

示例说明：

```markdown
Run `python scripts/validate_report.py <report-path>` before finalizing a report. If validation fails, fix the report and run it again.
```

脚本说明模板应写在 `SKILL.md` 正文中，建议放在 `## Scripts` 或 `## Tools` 小节。脚本自身也可以保留简短注释，但 Agent 首先应能从 `SKILL.md` 找到运行方式。

```markdown
## Scripts

Use `scripts/validate_report.py` when a report file is produced.

- Runtime: Python 3.11+.
- Dependencies: Install with `pip install -r scripts/requirements.txt`.
- Command: `python scripts/validate_report.py <report-path>`.
- Inputs: One Markdown report path.
- Outputs: Validation summary to stdout.
- Exit codes: `0` means valid; non-zero means validation failed.
- Failure behavior: Print actionable errors with section names and line references when possible.
```

### 7.3 `assets/`

用于放执行任务时会用到的静态资源。

适合内容：

- 报告模板。
- 邮件模板。
- 配置模板。
- 示例数据。
- 品牌图片、字体、小型图标。

要求：

- 只放执行任务真正需要的资源。
- 模板文件要说明适用场景。
- 大型二进制文件应谨慎放入 Skill。

### 7.4 `examples/`

用于放输入输出样例、测试任务或期望格式。`examples/` 是项目约定目录，不属于 Agent Skills 最小开放规范明确列出的核心目录；不同客户端不一定会自动识别它。

适合内容：

- `input-example.md`
- `output-example.md`
- `eval-queries.json`
- `golden-report.md`

示例不应替代正文说明。Agent 应先读 `SKILL.md`，只有需要参考输出形态或测试触发效果时才读取 `examples/`。

## 8. 安全与权限

Skill 可能影响 Agent 的行为，因此需要把副作用写清楚。

本节安全约束应写在 `SKILL.md` 正文中，建议放在 `## Safety`、`## Permissions`、`## Constraints` 或 `## Gotchas` 小节。它们不是 YAML frontmatter 字段，除非目标客户端另有专门扩展字段。

必须避免：

- 隐藏删除、覆盖、移动文件的行为。
- 自动上传用户文件或数据到外部服务。
- 读取 `.env`、密钥、证书、令牌、隐私目录。
- 下载并执行未知代码。
- 在 `description` 中夸大适用范围，诱导 Agent 过度触发。
- 把生产环境账号、内部 URL、密钥写进资源或脚本。

对于有副作用的 Skill，应在 `SKILL.md` 正文的安全或工作流小节中明确要求确认：

```markdown
Before making irreversible changes, summarize the planned actions and ask the user for confirmation.
```

对于只读 Skill，应在 `SKILL.md` 正文的安全或约束小节中写明限制：

```markdown
This skill is read-only. Do not edit files, run write commands, or change external systems.
```

如果目标客户端支持 `allowed-tools`，可以在 `SKILL.md` 顶部 YAML frontmatter 中声明该 Skill 激活时可预批准、免重复确认的工具；但它不一定等价于“只允许使用这些工具”。真正的工具限制应以目标客户端的权限系统为准。如果客户端不支持该字段，也必须在 `SKILL.md` 正文中写清楚权限边界。

推荐写法：

```markdown
## Safety

This skill is read-only. Do not edit files, run write commands, or change external systems.

Before making irreversible changes, summarize the planned actions and ask the user for confirmation.
```

## 9. Skill 交付要求 / 发布要求

一个可发布 Skill 应至少满足以下要求：

1. 包含单一顶层目录，目录名与 `name` 完全一致。
2. 顶层目录内必须有且只能有一个 `SKILL.md`。
3. `SKILL.md` 必须包含可被标准 YAML parser 正常解析的合法 YAML frontmatter。
4. `name` 与 `description` 必须通过 Agent Skills 规范校验。
5. 如果包含脚本，必须在 `SKILL.md` 正文中说明运行命令、依赖安装方式、输入输出、退出码和失败行为；脚本注释可作为补充。
6. 如果包含资源文件，必须在 `SKILL.md` 正文中说明读取条件，通常放在 `## Resources` 小节。
7. 如果用于分发，建议打包为 zip，且 zip 内保留单一顶层目录。
8. 不包含密钥、个人隐私、生产凭据、大型无关二进制文件。
9. 至少提供一组触发测试样例和输出质量样例。样例目录可以使用项目约定的 `examples/`，但不应假设所有客户端都会自动识别该目录。

## 10. 质量检查清单

发布前检查：

- [ ] YAML frontmatter 可以被标准 YAML parser 正常解析。
- [ ] `name` 与目录名完全一致。
- [ ] `name` 使用小写英文、数字和连字符。
- [ ] `description` 不超过 1024 字符。
- [ ] `description` 同时说明能力和使用时机。
- [ ] `description` 能覆盖常见用户表达，而不是只覆盖 Skill 名称。
- [ ] `description` 没有宽到会误触发相邻任务。
- [ ] Skill 包内只有一个 `SKILL.md`；如果目标客户端允许 `skill.md`，也只能二选一。
- [ ] 所有在 `SKILL.md` 中引用的相对路径都真实存在。
- [ ] 正文是任务指导，不是泛泛说明或市场介绍。
- [ ] `SKILL.md` 控制在合理长度，长资料已拆到资源文件。
- [ ] 每个资源文件都在 `SKILL.md` 正文中说明了读取条件。
- [ ] 脚本在 `SKILL.md` 正文中有明确运行命令、参数、依赖、输入、输出、退出码和失败行为。
- [ ] 脚本命令可以在干净环境中运行。
- [ ] 有副作用的流程在 `SKILL.md` 正文中要求用户确认。
- [ ] 没有密钥、隐私数据、生产凭据或不必要的大文件。
- [ ] 示例触发集包含 `should_trigger` 与 `should_not_trigger`。
- [ ] 至少人工测试过 3 条真实任务。
- [ ] 至少提供一组输出质量样例，说明合格输出应包含哪些要素。

## 11. 触发效果评估

一个 Skill 只有被正确触发才有价值。建议准备触发测试集：

- 8 到 10 条应该触发的用户请求。
- 8 到 10 条不应该触发的近似请求。
- 包含正式表达、口语表达、文件路径、领域术语、错别字、模糊需求。

示例：

```json
[
  {
    "query": "帮我分析这份产线传感器 CSV，找一下温度和不良率之间有没有异常关系",
    "should_trigger": true
  },
  {
    "query": "把这个 CSV 每行导入 Postgres，帮我写个脚本",
    "should_trigger": false
  }
]
```

优化方法：

- 应触发但未触发：`description` 可能太窄，需要加入更真实的用户意图。
- 不应触发但触发：`description` 可能太宽，需要补充边界。
- 同一请求结果不稳定：`description` 可能缺少关键词或任务边界。
- 不要为了某一条测试语句硬塞关键词，应提炼成通用类别。

## 12. 完整示例

目录：

```text
industrial-sensor-analysis/
├── SKILL.md
├── references/
│   ├── sensor-schema.md
│   └── quality-metrics.md
├── scripts/
│   └── validate_report.py
└── examples/          # 项目约定目录，用于触发测试和输出样例
    └── eval-queries.json
```

`SKILL.md`：

```markdown
---
name: industrial-sensor-analysis
description: Use this skill when the user needs to analyze industrial sensor or production time-series data, detect abnormal process patterns, calculate quality metrics, or generate diagnostics from CSV, Excel, or historian-exported files. Do not use it for generic CSV import/export tasks unless process analysis is requested.
---

# Industrial Sensor Analysis

## Workflow

1. Identify the input file, equipment, time range, sensor tags, and requested metric.
2. Read `references/sensor-schema.md` when column names or tag meanings are unclear.
3. Read `references/quality-metrics.md` when calculating yield, defect rate, stability, or process capability.
4. Analyze missing values, outliers, time alignment, and shift boundaries before drawing conclusions.
5. Validate any generated report with `scripts/validate_report.py` if a report file is produced.

## Output

Return:
- A concise summary.
- Key anomalies and supporting evidence.
- Likely causes, clearly marked as inference.
- Recommended next checks.
- Paths to generated artifacts, if any.

## Gotchas

- Do not treat missing sensor values as zero unless the schema explicitly says so.
- Use the equipment local timezone when grouping by shift.
- Separate observed evidence from inferred root causes.
```

## 13. 常见反模式

### 13.1 把 Skill 写成 README

问题：

```markdown
# About PDFs

PDF is a common document format...
```

改法：

```markdown
Use `pdfplumber` for text extraction. If the PDF is scanned, use OCR and mark OCR uncertainty in the output.
```

### 13.2 把所有资料塞进 `SKILL.md`

问题：正文太长，Agent 每次触发都会加载大量无关内容。

改法：把长资料放到 `references/`，在 `SKILL.md` 正文写读取条件。

### 13.3 只写口号，不写流程

问题：

```markdown
Follow best practices and ensure quality.
```

改法：

```markdown
1. Check authentication and authorization paths.
2. Check input validation before database writes.
3. Check error messages for sensitive data leakage.
4. List findings by severity with file references.
```

### 13.4 给太多平级选项

问题：

```markdown
You can use tool A, B, C, D, or E.
```

改法：

```markdown
Use tool A by default. Use tool C only when the input is scanned or image-based.
```

## 附录 A：客户端扩展字段

以下配置不是 Agent Skills 最小开放规范的一部分，只在部分客户端中可用。使用前应查阅目标客户端文档，并避免把核心能力建立在单一客户端扩展上。

### Codex 扩展配置

Codex 的 Skill 级扩展配置写在 Skill 顶层目录内的 `agents/openai.yaml`，不是写在 `SKILL.md` frontmatter 中。它用于配置 Codex App 中的界面元数据、隐式触发策略和工具依赖。

推荐目录位置：

```text
my-skill/
├── SKILL.md
├── assets/
│   ├── small-logo.svg
│   └── large-logo.png
└── agents/
    └── openai.yaml
```

示例：

```yaml
interface:
  display_name: "Report Review"
  short_description: "Review generated reports for structure, evidence, and formatting."
  icon_small: "./assets/small-logo.svg"
  icon_large: "./assets/large-logo.png"
  brand_color: "#3B82F6"
  default_prompt: "Use this skill to review the report."

policy:
  allow_implicit_invocation: false

dependencies:
  tools:
    - type: "mcp"
      value: "openaiDeveloperDocs"
      description: "OpenAI Docs MCP server"
      transport: "streamable_http"
      url: "https://developers.openai.com/mcp"
```

字段说明：

- `interface`：Codex App 展示信息，例如显示名、简介、图标、品牌色和默认提示语。
- `policy.allow_implicit_invocation`：是否允许 Codex 根据用户请求自动触发该 Skill；设为 `false` 时，仍可通过显式 `$skill` 调用。
- `dependencies.tools`：声明该 Skill 依赖的工具，例如 MCP server，方便 Codex 环境识别和引导配置。

本文只指导 Skill 开发；`agents/openai.yaml` 属于单个 Skill 的 Codex 增强配置，不等同于可安装插件的分发清单。

### Claude Code 扩展字段

Claude Code 当前支持若干扩展字段。这些字段写在 `SKILL.md` / `skill.md` 顶部 YAML frontmatter 中，例如：

| 字段 | 用途 |
| --- | --- |
| `allowed-tools` | Skill 激活时可预批准、免重复确认的工具；不是 deny 规则 |
| `disable-model-invocation` | 控制是否禁用模型调用 |
| `user-invocable` | 控制用户是否可直接调用 |
| `argument-hint` | 提示用户调用时应提供的参数 |
| `arguments` | 描述结构化参数 |
| `context` | 声明额外上下文 |
| `agent` | 指定或关联 Agent 行为 |
| `paths` | 声明相关路径 |
| `shell` | 声明 shell 相关行为 |
| `hooks` | 声明客户端支持的钩子 |

这些字段只应在明确面向 Claude Code 或已确认目标客户端兼容时使用。面向 Codex、Claude Code、API 或其他 Agent 客户端分发的通用 Skill，应优先保证只依赖 `name`、`description`、`SKILL.md` 正文和按需资源也能工作。

示例：

```markdown
---
name: pdf-review
description: Use this skill when reviewing PDF documents for structure, extraction quality, and summary accuracy.
allowed-tools:
  - Read
  - Bash
user-invocable: true
argument-hint: "<pdf-path>"
---
```

## 14. 参考资料

- Agent Skills Specification: https://agentskills.io/specification
- Agent Skills Best Practices: https://agentskills.io/skill-creation/best-practices
- Agent Skills Description Optimization: https://agentskills.io/skill-creation/optimizing-descriptions
- Agent Skills Using Scripts: https://agentskills.io/skill-creation/using-scripts
- Codex Agent Skills: https://developers.openai.com/codex/skills
- Claude Code Skills: https://code.claude.com/docs/en/skills
- Claude Skills Overview: https://claude.com/docs/skills/overview
