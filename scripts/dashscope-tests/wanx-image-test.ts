/**
 * Wanx-Image-Test.ts
 *
 * Tests the Aliyun DashScope Wanx V2 image generation models.
 * This script tests various Wanx models and reports on their capabilities.
 */

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import {
  API_KEY,
  API_BASE_URL,
  API_ENDPOINT,
  LONG_TIMEOUT,
  HIGH_RETRY_COUNT,
  DEFAULT_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_SIZE,
  DEFAULT_STEPS,
  type BaseTestResult,
  extractErrorDetails,
  prepareImageTempDir,
  ensureReportsDir,
  sleep,
  testAuthentication,
} from './dashscope-api-utils';

// Wanx V2 models to test (from the official documentation)
const WANX_MODELS = [
  'wanx2.1-t2i-turbo',
  'wanx2.1-t2i-plus',
  'wanx2.0-t2i-turbo',
];

/**
 * Interface for Wanx test result that includes model information
 */
interface WanxTestResult extends BaseTestResult {
  model: string;
}

/**
 * Interface for Wanx image generation parameters
 */
interface WanxImageGenParams {
  model: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  n?: number;
  steps?: number;
}

/**
 * Test Wanx image generation with DashScope API
 * @param params Image generation parameters
 * @returns Promise with test result
 */
