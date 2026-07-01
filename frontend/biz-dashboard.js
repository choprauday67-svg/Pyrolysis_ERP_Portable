/**
 * Overhaul of the Plant Status Dashboard.
 * Injects a pure JS ERP Dashboard on the root path (/).
 */

document.addEventListener('DOMContentLoaded', () => {
    let _lastRoute = null; // Track route changes to trigger data refresh

    // Persistent observer to handle React SPA navigation and re-renders
    const observer = new MutationObserver(() => {
        const isDashboardRoute = window.location.pathname === '/' || window.location.pathname === '/index.html';
        const mainContent = document.querySelector('.main-content');
        
        if (!mainContent) return;

        if (!isDashboardRoute) {
            // Clean up if we navigated away
            const erpDash = document.getElementById('erp-dashboard');
            if (erpDash) erpDash.style.display = 'none';
            
            // Re-enable React content
            Array.from(mainContent.children).forEach(c => {
                if (c.id !== 'erp-dashboard') c.style.display = '';
            });
            _lastRoute = window.location.pathname;
            return;
        }

        // We are on the dashboard route
        let erpDash = document.getElementById('erp-dashboard');
        if (!erpDash) {
            hijackDashboard(mainContent);
            erpDash = document.getElementById('erp-dashboard');
        } else if (_lastRoute !== window.location.pathname) {
            // User navigated BACK to dashboard — refresh all live data
            erpDash.style.display = 'block';
            loadDashboardData();
        }

        _lastRoute = window.location.pathname;
        if (erpDash) erpDash.style.display = 'block';

        // Constantly enforce hiding of React's original dashboard elements
        Array.from(mainContent.children).forEach(child => {
            if (child.id !== 'erp-dashboard' && child.style.display !== 'none') {
                child.style.display = 'none';
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ── System Settings: Sales Price Auto-fill ──
    let cachedPrices = null;
    const fetchPrices = async () => {
        if (cachedPrices) return cachedPrices;
        try {
            const res = await window.bizHelpers.apiRequest('/api/settings');
            if (res && res.data) {
                cachedPrices = {
                    'Oil': res.data.OIL_PRICE || 40,
                    'Carbon Black': res.data.CARBON_PRICE || 35,
                    'Steel': res.data.STEEL_PRICE || 25
                };
            }
        } catch (e) { console.error('Failed to fetch settings for auto-fill', e); }
        return cachedPrices;
    };

    const salesObserver = new MutationObserver(async () => {
        if (window.location.pathname !== '/sales') return;

        // Find the specific select and price inputs in the React form
        const selects = document.querySelectorAll('select.form-control');
        const inputs = document.querySelectorAll('input[type="number"].form-control');
        
        let productSelect = null;
        let priceInput = null;

        selects.forEach(s => {
            if (s.innerHTML.includes('OIL') && s.innerHTML.includes('CARBON BLACK')) {
                productSelect = s;
            }
        });
        inputs.forEach(i => {
            if (i.placeholder === 'Price per Unit' || i.placeholder.includes('Price')) {
                priceInput = i;
            }
        });

        if (productSelect && priceInput && !productSelect.dataset.autoFillBound) {
            productSelect.dataset.autoFillBound = 'true';
            
            productSelect.addEventListener('change', async (e) => {
                const prices = await fetchPrices();
                if (prices && prices[e.target.value]) {
                    // Update React's internal state
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(priceInput, prices[e.target.value]);
                    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            // Initial auto-fill if empty
            if (!priceInput.value) {
                const prices = await fetchPrices();
                if (prices && prices[productSelect.value]) {
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(priceInput, prices[productSelect.value]);
                    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });
    salesObserver.observe(document.body, { childList: true, subtree: true });
});

async function hijackDashboard(mainContent) {

    // Ensure flash-container exists
    if (!document.getElementById('flash-container')) {
        const fc = document.createElement('div');
        fc.id = 'flash-container';
        fc.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(fc);
    }

    // Create our dashboard panel inside main-content
    const dashboardContainer = document.createElement('div');
    dashboardContainer.id = 'erp-dashboard';
    dashboardContainer.style.padding = '0';
    mainContent.appendChild(dashboardContainer);

    dashboardContainer.innerHTML = `
        <div class="page-header" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h1>Plant Status Overview</h1>
                <p>Live production telemetry, machine status, and stock alerts.</p>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <div style="position: relative;" id="search-container">
                    <input type="text" id="erp-search" placeholder="Search invoices, stock, batches..." style="margin: 0; min-width: 300px; padding: 10px 14px; background: rgba(0,0,0,0.2); border: 1px solid var(--border); border-radius: 8px; color: #fff;">
                    <div id="search-results" class="glass-panel" style="display: none; position: absolute; top: 100%; left: 0; width: 100%; z-index: 1000; max-height: 300px; overflow-y: auto; margin-top: 5px;"></div>
                </div>
                <div style="position: relative;">
                    <button id="notif-btn" class="btn secondary" style="position: relative; padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border);">
                        🔔 <span id="notif-count" style="position: absolute; top: -5px; right: -5px; background: var(--danger); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; display: none;">0</span>
                    </button>
                    <div id="notif-panel" class="glass-panel" style="display: none; position: absolute; top: 100%; right: 0; width: 320px; z-index: 1000; margin-top: 5px; max-height: 400px; overflow-y: auto;"></div>
                </div>
                <div style="position: relative;">
                    <button id="settings-btn" class="btn secondary" style="padding: 10px; background: rgba(0,0,0,0.2); border: 1px solid var(--border);">⚙️ Quick Actions</button>
                    <div id="settings-panel" class="glass-panel" style="display: none; position: absolute; top: 100%; right: 0; width: 200px; z-index: 1000; margin-top: 5px;">
                        <a href="#" onclick="window.bizHelpers.createFlash('Exporting Reports...', 'success'); return false;" style="display: block; padding: 10px; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border);">📄 Export Reports</a>
                        <a href="#" onclick="window.bizHelpers.createFlash('Database Backup Started', 'success'); return false;" style="display: block; padding: 10px; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border);">💾 Backup Database</a>
                        <a href="#" onclick="window.bizHelpers.createFlash('User Management coming soon', 'warning'); return false;" style="display: block; padding: 10px; color: var(--text); text-decoration: none; border-bottom: 1px solid var(--border);">👥 User Management</a>
                        <a href="#" onclick="document.getElementById('settings-modal')?.style.setProperty('display', 'flex'); return false;" style="display: block; padding: 10px; color: var(--text); text-decoration: none;">⚙️ Plant Settings</a>
                    </div>
                </div>
            </div>
        </div>

        <div id="alerts-container" style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px;"></div>

        <div class="grid grid-3" style="margin-bottom: 24px;">
            <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin-bottom: 5px; color: var(--text-dim);">Machine Status</h3>
                    <div id="machine-status" style="font-size: 1.2rem; font-weight: 700; color: var(--success);">Loading...</div>
                </div>
                <div style="font-size: 2rem;">⚙️</div>
            </div>
            <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin-bottom: 5px; color: var(--text-dim);">Production Today</h3>
                    <div id="production-today" style="font-size: 1.2rem; font-weight: 700;">Loading...</div>
                </div>
                <div style="font-size: 2rem;">🏭</div>
            </div>
            <div class="card" style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <h3 style="margin-bottom: 5px; color: var(--text-dim);">Avg. Yield Efficiency</h3>
                    <div id="avg-yield" style="font-size: 1.2rem; font-weight: 700;">Loading...</div>
                </div>
                <div style="font-size: 2rem;">📈</div>
            </div>
        </div>

        <h2 style="margin-bottom: 16px;">Key Performance Indicators</h2>
        <div class="grid grid-3" id="kpi-grid" style="margin-bottom: 24px;">
            <!-- KPI Cards will be injected here -->
        </div>

        <div class="grid grid-3" style="margin-bottom: 24px;">
            <div class="glass-panel" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Top Customers</h3>
                <div id="top-customers-list">Loading...</div>
            </div>
            <div class="glass-panel" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Inventory Summary</h3>
                <div id="inventory-summary">Loading...</div>
            </div>
            <div class="glass-panel" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">Recent Activity</h3>
                <div id="recent-activity-list">Loading...</div>
            </div>
        </div>
    `;

    setupInteractions();
    await loadDashboardData();
}

function setupInteractions() {
    // Search Telemetry
    const searchInput = document.getElementById('erp-search');
    const searchDropdown = document.getElementById('search-results');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const term = e.target.value.trim();
        if (!term) {
            searchDropdown.style.display = 'none';
            return;
        }
        
        debounceTimer = setTimeout(async () => {
            try {
                const data = await window.bizHelpers.apiRequest(`/api/dashboard/search?q=${encodeURIComponent(term)}`);
                if (data && data.results && data.results.length > 0) {
                    searchDropdown.innerHTML = data.results.map(r => `
                        <a href="${r.url || '#'}" style="display: block; padding: 10px; border-bottom: 1px solid var(--border); text-decoration: none; color: inherit; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                            <strong style="color: var(--accent);">${r.type}</strong>: ${r.name} 
                            <br><span style="font-size: 0.85rem; color: var(--text-dim);">${r.details}</span>
                        </a>
                    `).join('');
                } else {
                    searchDropdown.innerHTML = '<div style="padding: 10px; color: var(--text-dim);">No results found</div>';
                }
                searchDropdown.style.display = 'block';
            } catch (e) {
                console.error(e);
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

    // Notif Dropdown
    const notifBtn = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');
    notifBtn.addEventListener('click', () => {
        notifPanel.style.display = notifPanel.style.display === 'none' ? 'block' : 'none';
        document.getElementById('settings-panel').style.display = 'none';
    });

    // Settings Dropdown
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    settingsBtn.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
        notifPanel.style.display = 'none';
    });
}

async function loadDashboardData() {
    try {
        const stats = await window.bizHelpers.apiRequest('/api/dashboard/stats');
        const kpis = await window.bizHelpers.apiRequest('/api/dashboard/production-kpis');

        // 1. Setup Alerts
        const alertsContainer = document.getElementById('alerts-container');
        const notifPanel = document.getElementById('notif-panel');
        const notifCount = document.getElementById('notif-count');
        
        if (stats.alerts && stats.alerts.list && stats.alerts.list.length > 0) {
            notifCount.textContent = stats.alerts.list.length;
            notifCount.style.display = 'block';

            // Top alerts
            alertsContainer.innerHTML = stats.alerts.list.slice(0, 2).map(a => `
                <div style="background: rgba(228, 93, 117, 0.1); border-left: 4px solid var(--danger); padding: 12px 16px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div><strong style="color: var(--danger);">${a.type}</strong>: ${a.message}</div>
                    <a href="${window.bizHelpers.getAlertAction(a).href}" class="btn small" style="background: var(--bg-secondary); color: var(--text); border: 1px solid var(--border); text-decoration: none;">${window.bizHelpers.getAlertAction(a).label}</a>
                </div>
            `).join('');

            // Notif panel
            notifPanel.innerHTML = stats.alerts.list.map(a => `
                <div style="padding: 12px; border-bottom: 1px solid var(--border);">
                    <div style="margin-bottom: 8px;"><strong style="color: var(--danger);">${a.type}</strong>: ${a.message}</div>
                    <a href="${window.bizHelpers.getAlertAction(a).href}" style="padding: 4px 10px; font-size: 0.75rem; text-decoration: none; background: var(--accent); color: white; border-radius: 4px;">${window.bizHelpers.getAlertAction(a).label}</a>
                </div>
            `).join('');
        } else {
            notifPanel.innerHTML = '<div style="padding: 12px; color: var(--text-dim);">No active notifications.</div>';
        }

        // 2. Machine Status & Production Today
        let machineStatusHtml = '';
        if (kpis.utilization.inProgress > 0) {
            machineStatusHtml = `<span style="color: var(--warning)">${kpis.utilization.inProgress} In-Progress</span>`;
        } else if (kpis.utilization.planned > 0) {
            machineStatusHtml = `<span style="color: var(--accent)">${kpis.utilization.planned} Planned</span>`;
        } else {
            machineStatusHtml = `<span style="color: var(--success)">Idle / Ready</span>`;
        }
        document.getElementById('machine-status').innerHTML = machineStatusHtml;
        document.getElementById('production-today').textContent = `${kpis.today.batches} Batches Today`;
        document.getElementById('avg-yield').textContent = `${kpis.allTime.avgYield}%`;

        // 3. KPI Cards — show net available stock (produced minus sold), not just total produced
        const kpiGrid = document.getElementById('kpi-grid');
        kpiGrid.innerHTML = `
            ${renderKPICard('Tyres In Hand',   stats.summary.currentStock,       kpis.thisMonth.tyres,   'kg', '🚚')}
            ${renderKPICard('Oil In Stock',     stats.summary.currentOilStock,    kpis.thisMonth.oil,     'L',  '🛢️')}
            ${renderKPICard('Carbon In Stock',  stats.summary.currentCarbonStock, kpis.thisMonth.carbon,  'kg', '🏭')}
            ${renderKPICard('Steel In Stock',   stats.summary.currentSteelStock,  kpis.thisMonth.steel,   'kg', '⚙️')}
            ${renderKPICard('Invoice Revenue (Incl. GST)',    stats.summary.totalRevenue,       0,                      '₹',  '💰')}
            ${renderKPICard('Net Profit',       stats.summary.netProfit,          0,                      '₹',  '📈')}
        `;

        // 4. Top Customers
        const custContainer = document.getElementById('top-customers-list');
        if (stats.strategy && stats.strategy.topBuyers && stats.strategy.topBuyers.length > 0) {
            custContainer.innerHTML = stats.strategy.topBuyers.map(b => `
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border);">
                    <span>${b.buyer}</span>
                    <strong style="color: var(--success);">₹${b.total_profit.toLocaleString('en-IN')}</strong>
                </div>
            `).join('');
        } else {
            custContainer.innerHTML = '<div style="color: var(--text-dim);">No sales data available.</div>';
        }

        // 5. Inventory Summary in bottom section
        const invSummContainer = document.getElementById('inventory-summary');
        if (invSummContainer) {
            invSummContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-secondary);">Tyres In Hand</span>
                        <strong>${Number(stats.summary.currentStock).toLocaleString('en-IN')} kg</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-secondary);">Pyrolysis Oil Stock</span>
                        <strong>${Number(stats.summary.currentOilStock).toLocaleString('en-IN')} L</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span style="color: var(--text-secondary);">Carbon Black Stock</span>
                        <strong>${Number(stats.summary.currentCarbonStock).toLocaleString('en-IN')} kg</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span style="color: var(--text-secondary);">Steel Wire Stock</span>
                        <strong>${Number(stats.summary.currentSteelStock).toLocaleString('en-IN')} kg</strong>
                    </div>
                </div>
            `;
        }

        // 6. Dynamic Recent Activity
        const recentContainer = document.getElementById('recent-activity-list');
        try {
            const [batchResp, invResp, expResp, stockResp, salesResp] = await Promise.all([
                window.bizHelpers.apiRequest('/api/batches'),
                window.bizHelpers.apiRequest('/api/invoices'),
                window.bizHelpers.apiRequest('/api/expenses'),
                window.bizHelpers.apiRequest('/api/inventory'),
                window.bizHelpers.apiRequest('/api/sales'),
            ]);
            const batches  = (batchResp.batches   || batchResp.data   || []).slice(0, 3);
            const invoices = (invResp.invoices     || invResp.data     || []).slice(0, 2);
            const expenses = (expResp.expenses     || expResp.data     || []).slice(0, 2);
            const stock    = (stockResp.inventory  || stockResp.data   || []).slice(0, 2);
            const sales    = (salesResp.sales      || salesResp.data   || []).slice(0, 3);

            const activities = [
                ...batches.map(b  => ({ icon: '🏭', text: `Batch ${b.batch_number} — ${b.status}`, date: b.date })),
                ...invoices.map(i => ({ icon: '📄', text: `Invoice ${i.invoice_number} — ${i.payment_status}`, date: i.invoice_date })),
                ...expenses.map(e => ({ icon: '💸', text: `Expense: ${e.type} (₹${Number(e.amount).toLocaleString('en-IN')})`, date: e.date })),
                ...stock.map(s    => ({ icon: '📦', text: `Stock In: ${Number(s.weight).toLocaleString('en-IN')} kg from ${s.supplier_name || 'Supplier'}`, date: s.date })),
                ...sales.map(s   => ({ icon: '🛒', text: `Sale: ${s.product_type} — ${Number(s.quantity).toLocaleString('en-IN')} units to ${s.buyer} (₹${(s.quantity * s.price_per_unit).toLocaleString('en-IN')})`, date: s.date })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

            if (activities.length === 0) {
                recentContainer.innerHTML = '<div style="color: var(--text-secondary);">No recent activity found.</div>';
            } else {
                recentContainer.innerHTML = activities.map(a => `
                    <div style="padding: 10px 0; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                        <span>${a.icon}</span>
                        <div>
                            <div>${a.text}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${a.date}</div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (e) {
            console.error('Recent Activity error:', e);
            recentContainer.innerHTML = '<div style="color: var(--text-secondary);">Could not load activity.</div>';
        }

    } catch (e) {
        console.error("Dashboard Load Error", e);
        window.bizHelpers.createFlash("Failed to load dashboard data", "error");
    }
}

function renderKPICard(title, total, thisMonthValue, unit, icon) {
    let formattedTotal = total;
    let formattedSub = thisMonthValue;
    if (unit === '₹') {
        formattedTotal = Number(total).toLocaleString('en-IN');
        formattedSub = Number(thisMonthValue).toLocaleString('en-IN');
    } else {
        formattedTotal = Number(total).toLocaleString('en-IN', { maximumFractionDigits: 1 });
        formattedSub = Number(thisMonthValue).toLocaleString('en-IN', { maximumFractionDigits: 1 });
    }

    return `
        <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: var(--text-dim); font-size: 0.95rem;">${title}</h3>
                <span style="font-size: 1.2rem;">${icon}</span>
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; margin-bottom: 5px;">
                ${unit === '₹' ? '₹' : ''}${formattedTotal} ${unit !== '₹' ? unit : ''}
            </div>
            ${thisMonthValue !== undefined && title !== 'Invoice Revenue (Incl. GST)' && title !== 'Net Profit' ? 
              `<div style="font-size: 0.85rem; color: var(--success);">+${formattedSub} ${unit} this month</div>` 
              : '<div style="font-size: 0.85rem; color: var(--text-dim);">All time</div>'}
        </div>
    `;
}
