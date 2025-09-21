import { test, expect } from '@playwright/test';

test.describe('Java Editor Performance Tests', () => {
  test('measure page load + manual runs - normal + potato mode', async ({ browser }) => {
    test.setTimeout(1200000); // 20 minutes total timeout
    const pageLoadResults: number[] = [];
    const firstRunResults: number[] = [];
    const secondRunResults: number[] = [];
    
    // Potato mode results (low-end device simulation)
    const potatoPageLoadResults: number[] = [];
    const potatoFirstRunResults: number[] = [];
    const potatoSecondRunResults: number[] = [];
    
    console.log('\n🖥️  STARTING NORMAL MODE TESTS (10 iterations)');
    console.log('='.repeat(60));
    
    for (let i = 0; i < 10; i++) {
      console.log(`\nIteration ${i + 1}/10`);
      
      // Create a new browser context for each iteration to ensure clean state
      const context = await browser.newContext({
        // Clear all browser data
        permissions: [],
      });
      
      // Clear storage and cache
      await context.clearCookies();
      await context.clearPermissions();
      
      const page = await context.newPage();
      
      // Clear browser cache via CDP (Chrome DevTools Protocol)
      const client = await context.newCDPSession(page);
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
      
      try {
        // === MEASUREMENT 1: Initial Page Load ===
        console.log('=== MEASURING: Initial Page Load ===');
        const pageLoadStart = performance.now();
        
        // Navigate to the app with the hello template
        await page.goto('/Java-Web-Editor/?file=hello');
        console.log('Page loaded, waiting for app to initialize and run...');
        
        // Wait for the editor to load first
        await page.waitForSelector('textarea.bg-amber-300', { timeout: 30000 });
        console.log('Editor loaded');
        
        // Wait for initial auto-execution output to appear
        console.log('Waiting for initial auto-execution output...');
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 120000 });
        
        const pageLoadEnd = performance.now();
        const pageLoadTime = pageLoadEnd - pageLoadStart;
        pageLoadResults.push(pageLoadTime);
        console.log(`Page load completed in ${pageLoadTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === MEASUREMENT 2: First Manual Run ===
        console.log('=== MEASURING: First Manual Run ===');
        await page.waitForTimeout(2000); // Wait for things to settle
        
        const firstRunStart = performance.now();
        await page.click('button:has-text("Run")');
        console.log('Clicked run button (first time)');
        
        // Wait for output from first manual run
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 120000 });
        
        const firstRunEnd = performance.now();
        const firstRunTime = firstRunEnd - firstRunStart;
        firstRunResults.push(firstRunTime);
        console.log(`First manual run completed in ${firstRunTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === MEASUREMENT 3: Second Manual Run ===
        console.log('=== MEASURING: Second Manual Run ===');
        await page.waitForTimeout(2000); // Wait for things to settle
        
        const secondRunStart = performance.now();
        await page.click('button:has-text("Run")');
        console.log('Clicked run button (second time)');
        
        // Wait for output from second manual run
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 120000 });
        
        const secondRunEnd = performance.now();
        const secondRunTime = secondRunEnd - secondRunStart;
        secondRunResults.push(secondRunTime);
        console.log(`Second manual run completed in ${secondRunTime.toFixed(2)}ms`);
        
        console.log(`Iteration ${i + 1} completed - Page Load: ${pageLoadTime.toFixed(2)}ms, First Run: ${firstRunTime.toFixed(2)}ms, Second Run: ${secondRunTime.toFixed(2)}ms`);
        
      } catch (error) {
        console.error(`Error in iteration ${i + 1}:`, error);
        // Continue with next iteration even if this one fails
      } finally {
        // Clean up
        await context.close();
      }
    }
    
    console.log('\n🥔 STARTING POTATO MODE TESTS (10 iterations)');
    console.log('Simulating low-end Chromebook: 1 CPU core, 4GB RAM, slow network');
    console.log('='.repeat(60));
    
    // Potato mode: simulate low-end device with CPU throttling and memory constraints
    for (let i = 0; i < 10; i++) {
      console.log(`\nPotato Iteration ${i + 1}/10`);
      
      // Create a new browser context for each iteration with potato constraints
      const context = await browser.newContext({
        // Clear all browser data
        permissions: [],
      });
      
      // Clear storage and cache
      await context.clearCookies();
      await context.clearPermissions();
      
      const page = await context.newPage();
      
      // Clear browser cache via CDP (Chrome DevTools Protocol)
      const client = await context.newCDPSession(page);
      await client.send('Network.clearBrowserCache');
      await client.send('Network.clearBrowserCookies');
      
      // 🥔 POTATO MODE: Apply severe performance constraints
      // Simulate slow CPU (6x slowdown = ~1 core vs 6 cores)
      await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      
      // Simulate slow 3G network (typical for rural/poor connections)
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps in bytes/sec
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps in bytes/sec
        latency: 150 // 150ms latency
      });
      
      try {
        // === POTATO MEASUREMENT 1: Initial Page Load ===
        console.log('=== POTATO MEASURING: Initial Page Load ===');
        const pageLoadStart = performance.now();
        
        // Navigate to the app with the hello template
        await page.goto('/Java-Web-Editor/?file=hello');
        console.log('Potato page loaded, waiting for app to initialize and run...');
        
        // Wait for the editor to load first (longer timeout for potato mode)
        await page.waitForSelector('textarea.bg-amber-300', { timeout: 60000 });
        console.log('Potato editor loaded');
        
        // Wait for initial auto-execution output to appear
        console.log('Waiting for potato initial auto-execution output...');
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 240000 }); // 4 minutes for potato auto-execution
        
        const pageLoadEnd = performance.now();
        const pageLoadTime = pageLoadEnd - pageLoadStart;
        potatoPageLoadResults.push(pageLoadTime);
        console.log(`Potato page load completed in ${pageLoadTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === POTATO MEASUREMENT 2: First Manual Run ===
        console.log('=== POTATO MEASURING: First Manual Run ===');
        await page.waitForTimeout(3000); // Wait longer for potato to settle
        
        const firstRunStart = performance.now();
        await page.click('button:has-text("Run")');
        console.log('Clicked potato run button (first time)');
        
        // Wait for output from first manual run
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 240000 });
        
        const firstRunEnd = performance.now();
        const firstRunTime = firstRunEnd - firstRunStart;
        potatoFirstRunResults.push(firstRunTime);
        console.log(`Potato first manual run completed in ${firstRunTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === POTATO MEASUREMENT 3: Second Manual Run ===
        console.log('=== POTATO MEASURING: Second Manual Run ===');
        await page.waitForTimeout(3000); // Wait longer for potato to settle
        
        const secondRunStart = performance.now();
        await page.click('button:has-text("Run")');
        console.log('Clicked potato run button (second time)');
        
        // Wait for output from second manual run
        await page.waitForFunction(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          
          const consoleHasContent = consoleEl && consoleEl.innerHTML && consoleEl.innerHTML.trim().length > 0;
          const outputHasContent = outputEl && outputEl.innerHTML && outputEl.innerHTML.trim().length > 0;
          
          return consoleHasContent || outputHasContent;
        }, { timeout: 240000 });
        
        const secondRunEnd = performance.now();
        const secondRunTime = secondRunEnd - secondRunStart;
        potatoSecondRunResults.push(secondRunTime);
        console.log(`Potato second manual run completed in ${secondRunTime.toFixed(2)}ms`);
        
        console.log(`Potato Iteration ${i + 1} completed - Page Load: ${pageLoadTime.toFixed(2)}ms, First Run: ${firstRunTime.toFixed(2)}ms, Second Run: ${secondRunTime.toFixed(2)}ms`);
        
      } catch (error) {
        console.error(`Error in potato iteration ${i + 1}:`, error);
        // Continue with next iteration even if this one fails
      } finally {
        // Clean up
        await context.close();
      }
    }
    
    // Helper function to calculate statistics
    function calculateStats(results: number[]) {
      if (results.length === 0) return null;
      const sortedResults = [...results].sort((a, b) => a - b);
      return {
        count: results.length,
        average: results.reduce((sum, time) => sum + time, 0) / results.length,
        min: Math.min(...results),
        max: Math.max(...results),
        median: sortedResults[Math.floor(sortedResults.length / 2)]
      };
    }
    
    // Calculate statistics for all measurements (normal + potato mode)
    const pageLoadStats = calculateStats(pageLoadResults);
    const firstRunStats = calculateStats(firstRunResults);
    const secondRunStats = calculateStats(secondRunResults);
    const potatoPageLoadStats = calculateStats(potatoPageLoadResults);
    const potatoFirstRunStats = calculateStats(potatoFirstRunResults);
    const potatoSecondRunStats = calculateStats(potatoSecondRunResults);
    
    // Display results in a nice table format
    console.log('\n' + '='.repeat(120));
    console.log('🚀 JAVA EDITOR PERFORMANCE TEST RESULTS - NORMAL vs POTATO MODE');
    console.log('='.repeat(120));
    
    if (pageLoadStats || firstRunStats || secondRunStats || potatoPageLoadStats || potatoFirstRunStats || potatoSecondRunStats) {
      console.log('\n📊 PERFORMANCE SUMMARY TABLE');
      console.log('┌─────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
      console.log('│ Measurement Type    │ Page Load   │ First Run   │ Second Run  │🥔 Page Load │🥔 First Run │🥔 Second Run│');
      console.log('├─────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');
      
      const pageLoadAvg = pageLoadStats ? `${pageLoadStats.average.toFixed(0)}ms` : 'N/A';
      const firstRunAvg = firstRunStats ? `${firstRunStats.average.toFixed(0)}ms` : 'N/A';
      const secondRunAvg = secondRunStats ? `${secondRunStats.average.toFixed(0)}ms` : 'N/A';
      const potatoPageLoadAvg = potatoPageLoadStats ? `${potatoPageLoadStats.average.toFixed(0)}ms` : 'N/A';
      const potatoFirstRunAvg = potatoFirstRunStats ? `${potatoFirstRunStats.average.toFixed(0)}ms` : 'N/A';
      const potatoSecondRunAvg = potatoSecondRunStats ? `${potatoSecondRunStats.average.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Average Time        │ ${pageLoadAvg.padEnd(11)} │ ${firstRunAvg.padEnd(11)} │ ${secondRunAvg.padEnd(11)} │ ${potatoPageLoadAvg.padEnd(11)} │ ${potatoFirstRunAvg.padEnd(11)} │ ${potatoSecondRunAvg.padEnd(11)} │`);
      
      const pageLoadMin = pageLoadStats ? `${pageLoadStats.min.toFixed(0)}ms` : 'N/A';
      const firstRunMin = firstRunStats ? `${firstRunStats.min.toFixed(0)}ms` : 'N/A';
      const secondRunMin = secondRunStats ? `${secondRunStats.min.toFixed(0)}ms` : 'N/A';
      const potatoPageLoadMin = potatoPageLoadStats ? `${potatoPageLoadStats.min.toFixed(0)}ms` : 'N/A';
      const potatoFirstRunMin = potatoFirstRunStats ? `${potatoFirstRunStats.min.toFixed(0)}ms` : 'N/A';
      const potatoSecondRunMin = potatoSecondRunStats ? `${potatoSecondRunStats.min.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Minimum Time        │ ${pageLoadMin.padEnd(11)} │ ${firstRunMin.padEnd(11)} │ ${secondRunMin.padEnd(11)} │ ${potatoPageLoadMin.padEnd(11)} │ ${potatoFirstRunMin.padEnd(11)} │ ${potatoSecondRunMin.padEnd(11)} │`);
      
      const pageLoadMax = pageLoadStats ? `${pageLoadStats.max.toFixed(0)}ms` : 'N/A';
      const firstRunMax = firstRunStats ? `${firstRunStats.max.toFixed(0)}ms` : 'N/A';
      const secondRunMax = secondRunStats ? `${secondRunStats.max.toFixed(0)}ms` : 'N/A';
      const potatoPageLoadMax = potatoPageLoadStats ? `${potatoPageLoadStats.max.toFixed(0)}ms` : 'N/A';
      const potatoFirstRunMax = potatoFirstRunStats ? `${potatoFirstRunStats.max.toFixed(0)}ms` : 'N/A';
      const potatoSecondRunMax = potatoSecondRunStats ? `${potatoSecondRunStats.max.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Maximum Time        │ ${pageLoadMax.padEnd(11)} │ ${firstRunMax.padEnd(11)} │ ${secondRunMax.padEnd(11)} │ ${potatoPageLoadMax.padEnd(11)} │ ${potatoFirstRunMax.padEnd(11)} │ ${potatoSecondRunMax.padEnd(11)} │`);
      
      const pageLoadMed = pageLoadStats ? `${pageLoadStats.median.toFixed(0)}ms` : 'N/A';
      const firstRunMed = firstRunStats ? `${firstRunStats.median.toFixed(0)}ms` : 'N/A';
      const secondRunMed = secondRunStats ? `${secondRunStats.median.toFixed(0)}ms` : 'N/A';
      const potatoPageLoadMed = potatoPageLoadStats ? `${potatoPageLoadStats.median.toFixed(0)}ms` : 'N/A';
      const potatoFirstRunMed = potatoFirstRunStats ? `${potatoFirstRunStats.median.toFixed(0)}ms` : 'N/A';
      const potatoSecondRunMed = potatoSecondRunStats ? `${potatoSecondRunStats.median.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Median Time         │ ${pageLoadMed.padEnd(11)} │ ${firstRunMed.padEnd(11)} │ ${secondRunMed.padEnd(11)} │ ${potatoPageLoadMed.padEnd(11)} │ ${potatoFirstRunMed.padEnd(11)} │ ${potatoSecondRunMed.padEnd(11)} │`);
      
      const pageLoadCount = pageLoadStats ? `${pageLoadStats.count}/10` : '0/10';
      const firstRunCount = firstRunStats ? `${firstRunStats.count}/10` : '0/10';
      const secondRunCount = secondRunStats ? `${secondRunStats.count}/10` : '0/10';
      const potatoPageLoadCount = potatoPageLoadStats ? `${potatoPageLoadStats.count}/10` : '0/10';
      const potatoFirstRunCount = potatoFirstRunStats ? `${potatoFirstRunStats.count}/10` : '0/10';
      const potatoSecondRunCount = potatoSecondRunStats ? `${potatoSecondRunStats.count}/10` : '0/10';
      
      console.log(`│ Successful Runs     │ ${pageLoadCount.padEnd(11)} │ ${firstRunCount.padEnd(11)} │ ${secondRunCount.padEnd(11)} │ ${potatoPageLoadCount.padEnd(11)} │ ${potatoFirstRunCount.padEnd(11)} │ ${potatoSecondRunCount.padEnd(11)} │`);
      console.log('└─────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');
      
      // Detailed results
      console.log('\n🖥️  NORMAL MODE DETAILED RESULTS:');
      if (pageLoadStats) {
        console.log(`📈 Page Load Times: ${pageLoadResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (firstRunStats) {
        console.log(`🔄 First Run Times: ${firstRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (secondRunStats) {
        console.log(`⚡ Second Run Times: ${secondRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      
      console.log('\n🥔 POTATO MODE DETAILED RESULTS:');
      if (potatoPageLoadStats) {
        console.log(`📈 Potato Page Load Times: ${potatoPageLoadResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (potatoFirstRunStats) {
        console.log(`🔄 Potato First Run Times: ${potatoFirstRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (potatoSecondRunStats) {
        console.log(`⚡ Potato Second Run Times: ${potatoSecondRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      
      // Performance comparison insights
      if (pageLoadStats && potatoPageLoadStats) {
        const slowdownFactor = potatoPageLoadStats.average / pageLoadStats.average;
        console.log(`\n📊 PERFORMANCE INSIGHTS:`);
        console.log(`🥔 Potato mode is ${slowdownFactor.toFixed(1)}x slower on average for page load`);
      }
      
      console.log('\n' + '='.repeat(120));
      
      // Create assertion based on any successful results
      const normalSuccessfulRuns = (pageLoadStats?.count || 0) + (firstRunStats?.count || 0) + (secondRunStats?.count || 0);
      const potatoSuccessfulRuns = (potatoPageLoadStats?.count || 0) + (potatoFirstRunStats?.count || 0) + (potatoSecondRunStats?.count || 0);
      const totalSuccessfulRuns = normalSuccessfulRuns + potatoSuccessfulRuns;
      expect(totalSuccessfulRuns).toBeGreaterThan(0);
      
    } else {
      throw new Error('No successful test iterations completed');
    }
  });
});