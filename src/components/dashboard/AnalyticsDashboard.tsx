import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658"];

export default function AnalyticsDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reports, setReports] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalRevenue: 0,
    avgGrowth: 0,
    provincesReporting: 0,
  });

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const fetchData = async () => {
    const [reportsRes, provincesRes] = await Promise.all([
      supabase
        .from("monthly_reports")
        .select("*, provinces(*)")
        .eq("year", year)
        .eq("month", month),
      supabase.from("provinces").select("*").order("province_number"),
    ]);

    if (reportsRes.data) {
      setReports(reportsRes.data);
      calculateStats(reportsRes.data);
    }
    if (provincesRes.data) setProvinces(provincesRes.data);
  };

  const calculateStats = async (data: any[]) => {
    const totalSubscribers = data.reduce((sum, r) => sum + (r.total_subscribers || 0), 0);
    const totalRevenue = data.reduce((sum, r) => sum + parseFloat(r.total_revenue || 0), 0);

    const growthRate = await calculateGrowthRate();

    setStats({
      totalSubscribers,
      totalRevenue,
      avgGrowth: growthRate,
      provincesReporting: data.length,
    });
  };

  const calculateGrowthRate = async () => {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;

    const { data: previousData } = await supabase
      .from("monthly_reports")
      .select("total_subscribers")
      .eq("year", previousYear)
      .eq("month", previousMonth);

    const { data: currentData } = await supabase
      .from("monthly_reports")
      .select("total_subscribers")
      .eq("year", year)
      .eq("month", month);

    if (!previousData || !currentData || previousData.length === 0 || currentData.length === 0) {
      return 0;
    }

    const previousTotal = previousData.reduce((sum, r) => sum + (r.total_subscribers || 0), 0);
    const currentTotal = currentData.reduce((sum, r) => sum + (r.total_subscribers || 0), 0);

    if (previousTotal === 0) return 0;

    const growth = ((currentTotal - previousTotal) / previousTotal) * 100;
    return parseFloat(growth.toFixed(2));
  };

  const provinceData = reports.map(r => ({
    name: r.provinces?.name || "Unknown",
    subscribers: r.total_subscribers || 0,
    revenue: parseFloat(r.total_revenue || 0),
  }));

  const serviceData = reports.length > 0 ? [
    { name: "GSM", value: reports.reduce((sum, r) => sum + (r.gsm_subscribers || 0), 0) },
    { name: "CDMA", value: reports.reduce((sum, r) => sum + (r.cdma_subscribers || 0), 0) },
    { name: "PSTN", value: reports.reduce((sum, r) => sum + (r.pstn_subscribers || 0), 0) },
    { name: "ADSL", value: reports.reduce((sum, r) => sum + (r.adsl_subscribers || 0), 0) },
    { name: "FTTH", value: reports.reduce((sum, r) => sum + (r.ftth_subscribers || 0), 0) },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">NPR {stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgGrowth >= 0 ? '+' : ''}{stats.avgGrowth}%</div>
            <p className="text-xs text-muted-foreground mt-1">vs previous month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provinces Reporting</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.provincesReporting} / 7</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscribers by Province</CardTitle>
            <CardDescription>Total subscribers across all provinces</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provinceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="subscribers" fill="#8884d8" name="Subscribers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Province</CardTitle>
            <CardDescription>Revenue distribution (NPR)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={provinceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue (NPR)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {serviceData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
              <CardDescription>Subscribers by service type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}