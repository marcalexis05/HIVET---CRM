const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type CheckoutItem = { id?: number | string; product_id?: number | string; business_id?: number | string; clinic_id?: number | string };
type ExistingOrder = { clinic_id?: number | string; business_id?: number | string; branch_id?: number | string } | null;
interface PickupClinic {
    id: number;
    name: string;
    phone?: string;
    branches: { id: number; name: string; phone?: string; address_line1?: string; address_line2?: string; lat?: number; lng?: number; is_main?: boolean }[];
}
const idOf = (value: unknown) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;

export async function loadPickupClinics(items: CheckoutItem[], order: ExistingOrder, signal?: AbortSignal): Promise<PickupClinic[]> {
    const productIdsForCheckout = [...new Set(items.map(item => idOf(item.product_id || item.id)).filter((id): id is number => id !== null))];
    if (productIdsForCheckout.length && !(order?.branch_id && !idOf(order.clinic_id || order.business_id))) {
        const response = await fetch(`${API}/api/checkout/pickup-branches?product_ids=${productIdsForCheckout.join(',')}`, { signal });
        if (response.ok) {
            const result = await response.json();
            if (!Array.isArray(result.clinics)) throw new Error('Could not load clinic branches. Please try again.');
            const owner = idOf(order?.clinic_id || order?.business_id);
            return result.clinics.filter((clinic: any) => !owner || Number(clinic.id) === owner);
        }
        // Support an older backend during a rolling frontend/backend deployment.
        if (response.status !== 404 && response.status !== 405) throw new Error('Could not load clinic branches. Please try again.');
    }
    const read = async (path: string) => {
        const response = await fetch(`${API}${path}`, { signal });
        if (!response.ok) throw new Error('Could not load clinic branches. Please try again.');
        return response.json();
    };
    const directory = await read('/api/clinics');
    if (!Array.isArray(directory.clinics)) throw new Error('Could not load clinic branches. Please try again.');
    const clinics = new Map<number, any>();
    for (const clinic of directory.clinics) {
        const id = idOf(clinic.id);
        if (id) clinics.set(id, { ...clinic, id, branches: (clinic.branches || []).map((branch: any) => ({ ...branch, id: Number(branch.id) })) });
    }
    const orderClinic = idOf(order?.clinic_id || order?.business_id);
    const sellers = new Set<number>();
    if (orderClinic) sellers.add(orderClinic);
    else for (const item of items) {
        const id = idOf(item.business_id || item.clinic_id);
        if (id) sellers.add(id);
    }
    if (order?.branch_id && !orderClinic) {
        const { branch } = await read(`/api/clinics/branches/${Number(order.branch_id)}`);
        const id = idOf(branch?.clinic_id);
        if (id) {
            sellers.clear();
            sellers.add(id);
            if (!clinics.has(id)) clinics.set(id, { id, name: branch.clinic_name, phone: branch.phone, branches: [{ ...branch, id: Number(branch.id) }] });
        }
    }
    // Products already expose their own seller's branches. Recover missing sellers
    // from that source without changing the approval rules of the public directory.
    const missingProducts = items.filter(item => {
        const id = idOf(item.business_id || item.clinic_id);
        return !id || (sellers.has(id) && !clinics.get(id)?.branches.length);
    });
    const productIds = [...new Set(missingProducts.map(item => idOf(item.product_id || item.id)).filter((id): id is number => id !== null))];
    const products = await Promise.all(productIds.map(id => read(`/api/catalog/${id}`)));
    for (const product of products) {
        const id = idOf(product.business_id);
        if (!id || (orderClinic && id !== orderClinic)) continue;
        const item = items.find(item => idOf(item.product_id || item.id) === idOf(product.id));
        const expectedSeller = idOf(item?.business_id || item?.clinic_id);
        if (expectedSeller && expectedSeller !== id) throw new Error('Product information changed. Refresh your cart and try again.');
        if (!expectedSeller && !order?.branch_id) sellers.add(id);
        if (!sellers.has(id)) continue;
        const existing = clinics.get(id);
        if (existing?.branches.length) continue;
        const branches = new Map<number, any>();
        for (const branch of product.branch_availability || []) {
            const branchId = idOf(branch.branch_id);
            if (branchId) branches.set(branchId, { id: branchId, name: branch.name, address_line1: branch.address || '', address_line2: '', phone: product.clinic_phone || '', lat: branch.lat, lng: branch.lng });
        }
        clinics.set(id, { ...existing, id, name: product.clinic_name || existing?.name || 'Clinic', phone: product.clinic_phone, branches: [...branches.values()] });
    }
    return [...clinics.values()].filter(clinic => sellers.has(clinic.id));
}
