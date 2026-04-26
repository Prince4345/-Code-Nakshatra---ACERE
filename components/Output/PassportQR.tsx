import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PassportQRProps {
    data: any;
}

export const PassportQR: React.FC<PassportQRProps> = ({ data }) => {
    // In a real app, this would be a hash on the blockchain.
    // For the hackathon, we encode the JSON outcome into a verifiable URL.
    const payload = JSON.stringify(data);
    const hash = btoa(payload).substring(0, 32); // Mock hash
    const qrValue = `https://aerce.eu/verify?hash=${hash}`;

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg inline-block w-full max-w-[200px]">
            <QRCodeSVG value={qrValue} size={168} className="w-full h-auto" />
            <div className="mt-3 text-center">
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">Digital Passport</p>
                <p className="text-[8px] font-mono text-slate-500 mt-1 break-all">ID: {hash}</p>
            </div>
        </div>
    );
};
