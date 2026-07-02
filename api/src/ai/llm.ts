import fetch from 'node-fetch';
import { createInterface } from 'readline';
import { SystemConfigDAO } from '../db/dao.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning?: string | null;
}

interface LLMConfig {
  apiBaseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  enableDeepThinking?: boolean;
}

const defaultConfig: LLMConfig = {
  apiBaseUrl: 'http://localhost:11434/v1',
  model: 'qwen3.6:35b-a3b-q8_0',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 4096,
};

function getConfig(): LLMConfig {
  const dbConfigs = SystemConfigDAO.getAllConfigs();
  
  return {
    apiBaseUrl: dbConfigs['llm.apiBaseUrl'] || defaultConfig.apiBaseUrl,
    model: dbConfigs['llm.model'] || defaultConfig.model,
    apiKey: dbConfigs['llm.apiKey'] || defaultConfig.apiKey,
    temperature: parseFloat(dbConfigs['llm.temperature'] || String(defaultConfig.temperature)),
    maxTokens: parseInt(dbConfigs['llm.maxTokens'] || String(defaultConfig.maxTokens)),
    enableDeepThinking: dbConfigs['llm.enableDeepThinking'] === 'true',
  };
}

export interface StreamChunk {
  content: string;
  reasoning?: string;
  done: boolean;
}

export async function chatWithLLM(
  messages: ChatMessage[],
  stream: boolean = false,
  systemPrompt?: string,
  enableDeepThinking?: boolean
): Promise<{ content: string; reasoning?: string } | AsyncGenerator<StreamChunk>> {
  const config = getConfig();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const requestMessages: ChatMessage[] = [];
  
  if (systemPrompt) {
    requestMessages.push({ role: 'system', content: systemPrompt });
  }
  
  requestMessages.push(...messages);

  const baseUrl = config.apiBaseUrl.replace('/v1', '');
  
  const body: Record<string, any> = {
    model: config.model,
    messages: requestMessages,
    stream,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  };

  const shouldThink = enableDeepThinking ?? config.enableDeepThinking;
  if (shouldThink) {
    body.think = shouldThink;
  }

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} ${errorText}`);
  }

  if (stream) {
    return streamResponse(response);
  }

  const json = (await response.json()) as { message: { content: string; thinking?: string } };
  return {
    content: json.message?.content || '',
    reasoning: json.message?.thinking,
  };
}

async function* streamResponse(response: any): AsyncGenerator<StreamChunk> {
  const decoder = new TextDecoder();
  let buffer = '';

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      yield* parseBuffer(buffer);
      buffer = buffer.slice(buffer.lastIndexOf('\n') + 1);
    }
  } else if (response.body?.on) {
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      yield* parseBuffer(buffer);
      buffer = buffer.slice(buffer.lastIndexOf('\n') + 1);
    }
  } else {
    throw new Error('Response body is not readable');
  }

  if (buffer) {
    yield* parseBuffer(buffer);
  }
}

function* parseBuffer(buffer: string): Generator<StreamChunk> {
  const lines = buffer.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    let data = trimmedLine;
    if (trimmedLine.startsWith('data: ')) {
      data = trimmedLine.slice(6);
    }
    
    if (data === '[DONE]') {
      yield { content: '', reasoning: '', done: true };
      return;
    }
    
    try {
      const json = JSON.parse(data) as { message?: { content?: string; thinking?: string }; done?: boolean };
      
      if (json.message) {
        yield {
          content: json.message?.content || '',
          reasoning: json.message?.thinking,
          done: json.done === true,
        };
      }
    } catch {
      continue;
    }
  }
}

export async function checkLLMStatus(config?: LLMConfig): Promise<{
  online: boolean;
  model?: string;
  error?: string;
  availableModels?: string[];
  modelDownloaded?: boolean;
  modelLoaded?: boolean;
  status?: 'connected' | 'model_not_found' | 'model_not_loaded' | 'model_error' | 'service_error' | 'connection_refused' | 'error';
  message?: string;
}> {
  const currentConfig = config || getConfig();

  try {
    const baseUrlNoV1 = currentConfig.apiBaseUrl.replace('/v1', '');

    const modelListResponse = await fetch(`${baseUrlNoV1}/api/tags`);
    if (!modelListResponse.ok) {
      return {
        online: false,
        error: '无法连接到服务',
        modelDownloaded: false,
        modelLoaded: false,
        status: 'connection_refused',
        message: '❌ 无法连接到服务，请确认服务地址正确且Ollama正在运行'
      };
    }

    const modelData = (await modelListResponse.json()) as { models?: Array<{ name: string }> };
    const availableModels = (modelData.models || []).map((m) => m.name);
    const modelDownloaded = availableModels.includes(currentConfig.model);

    if (!modelDownloaded) {
      return {
        online: true,
        model: currentConfig.model,
        availableModels,
        modelDownloaded: false,
        modelLoaded: false,
        status: 'model_not_found',
        message: `❌ 模型 '${currentConfig.model}' 未下载。可用模型: ${availableModels.join(', ') || '无'}`
      };
    }

    let modelLoaded = false;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 1500);
      });

      const chatResponse = await Promise.race([
        fetch(`${baseUrlNoV1}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: currentConfig.model,
            messages: [{ role: 'user', content: 'hi' }],
            stream: false,
            options: {
              num_ctx: 128,
              num_predict: 1,
              keep_alive: -1,
            },
          }),
        }),
        timeoutPromise,
      ]);

      if (chatResponse.ok) {
        modelLoaded = true;
      } else {
        try {
          const errorData = (await chatResponse.json()) as { error?: string };
          if (errorData.error?.includes('not loaded')) {
            modelLoaded = false;
          } else if (errorData.error?.includes('model')) {
            modelLoaded = false;
          } else {
            modelLoaded = true;
          }
        } catch {
          modelLoaded = false;
        }
      }
    } catch {
      modelLoaded = false;
    }

    return {
      online: true,
      model: currentConfig.model,
      availableModels,
      modelDownloaded: true,
      modelLoaded,
      status: modelLoaded ? 'connected' : 'model_not_loaded',
      message: modelLoaded
        ? `✅ 服务在线，模型 '${currentConfig.model}' 已就绪`
        : `⚠️ 服务在线，模型 '${currentConfig.model}' 已下载但未加载，请点击"启动模型"`
    };
  } catch (error: any) {
    return {
      online: false,
      error: error.message,
      modelDownloaded: false,
      modelLoaded: false,
      status: 'connection_refused',
      message: '❌ 无法连接到服务，请确认服务地址正确且Ollama正在运行'
    };
  }
}

