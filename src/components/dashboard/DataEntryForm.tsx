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
  const [userProvinceId, setUserProvinceId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [completionStatus, setCompletionStatus] = useState<{ completed: number; total: number } | null>(null);
  
  const [formData, setFormData] = useState({
    gsm_subscribers: '',
    cdma_subscribers: '',
    pstn_subscribers: '',
    adsl_subscribers: '',
    ftth_subscribers: '',
    gsm_revenue: '',
    cdma_revenue: '',
    pstn_revenue: '',
    adsl_revenue: '',
    ftth_revenue: '',
  });

  useEffect(() => {
    fetchUserProvince();
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (userProvinceId && !selectedProvince) {
      setSelectedProvince(userProvinceId);
    }
  }, [userProvinceId, selectedProvince]);

  useEffect(() => {
    if (month && year) {
      checkCompletionStatus();
    }
  }, [month, year]);

  const fetchUserProvince = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_roles")
      .select("province_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!error && data?.province_id) {
      setUserProvinceId(data.province_id);
    }
  };

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
      gsm_subscribers: parseInt(formData.gsm_subscribers) || 0,
      cdma_subscribers: parseInt(formData.cdma_subscribers) || 0,
      pstn_subscribers: parseInt(formData.pstn_subscribers) || 0,
      adsl_subscribers: parseInt(formData.adsl_subscribers) || 0,
      ftth_subscribers: parseInt(formData.ftth_subscribers) || 0,
      gsm_revenue: parseFloat(formData.gsm_revenue) || 0,
      cdma_revenue: parseFloat(formData.cdma_revenue) || 0,
      pstn_revenue: parseFloat(formData.pstn_revenue) || 0,
      adsl_revenue: parseFloat(formData.adsl_revenue) || 0,
      ftth_revenue: parseFloat(formData.ftth_revenue) || 0,
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
        gsm_subscribers: '',
        cdma_subscribers: '',
        pstn_subscribers: '',
        adsl_subscribers: '',
        ftth_subscribers: '',
        gsm_revenue: '',
        cdma_revenue: '',
        pstn_revenue: '',
        adsl_revenue: '',
        ftth_revenue: '',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
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
            <Select
              value={selectedProvince}
              onValueChange={setSelectedProvince}
              disabled={!!userProvinceId}
            >
              <SelectTrigger id="province">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces
                  .filter(p => !userProvinceId || p.id === userProvinceId)
                  .map((province) => (
                    <SelectItem key={province.id} value={province.id}>
                      {province.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {userProvinceId && (
              <p className="text-xs text-muted-foreground">You can only enter data for your assigned province</p>
            )}
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={formData[`${type}_subscribers` as keyof typeof formData]}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    handleInputChange(`${type}_subscribers`, value);
                  }}
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
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formData[`${type}_revenue` as keyof typeof formData]}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    const parts = value.split('.');
                    if (parts.length > 2) return;
                    handleInputChange(`${type}_revenue`, value);
                  }}
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