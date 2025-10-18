import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658"];

interface Province {
  id: string;
  name: string;
  province_number: number;
}

export default function ComparisonView() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [comparisonType, setComparisonType] = useState<"monthly" | "yearly">("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (selectedProvinces.length > 0) {
      fetchComparisonData();
    }
  }, [selectedProvinces, comparisonType, year]);

  const fetchProvinces = async () => {
    const { data } = await supabase
      .from("provinces")
      .select("*")
      .order("province_number");
    if (data) setProvinces(data);
  };

  const fetchComparisonData = async () => {
    setLoading(true);

    if (comparisonType === "monthly") {
      const { data } = await supabase
        .from("monthly_reports")
        .select("*, provinces(*)")
        .eq("year", year)
        .in("province_id", selectedProvinces)
        .order("month");

      if (data) {
        const monthlyData = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const monthData: any = {
            month: new Date(2000, i).toLocaleString("default", { month: "short" }),
          };

          selectedProvinces.forEach(provinceId => {
            const province = provinces.find(p => p.id === provinceId);
            const report = data.find(r => r.month === month && r.province_id === provinceId);
            if (province) {
              monthData[`${province.name}_subscribers`] = report?.total_subscribers || 0;
              monthData[`${province.name}_revenue`] = parseFloat(String(report?.total_revenue || "0"));
            }
          });

          return monthData;
        });
        setComparisonData(monthlyData);
      }
    } else {
      const startYear = year - 4;
      const years = Array.from({ length: 5 }, (_, i) => startYear + i);

      const { data } = await supabase
        .from("monthly_reports")
        .select("*, provinces(*)")
        .in("year", years)
        .in("province_id", selectedProvinces);

      if (data) {
        const yearlyData = years.map(y => {
          const yearData: any = { year: y };

          selectedProvinces.forEach(provinceId => {
            const province = provinces.find(p => p.id === provinceId);
            const yearReports = data.filter(r => r.year === y && r.province_id === provinceId);

            if (province) {
              const totalSubscribers = yearReports.reduce((sum, r) => sum + (r.total_subscribers || 0), 0);
              const totalRevenue = yearReports.reduce((sum, r) => sum + Number(r.total_revenue || 0), 0);

              yearData[`${province.name}_subscribers`] = totalSubscribers;
              yearData[`${province.name}_revenue`] = totalRevenue;
            }
          });

          return yearData;
        });
        setComparisonData(yearlyData);
      }
    }

    setLoading(false);
  };

  const handleProvinceToggle = (provinceId: string) => {
    setSelectedProvinces(prev =>
      prev.includes(provinceId)
        ? prev.filter(id => id !== provinceId)
        : [...prev, provinceId]
    );
  };

  const subscriberKeys = selectedProvinces.map(pid => {
    const province = provinces.find(p => p.id === pid);
    return province ? `${province.name}_subscribers` : '';
  }).filter(Boolean);

  const revenueKeys = selectedProvinces.map(pid => {
    const province = provinces.find(p => p.id === pid);
    return province ? `${province.name}_revenue` : '';
  }).filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Province Comparison</CardTitle>
          <CardDescription>Compare data across provinces on monthly or yearly basis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Comparison Type</Label>
              <Select value={comparisonType} onValueChange={(v: any) => setComparisonType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Comparison</SelectItem>
                  <SelectItem value="yearly">Yearly Comparison</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {comparisonType === "monthly" && (
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {comparisonType === "yearly" && (
              <div className="space-y-2">
                <Label>End Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Shows data from {year - 4} to {year}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Select Provinces to Compare</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {provinces.map(province => (
                <div key={province.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={province.id}
                    checked={selectedProvinces.includes(province.id)}
                    onCheckedChange={() => handleProvinceToggle(province.id)}
                  />
                  <label
                    htmlFor={province.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {province.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedProvinces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select at least one province to view comparison data
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            Loading comparison data...
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="subscribers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="subscribers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscribers Comparison</CardTitle>
                <CardDescription>
                  {comparisonType === "monthly" ? `Monthly comparison for ${year}` : `Yearly comparison (${year - 4} - ${year})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={comparisonType === "monthly" ? "month" : "year"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {subscriberKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[idx % COLORS.length]}
                        name={key.replace('_subscribers', '')}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscribers Bar Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={comparisonType === "monthly" ? "month" : "year"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {subscriberKeys.map((key, idx) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={COLORS[idx % COLORS.length]}
                        name={key.replace('_subscribers', '')}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Comparison</CardTitle>
                <CardDescription>
                  {comparisonType === "monthly" ? `Monthly comparison for ${year}` : `Yearly comparison (${year - 4} - ${year})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={comparisonType === "monthly" ? "month" : "year"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {revenueKeys.map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={COLORS[idx % COLORS.length]}
                        name={key.replace('_revenue', '')}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Bar Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={comparisonType === "monthly" ? "month" : "year"} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {revenueKeys.map((key, idx) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill={COLORS[idx % COLORS.length]}
                        name={key.replace('_revenue', '')}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
