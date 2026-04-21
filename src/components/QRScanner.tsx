import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true);
      // Wait for the DOM element to be ready
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear();
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Silence errors as they happen constantly while scanning
          }
        );

        scannerRef.current = scanner;
        setIsInitializing(false);
      }, 500);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [isOpen, onScanSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Scan de Carte Gadzola
          </DialogTitle>
          <DialogDescription>
            Placez le QR code du client au centre du carré pour l'identifier.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl bg-black border-4 border-primary/20">
          <div id="qr-reader" className="w-full h-full" />
          
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3 transition-opacity">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium animate-pulse">Initialisation de la caméra…</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onClose} className="w-full">
            <X className="mr-2 h-4 w-4" /> Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
