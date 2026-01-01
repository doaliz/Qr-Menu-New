import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const FRONTEND_URL = window.location.origin;

export default function QRCodePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const menuUrl = `${FRONTEND_URL}/menu/${user.id}`;

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = 512;
    canvas.height = 512;
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${user.name}-qr-menu.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Panele Dön
          </Button>
        </div>

        <Card data-testid="qr-card">
          <CardHeader>
            <CardTitle className="text-3xl playfair">QR Menü Kodunuz</CardTitle>
            <CardDescription>
              Müşterileriniz bu QR kodu okutarak menünüze erişebilir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center p-8 bg-white rounded-lg">
              <QRCodeSVG
                id="qr-code-svg"
                value={menuUrl}
                size={256}
                level="H"
                includeMargin={true}
                data-testid="qr-code"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Menü URL:</label>
                <div className="mt-1 p-3 bg-muted rounded-md break-all text-sm" data-testid="menu-url">
                  {menuUrl}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={downloadQRCode} className="flex-1" data-testid="download-button">
                  <Download className="h-4 w-4 mr-2" />
                  QR Kodu İndir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(menuUrl, '_blank')}
                  className="flex-1"
                  data-testid="preview-button"
                >
                  Menüyü Önizle
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Kullanım İpuçları:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>QR kodu masaüstü standlarına yerleştirebilirsiniz</li>
                <li>QR kodu büyük boyutta bastırıp duvara asabilirsiniz</li>
                <li>Menüde yaptığınız değişiklikler anlık olarak yansır</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}