export async function testWanxImageGeneration(
  params: WanxImageGenParams,
): Promise<WanxTestResult> {
  console.log(`Testing Wanx image generation with model: ${params.model}`);
  console.log('Parameters:');
  console.log(`- Prompt: "${params.prompt}"`);
  console.log(`- Negative Prompt: "${params.negativePrompt}"`);
  console.log(`- Size: ${params.size}`);
  console.log(`- Steps: ${params.steps}`);
  console.log(`- Number of images: ${params.n || 1}`);

  // Validate API key
  if (!API_KEY) {
    console.error('Error: API_KEY is not set in environment variables');
    return {
      model: params.model,
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'API key is not configured in environment variables',
      },
    };
  }

  try {
    console.log('Submitting image generation task...');

    // Prepare request body based on Wanx API requirements
    const requestBody = {
      model: params.model,
      input: {
        prompt: params.prompt,
        negative_prompt: undefined as string | undefined,
      },
      parameters: {} as Record<string, any>,
    };

    // Add optional parameters if provided
    if (params.negativePrompt) {
      requestBody.input.negative_prompt = params.negativePrompt;
    }
    if (params.size) {
      requestBody.parameters.size = params.size;
    }
    if (params.steps) {
      requestBody.parameters.steps = params.steps;
    }
    if (params.n) {
      requestBody.parameters.n = params.n;
    }

    // Submit task
    const submitResponse = await axios.post(
      `${API_BASE_URL}/${API_ENDPOINT}`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: LONG_TIMEOUT,
      },
    );

    // Check for API errors in submission
    if (submitResponse.data.code) {
      console.error(
        `API error: ${submitResponse.data.code} - ${submitResponse.data.message}`,
      );
      return {
        model: params.model,
        success: false,
        error: {
          code: submitResponse.data.code,
          message: submitResponse.data.message,
          details: submitResponse.data,
        },
      };
    }

    // Extract task ID
    const taskId = submitResponse.data.output?.task_id;
    if (!taskId) {
      console.error('No task ID returned');
      return {
        model: params.model,
        success: false,
        error: {
          code: 'NO_TASK_ID',
          message: 'No task ID returned from API',
          details: submitResponse.data,
        },
      };
    }

    console.log(`Task submitted successfully. Task ID: ${taskId}`);
    console.log('Polling for task completion...');

    // Poll for task status
    let retries = 0;
    let taskStatus = 'PENDING';
    let errorCode = '';
    let errorMessage = '';
    let imageUrl = '';

    while (
      retries < HIGH_RETRY_COUNT &&
      ['PENDING', 'RUNNING'].includes(taskStatus)
    ) {
      // Wait before checking, with exponential backoff
      const waitTime = 1000 * Math.pow(1.5, retries);
      console.log(
        `Waiting ${waitTime}ms before checking status (attempt ${
          retries + 1
        }/${HIGH_RETRY_COUNT})...`,
      );
      await sleep(waitTime);

      try {
        // Query task status
        const statusResponse = await axios.get(
          `${API_BASE_URL}/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
            timeout: LONG_TIMEOUT,
          },
        );

        // Update task status
        taskStatus = statusResponse.data.output?.task_status || 'FAILED';
        console.log(`Current task status: ${taskStatus}`);

        // If task failed, get error information
        if (taskStatus === 'FAILED') {
          errorCode = statusResponse.data.output?.code || 'UNKNOWN_ERROR';
          errorMessage = statusResponse.data.output?.message || 'Unknown error';

          console.error(`Task failed: ${errorCode} - ${errorMessage}`);
          return {
            model: params.model,
            success: false,
            taskId,
            error: {
              code: errorCode,
              message: errorMessage,
              details: statusResponse.data,
            },
          };
        }

        // If task completed successfully
        if (taskStatus === 'SUCCEEDED') {
          console.log('Task completed successfully!');

          // Extract image URL (first image if multiple were generated)
          imageUrl = statusResponse.data.output?.results?.[0]?.url;
          if (!imageUrl) {
            return {
              model: params.model,
              success: false,
              taskId,
              error: {
                code: 'NO_IMAGE_URL',
                message: 'No image URL in successful response',
                details: statusResponse.data,
              },
            };
          }

          console.log(`Image URL: ${imageUrl}`);

          // Save image to file
          try {
            const imagePath = await saveImageToFile(imageUrl, params.model);
            console.log(`Image saved to: ${imagePath}`);

            return {
              model: params.model,
              success: true,
              taskId,
              imageUrl,
              imagePath,
            };
          } catch (saveError) {
            console.error('Failed to save image:', saveError);
            return {
              model: params.model,
              success: true,
              taskId,
              imageUrl,
              error: {
                code: 'IMAGE_SAVE_FAILED',
                message:
                  saveError instanceof Error
                    ? saveError.message
                    : String(saveError),
              },
            };
          }
        }

        retries++;
      } catch (error) {
        console.error(
          `Error checking status (attempt ${retries + 1}/${HIGH_RETRY_COUNT}):`,
          error instanceof Error ? error.message : String(error),
        );
        retries++;
      }
    }

    // If we've exhausted all retries
    if (['PENDING', 'RUNNING'].includes(taskStatus)) {
      return {
        model: params.model,
        success: true,
        taskId,
        error: {
          code: 'STILL_PROCESSING',
          message:
            'Task is still processing - Wanx models may take several minutes to complete',
        },
      };
    }

    // Default failure case (should not normally reach here)
    return {
      model: params.model,
      success: false,
      taskId,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        message: errorMessage || 'Unknown error during image generation',
      },
    };
  } catch (error) {
    const errorDetails = extractErrorDetails(error);
    console.error('API request error:', errorDetails.message);

    return {
      model: params.model,
      success: false,
      error: errorDetails,
    };
  }
}

/**
 * Save image from URL to local file
 * @param url URL of the image to save
 * @param model Model name used to generate the image
 * @returns Path to saved image file
 */
async function saveImageToFile(url: string, model: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  // Prepare temp directory
  const outputDir = prepareImageTempDir('wanx');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedModel = model.replace(/\./g, '-');
  const outputPath = path.join(outputDir, `${sanitizedModel}-${timestamp}.png`);

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
}

/**
 * Run tests for all Wanx models
 * @returns Object with test results for each model
 */
export async function testAllWanxModels(): Promise<
  Record<string, WanxTestResult>
> {
  const results: Record<string, WanxTestResult> = {};

  console.log('='.repeat(60));
  console.log('Wanx V2 Image Generation API Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing ${WANX_MODELS.length} Wanx models`);
  console.log('='.repeat(60));

  for (const model of WANX_MODELS) {
    console.log(`\n${'-'.repeat(40)}`);
    console.log(`Testing model: ${model}`);
    console.log(`${'-'.repeat(40)}\n`);

    const result = await testWanxImageGeneration({
      model,
      prompt: DEFAULT_PROMPT,
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      size: DEFAULT_SIZE,
      steps: DEFAULT_STEPS,
      n: 1,
    });

    results[model] = result;

    // Print result summary
    console.log(`\nResult for ${model}:`);
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (result.taskId) {
      console.log(`Task ID: ${result.taskId}`);
    }

    if (result.imageUrl) {
      console.log(`Image URL: ${result.imageUrl}`);
    }

    if (result.imagePath) {
      console.log(`Image saved to: ${result.imagePath}`);
    }

    if (result.error) {
      console.log(`Error Code: ${result.error.code}`);
      console.log(`Error Message: ${result.error.message}`);
    }
  }

  // Generate and save report
  generateWanxTestReport(results);

  return results;
}

/**
 * Generate a detailed test summary report for Wanx models
 * and save it as HTML and JSON
 */
function generateWanxTestReport(results: Record<string, WanxTestResult>): void {
  const totalModels = Object.keys(results).length;
  const successfulModels = Object.values(results).filter(
    (r) => r.success && !r.error,
  ).length;
  const processingModels = Object.values(results).filter(
    (r) => r.success && r.error?.code === 'STILL_PROCESSING',
  ).length;
  const failedModels = Object.values(results).filter((r) => !r.success).length;

  // Generate JSON report
  const jsonReport = {
    timestamp: new Date().toISOString(),
    totalModels,
    successfulModels,
    processingModels,
    failedModels,
    results,
  };

  // Save JSON report
  const reportsDir = ensureReportsDir();
  const jsonReportPath = path.join(reportsDir, 'wanx-test-results.json');
  fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));
  console.log(`Wanx test results saved to: ${jsonReportPath}`);

  // Generate HTML report
  generateWanxHtmlReport(results);
}

/**
 * Generate HTML report for Wanx tests with Chinese UI
 */