export async function ensureModelLoaded(config?: LLMConfig): Promise<{ success: boolean; error?: string }> {
  const currentConfig = config || getConfig();

  try {
    const baseUrl = currentConfig.apiBaseUrl.replace('/v1', '');
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: currentConfig.model,
        prompt: 'hello',
        stream: false,
        options: {
          num_ctx: 128,
          num_predict: 1,
          keep_alive: -1,
        },
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return { success: false, error: errorText || `HTTP ${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function pullModel(modelName: string, apiBaseUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return { success: false, error: errorText || `HTTP ${response.status}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface ToolCall {
  name: string;
  arguments: Record<string, any>;
}

function findJsonInText(content: string): string | null {
  const jsonBlocks: string[] = [];
  let depth = 0;
  let start = -1;
  
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (content[i] === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        jsonBlocks.push(content.substring(start, i + 1));
        start = -1;
      }
    }
  }
  
  if (jsonBlocks.length > 0) {
    return jsonBlocks[jsonBlocks.length - 1];
  }
  
  return null;
}

function parseFunctionCall(content: string): ToolCall | null {
  const functionCallRegex = /(execute_policy_collection|execute_weather_query|execute_emergency_plan|read_downloaded_file)\s*\(\s*([^)]*)\s*\)/;
  const match = content.match(functionCallRegex);
  
  if (!match) {
    return null;
  }
  
  const toolName = match[1];
  const argsStr = match[2];
  
  const args: Record<string, any> = {} as Record<string, any>;
  const argPairs = argsStr.split(/,\s*/);
  
  for (const pair of argPairs) {
    if (!pair.trim()) continue;
    
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value !== undefined) {
      let parsedValue: any = value;
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        parsedValue = value.slice(1, -1);
      } else if (!isNaN(Number(value))) {
        parsedValue = Number(value);
      } else if (value.toLowerCase() === 'true') {
        parsedValue = true;
      } else if (value.toLowerCase() === 'false') {
        parsedValue = false;
      }
      
      args[key] = parsedValue;
    }
  }
  
  return {
    name: toolName,
    arguments: args,
  };
}

function parseBracketToolCall(content: string): ToolCall | null {
  const bracketRegex = /\[调用工具\]\s*(execute_policy_collection|execute_weather_query|execute_emergency_plan|read_downloaded_file)/;
  const toolNameMatch = content.match(bracketRegex);
  
  if (!toolNameMatch) {
    return null;
  }
  
  const toolName = toolNameMatch[1];
  const args: Record<string, any> = {} as Record<string, any>;
  
  const paramLines = content.split('\n').filter(line => line.trim().startsWith('- '));
  
  for (const line of paramLines) {
    const trimmed = line.trim().substring(2);
    const colonIndex = trimmed.indexOf(':');
    
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const valueStr = trimmed.substring(colonIndex + 1).trim();
      
      let value: any = valueStr;
      
      if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
        value = valueStr.slice(1, -1);
      } else if (!isNaN(Number(valueStr))) {
        value = Number(valueStr);
      } else if (valueStr.toLowerCase() === 'true') {
        value = true;
      } else if (valueStr.toLowerCase() === 'false') {
        value = false;
      }
      
      if (!args[key]) {
        args[key] = value;
      }
    }
  }
  
  return {
    name: toolName,
    arguments: args,
  };
}

