// Mock data for Create Agent page
// Replace with real API calls when integrating backend

import type {
  AgentConfig,
  AgentDefinition,
  ModelOption,
  PluginItem,
} from '@/types/modules/agentCreate'
import { AGENT_CREATE_LLM_MODELS } from '@/constants/llmModels'
import dataProcessingPrompt from '@/prompts/agent-create/data-processing.md?raw'
import featureEngineeringPrompt from '@/prompts/agent-create/feature-engineering.md?raw'
import modelSelectionPrompt from '@/prompts/agent-create/model-selection.md?raw'
import hyperparameterOptimizationPrompt from '@/prompts/agent-create/hyperparameter-optimization.md?raw'
import resultAnalysisPrompt from '@/prompts/agent-create/result-analysis.md?raw'

export type { AgentConfig, AgentDefinition, ModelOption, PluginItem }

/** 各智能体可选大模型，value 与入库/AgentConfig.llm_name 一致；label 为界面展示名 */
export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: AGENT_CREATE_LLM_MODELS[0],
    label: AGENT_CREATE_LLM_MODELS[0],
    provider: '',
    description: 'DeepSeek V4 Pro',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[1],
    label: AGENT_CREATE_LLM_MODELS[1],
    provider: '',
    description: 'DeepSeek V4 Flash',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[2],
    label: AGENT_CREATE_LLM_MODELS[2],
    provider: 'Qwen',
    description: 'Qwen3 Max',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[3],
    label: AGENT_CREATE_LLM_MODELS[3],
    provider: 'Qwen',
    description: 'Qwen3.7 Max',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[4],
    label: AGENT_CREATE_LLM_MODELS[4],
    provider: 'Moonshot',
    description: 'Kimi K2.6',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[5],
    label: AGENT_CREATE_LLM_MODELS[5],
    provider: 'SiliconFlow',
    description: 'GLM-5.2',
  },
  {
    value: AGENT_CREATE_LLM_MODELS[6],
    label: AGENT_CREATE_LLM_MODELS[6],
    provider: 'ZhipuAI',
    description: 'GLM-5.2',
  },
]

export const SKILL_OPTIONS: PluginItem[] = [
  { id: 'data-loader', name: '数据加载器', description: '支持 CSV/Excel/JSON 等格式数据读取', icon: '📂', category: '数据', categoryId: 1, authorName: '平台', favoriteCount: 320, likeCount: 180, viewCount: 2100, isHot: true },
  { id: 'data-cleaner', name: '数据清洗工具', description: '自动处理缺失值、异常值、重复数据', icon: '🧹', category: '数据', categoryId: 1, authorName: '平台', favoriteCount: 280, likeCount: 150, viewCount: 1800 },
  { id: 'data-visualizer', name: '数据可视化', description: '生成图表、热力图、分布图等', icon: '📊', category: '数据', categoryId: 1, authorName: '平台', favoriteCount: 410, likeCount: 220, viewCount: 3200, isHot: true },
  { id: 'db-connector', name: '数据库连接', description: '连接 MySQL/PostgreSQL 等数据库', icon: '🗄️', category: '数据', categoryId: 1, authorName: '平台', favoriteCount: 190, likeCount: 90, viewCount: 1200 },
  { id: 'feature-selector', name: '特征选择器', description: '自动筛选重要特征，降维处理', icon: '🎯', category: '特征', categoryId: 2, authorName: '平台', favoriteCount: 260, likeCount: 140, viewCount: 1600 },
  { id: 'feature-encoder', name: '特征编码器', description: 'One-Hot、Label Encoding 等编码', icon: '🔢', category: '特征', categoryId: 2, authorName: '平台', favoriteCount: 230, likeCount: 120, viewCount: 1500 },
  { id: 'feature-scaler', name: '特征归一化', description: 'StandardScaler、MinMaxScaler 等', icon: '⚖️', category: '特征', categoryId: 2, authorName: '平台', favoriteCount: 240, likeCount: 130, viewCount: 1400 },
  { id: 'model-trainer', name: '模型训练器', description: '支持多种机器学习算法训练', icon: '🤖', category: '模型', categoryId: 3, authorName: '平台', favoriteCount: 380, likeCount: 200, viewCount: 2800, isHot: true },
  { id: 'model-evaluator', name: '模型评估器', description: '计算 Accuracy、F1、AUC 等指标', icon: '📈', category: '模型', categoryId: 3, authorName: '平台', favoriteCount: 350, likeCount: 190, viewCount: 2600 },
  { id: 'hyperopt', name: '超参数优化', description: '基于贝叶斯优化自动调参', icon: '🔧', category: '优化', categoryId: 4, authorName: '平台', favoriteCount: 290, likeCount: 160, viewCount: 1900 },
  { id: 'auto-ml', name: 'AutoML', description: '自动化机器学习流程', icon: '⚡', category: '优化', categoryId: 4, authorName: '平台', favoriteCount: 310, likeCount: 170, viewCount: 2200, isLatest: true },
  { id: 'report-gen', name: '报告生成器', description: '自动生成分析报告与洞察', icon: '📄', category: '分析', categoryId: 5, authorName: '平台', favoriteCount: 270, likeCount: 145, viewCount: 1700 },
  { id: 'code-executor', name: '代码执行器', description: '安全沙箱执行 Python 代码', icon: '💻', category: '工具', categoryId: 6, authorName: '平台', favoriteCount: 340, likeCount: 180, viewCount: 2400 },
  { id: 'web-search', name: 'Web 搜索', description: '实时搜索网络信息', icon: '🔍', category: '工具', categoryId: 6, authorName: '平台', favoriteCount: 420, likeCount: 230, viewCount: 3500, isHot: true },
]