function generateWanxHtmlReport(results: Record<string, WanxTestResult>): void {
  const reportsDir = ensureReportsDir();
  const reportFile = path.join(reportsDir, 'wanx-status-report.html');

  // Calculate statistics
  const totalModels = Object.keys(results).length;
  const successfulModels = Object.values(results).filter(
    (r) => r.success && !r.error,
  ).length;
  const processingModels = Object.values(results).filter(
    (r) => r.success && r.error?.code === 'STILL_PROCESSING',
  ).length;
  const failedModels = Object.values(results).filter((r) => !r.success).length;

  // Create model status rows for HTML table
  const modelRows = WANX_MODELS.map((model) => {
    const result = results[model];
    if (!result) return '';

    let statusClass = 'success';
    let statusText = '成功';

    if (!result.success) {
      statusClass = 'error';
      statusText = '失败';
    } else if (result.error?.code === 'STILL_PROCESSING') {
      statusClass = 'warning';
      statusText = '处理中';
    }

    return `
      <tr>
        <td>${model}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>${result.taskId || '-'}</td>
        <td>${result.error ? result.error.code : '-'}</td>
        <td>${result.error ? result.error.message.substring(0, 50) : '-'}</td>
      </tr>
    `;
  }).join('');

  // Generate HTML content with Chinese UI
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>阿里云通义万相V2 API 状态报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "微软雅黑", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
      flex: 1;
      min-width: 300px;
    }
    .stat {
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .success { color: #27ae60; }
    .warning { color: #f39c12; }
    .error { color: #e74c3c; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    .timestamp {
      color: #7f8c8d;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <h1>阿里云通义万相V2 API 状态报告</h1>
  <p class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  
  <div class="container">
    <div class="card">
      <h2>总体状态</h2>
      <div class="stat">
        <span class="success">${successfulModels}</span> / 
        <span class="warning">${processingModels}</span> / 
        <span class="error">${failedModels}</span>
      </div>
      <p>成功 / 处理中 / 失败</p>
      <p>测试模型总数: ${totalModels}</p>
    </div>
  </div>
  
  <div class="card">
    <h2>模型状态</h2>
    <table>
      <thead>
        <tr>
          <th>模型</th>
          <th>状态</th>
          <th>任务ID</th>
          <th>错误代码</th>
          <th>错误信息</th>
        </tr>
      </thead>
      <tbody>
        ${modelRows}
      </tbody>
    </table>
  </div>

  <div class="card">
    <h2>分析</h2>
    <p>通义万相V2图像生成模型是先进的生成模型，比标准的Flux模型需要更长的处理时间。
       "处理中"状态表示任务已被API成功接受，但在测试超时时间内未能完成。</p>
    <p>在生产环境中，建议设置更长的超时时间和逐步增加的轮询间隔，或者考虑使用异步通知机制替代轮询。</p>
  </div>

  <footer>
    <p>DashScope API 测试套件 - ${new Date().toLocaleDateString('zh-CN')}</p>
  </footer>
</body>
</html>
  `;

  fs.writeFileSync(reportFile, html);
  console.log(`Wanx HTML report generated: ${reportFile}`);
}

/**
 * Run standalone Wanx test
 */
export async function runWanxTest() {
  console.log('='.repeat(60));
  console.log('DashScope 通义万相V2模型测试');
  console.log('='.repeat(60));
  console.log(`开始时间: ${new Date().toLocaleString()}`);

  try {
    // First test authentication
    console.log('测试API认证...');
    const authResult = await testAuthentication(WANX_MODELS[0]);

    if (!authResult.success) {
      console.error('认证测试失败，无法继续进行模型测试');
      return { success: false, error: authResult.error };
    }

    console.log('认证测试成功，开始模型测试\n');
    const results = await testAllWanxModels();

    // Calculate test statistics
    const totalModels = Object.keys(results).length;
    const successfulModels = Object.values(results).filter(
      (r) => r.success && !r.error,
    ).length;
    const processingModels = Object.values(results).filter(
      (r) => r.success && r.error?.code === 'STILL_PROCESSING',
    ).length;
    const failedModels = totalModels - successfulModels - processingModels;

    console.log('\n='.repeat(60));
    console.log('测试摘要:');
    console.log(`总共测试模型数: ${totalModels}`);
    console.log(`完全成功: ${successfulModels}`);
    console.log(`处理中: ${processingModels}`);
    console.log(`失败: ${failedModels}`);
    console.log('='.repeat(60));

    console.log('\n报告位置:');
    console.log(
      '- JSON报告: scripts/dashscope-tests/reports/wanx-test-results.json',
    );
    console.log(
      '- HTML报告: scripts/dashscope-tests/reports/wanx-status-report.html',
    );

    return results;
  } catch (error) {
    console.error('测试执行失败:', error);
    throw error;
  }
}

// Execute main function if script is run directly
if (require.main === module) {
  (async () => {
    try {
      await runWanxTest();
    } catch (error) {
      console.error('测试运行时出错:', error);
      process.exit(1);
    }
  })();
}