export function parseToolCall(content: string): ToolCall | null {
  try {
    const trimmedContent = content.trim();
    
    const bracketCall = parseBracketToolCall(trimmedContent);
    if (bracketCall) {
      return bracketCall;
    }
    
    const functionCall = parseFunctionCall(trimmedContent);
    if (functionCall) {
      return functionCall;
    }
    
    let jsonString: string | null = null;
    
    const jsonMatch = trimmedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    } else if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      jsonString = trimmedContent;
    } else {
      jsonString = findJsonInText(trimmedContent);
    }
    
    if (!jsonString) {
      return null;
    }
    
    const json = JSON.parse(jsonString);
    
    if (json.name && json.arguments) {
      return {
        name: json.name,
        arguments: json.arguments,
      };
    }
    
    if (json.tool_code && json.params) {
      return {
        name: json.tool_code,
        arguments: json.params,
      };
    }
    
    if (json.tool_code && json.arguments) {
      return {
        name: json.tool_code,
        arguments: json.arguments,
      };
    }
    
    if (json.skillId || json.keyword || json.category || json.url) {
      const toolNameMatch = trimmedContent.match(/execute_policy_collection|execute_weather_query|execute_emergency_plan|read_downloaded_file/);
      const toolName = toolNameMatch ? toolNameMatch[0] : 'execute_policy_collection';
      return {
        name: toolName,
        arguments: json,
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

const toolCallInstruction = `

## 工具调用规则

当你需要调用技能工具时，**必须**按照以下格式输出，不能使用其他格式：

\`\`\`json
{
  "tool_code": "工具名称",
  "params": {
    "参数名": "参数值"
  }
}
\`\`\`

可用工具列表：
1. **execute_policy_collection** - 搜索应急政策文件
   - 参数：skillId(必填，值为"policy-collection"), keyword(可选，搜索关键词), category(可选，分类), url(可选，网址)
   
2. **read_downloaded_file** - 读取下载的文件内容
   - 参数：skillId(必填，值为"policy-collection"), filePath(必填，文件路径)

3. **execute_weather_query** - 查询天气信息
   - 参数：skillId(必填，值为"weather"), city(必填，城市名)

4. **execute_emergency_plan** - 执行应急预案
   - 参数：skillId(必填，值为"emergency"), planId(可选，预案ID)

**注意事项：**
- 调用工具时，只输出JSON代码块，不要输出任何其他解释性文字
- 参数值必须用双引号括起来
- 确保JSON格式正确，没有语法错误
- 如果不需要调用工具，直接回答用户问题即可`;

export function getSystemPrompt(scenario: string): string {
  const prompts: Record<string, string> = {
    general: `你是一个智能应急管理助手，专门为应急管理领域提供专业的智能问答服务。

你的任务是：
1. 回答用户关于应急管理的各类问题
2. 提供专业的应急知识和建议
3. 帮助用户理解和应对各种突发事件
4. 根据知识库内容提供准确的信息

请用简洁、专业、易懂的语言回答问题。` + toolCallInstruction,

    qna: `你是一个智能应急问答助手，专门回答应急管理相关的问题。

请遵循以下原则：
1. 针对用户的问题提供专业、准确的应急知识
2. 回答要简洁明了，重点突出
3. 如果涉及具体的应急预案，请说明适用场景
4. 对于安全操作建议，务必强调注意事项

回答格式：
- 问题分析：简要说明问题的核心
- 解决方案：提供具体的应对措施
- 注意事项：提醒关键的安全要点` + toolCallInstruction,

    data_query: `你是一个智能应急数据分析助手，擅长处理和分析应急管理数据。

请遵循以下原则：
1. 帮助用户理解各类应急数据的含义
2. 提供数据趋势分析和预测
3. 识别潜在的风险和异常情况
4. 给出数据驱动的决策建议

回答格式：
- 数据概览：提供关键指标的统计信息
- 趋势分析：分析数据的变化趋势
- 风险预警：识别潜在风险
- 建议措施：基于数据提出改进建议` + toolCallInstruction,

    dispatch: `你是一个智能应急调度助手，负责协助应急资源的调度和分配。

请遵循以下原则：
1. 根据事件类型和级别，推荐合适的资源配置
2. 优化资源调度方案，提高响应效率
3. 考虑资源的可用性和地理位置
4. 协调多部门、多单位的协同工作

回答格式：
- 需求评估：分析事件的资源需求
- 资源配置：推荐资源种类和数量
- 调度方案：制定资源调配计划
- 协同建议：协调多方力量` + toolCallInstruction,

    report: `你是一个智能应急报告助手，负责生成各类应急报告。

请遵循以下原则：
1. 根据事件信息生成规范的报告
2. 报告结构清晰，内容详实
3. 包含关键信息：时间、地点、人员、措施、进展等
4. 语言专业、正式

报告模板：
【事件概述】
【基本信息】
【处置措施】
【进展情况】
【存在问题】
【下一步计划】` + toolCallInstruction,
  };

  return prompts[scenario] || prompts.general;
}

export function getDefaultConfig(): LLMConfig {
  return defaultConfig;
}

export { getConfig as llmConfig };
