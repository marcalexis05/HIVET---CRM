export type ComplianceStatus = 'pending' | 'verified' | 'non_compliant';

// Unsupported legacy values need review; they must never imply approval.
export function normalizeComplianceStatus(value: unknown): ComplianceStatus {
    if (typeof value !== 'string') return 'pending';
    const status = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
    return status === 'verified' || status === 'non_compliant' ? status : 'pending';
}
