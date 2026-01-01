import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SubscriptionBanner() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [show, setShow] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await axios.get(`${API}/subscription/info`, { headers });
      const info = response.data;
      
      if ((info.subscription_status === 'trial' || info.subscription_status === 'active') && info.days_remaining <= 3) {
        setSubscriptionInfo(info);
        setShow(true);
      }
    } catch (error) {
      console.error('Subscription info fetch error:', error);
    }
  };

  if (!show || !subscriptionInfo) return null;

  return (
    <div className="bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800" data-testid="subscription-banner">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              {subscriptionInfo.subscription_status === 'trial' ? (
                <>
                  Deneme süreniz <strong>{subscriptionInfo.days_remaining} gün</strong> içinde sona erecek.
                </>
              ) : (
                <>
                  Aboneliğiniz <strong>{subscriptionInfo.days_remaining} gün</strong> içinde sona erecek.
                </>
              )}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/subscription')}
            className="bg-orange-600 hover:bg-orange-700 text-white"
            data-testid="upgrade-button"
          >
            {subscriptionInfo.subscription_status === 'trial' ? 'Aboneliği Başlat' : 'Aboneliği Yenile'}
          </Button>
        </div>
      </div>
    </div>
  );
}