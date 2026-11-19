/**
 * 插件类别默认代码模板（pluginClass 1~5）
 * 符合插件开发规范：matplotlib Agg、run 签名、params 防护、output_dir、返回 dict
 */

export const PLUGIN_CLASS_NAMES: Record<number, string> = {
  1: 'DP',
  2: 'FE',
  3: 'MS',
  4: 'HD',
  5: 'RA',
}

export interface PluginCodeTemplate {
  codeFileName: string
  codeContent: string
}

const DP_TEMPLATE = `import os
import matplotlib
matplotlib.use("Agg")
import pandas as pd


def run(artifacts: dict, output_dir: str, params: dict = None, **kwargs) -> dict:
    params = params or {}
    # 读取上游数据
    data_path = artifacts.get("data")
    if not data_path or not os.path.isfile(data_path):
        return {"data": ""}
    df = pd.read_csv(data_path)
    # 轻量处理占位（可替换为实际清洗逻辑）
    out_df = df.copy()
    out_path = os.path.join(output_dir, "data.csv")
    out_df.to_csv(out_path, index=False)
    return {"data": os.path.abspath(out_path)}
`

const FE_TEMPLATE = `import os
import json
import matplotlib
matplotlib.use("Agg")
import pandas as pd


def run(artifacts: dict, output_dir: str, params: dict = None, **kwargs) -> dict:
    params = params or {}
    # 读取上游数据
    data_path = artifacts.get("data")
    if not data_path or not os.path.isfile(data_path):
        return {"data": ""}
    df = pd.read_csv(data_path)
    # 轻量特征工程占位（可替换为实际特征逻辑）
    out_df = df.copy()
    out_path = os.path.join(output_dir, "data.csv")
    out_df.to_csv(out_path, index=False)
    selected = list(out_df.select_dtypes(include=["number"]).columns)[:5]
    features_path = os.path.join(output_dir, "selected_features.json")
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump({"selected_features": selected}, f, ensure_ascii=False, indent=2)
    return {
        "data": os.path.abspath(out_path),
        "selected_features": os.path.abspath(features_path),
    }
`

const MS_TEMPLATE = `import os
import json
import matplotlib
matplotlib.use("Agg")


def run(artifacts: dict, output_dir: str, params: dict = None, **kwargs) -> dict:
    params = params or {}
    # 从 artifacts 读取上游数据（可选）
    # 生成最小 leaderboard 示例，实际应接入模型评估结果
    leaderboard = [
        {"model": "model_a", "metric": 0.85, "rank": 1},
        {"model": "model_b", "metric": 0.82, "rank": 2},
    ]
    leaderboard_path = os.path.join(output_dir, "leaderboard.json")
    with open(leaderboard_path, "w", encoding="utf-8") as f:
        json.dump(leaderboard, f, ensure_ascii=False, indent=2)
    return {"leaderboard": os.path.abspath(leaderboard_path)}
`

const HD_TEMPLATE = `import os
import json
import pickle
import matplotlib
matplotlib.use("Agg")


def run(artifacts: dict, output_dir: str, params: dict = None, **kwargs) -> dict:
    params = params or {}
    # 从 artifacts 读取数据（可选）
    # 最小 HPO 报告与模型占位
    hpo_report = {
        "best_score": 0.0,
        "n_trials": 0,
        "params": {},
    }
    hpo_path = os.path.join(output_dir, "hpo_report.json")
    with open(hpo_path, "w", encoding="utf-8") as f:
        json.dump(hpo_report, f, ensure_ascii=False, indent=2)
    model_path = os.path.join(output_dir, "final_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump({"placeholder": True}, f)
    return {
        "final_model": os.path.abspath(model_path),
        "hpo_report": os.path.abspath(hpo_path),
    }
`

const RA_TEMPLATE = `import os
import json
import matplotlib
matplotlib.use("Agg")


def run(artifacts: dict, output_dir: str, params: dict = None, **kwargs) -> dict:
    params = params or {}
    # 从 artifacts 读取上游产物（如 leaderboard、final_model 等）
    # 结果分析：生成报告或图表
    report = {
        "summary": "分析结果占位",
        "metrics": {},
    }
    report_path = os.path.join(output_dir, "report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return {"report": os.path.abspath(report_path)}
`

const TEMPLATES: Record<number, PluginCodeTemplate> = {
  1: { codeFileName: "main.py", codeContent: DP_TEMPLATE },
  2: { codeFileName: "main.py", codeContent: FE_TEMPLATE },
  3: { codeFileName: "main.py", codeContent: MS_TEMPLATE },
  4: { codeFileName: "main.py", codeContent: HD_TEMPLATE },
  5: { codeFileName: "main.py", codeContent: RA_TEMPLATE },
}

/**
 * 根据 pluginClass(1~5) 获取默认代码模板，越界按 5 处理
 */
export function getPluginCodeTemplate(pluginClass: number): PluginCodeTemplate | null {
  const key = Math.min(5, Math.max(1, pluginClass))
  return TEMPLATES[key] || null
}

/**
 * 获取模板展示名称，用于“已加载 XX 默认模板”
 */
export function getTemplateLabel(pluginClass: number): string {
  const name = PLUGIN_CLASS_NAMES[Math.min(5, Math.max(1, pluginClass))]
  return name ? `已加载 ${name} 默认模板` : ''
}

/**
 * 各类默认参数配置 JSON（可选，用于参数配置区初始化）
 */
export function getDefaultParamsJson(pluginClass: number): string {
  const key = Math.min(5, Math.max(1, pluginClass))
  const defaults: Record<number, string> = {
    1: `{
  "params": [
    { "key": "input_path", "label": "输入数据路径", "type": "string", "required": true, "defaultValue": "", "description": "上游数据路径" }
  ]
}`,
    2: `{
  "params": [
    { "key": "input_path", "label": "输入数据路径", "type": "string", "required": true, "defaultValue": "", "description": "上游数据路径" }
  ]
}`,
    3: `{
  "params": [
    { "key": "artifact_data", "label": "上游数据", "type": "string", "required": false, "defaultValue": "", "description": "artifacts 中的数据路径" }
  ]
}`,
    4: `{
  "params": [
    { "key": "n_trials", "label": "搜索次数", "type": "number", "required": false, "defaultValue": 10, "description": "HPO 试验次数" }
  ]
}`,
    5: `{
  "params": [
    { "key": "artifact_leaderboard", "label": "上游 leaderboard", "type": "string", "required": false, "defaultValue": "", "description": "artifacts 中的 leaderboard 路径" }
  ]
}`,
  }
  const raw = defaults[key] || '{"params": []}'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return '{\n  "params": []\n}'
  }
}
