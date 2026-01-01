import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Subscription() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchSubscriptionInfo();

    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [user, navigate, sessionId]);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await axios.get(`${API}/subscription/info`, { headers });
      setSubscriptionInfo(response.data);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Aboneliğiniz sona erdi');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    if (attempts >= maxAttempts) {
      toast.error('Ödeme durumu kontrol edilemedi');
      setCheckingStatus(false);
      return;
    }

    setCheckingStatus(true);
    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`, { headers });
      
      if (response.data.payment_status === 'paid') {
        toast.success('Ödeme başarılı! Aboneliğiniz aktif edildi.');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else if (response.data.status === 'expired') {
        toast.error('Ödeme oturumu süresi doldu');
        setCheckingStatus(false);
      } else {
        setTimeout(() => checkPaymentStatus(sessionId, attempts + 1), 2000);
      }
    } catch (error) {
      toast.error('Ödeme durumu kontrol edilemedi');
      setCheckingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    setProcessingPayment(true);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(
        `${API}/payments/checkout`,
        {
          package_id: 'monthly',
          origin_url: originUrl
        },
        { headers }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ödeme başlatılamadı');
      setProcessingPayment(false);
    }
  };

  if (loading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {checkingStatus ? 'Ödeme kontrol ediliyor...' : 'Yükleniyor...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard'a Dön
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card data-testid="current-status-card">
            <CardHeader>
              <CardTitle>Mevcut Durum</CardTitle>
              <CardDescription>Abonelik bilgileriniz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptionInfo && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <p className="text-lg font-semibold capitalize">
                      {subscriptionInfo.subscription_status === 'trial' && 'Deneme Sürümü'}
                      {subscriptionInfo.subscription_status === 'active' && 'Aktif'}
                      {subscriptionInfo.subscription_status === 'expired' && 'Süresi Dolmuş'}
                    </p>
                  </div>
                  {subscriptionInfo.days_remaining !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground">Kalan Süre</p>
                      <p className="text-2xl font-bold text-primary">
                        {subscriptionInfo.days_remaining} gün
                      </p>
                    </div>
                  )}
                  {subscriptionInfo.trial_end_date && subscriptionInfo.subscription_status === 'trial' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Deneme Bitiş Tarihi</p>
                      <p className="font-medium">
                        {new Date(subscriptionInfo.trial_end_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )}
                  {subscriptionInfo.subscription_end_date && subscriptionInfo.subscription_status === 'active' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Abonelik Bitiş Tarihi</p>
                      <p className="font-medium">
                        {new Date(subscriptionInfo.subscription_end_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card data-testid="pricing-card" className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">Aylık Abonelik</CardTitle>
              <CardDescription>Sınırsız erişim</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">99₺</span>
                  <span className="text-muted-foreground">/ay</span>
                </div>
              </div>

              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Sınırsız kategori ve ürün</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>QR menü oluşturma</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Fotoğraf yükleme</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Renk özelleştirme</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Logo ve kapak görseli</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>7 gün ücretsiz deneme</span>
                </li>
              </ul>

              <Button
                onClick={handleSubscribe}
                disabled={processingPayment}
                className="w-full"
                size="lg"
                data-testid="subscribe-button"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yönlendiriliyor...
                  </>
                ) : (
                  'Aboneliği Başlat'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}