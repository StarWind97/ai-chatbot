/**
 * DashScope API 测试运行器
 *
 * 运行DashScope API测试，包括Flux和通义万相V2图像生成模型测试。
 * 生成简单的测试结果摘要，验证模型可用性。
 *
 * 用法:
 * ```
 * # 运行所有测试
 * pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts
 *
 * # 仅测试Flux模型
 * pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts flux
 *
 * # 仅测试通义万相V2模型
 * pnpm tsx scripts/dashscope-tests/dashscope-test-runner.ts wanx
 * ```
 */

import fs from 'node:fs';
import path from 'node:path';
import { runFluxTest } from './flux-image-test';
import { runWanxTest } from './wanx-image-test';
import { prepareImageTempDir, ensureReportsDir } from './dashscope-api-utils';

// 测试结果接口
interface TestSummary {
  timestamp: string;
  fluxTest?: {
    authSuccess: boolean;
    imageGenSuccess: boolean;
    error?: {
      code: string;
      message: string;
    };
  };
  wanxTest?: {
    totalModels: number;
    successfulModels: number;
    processingModels: number;
    failedModels: number;
    models: Record<
      string,
      {
        success: boolean;
        error?: {
          code: string;
          message: string;
        };
      }
    >;
  };
}

/**
 * 生成综合测试报告
 */
function generateCombinedReport(summary: TestSummary): void {
  const reportsDir = ensureReportsDir();
  const reportFile = path.join(reportsDir, 'api-summary-report.txt');

  const fluxReport = summary.fluxTest
    ? `Flux 模型测试:
   认证: ${summary.fluxTest.authSuccess ? '✅ 成功' : '❌ 失败'}
   图像生成: ${summary.fluxTest.imageGenSuccess ? '✅ 成功' : '❌ 失败'}
   ${summary.fluxTest.error ? `错误: ${summary.fluxTest.error.code} - ${summary.fluxTest.error.message}` : ''}`
    : '未运行 Flux 模型测试';

  const wanxReport = summary.wanxTest
    ? `通义万相 V2 模型测试:
   测试模型总数: ${summary.wanxTest.totalModels}
   完全成功: ${summary.wanxTest.successfulModels}
   处理中: ${summary.wanxTest.processingModels}
   失败: ${summary.wanxTest.failedModels}
   
   各模型状态:
   ${Object.entries(summary.wanxTest.models)
     .map(
       ([model, result]) =>
         `   - ${model}: ${result.success ? '✅ 成功' : '❌ 失败'}${result.error ? ` (${result.error.code})` : ''}`,
     )
     .join('\n')}`
    : '未运行通义万相 V2 模型测试';

  const report = `
====================================================
DashScope API 测试摘要
====================================================
测试时间: ${new Date(summary.timestamp).toLocaleString('zh-CN')}

${fluxReport}

${wanxReport}

====================================================
测试结论: ${getTestConclusion(summary)}
====================================================
`;

  fs.writeFileSync(reportFile, report);
  console.log(`测试摘要已保存至: ${reportFile}`);

  // 打印测试结论
  console.log(`\n测试结论: ${getTestConclusion(summary)}`);
}

/**
 * 获取测试结论
 */
function getTestConclusion(summary: TestSummary): string {
  // Flux 测试结果
  const fluxSuccess = summary.fluxTest?.imageGenSuccess || false;

  // 通义万相测试结果 - 如果至少有一个模型成功，则认为测试成功
  const wanxSuccess = summary.wanxTest
    ? summary.wanxTest.successfulModels > 0 ||
      summary.wanxTest.processingModels > 0
    : false;

  if (fluxSuccess && wanxSuccess) {
    return '所有模型验证通过，API完全可用';
  } else if (fluxSuccess) {
    return 'Flux模型可用，通义万相模型不可用';
  } else if (wanxSuccess) {
    return '通义万相模型可用，Flux模型不可用';
  } else {
    return '所有模型验证失败，API不可用';
  }
}

/**
 * 主函数，运行测试并生成报告
 */
async function main() {
  console.log('='.repeat(80));
  console.log('DashScope API 测试');
  console.log('='.repeat(80));

  const args = process.argv.slice(2);
  const testType = args[0] || 'all'; // 默认运行所有测试

  // 创建临时目录
  prepareImageTempDir('flux');
  prepareImageTempDir('wanx');

  // 测试结果摘要
  const summary: TestSummary = {
    timestamp: new Date().toISOString(),
  };

  try {
    // 运行Flux测试
    if (testType === 'flux' || testType === 'all') {
      console.log('\n运行 Flux 图像生成测试...');
      const fluxResults = await runFluxTest();

      summary.fluxTest = {
        authSuccess: fluxResults.authResult.success,
        imageGenSuccess: fluxResults.imageGenResult.success,
        error: fluxResults.imageGenResult.error,
      };
    }

    // 运行通义万相测试
    if (testType === 'wanx' || testType === 'all') {
      console.log('\n运行 通义万相V2 模型测试...');
      const wanxResults = await runWanxTest();

      // 解析结果
      if (typeof wanxResults === 'object') {
        const modelResults = wanxResults as Record<string, any>;
        const modelCount = Object.keys(modelResults).length;
        let successCount = 0;
        let processingCount = 0;
        let failedCount = 0;
        const modelStatus: Record<string, any> = {};

        Object.entries(modelResults).forEach(([model, result]) => {
          modelStatus[model] = {
            success: result.success,
            error: result.error,
          };

          if (result.success && !result.error) {
            successCount++;
          } else if (
            result.success &&
            result.error?.code === 'STILL_PROCESSING'
          ) {
            processingCount++;
          } else {
            failedCount++;
          }
        });

        summary.wanxTest = {
          totalModels: modelCount,
          successfulModels: successCount,
          processingModels: processingCount,
          failedModels: failedCount,
          models: modelStatus,
        };
      }
    }

    if (testType !== 'flux' && testType !== 'wanx' && testType !== 'all') {
      console.error(`未知的测试类型: ${testType}`);
      console.log('有效的测试类型: flux, wanx, all');
      process.exit(1);
    }

    // 生成综合报告
    generateCombinedReport(summary);

    console.log('\n='.repeat(80));
    console.log('测试完成!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接执行此脚本，运行测试
if (require.main === module) {
  main().catch((error) => {
    console.error('执行测试失败:', error);
    process.exit(1);
  });
}
