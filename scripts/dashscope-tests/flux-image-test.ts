/**
 * Flux-Image-Test.ts
 *
 * Tests the Aliyun DashScope Flux image generation model API.
 * This script tests authentication and image generation capabilities.
 */

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';

import {
  API_KEY,
  API_BASE_URL,
  API_ENDPOINT,
  REQUEST_TIMEOUT,
  DEFAULT_PROMPT,
  DEFAULT_NEGATIVE_PROMPT,
  DEFAULT_SIZE,
  DEFAULT_STEPS,
  type BaseTestResult,
  type BaseImageGenParams,
  type BaseRequestBody,
  extractErrorDetails,
  prepareImageTempDir,
  ensureReportsDir,
  sleep,
  testAuthentication,
} from './dashscope-api-utils';

// Flux specific parameters
const FLUX_MODEL = 'flux-schnell';
const DEFAULT_RANDOM_SEED = 123456;

/**
 * Interface for Flux test parameters
 */
interface FluxImageGenParams extends BaseImageGenParams {
  seed?: number;
}

/**
 * Test image generation with DashScope Flux API
 * @param params Image generation parameters
 * @returns Promise with test result
 */
export async function testFluxImageGeneration(
  params: FluxImageGenParams,
): Promise<BaseTestResult> {
  console.log('Testing Flux image generation with DashScope API...');
  console.log('Parameters:');
  console.log(`- Prompt: "${params.prompt}"`);
  console.log(`- Negative Prompt: "${params.negativePrompt}"`);
  console.log(`- Size: ${params.size}`);
  console.log(`- Seed: ${params.seed}`);
  console.log(`- Steps: ${params.steps}`);
  console.log(`- Number of images: ${params.n || 1}`);

  // Validate API key
  if (!API_KEY) {
    console.error('Error: API_KEY is not set in environment variables');
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'API key is not configured in environment variables',
      },
    };
  }

  try {
    console.log('Submitting image generation task...');

    // Prepare request body
    const requestBody: BaseRequestBody = {
      model: FLUX_MODEL,
      input: {
        prompt: params.prompt,
        negative_prompt: undefined,
      },
      parameters: {},
    };

    // Add optional parameters if provided
    if (params.negativePrompt) {
      requestBody.input.negative_prompt = params.negativePrompt;
    }
    if (params.size) {
      requestBody.parameters.size = params.size;
    }
    if (params.seed) {
      requestBody.parameters.random_seed = params.seed;
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
        timeout: REQUEST_TIMEOUT,
      },
    );

    // Check for API errors in submission
    if (submitResponse.data.code) {
      console.error(
        `API error: ${submitResponse.data.code} - ${submitResponse.data.message}`,
      );
      return {
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

    // Use more retries similar to Wanx, since tasks take longer to complete
    const localRetryCount = 10;

    while (retries < localRetryCount && taskStatus !== 'SUCCEEDED') {
      // Wait before checking status
      const waitTime = 1000 * Math.pow(1.5, retries); // Exponential backoff
      console.log(
        `Waiting ${waitTime}ms before checking status (attempt ${
          retries + 1
        }/${localRetryCount})...`,
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
            timeout: REQUEST_TIMEOUT,
          },
        );

        // Update task status
        taskStatus = statusResponse.data.output?.task_status || 'FAILED';
        console.log(`Current task status: ${taskStatus}`);

        // If task failed
        if (taskStatus === 'FAILED') {
          errorCode = statusResponse.data.output?.code || 'UNKNOWN_ERROR';
          errorMessage = statusResponse.data.output?.message || 'Unknown error';

          console.error(`Task failed: ${errorCode} - ${errorMessage}`);
          return {
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
            const imagePath = await saveImageToFile(imageUrl);
            console.log(`Image saved to: ${imagePath}`);

            return {
              success: true,
              taskId,
              imageUrl,
              imagePath,
            };
          } catch (saveError) {
            console.error('Failed to save image:', saveError);
            return {
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
          `Error checking status (attempt ${retries + 1}/${localRetryCount}):`,
          error instanceof Error ? error.message : String(error),
        );
        retries++;
      }
    }

    // If task is still running after all retries
    if (taskStatus !== 'SUCCEEDED') {
      console.error('Task did not complete within the timeout period');
      return {
        success: false,
        taskId,
        error: {
          code: errorCode || 'UNKNOWN_ERROR',
          message: errorMessage || 'Unknown error during image generation',
        },
      };
    }

    // Default failure case (should not normally reach here)
    return {
      success: false,
      taskId,
      error: {
        code: errorCode || 'UNKNOWN_ERROR',
        message: errorMessage || 'Unknown error during image generation',
      },
    };
  } catch (error) {
    // Extract error details from Axios error
    const errorDetails = extractErrorDetails(error);
    console.error(`API request error: ${errorDetails.message}`);

    return {
      success: false,
      error: errorDetails,
    };
  }
}