/** @deprecated 历史命名，后续统一使用 SKILL_OPTIONS */
export const PLUGIN_OPTIONS = SKILL_OPTIONS

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  { id: 'data-processor', name: '数据处理智能体', shortName: '数据处理', icon: '🗃️', defaultPlugins: ['data-loader', 'data-cleaner', 'data-visualizer'] },
  { id: 'feature-engineer', name: '特征工程智能体', shortName: '特征工程', icon: '🔬', defaultPlugins: ['feature-selector', 'feature-encoder', 'feature-scaler'] },
  { id: 'model-selector', name: '模型选型智能体', shortName: '模型选型', icon: '🤖', defaultPlugins: ['model-trainer', 'model-evaluator'] },
  { id: 'hyperparameter-optimizer', name: '超参数定义与优化智能体', shortName: '超参优化', icon: '⚙️', defaultPlugins: ['hyperopt', 'auto-ml'] },
  { id: 'result-analyzer', name: '结果分析智能体', shortName: '结果分析', icon: '📊', defaultPlugins: ['report-gen', 'model-evaluator', 'data-visualizer'] },
]

/** 新建智能体时各阶段的默认系统提示词；编辑器“恢复默认”同样读取此映射。 */
export const DEFAULT_PROMPTS: Record<string, string> = {
  'data-processor': dataProcessingPrompt.trim(),
  'feature-engineer': featureEngineeringPrompt.trim(),
  'model-selector': modelSelectionPrompt.trim(),
  'hyperparameter-optimizer': hyperparameterOptimizationPrompt.trim(),
  'result-analyzer': resultAnalysisPrompt.trim(),
}

const R1 = [
  '已完成数据探索分析。数据集共 12,450 条记录，23 个特征字段。',
  '',
  '发现问题：',
  '• 缺失值：age 字段缺失 3.2%，income 字段缺失 7.8%',
  '• 异常值：salary 字段存在 12 个极端值（>3sigma）',
  '• 重复记录：发现并移除 45 条完全重复数据',
  '',
  '处理方案：',
  '1. age 使用中位数填充',
  '2. income 使用 KNN 插值填充',
  '3. 极端值使用 Winsorization 处理',
  '',
  '清洗后数据集：12,393 条，质量评分：94.2/100',
].join('\n')

const R2 = [
  '特征分析完成。原始特征 23 个，经筛选保留 18 个有效特征。',
  '',
  '关键操作：',
  '• 删除低方差特征 3 个（方差 < 0.01）',
  '• 删除高相关特征 2 个（相关系数 > 0.95）',
  '• 新增交叉特征 5 个（age x income、region x category 等）',
  '• 执行 One-Hot 编码 4 个类别特征，生成 12 个哑变量',
  '• 对数值特征执行 StandardScaler 归一化',
  '',
  '最终特征集：30 个特征，特征重要性分析已完成。',
].join('\n')

const R3 = [
  '根据任务分析，推荐以下候选模型（二分类，样本量中等，特征混合型）：',
  '',
  '推荐排序：',
  '1. XGBoost — 综合性能最优，适合结构化数据，AUC 预估 0.87',
  '2. LightGBM — 训练速度快，内存占用低，适合快速迭代',
  '3. Random Forest — 可解释性好，对异常值鲁棒',
  '4. Logistic Regression — 作为基线模型，便于解释',
  '',
  '建议先用 LightGBM 快速验证，再用 XGBoost 精调。',
].join('\n')

const R4 = [
  'XGBoost 超参数搜索完成（贝叶斯优化，50 次迭代）。',
  '',
  '最优参数组合：',
  '• n_estimators: 320',
  '• max_depth: 6',
  '• learning_rate: 0.042',
  '• subsample: 0.82',
  '• colsample_bytree: 0.75',
  '• min_child_weight: 3',
  '',
  '验证集 AUC：0.891（较默认参数提升 +4.3%）',
  '训练耗时：约 4.2 分钟',
  '',
  '建议继续在 learning_rate 范围 [0.03, 0.06] 内精细搜索。',
].join('\n')

const R5 = [
  '模型评估报告已生成。',
  '',
  '核心指标（测试集）：',
  '• Accuracy：88.3%',
  '• Precision：86.7%',
  '• Recall：89.1%',
  '• F1-Score：0.879',
  '• AUC-ROC：0.921',
  '',
  '误差分析：',
  '• 主要误判集中在边界样本（置信度 0.45~0.55 区间）',
  '• 对少数类（Class=1）的召回率偏低，建议采样增强',
  '',
  '特征重要性 Top 3：income_level、age_group、region_code',
  '',
  '建议：对低置信样本引入人工审核机制，可将整体准确率提升至 91%+',
].join('\n')

export const MOCK_TEST_RESPONSES: Record<string, string[]> = {
  'data-processor': [R1],
  'feature-engineer': [R2],
  'model-selector': [R3],
  'hyperparameter-optimizer': [R4],
  'result-analyzer': [R5],
}
