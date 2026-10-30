import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, PawPrint, X } from 'lucide-react';

export interface SavedPet {
    name: string;
    type: string;
    breed: string;
}

interface AddPetDialogProps {
    open: boolean;
    token?: string;
    onClose: () => void;
    onAdded: (pet: SavedPet) => void;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function AddPetDialog({ open, token, onClose, onAdded }: AddPetDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [type, setType] = useState('Dog');
    const [breed, setBreed] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (!open) { dialog.close(); return; }
        setName('');
        setType('Dog');
        setBreed('');
        setError('');
        nameRef.current?.setAttribute('autofocus', '');
        dialog.showModal();
        nameRef.current?.focus();
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previousOverflow; dialog.close(); };
    }, [open]);

    const savePet = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (saving) return;
        if (!name.trim()) { setError('Enter your pet’s name.'); return; }
        if (!token) { setError('Please log in again to add your pet.'); return; }
        setSaving(true);
        setError('');
        try {
            const response = await fetch(`${API}/api/customers/me/pets`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), type, breed: breed.trim() })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Could not save your pet. Please check the details and try again.');
            onAdded(data.pet);
            onClose();
        } catch (error) {
            setError(error instanceof TypeError ? 'Could not connect. Please try again.' : error instanceof Error ? error.message : 'Could not save your pet. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const fieldClass = 'w-full min-h-11 rounded-xl border border-accent-brown/15 bg-[#F7F6F2] px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="add-pet-title"
            aria-describedby="add-pet-description"
            onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}
            className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl bg-white p-6 text-accent-brown shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
        >
            <div className="flex items-center justify-between mb-4">
                <PawPrint className="w-8 h-8 text-brand" aria-hidden="true" />
                <button type="button" aria-label="Close add pet" onClick={onClose} disabled={saving} className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-accent-peach/30 disabled:opacity-40">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <h2 id="add-pet-title" className="text-2xl font-bold">Add your pet</h2>
            <p id="add-pet-description" className="mt-1 mb-5 text-sm text-slate-500">Save your pet’s details in Your family.</p>
            <form onSubmit={savePet} className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="new-pet-name" className="block text-sm font-semibold">Pet name <span className="text-brand">*</span></label>
                    <input ref={nameRef} id="new-pet-name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} disabled={saving} placeholder="e.g. Max" className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="new-pet-type" className="block text-sm font-semibold">Pet type <span className="text-brand">*</span></label>
                    <select id="new-pet-type" value={type} onChange={event => setType(event.target.value)} disabled={saving} className={fieldClass}>
                        {['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].map(type => <option key={type}>{type}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="new-pet-breed" className="block text-sm font-semibold">Breed <span className="font-normal text-slate-500">(optional)</span></label>
                    <input id="new-pet-breed" maxLength={100} value={breed} onChange={event => setBreed(event.target.value)} disabled={saving} placeholder="e.g. Golden Retriever" className={fieldClass} />
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} disabled={saving} className="min-h-11 px-4 rounded-xl border border-accent-brown/15 font-semibold disabled:opacity-40">Cancel</button>
                    <button type="submit" disabled={saving} className="min-h-11 px-5 rounded-xl bg-brand-dark hover:bg-brand text-white font-bold flex items-center gap-2 disabled:opacity-60">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {saving ? 'Saving…' : 'Save pet'}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