/**
 * Save image from URL to local file
 * @param url URL of the image to save
 * @returns Path to saved image file
 */
async function saveImageToFile(url: string): Promise<string> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  // Prepare temp directory
  const outputDir = prepareImageTempDir('flux');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(outputDir, `image-${timestamp}.png`);

  fs.writeFileSync(outputPath, response.data);

  return outputPath;
}

/**
 * Save test results to JSON file and generate HTML report
 * @param authResult Authentication test result
 * @param imageGenResult Image generation test result
 */
export function saveFluxTestResult(
  authSuccess: boolean,
  imageGenSuccess: boolean,
  error?: BaseTestResult['error'],
): void {
  const reportsDir = ensureReportsDir();

  // Read existing results or create new array
  const resultsFile = path.join(reportsDir, 'flux-test-results.json');
  const results = fs.existsSync(resultsFile)
    ? JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))
    : [];

  // Add new result
  results.push({
    timestamp: new Date().toISOString(),
    authSuccess,
    imageGenSuccess,
    error,
  });

  // Only keep the last 100 results
  const trimmedResults = results.slice(-100);

  // Save updated results
  fs.writeFileSync(resultsFile, JSON.stringify(trimmedResults, null, 2));

  // Generate HTML report
  generateFluxHtmlReport(trimmedResults);

  console.log(`Flux test results saved to: ${resultsFile}`);
}

/**
 * Generate HTML report for Flux tests with Chinese UI
 */
