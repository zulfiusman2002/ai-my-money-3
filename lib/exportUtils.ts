import { PaperTrade, AIAnalysis, PerformanceMetrics } from '../lib/types'

export function exportToCSV(trades: PaperTrade[], filename: string = 'trades.csv') {
  const headers = [
    'Ticker', 'Company', 'Entry Date', 'Entry Price', 'Position Size', 
    'Amount', 'Stop Loss', 'Target 1', 'Target 2', 'Latest Price',
    'Exit Date', 'Exit Price', 'Exit Reason', 'P&L', 'Return %',
    'Holding Period', 'Grade', 'Status', 'Notes'
  ]

  const rows = trades.map(t => [
    t.ticker,
    t.company,
    new Date(t.entry_date).toLocaleDateString(),
    t.entry_price,
    t.position_size,
    t.virtual_amount?.toFixed(2),
    t.stop_loss,
    t.take_profit_1,
    t.take_profit_2,
    t.latest_price,
    t.exit_date ? new Date(t.exit_date).toLocaleDateString() : '',
    t.exit_price || '',
    t.exit_reason || '',
    t.pnl?.toFixed(2) || '',
    t.return_pct?.toFixed(2) || '',
    t.max_holding_period,
    t.grade || '',
    t.status,
    t.notes || '',
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')

  downloadFile(csv, filename, 'text/csv')
}

export function exportToJSON(data: any, filename: string = 'export.json') {
  const json = JSON.stringify(data, null, 2)
  downloadFile(json, filename, 'application/json')
}

export async function exportToExcel(trades: PaperTrade[], filename: string = 'trades.xlsx') {
  try {
    const XLSX = await import('xlsx')
    
    const wsData = [
      ['AI Momentum Trading Lab — Trade Journal'],
      ['Generated:', new Date().toLocaleDateString()],
      [],
      ['Ticker', 'Company', 'Entry Date', 'Entry Price', 'Size', 'Amount Invested',
       'Stop Loss', 'Target 1', 'Target 2', 'Latest Price', 'Exit Date', 'Exit Price',
       'Exit Reason', 'P&L ($)', 'Return (%)', 'Grade', 'Status'],
      ...trades.map(t => [
        t.ticker,
        t.company,
        new Date(t.entry_date).toLocaleDateString(),
        t.entry_price,
        t.position_size,
        t.virtual_amount,
        t.stop_loss,
        t.take_profit_1,
        t.take_profit_2,
        t.latest_price,
        t.exit_date ? new Date(t.exit_date).toLocaleDateString() : '',
        t.exit_price || '',
        t.exit_reason || '',
        t.pnl || '',
        t.return_pct || '',
        t.grade || '',
        t.status,
      ]),
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trades')

    // Style headers
    ws['A1'] = { v: 'AI Momentum Trading Lab — Trade Journal', t: 's' }

    XLSX.writeFile(wb, filename)
  } catch (err) {
    console.error('Excel export failed:', err)
    exportToCSV(trades, filename.replace('.xlsx', '.csv'))
  }
}

export async function exportToPDFReport(
  trades: PaperTrade[],
  metrics: PerformanceMetrics,
  filename: string = 'trading-report.pdf'
) {
  // Build HTML report for PDF
  const closed = trades.filter(t => t.status === 'CLOSED')
  const winRate = closed.length > 0 
    ? ((closed.filter(t => (t.return_pct || 0) > 0).length / closed.length) * 100).toFixed(1) 
    : '0'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Momentum Trading Lab — Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
        h1 { color: #1a1a2e; font-size: 20px; }
        h2 { color: #16213e; font-size: 15px; margin-top: 20px; border-bottom: 1px solid #ddd; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #0f3460; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 10px; }
        .pos { color: #16a34a; font-weight: bold; }
        .neg { color: #dc2626; font-weight: bold; }
        .metric { display: inline-block; margin: 5px; padding: 8px 12px; background: #f5f5f5; border-radius: 6px; }
        .disclaimer { margin-top: 30px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; font-size: 10px; }
      </style>
    </head>
    <body>
      <h1>🚀 AI Momentum Trading Lab</h1>
      <p>Performance Report — Generated ${new Date().toLocaleDateString()}</p>
      <p><strong>Disclaimer: This is a virtual paper-trading research tool only. No real money involved.</strong></p>
      
      <h2>Account Summary</h2>
      <div>
        <div class="metric"><strong>Virtual Balance</strong><br>$${metrics.virtual_balance.toLocaleString()}</div>
        <div class="metric"><strong>Total P&L</strong><br><span class="${metrics.total_pnl >= 0 ? 'pos' : 'neg'}">$${metrics.total_pnl.toLocaleString()}</span></div>
        <div class="metric"><strong>Win Rate</strong><br>${winRate}%</div>
        <div class="metric"><strong>Profit Factor</strong><br>${metrics.profit_factor.toFixed(2)}</div>
        <div class="metric"><strong>Total Trades</strong><br>${metrics.total_trades}</div>
        <div class="metric"><strong>Max Drawdown</strong><br>${metrics.max_drawdown.toFixed(1)}%</div>
      </div>

      <h2>Trade Journal</h2>
      <table>
        <thead>
          <tr>
            <th>Ticker</th><th>Entry Date</th><th>Entry $</th><th>Exit $</th>
            <th>P&L</th><th>Return</th><th>Exit Reason</th><th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${closed.map(t => `
            <tr>
              <td><strong>${t.ticker}</strong></td>
              <td>${new Date(t.entry_date).toLocaleDateString()}</td>
              <td>$${t.entry_price.toFixed(2)}</td>
              <td>$${(t.exit_price || t.latest_price).toFixed(2)}</td>
              <td class="${(t.pnl || 0) >= 0 ? 'pos' : 'neg'}">$${(t.pnl || 0).toFixed(2)}</td>
              <td class="${(t.return_pct || 0) >= 0 ? 'pos' : 'neg'}">${(t.return_pct || 0).toFixed(2)}%</td>
              <td>${t.exit_reason || '—'}</td>
              <td>${t.grade || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="disclaimer">
        ⚠️ This is a virtual paper-trading research tool only. It does not provide financial advice 
        and does not execute real trades. Past paper-trading performance is not indicative of future results.
        Always consult a licensed financial advisor before making investment decisions.
      </div>
    </body>
    </html>
  `

  // Open print dialog for PDF
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 500)
  }
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
