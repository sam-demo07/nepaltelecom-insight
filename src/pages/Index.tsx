import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Database, FileText, Lock, TrendingUp, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Nepal Telecom</h1>
              <p className="text-xs text-muted-foreground">Management Information System</p>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Login
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Nepal Telecom <span className="text-primary">MIS</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive Management Information System for tracking subscribers, revenue, and analytics across all 7 provinces of Nepal
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")}>
              View Dashboard
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <Database className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Province Data Management</CardTitle>
              <CardDescription>
                Enter and manage monthly subscriber and revenue data for all 7 provinces
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Visualize trends with interactive charts and real-time statistics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Report Generation</CardTitle>
              <CardDescription>
                Generate and export comprehensive reports in PDF format
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Multi-Service Tracking</CardTitle>
              <CardDescription>
                Track GSM, CDMA, PSTN, ADSL, and FTTH subscribers separately
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Lock className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Secure admin and user roles with controlled data entry permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Validation System</CardTitle>
              <CardDescription>
                Auto-check data completion across all provinces for each reporting period
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">System Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <p><strong>7 Provinces Coverage:</strong> Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, and Sudurpashchim</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <p><strong>Multiple Service Types:</strong> GSM, CDMA, PSTN, ADSL, and FTTH tracking</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <p><strong>Real-time Analytics:</strong> Interactive charts and statistics</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <p><strong>Secure Authentication:</strong> Admin and user role management</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2" />
              <p><strong>Data Validation:</strong> Automatic completion status tracking</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t bg-card/80 backdrop-blur mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Nepal Telecom Management Information System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
