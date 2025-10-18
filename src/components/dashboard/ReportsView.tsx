import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    if (reports.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const doc = new jsPDF();

      const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });

      doc.setFontSize(18);
      doc.text("Nepal Telecom MIS", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });

      doc.setFontSize(14);
      doc.text(`Monthly Report - ${monthName} ${year}`, doc.internal.pageSize.getWidth() / 2, 25, { align: "center" });

      const tableData = reports.map(report => [
        report.provinces?.name || "Unknown",
        (report.gsm_subscribers || 0).toLocaleString(),
        (report.cdma_subscribers || 0).toLocaleString(),
        (report.pstn_subscribers || 0).toLocaleString(),
        (report.adsl_subscribers || 0).toLocaleString(),
        (report.ftth_subscribers || 0).toLocaleString(),
        (report.total_subscribers || 0).toLocaleString(),
        parseFloat(report.total_revenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
      ]);

      tableData.push([
        "TOTAL",
        "-",
        "-",
        "-",
        "-",
        "-",
        totals.subscribers.toLocaleString(),
        totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      ]);

      autoTable(doc, {
        startY: 35,
        head: [["Province", "GSM", "CDMA", "PSTN", "ADSL", "FTTH", "Total Subscribers", "Total Revenue (NPR)"]],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: 255,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [232, 245, 233],
          textColor: 0,
          fontStyle: "bold",
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { halign: "right", cellWidth: 20 },
          2: { halign: "right", cellWidth: 20 },
          3: { halign: "right", cellWidth: 20 },
          4: { halign: "right", cellWidth: 20 },
          5: { halign: "right", cellWidth: 20 },
          6: { halign: "right", cellWidth: 28 },
          7: { halign: "right", cellWidth: 32 },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        doc.internal.pageSize.getWidth() / 2,
        finalY + 15,
        { align: "center" }
      );

      doc.save(`report-${year}-${month}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    }
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