function generateFluxHtmlReport(results: any[]): void {
  const reportsDir = ensureReportsDir();
  const reportFile = path.join(reportsDir, 'flux-status-report.html');

  // Calculate statistics
  const totalTests = results.length;
  const authSuccessCount = results.filter((r) => r.authSuccess).length;
  const imageGenSuccessCount = results.filter((r) => r.imageGenSuccess).length;
  const authSuccessRate =
    totalTests > 0 ? (authSuccessCount / totalTests) * 100 : 0;
  const imageGenSuccessRate =
    totalTests > 0 ? (imageGenSuccessCount / totalTests) * 100 : 0;

  // Get most common error codes
  const errorCodes = results
    .filter((r) => r.error?.code)
    .map((r) => r.error.code);

  const errorCounts: Record<string, number> = {};
  for (const code of errorCodes) {
    errorCounts[code] = (errorCounts[code] || 0) + 1;
  }

  const errorRows = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([code, count]) => `
      <tr>
        <td>${code}</td>
        <td>${count}</td>
        <td>${((count / totalTests) * 100).toFixed(1)}%</td>
      </tr>
    `,
    )
    .join('');

  // Generate HTML content with Chinese UI
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DashScope Flux API 状态报告</title>
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
    .status-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-icon {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-success { background-color: #27ae60; }
    .status-fail { background-color: #e74c3c; }
  </style>
</head>
<body>
  <h1>阿里云 DashScope Flux API 状态报告</h1>
  <p class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
  
  <div class="container">
    <div class="card">
      <h2>认证状态</h2>
      <div class="stat ${
        authSuccessRate > 80
          ? 'success'
          : authSuccessRate > 50
            ? 'warning'
            : 'error'
      }">
        ${authSuccessRate.toFixed(1)}% 成功率
      </div>
      <p>${authSuccessCount} 成功 / ${totalTests} 总测试次数</p>
    </div>
    
    <div class="card">
      <h2>图像生成状态</h2>
      <div class="stat ${
        imageGenSuccessRate > 80
          ? 'success'
          : imageGenSuccessRate > 50
            ? 'warning'
            : 'error'
      }">
        ${imageGenSuccessRate.toFixed(1)}% 成功率
      </div>
      <p>${imageGenSuccessCount} 成功 / ${totalTests} 总测试次数</p>
    </div>
  </div>
  
  <div class="card">
    <h2>近期错误分析</h2>
    ${
      errorRows
        ? `
        <table>
          <thead>
            <tr>
              <th>错误代码</th>
              <th>次数</th>
              <th>频率</th>
            </tr>
          </thead>
          <tbody>
            ${errorRows}
          </tbody>
        </table>
        `
        : '<p>最近的测试中没有记录到错误。</p>'
    }
  </div>
  
  <div class="card">
    <h2>近期测试结果</h2>
    <table>
      <thead>
        <tr>
          <th>时间</th>
          <th>认证</th>
          <th>图像生成</th>
          <th>错误信息</th>
        </tr>
      </thead>
      <tbody>
        ${results
          .slice()
          .reverse()
          .slice(0, 10)
          .map(
            (result) => `
          <tr>
            <td>${new Date(result.timestamp).toLocaleString('zh-CN')}</td>
            <td>
              <div class="status-row">
                <span class="status-icon ${
                  result.authSuccess ? 'status-success' : 'status-fail'
                }"></span>
                ${result.authSuccess ? '成功' : '失败'}
              </div>
            </td>
            <td>
              <div class="status-row">
                <span class="status-icon ${
                  result.imageGenSuccess ? 'status-success' : 'status-fail'
                }"></span>
                ${result.imageGenSuccess ? '成功' : '失败'}
              </div>
            </td>
            <td>${
              result.error
                ? `${result.error.code}: ${result.error.message.substring(
                    0,
                    50,
                  )}${result.error.message.length > 50 ? '...' : ''}`
                : '-'
            }</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  </div>

  <footer>
    <p>DashScope API 测试套件 - ${new Date().toLocaleDateString('zh-CN')}</p>
  </footer>
</body>
</html>
  `;

  fs.writeFileSync(reportFile, html);
  console.log(`Flux HTML report generated: ${reportFile}`);
}

/**
 * Run Flux tests (both authentication and image generation)
 */
export async function runFluxTest() {
  console.log('='.repeat(60));
  console.log('DashScope Flux API 测试');
  console.log('='.repeat(60));
  console.log(`开始时间: ${new Date().toLocaleString()}`);

  try {
    // Run authentication test
    console.log('\n运行认证测试...');
    const authResult = await testAuthentication(FLUX_MODEL);
    console.log(`认证测试结果: ${authResult.success ? '✅ 成功' : '❌ 失败'}`);

    // Run image generation test if authentication succeeded
    let imageGenResult: BaseTestResult = { success: false };
    if (authResult.success) {
      console.log('\n运行图像生成测试...');
      imageGenResult = await testFluxImageGeneration({
        prompt: DEFAULT_PROMPT,
        negativePrompt: DEFAULT_NEGATIVE_PROMPT,
        size: DEFAULT_SIZE,
        seed: DEFAULT_RANDOM_SEED,
        steps: DEFAULT_STEPS,
        n: 1,
      });
      console.log(
        `图像生成测试结果: ${imageGenResult.success ? '✅ 成功' : '❌ 失败'}`,
      );
    } else {
      console.log('由于认证失败，跳过图像生成测试');
    }

    // Save results to file and generate report
    saveFluxTestResult(
      authResult.success,
      imageGenResult.success,
      imageGenResult.error,
    );

    console.log('\n='.repeat(60));
    console.log('测试完成! 报告已生成:');
    console.log(
      '- JSON报告: scripts/dashscope-tests/reports/flux-test-results.json',
    );
    console.log(
      '- HTML报告: scripts/dashscope-tests/reports/flux-status-report.html',
    );

    return {
      authResult,
      imageGenResult,
    };
  } catch (error) {
    console.error('测试执行失败:', error);
    throw error;
  }
}

// Execute main function if script is run directly
if (require.main === module) {
  runFluxTest().catch((err) => {
    console.error('测试运行时出错:', err);
    process.exit(1);
  });
}
