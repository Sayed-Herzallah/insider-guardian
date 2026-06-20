import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import gsap from 'gsap';
import type { Alert } from '@/types';

interface ScanWidgetProps {
  onThreatDetected: () => void;
}

export default function ScanWidget({ onThreatDetected }: ScanWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [threatFound, setThreatFound] = useState(false);
  const { addAlert } = useData();
  const progressRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const completeScan = useCallback((file: File) => {
    setIsScanning(false);
    setScanComplete(true);
    setThreatFound(true);

    const newAlert: Alert = {
      id: `ALT-${String(Date.now()).slice(-6)}`,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      host: 'WS-UPLOAD-001',
      threatName: `Malware.${file.name.split('.')[0].toUpperCase()}.Trojan`,
      status: 'new',
      user: 'current.user',
      description: `Malicious file detected during upload scan: ${file.name}`,
      evidence: ['File hash match in threat database', 'Suspicious behavior pattern', 'Known malware signature'],
      iocs: [
        { type: 'hash', value: `sha256:${Math.random().toString(36).substring(2, 15)}` },
      ],
      mitreTactic: 'Initial Access',
      mitreTechnique: 'T1566.001 - Spearphishing Attachment',
    };

    addAlert(newAlert);
    onThreatDetected();

    gsap.fromTo(
      progressRef.current,
      { scale: 1 },
      { scale: 1.1, duration: 0.3, yoyo: true, repeat: 1, ease: 'power2.out' }
    );
  }, [addAlert, onThreatDetected]);

  const simulateScan = useCallback((file: File) => {
    setIsScanning(true);
    setScanProgress(0);

    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setScanProgress(progress);

      if (ringRef.current) {
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progress / 100) * circumference;
        ringRef.current.style.strokeDashoffset = String(offset);
      }

      if (currentStep >= steps) {
        clearInterval(progressInterval);
        completeScan(file);
      }
    }, interval);
  }, [completeScan]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setScannedFile(file);
      simulateScan(file);
    }
  }, [simulateScan]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setScannedFile(file);
      simulateScan(file);
    }
  }, [simulateScan]);

  const resetScan = useCallback(() => {
    setScannedFile(null);
    setScanComplete(false);
    setThreatFound(false);
    setScanProgress(0);
    if (ringRef.current) {
      ringRef.current.style.strokeDashoffset = '339.292';
    }
  }, []);

  return (
    <div className="card-dark p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-[#f4f6fb]">Scan Artifact</h3>
        {scanComplete && (
          <button
            onClick={resetScan}
            className="text-xs text-[#a6acb8] hover:text-[#f4f6fb] flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {!scannedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            drop-zone h-36 sm:h-48 flex flex-col items-center justify-center gap-2 sm:gap-4 p-4
            ${isDragging ? 'drag-over' : ''}
          `}
        >
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#00d4c3]/10 flex items-center justify-center">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-[#00d4c3]" />
          </div>
          <div className="text-center">
            <p className="text-xs sm:text-sm text-[#f4f6fb] mb-1">
              Drag and drop a file here, or{' '}
              <label className="text-[#00d4c3] cursor-pointer hover:underline">
                browse
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-[10px] sm:text-xs text-[#6b7280]">
              Supports: EXE, DLL, PDF, DOC, ZIP (max 50MB)
            </p>
          </div>
        </div>
      ) : (
        <div ref={progressRef} className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[rgba(244,246,251,0.03)]">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#00d4c3]/10 flex items-center justify-center flex-shrink-0">
              <File className="w-4 h-4 sm:w-5 sm:h-5 text-[#00d4c3]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#f4f6fb] truncate">
                {scannedFile.name}
              </p>
              <p className="text-[10px] sm:text-xs text-[#6b7280]">
                {(scannedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center py-3 sm:py-4">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="rgba(244, 246, 251, 0.1)"
                  strokeWidth="8"
                />
                <circle
                  ref={ringRef}
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke={scanComplete ? (threatFound ? '#ff3b30' : '#00d4c3') : '#00d4c3'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="339.292"
                  strokeDashoffset="339.292"
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {!scanComplete ? (
                  <>
                    <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-[#00d4c3] animate-spin mb-0.5 sm:mb-1" />
                    <span className="text-lg sm:text-2xl font-bold text-[#f4f6fb]">
                      {Math.round(scanProgress)}%
                    </span>
                  </>
                ) : threatFound ? (
                  <>
                    <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-[#ff3b30] mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs text-[#ff3b30] font-medium">THREAT</span>
                  </>
                ) : (
                  <>
                    <Check className="w-8 h-8 sm:w-10 sm:h-10 text-[#00d4c3] mb-0.5 sm:mb-1" />
                    <span className="text-[10px] sm:text-xs text-[#00d4c3] font-medium">CLEAN</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!scanComplete && (
            <p className="text-center text-xs sm:text-sm text-[#a6acb8]">
              Analyzing file for threats...
            </p>
          )}

          {scanComplete && threatFound && (
            <div className="p-2 sm:p-3 rounded-lg bg-[#ff3b30]/10 border border-[#ff3b30]/30">
              <p className="text-xs sm:text-sm font-medium text-[#ff3b30] mb-1">
                Malware Detected!
              </p>
              <p className="text-[10px] sm:text-xs text-[#a6acb8]">
                Threat has been added to alerts. File quarantined.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
