'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toCanvas } from 'qrcode';
import { toPng, toBlob } from 'html-to-image';
import {
    DocumentPlusIcon,
    PrinterIcon,
    ShareIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface CertificateData {
    id: string;
    date: string;
    expiryDate: string;
    registrationNumber: string;
    fullName: string;
    emailAddress: string;
    courseCompleted: string;
    levelCompleted: string;
    signature: string;
    qrCode: string;
}

const CertificateDisplay: React.FC = () => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const qrCodeRef = useRef<HTMLCanvasElement>(null);
    const searchParams = useSearchParams();
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isVerificationVisible, setIsVerificationVisible] = useState(false);

    const certificateData = (() => {
        const data: Partial<CertificateData> = {};
        for (const [key, value] of searchParams.entries()) {
            (data as any)[key] = decodeURIComponent(value);
        }
        const requiredKeys: (keyof CertificateData)[] = [
            'id', 'date', 'expiryDate', 'registrationNumber',
            'fullName', 'emailAddress', 'courseCompleted',
            'levelCompleted', 'signature', 'qrCode'
        ];
        return requiredKeys.every(k => data[k]) ? data as CertificateData : null;
    })();

    useEffect(() => {
        const generateQrCode = async () => {
            if (certificateData?.qrCode && qrCodeRef.current) {
                try {
                    await toCanvas(qrCodeRef.current, certificateData.qrCode, {
                        width: 90,
                        margin: 1,
                        color: { dark: '#000', light: '#fff' },
                    });
                    const dataUrl = qrCodeRef.current.toDataURL('image/png');
                    setQrCodeDataUrl(dataUrl);
                } catch (err) {
                    console.error('QR code generation failed:', err);
                }
            }
        };

        generateQrCode();
    }, [certificateData]);

    const cleanColorStyles = (node: unknown): boolean => {
        if (!(node instanceof Element)) return true;

        const style = window.getComputedStyle(node);
        const props = ['color', 'backgroundColor', 'borderColor'];

        props.forEach((prop) => {
            const val = style.getPropertyValue(prop);
            if (val.includes('oklch') || val.includes('lab')) {
                (node as HTMLElement).style.setProperty(prop, '#000');
            }
        });

        return true;
    };

    const captureImage = async () => {
        if (!certificateRef.current) return null;

        try {
            const dataUrl = await toPng(certificateRef.current, {
                filter: (node) => cleanColorStyles(node as HTMLElement),
                cacheBust: true,
                pixelRatio: 2,
            });

            return dataUrl;
        } catch (error) {
            console.error('Capture failed:', error);
            return null;
        }
    };

    const handleDownload = async () => {
        setLoading(true);
        try {
            const dataUrl = await captureImage();
            if (!dataUrl) return;

            const link = document.createElement('a');
            link.download = `certificate-${certificateData?.registrationNumber}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download failed', err);
            alert('Failed to download the certificate.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        setLoading(true);
        try {
            if (!certificateRef.current) return;

            const blob = await toBlob(certificateRef.current, {
                filter: (node) => cleanColorStyles(node as HTMLElement),
                cacheBust: true,
                pixelRatio: 2,
            });

            if (!blob) throw new Error('Could not generate blob');

            const file = new File([blob], `certificate-${certificateData?.registrationNumber}.png`, { type: 'image/png' });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: 'Certificate of Achievement',
                    text: `I've completed ${certificateData?.courseCompleted}!`,
                    files: [file],
                });
            } else {
                alert('Sharing not supported. Please download and share manually.');
            }
        } catch (err) {
            console.error('Share failed', err);
            alert('Unable to share the certificate.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        const dataUrl = await captureImage();
        if (!dataUrl) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Certificate</title>
                    <style>body { margin: 0; }</style>
                </head>
                <body>
                    <img id="print-Image" src="${dataUrl}" style="width:100%;" />
                </body>
            </html>
        `);

        printWindow.document.close();

        printWindow.onload = () => {
            const img = printWindow.document.getElementById('print-Image') as HTMLImageElement;
            if (img) {
                img.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                };
            } else {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }
        };
    };

    const handleVerifyCertificate = () => {
        setIsVerificationVisible(true);
        setTimeout(() => setIsVerificationVisible(false), 3000);
    };

    if (!certificateData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-6">
                <div className="bg-white shadow-xl rounded-lg p-10 max-w-md w-full">
                    <h1 className="text-2xl font-bold text-black mb-4">Certificate Not Found</h1>
                    <p className="text-gray-600">Invalid or missing certificate data.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-black p-6 flex flex-col items-center">
            <div ref={certificateRef} className="relative w-full max-w-4xl rounded-xl shadow-2xl p-10 relative overflow-hidden border-4 border-opacity-20 border-blue-400 bg-gradient-to-br from-white to-gray-100">
                <div className="absolute inset-0 bg-[url('/back.png')] bg-cover z-80 pointer-events-none" />
                <img src="/ssd.png" alt="Logo" className="absolute justify-center z-3 opacity-20 w-full" />
                <div className="relative z-30">
                    {/* Certificate content... */}
                    <div className="text-center mb-8">
                        <img src="/icon.png" alt="Logo" className="w-40 mx-auto mb-3" />
                        <h1 className="text-3xl font-bold uppercase text-gray-800 tracking-wide leading-tight">
                            The Spatial & Data Science Institute
                        </h1>
                        <p className="text-sm text-gray-500 italic mt-1">*Recognizing Excellence in Learning*</p>
                    </div>
                    <div className="text-center mb-8">
                        <div className="inline-block border-b-8 border-blue-500 pb-2">
                            <h2 className="text-5xl font-semibold text-blue-700 tracking-tight">
                                Certificate of <span className="font-extrabold">Achievement</span>
                            </h2>
                        </div>
                    </div>
                    <p className="text-center text-lg text-black mb-3">This is to certify that</p>
                    <p className="text-center text-5xl font-bold italic text-indigo-800 mb-4 shadow-sm">{certificateData.fullName}</p>
                    <p className="text-center text-lg text-gray-700 mb-2">has <span className="italic font-medium text-green-800">successfully completed</span> the</p>
                    <p className="text-center text-3xl font-bold text-blue-800 mb-1">{certificateData.courseCompleted}</p>
                    <p className="text-center text-md text-gray-600 mb-8">at the <i className="font-semibold">{certificateData.levelCompleted}</i> level</p>

                    {/* Dates and QR */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 text-center text-sm text-gray-600 gap-6 my-10">
                        <div>
                            <h4 className="font-semibold text-black uppercase tracking-wide mb-1">Issue Date</h4>
                            <p className="text-blue-700 font-medium">{certificateData.date}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-black uppercase tracking-wide mb-1">Registration No.</h4>
                            <p className="text-green-700 font-medium">{certificateData.registrationNumber}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-black uppercase tracking-wide mb-1">Expiration</h4>
                            <p className="text-red-700 font-medium">{certificateData.expiryDate}</p>
                        </div>
                    </div>

                    <div className="flex justify-around items-center mt-12 flex-wrap gap-8">
                        <div className="text-center">
                            <img src={certificateData.signature} className="w-32 border-gray-400 mx-auto" alt="Student Signature" />
                            <p className="text-xs mt-1 border-t-3 text-black">Student Signature</p>
                        </div>
                        <div className="text-center">
                            <img src="/man.png" className="w-10 border-gray-400" alt="Management Signature" />
                            <p className="text-xs border-t-3 mt-1 text-black">Management Signature</p>
                        </div>
                        <div className="text-center">
                            <canvas ref={qrCodeRef} className="w-24 h-32 mx-auto" />
                            <p className="text-xs text-black mt-1">Scan to Verify</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-12 flex flex-wrap justify-center gap-4">
                <button onClick={handleDownload} disabled={loading} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-semibold transition-colors duration-200 shadow-md">
                    <DocumentPlusIcon className="h-5 w-5" />
                    {loading ? 'Downloading...' : 'Download'}
                </button>
                <button onClick={handlePrint} disabled={loading} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-semibold transition-colors duration-200 shadow-md">
                    <PrinterIcon className="h-5 w-5" />
                    Print
                </button>
                <button onClick={handleShare} disabled={loading} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-semibold transition-colors duration-200 shadow-md">
                    <ShareIcon className="h-5 w-5" />
                    {loading ? 'Sharing...' : 'Share'}
                </button>
                <button onClick={handleVerifyCertificate} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-3 rounded-md font-semibold transition-colors duration-200 shadow-md">
                    <CheckCircleIcon className="h-5 w-5" />
                    Verify
                </button>
            </div>

            {isVerificationVisible && (
                <div className="fixed bottom-6 right-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg max-w-sm">
                    <strong className="font-bold">Certificate Verified!</strong>
                    <span className="block sm:inline ml-2">This certificate is authentic.</span>
                </div>
            )}
        </div>
    );
};

export default CertificateDisplay;
