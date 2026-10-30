import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bike, Loader2, RefreshCw, Store, Users, X } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SERIES = [
    { key: 'Partners', label: 'Clinics', color: '#F97316' },
    { key: 'Riders', label: 'Riders', color: '#0F9B8E' },
    { key: 'Customers', label: 'Customers', color: '#7C6AE6' }
] as const;
const tooltipStyle = { borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgb(0 0 0 / 6%)', fontSize: 13 };
const axisStyle = { fill: '#64748B', fontSize: 11 };

interface Account { id: string; name: string; email: string; joined: string }
type AccountGroup = 'partners' | 'riders' | 'customers' | 'end_users';
interface DashboardStats {
    partners: number; partners_trend: string;
    riders: number; riders_trend: string;
    customers: number; customers_trend: string;
    end_users: number; end_users_trend: string;
    details: Record<AccountGroup, Account[]>;
}
interface Analytics {
    growth: { name: string; Partners: number; Riders: number; Customers: number }[];
    distribution: { name: string; value: number; color: string }[];
    velocity: { date: string; new: number }[];
}

function AccountList({ title, accounts, onClose }: { title: string; accounts: Account[]; onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { dialog?.close(); document.body.style.overflow = overflow; };
    }, []);

    return (
        <dialog ref={dialogRef} aria-labelledby="admin-accounts-title" onCancel={event => { event.preventDefault(); onClose(); }} className="admin-accounts-dialog">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
                <div>
                    <h2 id="admin-accounts-title" className="text-xl font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">Latest accounts and contact details.</p>
                </div>
                <button type="button" aria-label="Close account list" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="max-h-[60dvh] overflow-auto p-5 sm:p-6">
                {accounts.length ? (
                    <table className="w-full min-w-[440px] text-left text-sm">
                        <thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th scope="col" className="pb-3 pr-4 font-medium">Name</th><th scope="col" className="pb-3 pr-4 font-medium">Email</th><th scope="col" className="pb-3 font-medium">Joined</th></tr></thead>
                        <tbody>{accounts.map(account => <tr key={account.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4"><span className="block font-medium text-slate-800">{account.name}</span><span className="text-xs text-slate-400">{account.id}</span></td><td className="py-3 pr-4 text-slate-600 break-all">{account.email}</td><td className="whitespace-nowrap py-3 text-slate-500">{account.joined}</td></tr>)}</tbody>
                    </table>
                ) : <p className="py-10 text-center text-sm text-slate-500">No accounts yet.</p>}
            </div>
        </dialog>
    );
}

export default function AdminDashboard() {
    const { user, isLoading: authLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<AccountGroup | null>(null);

    const loadDashboard = useCallback(async () => {
        if (authLoading || !user?.token) return;
        setLoading(true);
        setError('');
        try {
            const headers = { Authorization: `Bearer ${user.token}` };
            const [statsResponse, analyticsResponse] = await Promise.all([
                fetch(`${API}/api/admin/dashboard-stats`, { headers }),
                fetch(`${API}/api/admin/analytics`, { headers })
            ]);
            if (!statsResponse.ok || !analyticsResponse.ok) throw new Error('Could not load your dashboard. Please try again.');
            const [nextStats, nextAnalytics] = await Promise.all([statsResponse.json(), analyticsResponse.json()]);
            setStats(nextStats);
            setAnalytics(nextAnalytics);
        } catch {
            setError('Could not load your dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [authLoading, user?.token]);

    useEffect(() => { void loadDashboard(); }, [loadDashboard]);

    const cards = stats ? [
        { key: 'partners' as const, label: 'Clinics', note: 'Approved clinics', value: stats.partners, added: stats.partners_trend, icon: Store, color: 'orange' },
        { key: 'riders' as const, label: 'Riders', note: 'Approved riders', value: stats.riders, added: stats.riders_trend, icon: Bike, color: 'teal' },
        { key: 'customers' as const, label: 'Customers', note: 'Pet owner accounts', value: stats.customers, added: stats.customers_trend, icon: Users, color: 'violet' },
        { key: 'end_users' as const, label: 'Total accounts', note: 'The three groups combined', value: stats.end_users, added: stats.end_users_trend, icon: Users, color: 'slate' }
    ] : [];
    const currentCounts = { Partners: stats?.partners ?? 0, Riders: stats?.riders ?? 0, Customers: stats?.customers ?? 0 };
    const distribution = SERIES.map(series => ({ ...series, value: currentCounts[series.key] }));
    const accountTotal = distribution.reduce((total, item) => total + item.value, 0);
    const newSignups = analytics?.velocity.reduce((total, day) => total + day.new, 0) ?? 0;

    return (
        <DashboardLayout title="Dashboard">
            <div className="admin-overview mx-auto w-full max-w-[1440px] space-y-5 sm:space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div><h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Overview</h2><p className="mt-1 text-sm text-slate-500">Your clinics, riders, and customers at a glance.</p></div>
                    <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /><span className="hidden sm:inline">Refresh</span><span className="sr-only sm:hidden">Refresh dashboard</span></button>
                </div>

                {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><p>{error}</p><button type="button" onClick={() => void loadDashboard()} className="font-semibold underline">Try again</button></div>}
                {loading && !stats && <div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-brand" />Loading your dashboard…</div>}

                {stats && analytics && <>
                    <section aria-label="Account totals" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                        {cards.map(card => <button type="button" key={card.key} onClick={() => setSelectedGroup(card.key)} aria-label={`View ${card.label.toLowerCase()}: ${card.value}`} className="admin-summary-card group rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left transition-colors hover:border-orange-300 focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4">
                            <div className="flex items-center justify-between gap-2"><span className={`admin-stat-icon admin-stat-icon-${card.color}`}><card.icon className="h-5 w-5" aria-hidden="true" /></span><ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-brand" aria-hidden="true" /></div>
                            <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
                            <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{card.value.toLocaleString()}</p>
                            <p className="mt-1 text-xs text-slate-500">{card.note}</p>
                            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="font-semibold text-slate-700">{card.added}</span> in the last 30 days</p>
                        </button>)}
                    </section>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5">
                        <section className="admin-chart-card xl:col-span-2" aria-labelledby="account-growth-title">
                            <h3 id="account-growth-title">Accounts over time</h3><p className="admin-chart-description">Monthly totals for all accounts over the last 6 months.</p>
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">{SERIES.map(series => <span key={series.key} className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />{series.label}</span>)}</div>
                            <div className="mt-5 h-[230px] sm:h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.growth} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                                        <defs>{SERIES.map(series => <linearGradient key={series.key} id={`admin-${series.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={series.color} stopOpacity={0.12} /><stop offset="100%" stopColor={series.color} stopOpacity={0} /></linearGradient>)}</defs>
                                        <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#E8EDF2" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisStyle} tickMargin={10} />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisStyle} width={42} />
                                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#334155', fontWeight: 600 }} />
                                        {SERIES.map(series => <Area key={series.key} name={series.label} dataKey={series.key} type="monotone" stroke={series.color} strokeWidth={2.5} fill={`url(#admin-${series.key})`} isAnimationActive={false} />)}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        <section className="admin-chart-card" aria-labelledby="account-types-title">
                            <h3 id="account-types-title">Account types</h3><p className="admin-chart-description">The accounts shown above.</p>
                            {accountTotal ? <div className="relative h-[220px]">
                                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} nameKey="label" dataKey="value" innerRadius={63} outerRadius={82} paddingAngle={3} stroke="none" isAnimationActive={false}>{distribution.map(item => <Cell key={item.key} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-semibold text-slate-900">{accountTotal.toLocaleString()}</span><span className="mt-1 text-xs text-slate-500">Accounts</span></div>
                            </div> : <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No accounts yet.</div>}
                            <ul className="space-y-3">{distribution.map(item => <li key={item.key} className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><span className="font-semibold tabular-nums text-slate-800">{item.value.toLocaleString()}</span></li>)}</ul>
                        </section>
                    </div>

                    <section className="admin-chart-card" aria-labelledby="signups-title">
                        <div className="flex items-start justify-between gap-4"><div><h3 id="signups-title">New sign-ups</h3><p className="admin-chart-description">Daily sign-ups over the last 14 days.</p></div><span className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">{newSignups.toLocaleString()} joined</span></div>
                        <div className="mt-5 h-[180px] sm:h-[200px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.velocity} margin={{ top: 5, right: 4, left: -16, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="#E8EDF2" />
                            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} tickMargin={10} minTickGap={20} />
                            <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisStyle} width={42} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#FFF7ED' }} />
                            <Bar dataKey="new" name="New sign-ups" fill="#F97316" radius={[5, 5, 0, 0]} maxBarSize={30} isAnimationActive={false} />
                        </BarChart></ResponsiveContainer></div>
                    </section>
                </>}
            </div>
            {selectedGroup && stats && <AccountList title={cards.find(card => card.key === selectedGroup)?.label ?? 'Accounts'} accounts={stats.details[selectedGroup] ?? []} onClose={() => setSelectedGroup(null)} />}
        </DashboardLayout>
    );
}
