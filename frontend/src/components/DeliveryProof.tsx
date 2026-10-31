import { useEffect, useState, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function EvidencePhoto({ url, alt = "Supply photo", className = "", expandable = true }: { url?: string | null; alt?: string; className?: string; expandable?: boolean }) {
    const [image, setImage] = useState('');
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const photoDialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (expanded) photoDialog.current?.showModal();
        else photoDialog.current?.close();
    }, [expanded]);
    useEffect(() => {
        setImage(''); setError(''); setExpanded(false);
        if (!url) return;
        const privatePhoto = /^\/api\/(?:deliveries\/\d+\/proof|orders\/\d+\/refund-photo\/refund_[0-9]+_[0-9]+_[0-9a-f]{32}\.jpg)$/.test(url);
        if (!privatePhoto) {
            if (/^https?:\/\//.test(url)) setImage(url);
            return;
        }
        const controller = new AbortController();
        let objectUrl = '';
        fetch(`${API}${url}`, { headers: { Authorization: `Bearer ${localStorage.getItem('hivet_token')}` }, signal: controller.signal })
            .then(async response => {
                if (!response.ok) throw new Error('Could not load this photo.');
                const blob = await response.blob();
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(blob); setImage(objectUrl);
            }).catch(error => { if (error.name !== 'AbortError') setError(error.message); });
        return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [url]);
    if (!url) return null;
    if (error) return <p role="alert" className="text-sm text-red-600">{error}</p>;
    if (!image) return <p className="text-xs text-slate-500">Loading photo...</p>;
    const imageElement = <img src={image} alt={alt} className={`w-full rounded-xl object-contain bg-slate-50 max-h-64 ${className}`} />;
    return expandable ? <div>
        <button type="button" onClick={() => setExpanded(true)} aria-haspopup="dialog" className="block w-full" aria-label={`Enlarge ${alt.toLowerCase()}`}>{imageElement}</button>
        <p className="text-xs text-slate-500">Tap the photo to enlarge it.</p>
        <dialog ref={photoDialog} onClose={() => setExpanded(false)} onCancel={() => setExpanded(false)} onKeyDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} aria-label={alt} className="m-auto max-w-[95vw] max-h-[95dvh] bg-white p-4 rounded-2xl shadow-2xl backdrop:bg-transparent">
            <button type="button" onClick={() => setExpanded(false)} className="block ml-auto mb-3 min-h-11 px-4 rounded-xl bg-slate-100 font-bold text-accent-brown">Close photo</button>
            <img src={image} alt={alt} className="max-w-full max-h-[75dvh] object-contain" />
        </dialog>
    </div> : imageElement;
}

export default function DeliveryProof({ url }: { url?: string | null }) {
    if (!url) return null;
    return <section className="p-4 rounded-2xl border border-accent-brown/10 bg-white space-y-3" aria-label="Proof of delivery">
        <h4 className="font-bold text-accent-brown">Delivery photo</h4>
        <p className="text-xs text-slate-500">Photo submitted by the rider for this order.</p>
        <EvidencePhoto url={url} alt="Delivery proof submitted by the rider" />
    </section>;
}
