import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ManualSubscription() {
  const { user, token, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [durationType, setDurationType] = useState('365'); // 365 days = 1 year
  const [processing, setProcessing] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const durationOptions = [
    { value: '30', label: '1 Ay (30 Gün)' },
    { value: '90', label: '3 Ay (90 Gün)' },
    { value: '180', label: '6 Ay (180 Gün)' },
    { value: '365', label: '1 Yıl (365 Gün)' },
    { value: '730', label: '2 Yıl (730 Gün)' }
  ];

  // Redirect if not super admin
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [user, isSuperAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Lütfen email adresi girin');
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(
        `${API}/admin/manual-subscription`,
        {
          email: email.trim(),
          duration_days: parseInt(durationType)
        },
        { headers }
      );

      toast.success(`Başarılı! ${response.data.restaurant_name} için ${response.data.days_added} gün eklendi`);
      setEmail('');
      setDurationType('365');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Abonelik eklenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  if (!user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>

        <Card data-testid="manual-subscription-card">
          <CardHeader>
            <CardTitle className="text-3xl playfair">Manuel Abonelik Tanımlama</CardTitle>
            <CardDescription>
              Yüz yüze satış yaptığınız müşteriler için manuel lisans ekleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer-email">Müşteri Email Adresi</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="musteri@restaurant.com"
                  required
                  data-testid="customer-email-input"
                />
                <p className="text-xs text-muted-foreground">
                  Müşterinin kayıt olurken kullandığı email adresini girin
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Abonelik Süresi</Label>
                <Select value={durationType} onValueChange={setDurationType}>
                  <SelectTrigger data-testid="duration-select">
                    <SelectValue placeholder="Süre seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg p-4 bg-muted">
                <h3 className="font-medium mb-2">Önemli Notlar:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Müşteri sistemde kayıtlı olmalıdır</li>
                  <li>Eğer aktif aboneliği varsa üzerine eklenir</li>
                  <li>Deneme süresi bitmişse yeni abonelik başlatılır</li>
                  <li>Tüm işlemler loglanır ve takip edilebilir</li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={processing}
                className="w-full"
                size="lg"
                data-testid="add-subscription-button"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  'Abonelik Ekle'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
