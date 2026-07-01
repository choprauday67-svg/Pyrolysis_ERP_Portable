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
        this.colors = {
            'Pyrolysis Oil': '#FF6B6B',
            'Carbon Black': '#4C4C4C',
            'Gas': '#4ECDC4',
            'Steel': '#666666'
        };
    }

    // Initialize and inject into DOM
    async init() {
        this.createUI();
        this.attachEventListeners();
        await this.loadData();
        this.startAutoRefresh();
        console.log('✅ Market Trends Viewer initialized');
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
                    <button class="tab-btn" data-commodity="Gas">Gas</button>
                    <button class="tab-btn" data-commodity="Steel">Steel</button>
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
            .market-trends-btn {
                padding: 8px 16px;
                margin: 10px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            .market-trends-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
            }

            .market-trends-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }

            .market-trends-content {
                background: white;
                border-radius: 12px;
                max-width: 900px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .market-trends-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 2px solid #f0f0f0;
            }

            .market-trends-header h2 {
                margin: 0;
                color: #333;
                font-size: 24px;
            }

            .close-btn {
                background: #f0f0f0;
                border: none;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                font-size: 24px;
                cursor: button;
                transition: background 0.2s;
            }

            .close-btn:hover {
                background: #e0e0e0;
            }

            .market-trends-tabs {
                display: flex;
                padding: 15px 20px;
                gap: 10px;
                background: #f9f9f9;
                border-bottom: 1px solid #e0e0e0;
            }

            .tab-btn {
                padding: 8px 16px;
                background: white;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                color: #666;
                transition: all 0.2s;
            }

            .tab-btn.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-color: transparent;
            }

            .market-trends-summary {
                padding: 20px;
            }

            .market-trends-chart {
                padding: 0 20px 20px 20px;
            }

            .market-trends-stats {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 15px;
                padding: 20px;
                background: #f9f9f9;
                border-top: 1px solid #e0e0e0;
            }

            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .stat-label {
                font-weight: 600;
                color: #666;
                font-size: 14px;
            }

            .stat-value {
                color: #333;
                font-size: 16px;
                font-weight: bold;
            }

            .market-trends-footer {
                padding: 15px 20px;
                text-align: center;
                color: #999;
                font-size: 12px;
                border-top: 1px solid #e0e0e0;
            }

            @media (max-width: 768px) {
                .market-trends-content {
                    width: 95%;
                    max-height: 95vh;
                }

                .market-trends-stats {
                    grid-template-columns: 1fr;
                }

                .market-trends-tabs {
                    flex-wrap: wrap;
                }

                .market-trends-header h2 {
                    font-size: 18px;
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
            const response = await fetch(`${this.apiBase}/summaryheaders`, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to fetch market data');

            const data = await response.json();

            // Update summary
            if (data.summary && data.summary.commodities) {
                this.updateSummary(data.summary.commodities);

                // Render initial chart
                const firstCommodity = this.commodities[0];
                this.renderChart(firstCommodity);
                this.updateStats(firstCommodity);
            }

            // Update timestamp
            document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
        } catch (err) {
            console.error('Error loading market data:', err);
            this.showError('Failed to load market trends data');
        }
    }

    // Update summary stats
    updateSummary(commodities) {
        const summaryDiv = document.getElementById('summary-stats');
        const stats = commodities.map(c => `
            <div class="commodity-stat">
                <strong>${c.name}</strong>: $${c.currentPrice} 
                <span style="color: ${c.trend === 'up' ? '#4CAF50' : c.trend === 'down' ? '#f44336' : '#999'}">
                    ${c.trend === 'up' ? '↑' : c.trend === 'down' ? '↓' : '→'} ${c.changePercentage}%
                </span>
            </div>
        `).join('');

        summaryDiv.innerHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">${stats}</div>`;
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

        const prices = history.map(h => parseFloat(h.price));
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
            label.textContent = `$${price.toFixed(0)}`;
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

            document.getElementById('current-price').textContent = `$${price.current_price.toFixed(2)}`;
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

    // Start auto-refresh
    startAutoRefresh() {
        setInterval(() => {
            if (this.isVisible) {
                this.loadData();
            }
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
