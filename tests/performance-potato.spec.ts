import { test, expect } from '@playwright/test';

test.describe('Java Editor Performance Tests - Potato Mode', () => {
  test('measure page load + manual runs - potato mode (CPU throttled)', async ({ browser }) => {
    test.setTimeout(600000); // 10 minutes total timeout
    const pageLoadResults: number[] = [];
    const firstRunResults: number[] = [];
    const secondRunResults: number[] = [];
    
    console.log('\n🥔 POTATO MODE PERFORMANCE TESTS (10 iterations)');
    console.log('Simulating low-end Chromebook: 4x CPU throttling only');
    console.log('='.repeat(60));
    
    for (let i = 0; i < 10; i++) {
      console.log(`\nPotato Iteration ${i + 1}/10`);
      
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
      
      // 🥔 POTATO MODE: Apply CPU throttling only (no network throttling)
      // Simulate slower CPU (4x slowdown for reasonable but noticeable difference)
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      
      try {
        // === MEASUREMENT 1: Initial Page Load ===
        console.log('=== POTATO MEASURING: Initial Page Load ===');
        const pageLoadStart = performance.now();
        
        // Navigate to the app with the hello template
        await page.goto('/Java-Web-Editor/?file=hello');
        console.log('Potato page loaded, waiting for app to initialize and run...');
        
        // Wait for the editor to load first
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
        }, { timeout: 180000 }); // 3 minutes for potato auto-execution
        
        const pageLoadEnd = performance.now();
        const pageLoadTime = pageLoadEnd - pageLoadStart;
        pageLoadResults.push(pageLoadTime);
        console.log(`Potato page load completed in ${pageLoadTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === MEASUREMENT 2: First Manual Run ===
        console.log('=== POTATO MEASURING: First Manual Run ===');
        await page.waitForTimeout(2000); // Wait for things to settle
        
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
        }, { timeout: 180000 });
        
        const firstRunEnd = performance.now();
        const firstRunTime = firstRunEnd - firstRunStart;
        firstRunResults.push(firstRunTime);
        console.log(`Potato first manual run completed in ${firstRunTime.toFixed(2)}ms`);
        
        // Clear output for next test
        await page.evaluate(() => {
          const consoleEl = document.getElementById('console');
          const outputEl = document.getElementById('cheerpjDisplay');
          if (consoleEl) consoleEl.innerHTML = '';
          if (outputEl) outputEl.innerHTML = '';
        });
        
        // === MEASUREMENT 3: Second Manual Run ===
        console.log('=== POTATO MEASURING: Second Manual Run (with code change to force recompilation) ===');
        await page.waitForTimeout(2000); // Wait for things to settle
        
        // Make a small change to force recompilation (bypass cache)
        await page.evaluate(() => {
          const editor = document.querySelector('textarea.bg-amber-300') as HTMLTextAreaElement;
          if (editor) {
            editor.value = editor.value + '\n// test change';
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        await page.waitForTimeout(500); // Wait for change to register
        
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
        }, { timeout: 180000 });
        
        const secondRunEnd = performance.now();
        const secondRunTime = secondRunEnd - secondRunStart;
        secondRunResults.push(secondRunTime);
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
    
    // Calculate statistics for all measurements
    const pageLoadStats = calculateStats(pageLoadResults);
    const firstRunStats = calculateStats(firstRunResults);
    const secondRunStats = calculateStats(secondRunResults);
    
    // Display results in a nice table format
    console.log('\n' + '='.repeat(80));
    console.log('🥔 JAVA EDITOR PERFORMANCE TEST RESULTS - POTATO MODE');
    console.log('='.repeat(80));
    
    if (pageLoadStats || firstRunStats || secondRunStats) {
      console.log('\n📊 POTATO MODE PERFORMANCE SUMMARY TABLE');
      console.log('┌─────────────────────┬─────────────┬─────────────┬─────────────┐');
      console.log('│ Measurement Type    │🥔 Page Load │🥔 First Run │🥔 Second Run│');
      console.log('├─────────────────────┼─────────────┼─────────────┼─────────────┤');
      
      const pageLoadAvg = pageLoadStats ? `${pageLoadStats.average.toFixed(0)}ms` : 'N/A';
      const firstRunAvg = firstRunStats ? `${firstRunStats.average.toFixed(0)}ms` : 'N/A';
      const secondRunAvg = secondRunStats ? `${secondRunStats.average.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Average Time        │ ${pageLoadAvg.padEnd(11)} │ ${firstRunAvg.padEnd(11)} │ ${secondRunAvg.padEnd(11)} │`);
      
      const pageLoadMin = pageLoadStats ? `${pageLoadStats.min.toFixed(0)}ms` : 'N/A';
      const firstRunMin = firstRunStats ? `${firstRunStats.min.toFixed(0)}ms` : 'N/A';
      const secondRunMin = secondRunStats ? `${secondRunStats.min.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Minimum Time        │ ${pageLoadMin.padEnd(11)} │ ${firstRunMin.padEnd(11)} │ ${secondRunMin.padEnd(11)} │`);
      
      const pageLoadMax = pageLoadStats ? `${pageLoadStats.max.toFixed(0)}ms` : 'N/A';
      const firstRunMax = firstRunStats ? `${firstRunStats.max.toFixed(0)}ms` : 'N/A';
      const secondRunMax = secondRunStats ? `${secondRunStats.max.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Maximum Time        │ ${pageLoadMax.padEnd(11)} │ ${firstRunMax.padEnd(11)} │ ${secondRunMax.padEnd(11)} │`);
      
      const pageLoadMed = pageLoadStats ? `${pageLoadStats.median.toFixed(0)}ms` : 'N/A';
      const firstRunMed = firstRunStats ? `${firstRunStats.median.toFixed(0)}ms` : 'N/A';
      const secondRunMed = secondRunStats ? `${secondRunStats.median.toFixed(0)}ms` : 'N/A';
      
      console.log(`│ Median Time         │ ${pageLoadMed.padEnd(11)} │ ${firstRunMed.padEnd(11)} │ ${secondRunMed.padEnd(11)} │`);
      
      const pageLoadCount = pageLoadStats ? `${pageLoadStats.count}/10` : '0/10';
      const firstRunCount = firstRunStats ? `${firstRunStats.count}/10` : '0/10';
      const secondRunCount = secondRunStats ? `${secondRunStats.count}/10` : '0/10';
      
      console.log(`│ Successful Runs     │ ${pageLoadCount.padEnd(11)} │ ${firstRunCount.padEnd(11)} │ ${secondRunCount.padEnd(11)} │`);
      console.log('└─────────────────────┴─────────────┴─────────────┴─────────────┘');
      
      // Detailed results
      console.log('\n🥔 POTATO MODE DETAILED RESULTS:');
      if (pageLoadStats) {
        console.log(`📈 Potato Page Load Times: ${pageLoadResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (firstRunStats) {
        console.log(`🔄 Potato First Run Times: ${firstRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      if (secondRunStats) {
        console.log(`⚡ Potato Second Run Times: ${secondRunResults.map(t => t.toFixed(0) + 'ms').join(', ')}`);
      }
      
      console.log('\n' + '='.repeat(80));
      
      // Create assertion based on any successful results
      const totalSuccessfulRuns = (pageLoadStats?.count || 0) + (firstRunStats?.count || 0) + (secondRunStats?.count || 0);
      expect(totalSuccessfulRuns).toBeGreaterThan(0);
      
    } else {
      throw new Error('No successful test iterations completed');
    }
  });
});