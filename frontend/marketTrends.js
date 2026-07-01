/**
 * Market Trends Viewer - Lightweight frontend module for commodity price charts
 * Integrates with existing dashboard without requiring rebuild
 * Uses SVG for lightweight rendering
 */

class MarketTrendsViewer {
    constructor() {
        this.apiBase = '/api/market-trends';
        this.refreshInterval = 30000; // Refresh every 30 seconds
        this.isVisible = false;
        this.commodities = ['Pyrolysis Oil', 'Carbon Black', 'Gas', 'Steel'];
        this.chartData = {};
        this.dashboardStats = null;
        this.marketTrendSummary = null;
        this.extensionRoot = null;
        this.colors = {
            'Pyrolysis Oil': '#FF6B6B',
            'Carbon Black': '#4C4C4C',
            'Gas': '#4ECDC4',
            'Steel': '#666666'
        };
        this.displayNames = {
            'Pyrolysis Oil': 'Pyrolysis Oil',
            'Carbon Black': 'Carbon Black',
            'Gas': 'Energy Recovery',
            'Steel': 'Steel Wire'
        };
        this.units = {
            'Pyrolysis Oil': 'litre',
            'Carbon Black': 'kg',
            'Gas': 'Nm³',
            'Steel': 'kg'
        };
        this.priceRanges = {
            'Pyrolysis Oil': { min: 28, max: 48, rawMin: 300, rawMax: 660 },
            'Carbon Black': { min: 15, max: 25, rawMin: 60, rawMax: 350 },
            'Gas': { min: 10, max: 18, rawMin: 180, rawMax: 350 },
            'Steel': { min: 30, max: 45, rawMin: 40, rawMax: 180 }
        };

        this.priceSettings = {
            oil: 40,
            energy: 12,
            carbon: 6,
            steel: 35
        };
        this.settingsLoaded = false;
        this.isMounted = false;
        this.autoRefreshId = null;
        this.navEnhanced = false;
    }

    // Initialize and bind to routing lifecycle
    async init() {
        console.log('Plant Intelligence module loaded');
        // Load lightweight settings early
        await this.loadPriceSettings();
        // Enhance nav globally (idempotent)
        this.enhanceNavbar();

        // Bind route changes to mount/unmount intelligence UI
        this._routeHandler = this._globalRouteHandler.bind(this);
        window.addEventListener('hashchange', this._routeHandler);
        window.addEventListener('popstate', this._routeHandler);

        // Initial attempt to mount (will check for dashboard container)
        this._routeHandler();
        console.log('Plant Intelligence router bound');
    }

    async _globalRouteHandler() {
        try {
            // Dashboard summary mount/unmount
            await this.mountIfDashboard();

            // Plant Intelligence full page route handling
            if (this.isPlantIntelRoute()) {
                await this.mountPlantIntelligence();
            } else {
                this.unmountPlantIntelligence();
            }
        } catch (err) {
            console.error('Plant Intelligence route handler error:', err);
        }
    }

    // Determine whether current route is the main dashboard
    isDashboardRoute() {
        const hash = window.location.hash || '';
        const possibleDashboard = hash === '' || hash === '#/' || hash.startsWith('#/dashboard') || hash.startsWith('#/plant') || hash.startsWith('#/plant-summary');
        const hasContainer = !!document.querySelector('.stats-grid') || !!document.getElementById('dashboard-summary-cards');
        return possibleDashboard && hasContainer;
    }

    async mountIfDashboard() {
        try {
            if (this.isDashboardRoute()) {
                if (!this.isMounted) {
                    await this.mount();
                }
            } else {
                if (this.isMounted) {
                    this.unmount();
                }
            }
        } catch (err) {
            console.error('Plant Intelligence mount error:', err);
        }
    }

    async mount() {
        this.isMounted = true;
        await Promise.all([this.loadDashboardStats(), this.loadOperationalData()]);
        // Only restore lightweight summary cards on the main dashboard
        this.renderDashboardSummaryCards();

        // Ensure navigation entry for full Plant Intelligence page
        this.ensureNavButton();

        // Mount the full Plant Intelligence page only when route requests it
        if (this.isPlantIntelRoute()) {
            await this.mountPlantIntelligence();
        }

        // Attach global event listeners (modal, nav enhancements, dropdowns)
        this.attachEventListeners();
        // Start auto refresh and keep id for cleanup
        this.autoRefreshId = setInterval(async () => {
            await this.loadDashboardStats();
            await this.loadOperationalData();
            this.renderDashboardSummaryCards();
            this.renderPlantIntelligence();
        }, this.refreshInterval);
        this.scheduleRenderRetry();
        console.log('✅ Plant Intelligence mounted on dashboard');
    }

    unmount() {
        // remove extension UI if present
        // Unmount any rendered Plant Intelligence page
        this.unmountPlantIntelligence();
        // clear injected stat cards inserted by this module
        Array.from(document.querySelectorAll('.market-trends-injected-card')).forEach(el => el.remove());
        if (this.autoRefreshId) {
            clearInterval(this.autoRefreshId);
            this.autoRefreshId = null;
        }
        this.isMounted = false;
        console.log('Plant Intelligence unmounted from non-dashboard route');
    }

