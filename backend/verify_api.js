const http = require('http');
const loginData = JSON.stringify({ email: 'admin@pyrolysis.com', password: 'admin123' });
const req = http.request(
  { host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length } },
  res => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', () => {
      const r = JSON.parse(d);
      if (!r.token) { console.log('LOGIN FAIL:', d); return; }
      console.log('LOGIN OK');
      const tok = r.token;

      function fetchAPI(path) {
        return new Promise((resolve) => {
          http.get({ host: 'localhost', port: 5000, path, headers: { Authorization: 'Bearer ' + tok } }, res => {
            let d = ''; res.on('data', c => d += c);
            res.on('end', () => resolve(JSON.parse(d)));
          });
        });
      }

      Promise.all([
        fetchAPI('/api/dashboard/stats'),
        fetchAPI('/api/dashboard/production-kpis'),
        fetchAPI('/api/dashboard/search?q=oil'),
      ]).then(([stats, kpis, search]) => {
        console.log('=== STATS ===');
        console.log('Revenue:', stats.summary?.totalRevenue);
        console.log('Profit:', stats.summary?.netProfit);
        console.log('Tyre Stock:', stats.summary?.currentStock);
        console.log('Alerts:', stats.alerts?.list?.length);
        console.log('Alert Types:', stats.alerts?.list?.map(a => a.type).join(', '));
        console.log('');
        console.log('=== PRODUCTION KPIs ===');
        console.log('Oil Produced:', kpis.allTime?.oil, 'kg');
        console.log('Carbon Produced:', kpis.allTime?.carbon, 'kg');
        console.log('Steel Produced:', kpis.allTime?.steel, 'kg');
        console.log('Tyre Stock (KPIs):', kpis.stock?.tyres, 'kg');
        console.log('Batch Utilization:', kpis.utilization?.percentage + '%');
        console.log('Avg Yield:', kpis.allTime?.avgYield + '%');
        console.log('');
        console.log('=== SEARCH ===');
        console.log('Results for "oil":', search.results?.length);
        console.log('Types found:', search.results?.map(r => r.type).join(', '));
      });
    });
  }
);
req.write(loginData); req.end();
