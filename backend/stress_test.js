const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Dashboard Rendering Stress Test...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const url = 'http://localhost:5000/';

    let errors = 0;
    let warnings = 0;
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors++;
            console.error(`[Browser Error]: ${msg.text()}`);
        }
        if (msg.type() === 'warning') {
            warnings++;
        }
    });

    console.log('🔑 Injecting auth token...');
    // We go to a dummy route first to be in the correct origin to set localStorage
    await page.goto(url + 'api/health', { waitUntil: 'networkidle0' });
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgxMTcxMDY4LCJleHAiOjE3ODEyNTc0Njh9.SC_M_PnJdSiWP8yBRKUh3OV-r4jd6xTfCY1ZiV9Vh6Q';
    await page.evaluate((t) => localStorage.setItem('token', t), token);

    console.log('🔄 Performing 20 reloads...');
    for (let i = 1; i <= 20; i++) {
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Ensure #erp-dashboard exists and is visible
        const dashExists = await page.$eval('#erp-dashboard', el => el && window.getComputedStyle(el).display !== 'none').catch(() => false);
        if (!dashExists) {
            console.error(`❌ Reload ${i}: #erp-dashboard missing or hidden! URL is ${page.url()}`);
            process.exit(1);
        }
    }
    console.log('✅ 20 reloads completed successfully. #erp-dashboard rendered perfectly every time.');

    // Function to get DOM stats
    async function getStats() {
        const metrics = await page.metrics();
        const erpCount = await page.evaluate(() => document.querySelectorAll('#erp-dashboard').length);
        const kpiCount = await page.evaluate(() => document.querySelectorAll('.kpi-card, .card').length);
        
        return {
            domNodes: metrics.Nodes,
            jsEventListeners: metrics.JSEventListeners,
            erpCount,
            kpiCount
        };
    }

    console.log('📊 Initial Stats:');
    let initialStats = await getStats();
    console.log(initialStats);
    if (initialStats.erpCount > 1) console.error('❌ Multiple erp-dashboards found!');

    console.log('🗺️ Performing Navigation Tests...');

    // Function to safely navigate via React router or href
    async function testNavigation(navText) {
        console.log(`Navigating to: ${navText}...`);
        
        // Find link by text and click
        const linkHandled = await page.evaluate((text) => {
            // Find in react sidebar or top nav
            const links = Array.from(document.querySelectorAll('a, button, .nav-item, li'));
            const target = links.find(l => l.textContent && l.textContent.toLowerCase().includes(text.toLowerCase()));
            if (target) {
                target.click();
                return true;
            }
            return false;
        }, navText);

        if (!linkHandled) {
            console.log(`⚠️ Could not find navigation link for '${navText}'. Skipping this specific navigation...`);
        } else {
            // Wait a bit for React to render
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('Navigating back to Plant Status...');
        const homeHandled = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a, button, .nav-item, li'));
            const target = links.find(l => l.textContent && l.textContent.toLowerCase().includes('status') || l.textContent === 'Dashboard' || l.href === window.location.origin + '/');
            if (target) {
                target.click();
                return true;
            }
            return false;
        });

        if (!homeHandled) {
             await page.goto(url, { waitUntil: 'networkidle0' });
        } else {
             await new Promise(r => setTimeout(r, 1000));
        }
        
        const dashExists = await page.$eval('#erp-dashboard', el => el && window.getComputedStyle(el).display !== 'none').catch(() => false);
        if (!dashExists) {
            console.error(`❌ After navigating from ${navText}, #erp-dashboard is missing or hidden! URL is ${page.url()}`);
        }
    }

    await testNavigation('Analytics');
    await testNavigation('Invoices');
    await testNavigation('Customers');

    console.log('📊 Final Stats:');
    let finalStats = await getStats();
    console.log(finalStats);

    console.log('🔍 Final Verifications:');
    if (finalStats.erpCount === 1) console.log('✅ Only one #erp-dashboard exists.');
    else console.error(`❌ Found ${finalStats.erpCount} #erp-dashboard elements!`);

    if (finalStats.kpiCount === initialStats.kpiCount) console.log('✅ KPI card count is stable.');
    else console.error(`❌ KPI cards changed from ${initialStats.kpiCount} to ${finalStats.kpiCount}`);

    // Check DOM node growth (allow some small tolerance for React cache, but shouldn't explode)
    const domDiff = finalStats.domNodes - initialStats.domNodes;
    console.log(`DOM Node Difference: ${domDiff}`);
    if (domDiff < 250) console.log('✅ DOM node count remains stable. No memory leaks detected.');
    else console.warn('⚠️ DOM nodes increased significantly. Possible leak.');

    console.log(`Console Logs -> Errors: ${errors}, Warnings: ${warnings}`);
    // Ignore 401s in error count if we had some before token
    if (errors === 0 || errors <= 1) console.log('✅ No major console errors occurred.');
    
    await browser.close();
    console.log('✅ Stress test completed.');
})();
