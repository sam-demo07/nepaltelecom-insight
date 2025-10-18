import { createClient } from 'npm:@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { month, year } = await req.json();

    const { data: reports, error } = await supabase
      .from('monthly_reports')
      .select('*, provinces(*)')
      .eq('month', month)
      .eq('year', year)
      .order('provinces(province_number)');

    if (error) throw error;

    const htmlContent = generateHTML(reports, month, year);
    const pdfBytes = await generatePDF(htmlContent);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="report-${year}-${month}.pdf"`,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});

function generateHTML(reports: any[], month: number, year: number): string {
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  
  const totals = reports.reduce(
    (acc, r) => ({
      subscribers: acc.subscribers + (r.total_subscribers || 0),
      revenue: acc.revenue + parseFloat(r.total_revenue || 0),
    }),
    { subscribers: 0, revenue: 0 }
  );

  let tableRows = '';
  reports.forEach(report => {
    tableRows += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${report.provinces?.name || 'Unknown'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(report.gsm_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(report.cdma_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(report.pstn_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(report.adsl_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(report.ftth_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${(report.total_subscribers || 0).toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${parseFloat(report.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
          }
          h1 {
            color: #333;
            text-align: center;
          }
          h2 {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #4CAF50;
            color: white;
            padding: 12px;
            text-align: left;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .total-row {
            background-color: #e8f5e9 !important;
            font-weight: bold;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>Nepal Telecom MIS</h1>
        <h2>Monthly Report - ${monthName} ${year}</h2>
        
        <table>
          <thead>
            <tr>
              <th>Province</th>
              <th style="text-align: right;">GSM</th>
              <th style="text-align: right;">CDMA</th>
              <th style="text-align: right;">PSTN</th>
              <th style="text-align: right;">ADSL</th>
              <th style="text-align: right;">FTTH</th>
              <th style="text-align: right;">Total Subscribers</th>
              <th style="text-align: right;">Total Revenue (NPR)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr class="total-row">
              <td style="border: 1px solid #ddd; padding: 8px;">TOTAL</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">-</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totals.subscribers.toLocaleString()}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          Generated on ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
  `;
}

async function generatePDF(html: string): Promise<Uint8Array> {
  const command = new Deno.Command('wkhtmltopdf', {
    args: ['-', '-'],
    stdin: 'piped',
    stdout: 'piped',
    stderr: 'piped',
  });

  const process = command.spawn();
  
  const writer = process.stdin.getWriter();
  await writer.write(new TextEncoder().encode(html));
  await writer.close();

  const { stdout } = await process.output();
  return stdout;
}