    // Ensure the nav button exists and is idempotent
    ensureNavButton() {
        if (this.navEnhanced && document.getElementById('plant-intel-nav')) return;

        const header = document.querySelector('header') || document.querySelector('nav') || document.body;
        if (!header) return;

        const btn = document.createElement('button');
        btn.id = 'plant-intel-nav';
        btn.className = 'plant-intel-nav-btn';
        btn.textContent = 'Plant Intelligence';
        btn.style.marginLeft = '12px';
        btn.style.padding = '0.5rem 0.9rem';
        btn.style.borderRadius = '999px';
        btn.style.border = '1px solid rgba(148,163,184,0.12)';
        btn.style.background = 'transparent';
        btn.style.color = 'inherit';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/plant-intelligence';
        });

        // Try to insert into a visible nav area
        const navTarget = header.querySelector('.nav-actions') || header.querySelector('nav') || header;
        navTarget.appendChild(btn);
    }

    isPlantIntelRoute() {
        const hash = window.location.hash || '';
        return hash.startsWith('#/plant-intelligence') || hash.startsWith('#/plant-intel');
    }

    async mountPlantIntelligence() {
        if (this.intelPageMounted) return;
        this.intelPageMounted = true;

        // Ensure dashboard body exists
        const pageWrapper = document.querySelector('.page-wrapper') || document.querySelector('#app') || document.body;
        if (!pageWrapper) return;

        // Save current content to restore later
        if (!this._savedPageWrapperHtml) this._savedPageWrapperHtml = pageWrapper.innerHTML;

        // Create intelligence extension if not present
        if (!this.extensionRoot) this.createDashboardSection();

        // Clear wrapper and append intelligence UI
        pageWrapper.innerHTML = '';
        pageWrapper.appendChild(this.extensionRoot);

        // Render the intelligence content now that it's in DOM
        await this.loadDashboardStats();
        await this.loadOperationalData();
        this.renderPlantIntelligence();

        console.log('Mounted Plant Intelligence full page');
    }

    unmountPlantIntelligence() {
        if (!this.intelPageMounted) return;
        const pageWrapper = document.querySelector('.page-wrapper') || document.querySelector('#app') || document.body;
        if (pageWrapper && this._savedPageWrapperHtml !== undefined) {
            pageWrapper.innerHTML = this._savedPageWrapperHtml;
        }

        if (this.extensionRoot && this.extensionRoot.parentElement) {
            this.extensionRoot.parentElement.removeChild(this.extensionRoot);
        }
        this.extensionRoot = null;
        this.intelPageMounted = false;
        console.log('Unmounted Plant Intelligence full page');
    }

    // Enhance the top navbar with search, dropdowns, and quick actions
    enhanceNavbar(attempts = 0) {
        if (this.navEnhanced) return;
        const header = document.querySelector('header');
        if (!header) {
            if (attempts < 10) {
                setTimeout(() => this.enhanceNavbar(attempts + 1), 550);
            }
            return;
        }

        this.updateSearchBar();
        this.setupNotificationDropdown(header);
        this.setupSettingsDropdown(header);
        this.setupProfileMenu(header);

        document.addEventListener('click', (event) => {
            if (this.notificationMenu && !this.notificationMenu.contains(event.target) && !this.notificationToggle?.contains(event.target)) {
                this.closeDropdown(this.notificationMenu);
            }
            if (this.settingsMenu && !this.settingsMenu.contains(event.target) && !this.settingsToggle?.contains(event.target)) {
                this.closeDropdown(this.settingsMenu);
            }
            if (this.profileMenu && !this.profileMenu.contains(event.target) && !this.profileToggle?.contains(event.target)) {
                this.closeDropdown(this.profileMenu);
            }
        });
        this.navEnhanced = true;
    }

    updateSearchBar() {
        const searchInput = document.querySelector('header input[type="text"][placeholder*="Search"]');
        if (!searchInput) return;

        searchInput.placeholder = 'Search operations, inventory, records, suppliers...';
        searchInput.autocomplete = 'off';
        searchInput.style.minWidth = '320px';
        searchInput.style.borderRadius = '999px';
        searchInput.style.backgroundColor = '#0f172a';
        searchInput.style.border = '1px solid rgba(148,163,184,0.18)';
        searchInput.style.color = '#f8fafc';
        searchInput.style.padding = '0.5rem 1rem 0.5rem 2.5rem';

        searchInput.addEventListener('input', (event) => {
            this.applyHeaderSearch(event.target.value.trim().toLowerCase());
        });
    }

    applyHeaderSearch(query) {
        const rows = document.querySelectorAll('.page-wrapper table tbody tr');
        if (!rows.length) return;

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = !query || text.includes(query) ? '' : 'none';
        });
    }

    setupNotificationDropdown(header) {
        let button = header.querySelector('button');
        if (!button) button = header.querySelector('button[data-notification]') || header.querySelectorAll('button')[0];
        if (!button) return;
        button.title = 'Plant notifications';
        button.style.position = 'relative';
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDropdown(this.notificationMenu);
            this.renderNotificationMenu();
        });

        this.notificationToggle = button;
        this.notificationMenu = this.createDropdown('Plant Notifications', 'pi-notification-list');
        document.body.appendChild(this.notificationMenu);
        this.positionDropdown(this.notificationMenu, button);
    }

    setupSettingsDropdown(header) {
        const buttons = header.querySelectorAll('button');
        let button = buttons[1] || buttons[0] || header.querySelector('button[data-settings]');
        if (!button) return;
        button.title = 'Quick settings';
        button.style.position = 'relative';
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDropdown(this.settingsMenu);
            this.renderSettingsMenu();
        });

        this.settingsToggle = button;
        this.settingsMenu = this.createDropdown('Quick Settings', 'pi-settings-list');
        document.body.appendChild(this.settingsMenu);
        this.positionDropdown(this.settingsMenu, button);
    }

    setupProfileMenu(header) {
        let rightArea = header.children[1];
        if (!rightArea) rightArea = header.querySelector('.right-area') || header;
        if (!rightArea) return;
        const profileTarget = rightArea.querySelector('div') || rightArea.querySelector('img') || rightArea;
        profileTarget.style.cursor = 'pointer';
        profileTarget.title = 'User menu';

        profileTarget.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleDropdown(this.profileMenu);
            this.renderProfileMenu();
        });

        this.profileToggle = profileTarget;
        this.profileMenu = this.createDropdown('Quick Actions', 'pi-profile-list');
        document.body.appendChild(this.profileMenu);
        this.positionDropdown(this.profileMenu, profileTarget);
    }

    createDropdown(title, listClass) {
        const menu = document.createElement('div');
        menu.className = `pi-dropdown ${listClass}`;
        menu.style.display = 'none';
        menu.innerHTML = `
            <div class="pi-dropdown-title">${title}</div>
            <div class="pi-dropdown-content"></div>
        `;
        return menu;
    }

    toggleDropdown(menu) {
        if (!menu) return;
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }

    closeDropdown(menu) {
        if (menu && menu.style.display === 'block') {
            menu.style.display = 'none';
        }
    }

    positionDropdown(menu, anchor) {
        if (!menu || !anchor) return;
        const rect = anchor.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + window.scrollY + 8}px`;
        menu.style.left = `${rect.left + window.scrollX}px`;
        menu.style.minWidth = '260px';
        menu.style.zIndex = 9999;
    }

    renderNotificationMenu() {
        if (!this.notificationMenu) return;
        const content = this.notificationMenu.querySelector('.pi-dropdown-content');
        if (!content) return;

        const summary = this.dashboardStats?.summary || {};
        const notifications = [];
        const oilStock = Number(summary.currentOilStock || summary.totalProduction?.oil || 0);
        const gasStock = Number(summary.currentGasStock || summary.currentGas || summary.totalProduction?.gas || 0);
        const carbonStock = Number(summary.currentCarbonStock || summary.currentCarbon || summary.totalProduction?.carbon || 0);

        if (oilStock > 0 && oilStock < 700) {
            notifications.push({ icon: '⚠️', title: 'Low Oil Reserve', text: 'Oil inventory is below safe margin. Consider moving product to dispatch.' });
        }
        if (gasStock > 0 && gasStock < 250) {
            notifications.push({ icon: '🔥', title: 'Gas recovery slowing', text: 'Gas stock is tightening. Review gas conditioning and storage.' });
        }
        if (carbonStock > 0 && carbonStock < 600) {
            notifications.push({ icon: '🛠️', title: 'Carbon stock low', text: 'Carbon output is lower than expected. Monitor production feedstock.' });
        }
        if ((this.batches || []).some(batch => batch.status === 'Planned')) {
            notifications.push({ icon: '🗓️', title: 'Planned batch waiting', text: 'One or more scheduled batches are ready to start.' });
        }
        if (!notifications.length) {
            notifications.push({ icon: '✅', title: 'All systems nominal', text: 'No critical alerts currently. Review performance metrics as needed.' });
        }

        content.innerHTML = notifications.map(item => `
            <div class="pi-dropdown-item">
                <div class="pi-dropdown-item-title">${item.icon} ${item.title}</div>
                <div class="pi-dropdown-item-text">${item.text}</div>
            </div>
        `).join('');

        this.positionDropdown(this.notificationMenu, this.notificationToggle);
    }

    renderSettingsMenu() {
        if (!this.settingsMenu) return;
        const content = this.settingsMenu.querySelector('.pi-dropdown-content');
        if (!content) return;

        const links = [
            { label: 'Plant Dashboard', href: '#/' },
            { label: 'Inventory', href: '#/inventory' },
            { label: 'Production', href: '#/production' },
            { label: 'Sales', href: '#/sales' },
            { label: 'Settings', href: '#/settings' }
        ];

        content.innerHTML = links.map(item => `
            <a class="pi-dropdown-link" href="${item.href}">${item.label}</a>
        `).join('');

        this.positionDropdown(this.settingsMenu, this.settingsToggle);
    }

    renderProfileMenu() {
        if (!this.profileMenu) return;
        const content = this.profileMenu.querySelector('.pi-dropdown-content');
        if (!content) return;

        const links = [
            { label: 'Profile & Settings', href: '#/settings' },
            { label: 'Order History', href: '#/sales' },
            { label: 'Logout', href: '#/login', extraClass: 'pi-dropdown-destructive' }
        ];

        content.innerHTML = links.map(item => `
            <a class="pi-dropdown-link ${item.extraClass || ''}" href="${item.href}">${item.label}</a>
        `).join('');

        this.positionDropdown(this.profileMenu, this.profileToggle);
    }

    // Create HTML structure
    createUI() {
        // Create button to toggle market trends
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'market-trends-toggle';
        toggleBtn.className = 'market-trends-btn';
        toggleBtn.innerHTML = '📈 Market Trends';
        toggleBtn.title = 'View commodity market trends';

        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'market-trends-modal';
        modal.className = 'market-trends-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="market-trends-content">
                <div class="market-trends-header">
                    <h2>Commodity Market Trends 📊</h2>
                    <button id="market-trends-close" class="close-btn">&times;</button>
                </div>
                
                <div class="market-trends-tabs">
                    <button class="tab-btn active" data-commodity="Pyrolysis Oil">Oil</button>
                    <button class="tab-btn" data-commodity="Carbon Black">Carbon</button>
                    <button class="tab-btn" data-commodity="Gas">Energy Savings</button>
                    <button class="tab-btn" data-commodity="Steel">Steel Wire</button>
                </div>

                <div class="market-trends-summary">
                    <div id="summary-stats"></div>
                </div>

                <div class="market-trends-chart">
                    <svg id="price-chart" width="100%" height="300" style="border: 1px solid #e0e0e0;"></svg>
                </div>

                <div class="market-trends-stats">
                    <div class="stat-item">
                        <span class="stat-label">Current Price:</span>
                        <span id="current-price" class="stat-value">—</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Change:</span>
                        <span id="price-change" class="stat-value">—</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trend:</span>
                        <span id="trend-direction" class="stat-value">—</span>
                    </div>
                </div>

                <div class="market-trends-footer">
                    <small>Updates every 30 seconds • Last updated: <span id="last-updated">—</span></small>
                </div>
            </div>
        `;

        // Inject styles
        this.injectStyles();

        // Add to DOM
        const navArea = document.querySelector('nav') || document.querySelector('header') || document.body;
        navArea.appendChild(toggleBtn);
        document.body.appendChild(modal);

        this.toggleBtn = toggleBtn;
        this.modal = modal;
    }

    // Inject CSS styles
    injectStyles() {
        if (document.getElementById('market-trends-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'market-trends-styles';
        styles.innerHTML = `
            .plant-intelligence-extension {
                margin: 32px auto;
                padding: 24px;
                background: #ffffff;
                border-radius: 20px;
                box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
                max-width: 1180px;
                border: 1px solid rgba(148, 163, 184, 0.18);
            }

            .plant-intelligence-panel {
                display: grid;
                gap: 24px;
            }

            .plant-intel-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 16px;
            }

            .plant-intel-header h2 {
                margin: 0;
                font-size: 2rem;
                color: #111827;
            }

            .plant-intel-header p {
                margin: 8px 0 0;
                color: #4b5563;
                line-height: 1.6;
                max-width: 720px;
            }

            .plant-intel-badge {
                align-self: center;
                background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%);
                color: white;
                border-radius: 999px;
                padding: 10px 18px;
                font-size: 0.9rem;
                font-weight: 700;
                letter-spacing: 0.02em;
                white-space: nowrap;
            }

            .plant-intelligence-body {
                display: grid;
                gap: 22px;
            }

            .plant-intel-summary-grid,
            .plant-intel-metrics-grid,
            .plant-intel-inventory-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 16px;
            }

            .plant-intel-card {
                background: #f8fafc;
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 18px;
                padding: 20px;
                min-height: 136px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }

            .plant-intel-card h3 {
                margin: 0 0 10px;
                font-size: 1rem;
                color: #475569;
                letter-spacing: 0.01em;
                text-transform: uppercase;
            }

            .plant-intel-card .value {
                font-size: 2rem;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.1;
            }

            .plant-intel-card .metric-note {
                margin-top: 12px;
                font-size: 0.9rem;
                color: #64748b;
                line-height: 1.5;
            }

            .plant-intel-recommendations {
                border-radius: 18px;
                padding: 24px;
                background: #eef2ff;
                border: 1px solid #c7d2fe;
            }

            .plant-intel-recommendations h3 {
                margin: 0 0 12px;
                font-size: 1.1rem;
                color: #312e81;
            }

            .plant-intel-recommendations ul {
                margin: 0;
                padding-left: 20px;
                color: #334155;
                line-height: 1.7;
            }

            .plant-intel-recommendations li {
                margin-bottom: 10px;
            }

            .plant-intel-flag {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-size: 0.95rem;
                color: #111827;
                font-weight: 700;
                margin-top: 16px;
            }

            .plant-intel-flag span {
                display: inline-flex;
                width: 10px;
                height: 10px;
                border-radius: 999px;
                background: #2563eb;
            }

            .plant-intel-price-controls {
                display: flex;
                justify-content: stretch;
            }

            .plant-intel-control-panel {
                grid-column: span 4;
                background: #ffffff;
                border: 1px solid rgba(148, 163, 184, 0.18);
                padding: 24px;
            }

            .price-control-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 14px;
                margin: 14px 0 18px;
            }

            .rate-control-card {
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #f8fafc;
                border: 1px solid rgba(148, 163, 184, 0.16);
                border-radius: 14px;
                padding: 16px;
            }

            .rate-control-card label {
                font-size: 0.82rem;
                font-weight: 700;
                color: #334155;
                text-transform: uppercase;
                letter-spacing: 0.02em;
            }

            .rate-control-input-row {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .rate-control-input-row input {
                width: 100%;
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 10px;
                padding: 12px 14px;
                font-size: 1rem;
                font-weight: 700;
                color: #0f172a;
                outline: none;
                background: white;
            }

            .rate-control-input-row span {
                color: #64748b;
                font-size: 0.95rem;
                font-weight: 700;
            }

            .rate-control-actions {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
            }

            .save-rate-button {
                background: #2563eb;
                color: white;
                padding: 12px 18px;
                border: none;
                border-radius: 999px;
                font-weight: 700;
                cursor: pointer;
                transition: transform 0.15s ease, background 0.15s ease;
            }

            .save-rate-button:hover {
                transform: translateY(-1px);
                background: #1d4ed8;
            }

            #plant-intel-save-status {
                font-size: 0.95rem;
                min-width: 220px;
            }

            @media (max-width: 1024px) {
                .plant-intel-summary-grid,
                .plant-intel-metrics-grid,
                .plant-intel-inventory-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 720px) {
                .plant-intelligence-extension {
                    padding: 18px;
                }

                .plant-intel-summary-grid,
                .plant-intel-metrics-grid,
                .plant-intel-inventory-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(styles);
    }

    // Attach event listeners
    attachEventListeners() {
        // Toggle modal
        this.toggleBtn.addEventListener('click', () => this.toggleModal());

        // Close modal
        document.getElementById('market-trends-close').addEventListener('click', () => this.toggleModal());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleTabClick(e));
        });

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.toggleModal();
            }
        });
    }

    // Toggle modal visibility
    toggleModal() {
        this.isVisible = !this.isVisible;
        this.modal.style.display = this.isVisible ? 'flex' : 'none';
        if (this.isVisible) {
            this.loadData();
        }
    }

    // Handle tab switching
    handleTabClick(e) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        const commodity = e.target.dataset.commodity;
        this.renderChart(commodity);
        this.updateStats(commodity);
    }

    // Load data from API
    async loadData() {
        try {
            const response = await fetch(`${this.apiBase}/summary`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to fetch market data');

            const data = await response.json();
            const summary = data.summary || data?.summary?.summary || null;
            this.marketTrendSummary = summary;

            // Update summary
            if (summary && summary.commodities) {
                this.updateSummary(summary.commodities);

                // Render initial chart
                const firstCommodity = this.commodities[0];
                this.renderChart(firstCommodity);
                this.updateStats(firstCommodity);
                this.renderMarketTrendCards();
            }

            const timestampEl = document.getElementById('last-updated');
            if (timestampEl) {
                timestampEl.textContent = new Date().toLocaleTimeString();
            }
        } catch (err) {
            console.error('Error loading market data:', err);
            this.showError('Failed to load market trends data');
        }
    }

    // Update summary stats
    updateSummary(commodities) {
        const summaryDiv = document.getElementById('summary-stats');
        const stats = commodities.map(c => {
            const displayPrice = this.formatDisplayPrice(c.name, parseFloat(c.currentPrice));
            const unit = this.units[c.name] || 'unit';
            const explanation = this.getTrendExplanation(c.trend, c.name);

            return `
            <div class="commodity-stat">
                <strong>${this.displayNames[c.name] || c.name}</strong>
                <div class="commodity-price">₹${displayPrice} / ${unit}</div>
                <div class="commodity-trend ${c.trend}">${c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'} ${c.changePercentage}% • ${explanation}</div>
            </div>
        `;
        }).join('');

        summaryDiv.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">${stats}</div>`;
    }

    normalizePrice(commodity, price) {
        if (typeof price !== 'number' || Number.isNaN(price)) return price;
        const config = this.priceRanges[commodity];
        if (!config) return price;
        if (price >= config.min && price <= config.max) return price;

        const raw = Math.max(config.rawMin, Math.min(config.rawMax, price));
        return config.min + ((raw - config.rawMin) / (config.rawMax - config.rawMin || 1)) * (config.max - config.min);
    }

    formatDisplayPrice(commodity, price) {
        const normalized = this.normalizePrice(commodity, Number(price));
        return Number.isNaN(normalized) ? '—' : normalized.toFixed(2);
    }

    getTrendExplanation(trend, commodityName) {
        if (trend === 'up') return 'Demand firm and supply tight';
        if (trend === 'down') return 'Pressure easing from improved supply';
        return 'Stable local industrial movement';
    }

    // Render price chart using SVG
    async renderChart(commodity) {
        try {
            const response = await fetch(`${this.apiBase}/${commodity}/history?limit=30`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to fetch chart data');

            const data = await response.json();
            const history = data.history || [];

            if (history.length === 0) {
                this.showError('No historical data available');
                return;
            }

            this.renderSVGChart(history, commodity);
        } catch (err) {
            console.error('Error rendering chart:', err);
            this.showError('Failed to render chart');
        }
    }

    // Render SVG chart
    renderSVGChart(history, commodity) {
        const svg = document.getElementById('price-chart');
        svg.innerHTML = '';

        const padding = 40;
        const width = svg.clientWidth;
        const height = 300;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;

        const prices = history.map(h => this.normalizePrice(commodity, parseFloat(h.price)));
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        // Create background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', width);
        bg.setAttribute('height', height);
        bg.setAttribute('fill', '#fafafa');
        svg.appendChild(bg);

        // Draw grid lines and labels
        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const price = minPrice + (priceRange / steps) * i;
            const y = height - padding - (price - minPrice) / priceRange * chartHeight;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', padding);
            line.setAttribute('x2', width - padding);
            line.setAttribute('y1', y);
            line.setAttribute('y2', y);
            line.setAttribute('stroke', '#e0e0e0');
            line.setAttribute('stroke-dasharray', '4');
            svg.appendChild(line);

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', padding - 10);
            label.setAttribute('y', y + 4);
            label.setAttribute('font-size', '12');
            label.setAttribute('fill', '#999');
            label.setAttribute('text-anchor', 'end');
            label.textContent = `₹${price.toFixed(0)}`;
            svg.appendChild(label);
        }

        // Draw axes
        const axisX = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axisX.setAttribute('x1', padding);
        axisX.setAttribute('x2', width - padding);
        axisX.setAttribute('y1', height - padding);
        axisX.setAttribute('y2', height - padding);
        axisX.setAttribute('stroke', '#333');
        axisX.setAttribute('stroke-width', '2');
        svg.appendChild(axisX);

        const axisY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        axisY.setAttribute('x1', padding);
        axisY.setAttribute('x2', padding);
        axisY.setAttribute('y1', padding);
        axisY.setAttribute('y2', height - padding);
        axisY.setAttribute('stroke', '#333');
        axisY.setAttribute('stroke-width', '2');
        svg.appendChild(axisY);

        // Draw line chart
        let pathData = '';
        prices.forEach((price, idx) => {
            const x = padding + (idx / (prices.length - 1 || 1)) * chartWidth;
            const y = height - padding - ((price - minPrice) / priceRange) * chartHeight;
            pathData += `${idx === 0 ? 'M' : 'L'} ${x} ${y} `;
        });

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', this.colors[commodity] || '#667eea');
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);

        // Draw points
        prices.forEach((price, idx) => {
            const x = padding + (idx / (prices.length - 1 || 1)) * chartWidth;
            const y = height - padding - ((price - minPrice) / priceRange) * chartHeight;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', idx === prices.length - 1 ? 5 : 3);
            circle.setAttribute('fill', this.colors[commodity] || '#667eea');
            circle.setAttribute('opacity', idx === prices.length - 1 ? '1' : '0.6');
            svg.appendChild(circle);
        });
    }

    // Update stats display
    async updateStats(commodity) {
        try {
            const response = await fetch(`${this.apiBase}/${commodity}/price`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to fetch stats');

            const data = await response.json();
            const price = data.data;

            const displayPrice = this.formatDisplayPrice(commodity, price.current_price);
            const displayUnit = this.units[commodity] || 'unit';
            document.getElementById('current-price').textContent = `₹${displayPrice} / ${displayUnit}`;
            document.getElementById('price-change').textContent = 
                `${price.change_percentage > 0 ? '+' : ''}${price.change_percentage.toFixed(2)}%`;
            
            const trendEmoji = price.trend_direction === 'up' ? '📈' : 
                               price.trend_direction === 'down' ? '📉' : '➡️';
            document.getElementById('trend-direction').textContent = 
                `${trendEmoji} ${price.trend_direction.toUpperCase()}`;

        } catch (err) {
            console.error('Error updating stats:', err);
        }
    }

    // Show error message
    showError(message) {
        const summaryDiv = document.getElementById('summary-stats');
        if (summaryDiv) {
            summaryDiv.innerHTML = `<div style="color: #f44336; padding: 20px; text-align: center;">${message}</div>`;
        }
    }

    async loadDashboardStats() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch('/api/dashboard/stats', { headers });
            if (!response.ok) throw new Error('Failed to fetch dashboard stats');

            const data = await response.json();
            this.dashboardStats = data;
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        }
    }

    async loadOperationalData() {
        const [rates, sales, batches] = await Promise.all([
            this.fetchRates(),
            this.fetchSales(),
            this.fetchBatches()
        ]);

        this.rates = rates;
        this.sales = sales;
        this.batches = batches;
    }

    async fetchRates() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch('/api/rates', { headers });
            if (!response.ok) throw new Error('Failed to fetch rates');
            const data = await response.json();
            return data.data || [];
        } catch (err) {
            console.warn('Plant Intelligence: unable to load rates', err);
            return [];
        }
    }

    async fetchSales() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch('/api/sales', { headers });
            if (!response.ok) throw new Error('Failed to fetch sales data');
            const data = await response.json();
            return data.data || [];
        } catch (err) {
            console.warn('Plant Intelligence: unable to load sales', err);
            return [];
        }
    }

    async fetchBatches() {
        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;
            const response = await fetch('/api/batches', { headers });
            if (!response.ok) throw new Error('Failed to fetch batch records');
            const data = await response.json();
            return data.data || [];
        } catch (err) {
            console.warn('Plant Intelligence: unable to load batches', err);
            return [];
        }
    }

    getToken() {
        return localStorage.getItem('token') || localStorage.getItem('authToken') || null;
    }

    async loadPriceSettings() {
        const fallbackKey = 'plant-intel-price-settings';
        let loadedFromBackend = false;

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch('/api/settings', { headers });
            if (response.ok) {
                const json = await response.json();
                const data = json.data || {};
                const oil = Number(data.oil_price ?? data.OIL_PRICE ?? this.priceSettings.oil);
                const carbon = Number(data.carbon_price ?? data.CARBON_PRICE ?? this.priceSettings.carbon);
                const steel = Number(data.steel_price ?? data.STEEL_PRICE ?? this.priceSettings.steel);
                const energy = Number(data.energy_value ?? data.ENERGY_VALUE ?? this.priceSettings.energy);

                this.priceSettings = {
                    oil: Number.isFinite(oil) && !Number.isNaN(oil) ? oil : this.priceSettings.oil,
                    carbon: Number.isFinite(carbon) && !Number.isNaN(carbon) ? carbon : this.priceSettings.carbon,
                    steel: Number.isFinite(steel) && !Number.isNaN(steel) ? steel : this.priceSettings.steel,
                    energy: Number.isFinite(energy) && !Number.isNaN(energy) ? energy : this.priceSettings.energy
                };

                loadedFromBackend = true;
            }
        } catch (err) {
            console.warn('Plant Intelligence: failed to load settings from backend', err);
        }

        if (!loadedFromBackend) {
            const stored = localStorage.getItem(fallbackKey);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    this.priceSettings = {
                        ...this.priceSettings,
                        ...parsed
                    };
                } catch (err) {
                    console.warn('Plant Intelligence: invalid local price settings', err);
                }
            }
        }

        localStorage.setItem(fallbackKey, JSON.stringify(this.priceSettings));
        this.settingsLoaded = true;
    }

    async savePriceSettings(updatedSettings) {
        const fallbackKey = 'plant-intel-price-settings';
        const payload = {
            oil: Number(updatedSettings.oil),
            carbon: Number(updatedSettings.carbon),
            steel: Number(updatedSettings.steel),
            energy: Number(updatedSettings.energy)
        };

        if (Object.values(payload).some(value => Number.isNaN(value) || value < 0)) {
            throw new Error('Please enter valid non-negative valuation values');
        }

        this.priceSettings = {
            oil: payload.oil,
            carbon: payload.carbon,
            steel: payload.steel,
            energy: payload.energy
        };

        try {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers.Authorization = `Bearer ${token}`;

            const response = await fetch('/api/settings/prices', {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const json = await response.json();
                if (!json.success) {
                    throw new Error(json.message || 'Unable to save pricing controls');
                }
            } else {
                throw new Error('Backend save failed');
            }
        } catch (err) {
            console.warn('Plant Intelligence: unable to save prices to backend, saving locally', err);
        }

        localStorage.setItem(fallbackKey, JSON.stringify(this.priceSettings));
        this.renderPlantIntelligence();
    }

    async handleSavePriceControls() {
        const statusEl = document.getElementById('plant-intel-save-status');
        if (statusEl) {
            statusEl.textContent = 'Saving...';
            statusEl.style.color = '#374151';
        }

        try {
            const updatedSettings = {
                oil: document.getElementById('plant-intel-rate-oil')?.value,
                energy: document.getElementById('plant-intel-rate-energy')?.value,
                carbon: document.getElementById('plant-intel-rate-carbon')?.value,
                steel: document.getElementById('plant-intel-rate-steel')?.value
            };

            await this.savePriceSettings(updatedSettings);

            if (statusEl) {
                statusEl.textContent = 'Saved valuation controls successfully';
                statusEl.style.color = '#16a34a';
            }
        } catch (err) {
            if (statusEl) {
                statusEl.textContent = err.message || 'Failed to save valuation controls';
                statusEl.style.color = '#dc2626';
            }
            console.error(err);
        }

        setTimeout(() => {
            if (statusEl) statusEl.textContent = '';
        }, 4200);
    }

    renderDashboardSummaryCards() {
        let container = document.querySelector('.stats-grid') || document.getElementById('dashboard-summary-cards');
        if (!container) {
            console.warn('MarketTrendsViewer: dashboard summary container not found - skipping injection');
            return;
        }

        const summary = this.dashboardStats?.summary || {};

        const cards = [
            { label: 'Tyres In Hand', value: this.formatStat(summary.currentStock ?? null), unit: 'KG' },
            { label: 'Oil In Tanks', value: this.formatStat(summary.currentOilStock ?? summary.totalProduction?.oil ?? null), unit: 'Ltrs' },
            { label: 'Gas Remaining', value: this.formatStat(summary.currentGasStock ?? summary.totalProduction?.gas ?? null), unit: 'Nm³' },
            { label: 'Carbon Black Remaining', value: this.formatStat(summary.currentCarbonStock ?? summary.totalProduction?.carbon ?? null), unit: 'KG' },
            { label: 'Steel Remaining', value: this.formatStat(summary.currentSteelStock ?? summary.totalProduction?.steel ?? null), unit: 'KG' },
            { label: 'Total Sales Amount', value: this.formatCurrency(summary.totalRevenue ?? 0), unit: '' },
            { label: 'Estimated Profit', value: this.formatCurrency(summary.netProfit ?? 0), unit: '' }
        ];

        // Remove only cards previously injected by this module to avoid wiping original dashboard cards
        Array.from(container.querySelectorAll('.market-trends-injected-card')).forEach(el => el.remove());

        // Append in order without removing other existing stat cards
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'stat-card market-trends-injected-card';
            cardEl.innerHTML = `
                <div class="stat-title">${card.label}</div>
                <div style="display:flex;align-items:baseline;gap:0.5rem;">
                    <div class="stat-value" style="font-size:2.5rem">${card.value}</div>
                    ${card.unit ? `<span style="color:var(--text-secondary);font-size:1.2rem;font-weight:800">${card.unit}</span>` : ''}
                </div>
                <div style="margin-top:1rem;color:var(--text-secondary);font-size:0.9rem;font-weight:700;">
                    ${card.value === 'N/A' ? 'Inventory not available' : 'Live summary from dashboard data'}
                </div>
            `;
            container.appendChild(cardEl);
        });

        console.log('MarketTrendsViewer: ensured primary summary cards are present and injected missing items');
    }

    calculatePlantAnalytics() {
        const summary = this.dashboardStats?.summary || {};
        const ratesByType = (this.rates || []).reduce((map, rate) => {
            if (rate.product_type) {
                map[rate.product_type.toString().toLowerCase()] = Number(rate.unit_price) || 0;
            }
            return map;
        }, {});

        const oilPrice = this.priceSettings.oil || ratesByType['oil'] || ratesByType['pyrolysis oil'] || 40;
        const energyValue = this.priceSettings.energy || ratesByType['gas'] || 12;
        const carbonPrice = this.priceSettings.carbon || ratesByType['carbon'] || 6;
        const steelPrice = this.priceSettings.steel || ratesByType['steel'] || 35;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isToday = (dateValue) => {
            const date = new Date(dateValue);
            if (Number.isNaN(date.getTime())) return false;
            date.setHours(0, 0, 0, 0);
            return date.getTime() === today.getTime();
        };

        const todaySales = (this.sales || []).filter(sale => isToday(sale.date));
        const todayRevenue = todaySales.reduce((sum, sale) => {
            const qty = Number(sale.quantity) || 0;
            const price = Number(sale.price_per_unit || sale.unit_price || 0) || 0;
            return sum + qty * price;
        }, 0);

        const totalProductionOil = Number(summary.totalProduction?.oil) || 0;
        const totalWasteTyres = (this.batches || []).reduce((sum, batch) => sum + (Number(batch.input_tyres) || 0), 0);
        const productionEfficiency = totalWasteTyres ? Math.min(100, Math.round((totalProductionOil / totalWasteTyres) * 100)) : 0;

        const inventoryValue = ((Number(summary.currentOilStock) || 0) * oilPrice)
            + ((Number(summary.currentGasStock) || 0) * energyValue)
            + ((Number(summary.currentCarbonStock) || 0) * carbonPrice)
            + ((Number(summary.currentSteelStock) || 0) * steelPrice);

        const netProfit = Number(summary.netProfit) || 0;
        const totalRevenue = Number(summary.totalRevenue) || 0;
        const profitMargin = totalRevenue ? Math.round((netProfit / totalRevenue) * 100) : 0;

        const recommendations = [];
        if ((Number(summary.currentOilStock) || 0) > 1200) {
            recommendations.push('Prioritize oil dispatch to avoid storage bottlenecks and reduce inventory holding costs.');
        }
        if (productionEfficiency < 45) {
            recommendations.push('Review feedstock handling and combustion control to improve overall production efficiency.');
        }
        if (todayRevenue === 0 && totalRevenue > 0) {
            recommendations.push('Focus on converting inventory into sales today to maintain cash flow.');
        }
        if ((Number(summary.currentSteelStock) || 0) < 500) {
            recommendations.push('Schedule steel procurement now to avoid delays in maintenance or equipment upgrade cycles.');
        }
        if (energyValue < 10) {
            recommendations.push('Review gas recovery performance and energy conversion settings to preserve fuel recovery margins.');
        }
        if (!recommendations.length) {
            recommendations.push('Operations are stable. Keep monitoring stock levels and production efficiency for any swings.');
        }

        return {
            todayRevenue,
            productionEfficiency,
            inventoryValue,
            profitMargin,
            netProfit,
            totalRevenue,
            recommendations,
            oilPrice,
            energyValue,
            carbonPrice,
            steelPrice
        };
    }

    formatCurrency(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
        return `₹${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }

    formatPercent(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
        return `${Number(value).toFixed(0)}%`;
    }

    renderPlantIntelligence() {
        const body = document.getElementById('plant-intelligence-body');
        if (!body) return;

        const summary = this.dashboardStats?.summary || {};
        const analytics = this.calculatePlantAnalytics();
        const dailyMomentum = analytics.totalRevenue ? Math.min(100, Math.round((analytics.todayRevenue / Math.max(1, analytics.totalRevenue)) * 100)) : 0;
        const totalOilProduction = Number(summary.totalProduction?.oil) || 1;
        const inventoryCoverage = totalOilProduction ? Math.min(100, Math.round(((Number(summary.currentOilStock) || 0) / totalOilProduction) * 100)) : 0;

        body.innerHTML = `
            <div class="plant-intel-summary-grid">
                <div class="plant-intel-card">
                    <h3>Today's Revenue</h3>
                    <div class="value">${this.formatCurrency(analytics.todayRevenue)}</div>
                    <div class="metric-note">Sales recognized for today based on recorded invoice dates.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Net Profit</h3>
                    <div class="value">${this.formatCurrency(analytics.netProfit)}</div>
                    <div class="metric-note">Profitability estimate from dashboard revenue and cost performance.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Inventory Value</h3>
                    <div class="value">${this.formatCurrency(analytics.inventoryValue)}</div>
                    <div class="metric-note">Estimated current value of oil, gas, carbon and steel stock.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Profit Margin</h3>
                    <div class="value">${this.formatPercent(analytics.profitMargin)}</div>
                    <div class="metric-note">Margin based on available net profit and revenue figures.</div>
                </div>
            </div>
            <div class="plant-intel-metrics-grid">
                <div class="plant-intel-card">
                    <h3>Production Efficiency</h3>
                    <div class="value">${this.formatPercent(analytics.productionEfficiency)}</div>
                    <div class="metric-note">Converted feedstock to oil output efficiency.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Current Oil Selling Rate</h3>
                    <div class="value">${this.formatCurrency(analytics.oilPrice)}/L</div>
                    <div class="metric-note">Reference for oil valuation and inventory pricing.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Energy Recovery Value</h3>
                    <div class="value">${this.formatCurrency(analytics.energyValue)}/Nm³</div>
                    <div class="metric-note">Rate used for gas recovery and energy equivalent calculations.</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Current Carbon Selling Rate</h3>
                    <div class="value">${this.formatCurrency(analytics.carbonPrice)}/KG</div>
                    <div class="metric-note">Reference for carbon black inventory valuation.</div>
                </div>
            </div>
            <div class="plant-intel-price-controls">
                <div class="plant-intel-card plant-intel-control-panel">
                    <h3>Admin Valuation Controls</h3>
                    <div class="price-control-grid">
                        <div class="rate-control-card">
                            <label for="plant-intel-rate-oil">Current Oil Selling Rate</label>
                            <div class="rate-control-input-row">
                                <input id="plant-intel-rate-oil" type="number" step="0.1" min="0" value="${this.priceSettings.oil}" />
                                <span>₹ / L</span>
                            </div>
                        </div>
                        <div class="rate-control-card">
                            <label for="plant-intel-rate-energy">Energy Recovery Value</label>
                            <div class="rate-control-input-row">
                                <input id="plant-intel-rate-energy" type="number" step="0.1" min="0" value="${this.priceSettings.energy}" />
                                <span>₹ / Nm³</span>
                            </div>
                        </div>
                        <div class="rate-control-card">
                            <label for="plant-intel-rate-carbon">Current Carbon Selling Rate</label>
                            <div class="rate-control-input-row">
                                <input id="plant-intel-rate-carbon" type="number" step="0.1" min="0" value="${this.priceSettings.carbon}" />
                                <span>₹ / KG</span>
                            </div>
                        </div>
                        <div class="rate-control-card">
                            <label for="plant-intel-rate-steel">Steel Selling Rate</label>
                            <div class="rate-control-input-row">
                                <input id="plant-intel-rate-steel" type="number" step="0.1" min="0" value="${this.priceSettings.steel}" />
                                <span>₹ / KG</span>
                            </div>
                        </div>
                    </div>
                    <div class="rate-control-actions">
                        <button id="plant-intel-save-rates" class="save-rate-button" type="button">Save valuation controls</button>
                        <span id="plant-intel-save-status"></span>
                    </div>
                    <div class="metric-note">Admin values persist to local storage and backend when authorized.</div>
                </div>
            </div>
            <div class="plant-intel-performance">
                <div class="plant-intel-card">
                    <h3>Operational Pulse</h3>
                    <div class="performance-block">
                        <div class="performance-row"><span>Feedstock conversion</span><strong>${this.formatPercent(analytics.productionEfficiency)}</strong></div>
                        <div class="performance-bar"><span style="width:${Math.max(0, Math.min(100, analytics.productionEfficiency))}%;"></span></div>
                        <div class="performance-row"><span>Sales momentum</span><strong>${this.formatPercent(dailyMomentum)}</strong></div>
                        <div class="performance-bar"><span style="width:${dailyMomentum}%;"></span></div>
                        <div class="performance-row"><span>Oil inventory coverage</span><strong>${this.formatPercent(inventoryCoverage)}</strong></div>
                        <div class="performance-bar"><span style="width:${inventoryCoverage}%;"></span></div>
                    </div>
                </div>
                <div class="plant-intel-card">
                    <h3>Today's Cash Flow</h3>
                    <div class="value">${this.formatCurrency(analytics.todayRevenue)}</div>
                    <div class="metric-note">Quick snapshot of cash movement and order fulfillment velocity.</div>
                </div>
            </div>
            <div class="plant-intel-inventory-grid">
                <div class="plant-intel-card">
                    <h3>Oil Stock</h3>
                    <div class="value">${this.formatStat(summary.currentOilStock ?? 'N/A')} Ltrs</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Gas Stock</h3>
                    <div class="value">${this.formatStat(summary.currentGasStock ?? 'N/A')} Nm³</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Carbon Black</h3>
                    <div class="value">${this.formatStat(summary.currentCarbonStock ?? 'N/A')} KG</div>
                </div>
                <div class="plant-intel-card">
                    <h3>Steel Stock</h3>
                    <div class="value">${this.formatStat(summary.currentSteelStock ?? 'N/A')} KG</div>
                </div>
            </div>
            <div class="plant-intel-recommendations">
                <h3>Recommendations</h3>
                <ul>${analytics.recommendations.map(item => `<li>${item}</li>`).join('')}</ul>
                <div class="plant-intel-flag"><span></span> Operational insights updated from live ERP data.</div>
            </div>
        `;

        const saveButton = document.getElementById('plant-intel-save-rates');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.handleSavePriceControls());
        }
    }

    renderMarketTrendCards() {
        const grid = document.getElementById('market-trends-commodity-grid');
        if (!grid) return;

        const commodities = this.marketTrendSummary?.commodities || [];
        if (!commodities.length) {
            grid.innerHTML = `<div class="trend-empty">Market trend data is unavailable right now.</div>`;
            return;
        }

        grid.innerHTML = commodities.map(commodity => {
            const displayPrice = this.formatDisplayPrice(commodity.name, parseFloat(commodity.currentPrice));
            const unit = this.units[commodity.name] || 'unit';
            const label = this.displayNames[commodity.name] || commodity.name;
            const explanation = this.getTrendExplanation(commodity.trend, commodity.name);

            return `
            <div class="market-trends-mini-card" data-commodity="${commodity.name}">
                <div class="mini-card-header">
                    <span>${label}</span>
                    <strong>₹${displayPrice}</strong>
                </div>
                <div class="mini-card-subtitle">/ ${unit}</div>
                <div class="mini-card-meta ${commodity.trend}">
                    ${commodity.trend === 'up' ? '▲' : commodity.trend === 'down' ? '▼' : '→'} ${commodity.changePercentage}%
                    <div class="mini-card-explanation">${explanation}</div>
                </div>
                <div class="trend-sparkline"></div>
            </div>
        `;
        }).join('');

        this.renderTrendMiniCharts();
    }

    escapeId(value) {
        return String(value).replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase();
    }

    formatStat(value) {
        if (value === null || value === undefined || value === '') {
            return 'N/A';
        }

        if (typeof value === 'number') {
            return value.toLocaleString();
        }

        return String(value);
    }

    createDashboardSection() {
        if (document.getElementById('plant-intelligence-extension')) return;
        this.injectDashboardStyles();

        const section = document.createElement('section');
        section.id = 'plant-intelligence-extension';
        section.className = 'plant-intelligence-extension';
        section.innerHTML = `
            <div class="plant-intelligence-panel">
                <div class="plant-intel-header">
                    <div>
                        <h2>Plant Intelligence</h2>
                        <p>Operational ERP intelligence for pyrolysis plant owners, built on inventory, production, and sales data.</p>
                    </div>
                    <div class="plant-intel-badge">Industrial KPI Dashboard</div>
                </div>
                <div id="plant-intelligence-body" class="plant-intelligence-body"></div>
            </div>
        `;

        this.extensionRoot = section;
        this.attachDashboardSection(section);
    }

    attachDashboardSection(section) {
        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid && statsGrid.parentElement) {
            // Append inside the existing summary area to keep unified dashboard
            statsGrid.parentElement.insertBefore(section, statsGrid.nextSibling);
            return;
        }

        // If no stats grid is present, do not inject the intelligence UI to avoid global injection
        console.warn('MarketTrendsViewer: stats grid not present; skipping intelligence section injection');
    }

    async renderTrendMiniCharts() {
        const cards = Array.from(document.querySelectorAll('.market-trends-mini-card'));
        for (const card of cards) {
            const commodity = card.dataset.commodity;
            const sparklineHolder = card.querySelector('.trend-sparkline');
            if (!sparklineHolder) continue;

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 220 70');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '70');
            sparklineHolder.innerHTML = '';
            sparklineHolder.appendChild(svg);

            try {
                const history = await this.fetchCommodityHistory(commodity, 12);
                const points = Array.isArray(history) ? history.map(item => this.normalizePrice(commodity, parseFloat(item.price))).filter(price => !Number.isNaN(price)) : [];
                if (!points.length) {
                    svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#999" font-size="12">No trend data</text>`;
                    continue;
                }

                const minPrice = Math.min(...points);
                const maxPrice = Math.max(...points);
                const range = maxPrice - minPrice || 1;
                const stepX = 200 / Math.max(points.length - 1, 1);
                const pathData = points.map((price, index) => {
                    const x = 10 + index * stepX;
                    const y = 60 - ((price - minPrice) / range) * 45;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', this.colors[commodity] || '#667eea');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('stroke-linecap', 'round');
                svg.appendChild(path);

                points.forEach((price, index) => {
                    const x = 10 + index * stepX;
                    const y = 60 - ((price - minPrice) / range) * 45;
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', x);
                    circle.setAttribute('cy', y);
                    circle.setAttribute('r', '3');
                    circle.setAttribute('fill', this.colors[commodity] || '#667eea');
                    svg.appendChild(circle);
                });
            } catch (err) {
                console.error(`Failed to render mini chart for ${commodity}:`, err);
                sparklineHolder.innerHTML = `<span style="color:#999;font-size:12px;">Trend unavailable</span>`;
            }
        }
    }

    async fetchCommodityHistory(commodity, limit = 12) {
        try {
            const response = await fetch(`${this.apiBase}/${encodeURIComponent(commodity)}/history?limit=${limit}`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) return [];
            const json = await response.json();
            return json.history || json.data || [];
        } catch (err) {
            console.warn('MarketTrendsViewer: failed to fetch commodity history', err);
            return [];
        }
    }

    injectDashboardStyles() {
        if (document.getElementById('market-trends-dashboard-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'market-trends-dashboard-styles';
        styles.innerHTML = `
            #plant-intelligence-extension {
                padding: 1.5rem 2rem 2rem;
                background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
                border: 1px solid rgba(148, 163, 184, 0.14);
                box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
                max-width: 1300px;
                margin: 1.5rem auto 2rem;
                border-radius: 24px;
                color: #e2e8f0;
            }
            .plant-intel-header {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 1rem;
                align-items: center;
            }
            .plant-intel-header h2 {
                margin: 0;
                font-size: 2.2rem;
                color: #f8fafc;
            }
            .plant-intel-header p {
                margin: 0.75rem 0 0;
                color: #94a3b8;
                line-height: 1.7;
                max-width: 760px;
            }
            .plant-intel-badge {
                justify-self: end;
                padding: 0.85rem 1.4rem;
                border-radius: 999px;
                font-size: 0.85rem;
                font-weight: 700;
                background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(124,58,237,0.18));
                color: #e0e7ff;
                border: 1px solid rgba(148, 163, 184, 0.2);
            }
            .plant-intelligence-body {
                display: grid;
                gap: 22px;
            }
            .plant-intel-summary-grid,
            .plant-intel-metrics-grid,
            .plant-intel-inventory-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 16px;
            }
            .plant-intel-performance {
                display: grid;
                grid-template-columns: 1.7fr 1fr;
                gap: 16px;
            }
            .plant-intel-card {
                background: rgba(15, 23, 42, 0.9);
                border: 1px solid rgba(148, 163, 184, 0.12);
                border-radius: 20px;
                padding: 22px;
                min-height: 160px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                color: #e2e8f0;
                overflow: hidden;
            }
            .plant-intel-card h3 {
                margin: 0 0 14px;
                font-size: 0.98rem;
                color: #94a3b8;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }
            .plant-intel-card .value {
                font-size: 2.6rem;
                font-weight: 900;
                line-height: 1.05;
                color: #f8fafc;
            }
            .plant-intel-card .metric-note {
                margin-top: 1rem;
                font-size: 0.95rem;
                color: #94a3b8;
                line-height: 1.7;
            }
            .plant-intel-performance .plant-intel-card {
                min-height: 260px;
            }
            .performance-block {
                display: grid;
                gap: 1.15rem;
                margin-top: 1rem;
            }
            .performance-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.95rem;
                color: #cbd5e1;
            }
            .performance-bar {
                height: 10px;
                background: rgba(148, 163, 184, 0.12);
                border-radius: 999px;
                overflow: hidden;
            }
            .performance-bar span {
                display: block;
                height: 100%;
                background: linear-gradient(90deg, #38bdf8 0%, #7c3aed 100%);
            }
            .plant-intel-recommendations {
                border-radius: 20px;
                padding: 24px;
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(148, 163, 184, 0.14);
            }
            .plant-intel-recommendations h3 {
                margin: 0 0 16px;
                font-size: 1.1rem;
                color: #f8fafc;
            }
            .plant-intel-recommendations ul {
                margin: 0;
                padding-left: 18px;
                color: #cbd5e1;
                line-height: 1.8;
            }
            .plant-intel-recommendations li {
                margin-bottom: 0.9rem;
            }
            .plant-intel-flag {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-size: 0.95rem;
                color: #f8fafc;
                font-weight: 700;
                margin-top: 18px;
            }
            .plant-intel-flag span {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                background: linear-gradient(135deg, #38bdf8, #8b5cf6);
            }
            .pi-dropdown {
                position: absolute;
                z-index: 9999;
                min-width: 260px;
                background: rgba(15, 23, 42, 0.98);
                border: 1px solid rgba(148, 163, 184, 0.18);
                border-radius: 14px;
                box-shadow: 0 20px 45px rgba(0,0,0,0.35);
                color: #e2e8f0;
                overflow: hidden;
                padding: 0.75rem 0;
            }
            .pi-dropdown-title {
                padding: 0.85rem 1rem;
                font-size: 0.92rem;
                font-weight: 800;
                color: #fff;
                border-bottom: 1px solid rgba(148,163,184,0.08);
            }
            .pi-dropdown-content {
                display: grid;
                gap: 0.5rem;
                padding: 0.75rem 0.85rem 0.9rem;
            }
            .pi-dropdown-item {
                border-radius: 12px;
                padding: 0.9rem 0.95rem;
                background: rgba(255,255,255,0.04);
            }
            .pi-dropdown-item-title {
                font-size: 0.95rem;
                font-weight: 700;
                color: #f8fafc;
                margin-bottom: 0.35rem;
            }
            .pi-dropdown-item-text {
                font-size: 0.85rem;
                color: #cbd5e1;
                line-height: 1.6;
            }
            .pi-dropdown-link {
                display: block;
                padding: 0.9rem 0.95rem;
                color: #e2e8f0;
                text-decoration: none;
                border-radius: 12px;
                transition: background 0.2s ease;
            }
            .pi-dropdown-link:hover {
                background: rgba(255,255,255,0.06);
            }
            .pi-dropdown-destructive {
                color: #f87171;
            }
            @media (max-width: 1024px) {
                .plant-intel-summary-grid,
                .plant-intel-metrics-grid,
                .plant-intel-inventory-grid,
                .plant-intel-performance {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (max-width: 720px) {
                #plant-intelligence-extension {
                    padding: 1.25rem 1rem 1.5rem;
                }
                .plant-intel-summary-grid,
                .plant-intel-metrics-grid,
                .plant-intel-inventory-grid,
                .plant-intel-performance {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    scheduleRenderRetry(attempts = 0) {
        if (attempts >= 6) return;
        setTimeout(() => {
            const container = document.querySelector('.stats-grid') || document.getElementById('dashboard-summary-cards');
            if (!container) {
                this.scheduleRenderRetry(attempts + 1);
                return;
            }
            this.renderDashboardSummaryCards();
        }, 1500);
    }

    // Start auto-refresh
    startAutoRefresh() {
        setInterval(async () => {
            await this.loadDashboardStats();
            await this.loadOperationalData();
            this.renderDashboardSummaryCards();
            this.renderPlantIntelligence();
        }, this.refreshInterval);
    }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const viewer = new MarketTrendsViewer();
        viewer.init().catch(err => console.error('Failed to init market trends viewer:', err));
    });
} else {
    const viewer = new MarketTrendsViewer();
    viewer.init().catch(err => console.error('Failed to init market trends viewer:', err));
}
