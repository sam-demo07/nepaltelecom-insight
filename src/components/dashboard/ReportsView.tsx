import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ReportsViewProps {
  isAdmin: boolean;
}

export default function ReportsView({ isAdmin }: ReportsViewProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [year, month]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("*, provinces(*)")
      .eq("year", year)
      .eq("month", month)
      .order("provinces(province_number)");

    if (error) {
      toast.error("Failed to load reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  };

  const exportToPDF = () => {
    toast.info("PDF export feature will be implemented with a backend function");
  };

  const totals = reports.reduce(
    (acc, report) => ({
      subscribers: acc.subscribers + (report.total_subscribers || 0),
      revenue: acc.revenue + parseFloat(report.total_revenue || 0),
    }),
    { subscribers: 0, revenue: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Monthly Reports</CardTitle>
            <CardDescription>View and export monthly data reports</CardDescription>
          </div>
          <Button onClick={exportToPDF} disabled={reports.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No reports available for the selected period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Province</TableHead>
                  <TableHead className="text-right">GSM</TableHead>
                  <TableHead className="text-right">CDMA</TableHead>
                  <TableHead className="text-right">PSTN</TableHead>
                  <TableHead className="text-right">ADSL</TableHead>
                  <TableHead className="text-right">FTTH</TableHead>
                  <TableHead className="text-right">Total Subscribers</TableHead>
                  <TableHead className="text-right">Total Revenue (NPR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.provinces?.name}</TableCell>
                    <TableCell className="text-right">{report.gsm_subscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{report.cdma_subscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{report.pstn_subscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{report.adsl_subscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{report.ftth_subscribers.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {report.total_subscribers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {parseFloat(report.total_revenue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">{totals.subscribers.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}