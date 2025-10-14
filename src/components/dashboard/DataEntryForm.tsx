import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface Province {
  id: string;
  name: string;
  province_number: number;
}

export default function DataEntryForm() {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [completionStatus, setCompletionStatus] = useState<{ completed: number; total: number } | null>(null);
  
  const [formData, setFormData] = useState({
    gsm_subscribers: 0,
    cdma_subscribers: 0,
    pstn_subscribers: 0,
    adsl_subscribers: 0,
    ftth_subscribers: 0,
    gsm_revenue: 0,
    cdma_revenue: 0,
    pstn_revenue: 0,
    adsl_revenue: 0,
    ftth_revenue: 0,
  });

  useEffect(() => {
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (month && year) {
      checkCompletionStatus();
    }
  }, [month, year]);

  const fetchProvinces = async () => {
    const { data, error } = await supabase
      .from("provinces")
      .select("*")
      .order("province_number");

    if (error) {
      toast.error("Failed to load provinces");
    } else {
      setProvinces(data || []);
    }
  };

  const checkCompletionStatus = async () => {
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("province_id")
      .eq("month", month)
      .eq("year", year);

    if (!error && data) {
      setCompletionStatus({ completed: data.length, total: 7 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProvince) {
      toast.error("Please select a province");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const reportData = {
      province_id: selectedProvince,
      month,
      year,
      ...formData,
      entered_by: user.id,
    };

    const { error } = await supabase
      .from("monthly_reports")
      .upsert(reportData, { onConflict: "province_id,month,year" });

    if (error) {
      toast.error("Failed to save report: " + error.message);
    } else {
      toast.success("Report saved successfully!");
      checkCompletionStatus();
      setFormData({
        gsm_subscribers: 0,
        cdma_subscribers: 0,
        pstn_subscribers: 0,
        adsl_subscribers: 0,
        ftth_subscribers: 0,
        gsm_revenue: 0,
        cdma_revenue: 0,
        pstn_revenue: 0,
        adsl_revenue: 0,
        ftth_revenue: 0,
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  return (
    <div className="space-y-6">
      {completionStatus && (
        <Alert variant={completionStatus.completed === completionStatus.total ? "default" : "destructive"}>
          {completionStatus.completed === completionStatus.total ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {completionStatus.completed} of {completionStatus.total} provinces completed for {month}/{year}
            {completionStatus.completed === completionStatus.total && " - All provinces data entered!"}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Select value={selectedProvince} onValueChange={setSelectedProvince}>
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((province) => (
                  <SelectItem key={province.id} value={province.id}>
                    {province.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger id="month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger id="year">
                <SelectValue />
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
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Subscribers</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {["gsm", "cdma", "pstn", "adsl", "ftth"].map((type) => (
              <div key={type} className="space-y-2">
                <Label htmlFor={`${type}_subscribers`}>{type.toUpperCase()}</Label>
                <Input
                  id={`${type}_subscribers`}
                  type="number"
                  min="0"
                  value={formData[`${type}_subscribers` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`${type}_subscribers`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Revenue (NPR)</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {["gsm", "cdma", "pstn", "adsl", "ftth"].map((type) => (
              <div key={type} className="space-y-2">
                <Label htmlFor={`${type}_revenue`}>{type.toUpperCase()}</Label>
                <Input
                  id={`${type}_revenue`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData[`${type}_revenue` as keyof typeof formData]}
                  onChange={(e) => handleInputChange(`${type}_revenue`, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">
          Save Report
        </Button>
      </form>
    </div>
  );
}