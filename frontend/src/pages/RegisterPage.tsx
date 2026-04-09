import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function validate(): string | null {
    if (!form.companyName.trim()) return "Naziv firme je obavezan";
    if (!form.email.trim()) return "Email je obavezan";
    if (!form.firstName.trim()) return "Ime je obavezno";
    if (!form.lastName.trim()) return "Prezime je obavezno";
    if (!form.phone.trim()) return "Telefon je obavezan";
    if (form.password.length < 8)
      return "Lozinka mora imati najmanje 8 znakova";
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Greška pri registraciji"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1e3a5f]">Waitino</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registrirajte svoju firmu
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registracija</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Naziv firme</Label>
                <Input
                  id="companyName"
                  placeholder="Npr. Transport d.o.o."
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Ime</Label>
                  <Input
                    id="firstName"
                    placeholder="Ivan"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Prezime</Label>
                  <Input
                    id="lastName"
                    placeholder="Horvat"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ivan@firma.hr"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+385 91 234 5678"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Lozinka</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimalno 8 znakova"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registracija..." : "Registriraj firmu"}
              </Button>

              <p className="text-center text-sm text-gray-500">
                Već imate račun?{" "}
                <Link
                  to="/login"
                  className="font-medium text-[#1e3a5f] hover:underline"
                >
                  Prijavite se
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
