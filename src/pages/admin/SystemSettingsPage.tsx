import { useState } from 'react';
import { Settings, Bell, Calendar, Building2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';

interface SettingsState {
    company_name: string;
    company_email: string;
    enable_alerts: boolean;
    enable_expiry_warnings: boolean;
    expiry_warning_days: number;
    low_stock_threshold: number;
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 focus:outline-none"
            aria-label={`Toggle ${label}`}
        >
            {on
                ? <ToggleRight size={28} className="text-blue-500" />
                : <ToggleLeft size={28} className="text-gray-300" />
            }
        </button>
    );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <div className="ml-4 shrink-0">{children}</div>
        </div>
    );
}

export function SystemSettingsPage() {
    const { success } = useToast();
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SettingsState>({
        company_name: 'MedFlow Healthcare',
        company_email: 'admin@medflow.com',
        enable_alerts: true,
        enable_expiry_warnings: true,
        expiry_warning_days: 30,
        low_stock_threshold: 10,
    });

    const set = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) =>
        setSettings(prev => ({ ...prev, [key]: value }));

    const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white transition-all';

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 700)); // Simulate API call
        setSaving(false);
        success('Settings saved successfully');
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Settings size={18} /> System Settings
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">Configure application-wide preferences</p>
            </div>

            {/* Company Info */}
            <Card>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-5">
                    <Building2 size={15} className="text-blue-500" /> Company Information
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Company Name</label>
                        <input
                            type="text"
                            className={inputCls}
                            placeholder="e.g. MedFlow Healthcare"
                            title="Company name"
                            value={settings.company_name}
                            onChange={e => set('company_name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Admin Email</label>
                        <input
                            type="email"
                            className={inputCls}
                            placeholder="admin@medflow.com"
                            title="Admin email"
                            value={settings.company_email}
                            onChange={e => set('company_email', e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {/* Alerts & Notifications */}
            <Card>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                    <Bell size={15} className="text-amber-500" /> Alerts & Notifications
                </h3>
                <SettingRow label="Enable Alerts" description="Show system notifications for critical events">
                    <Toggle on={settings.enable_alerts} onToggle={() => set('enable_alerts', !settings.enable_alerts)} label="Enable Alerts" />
                </SettingRow>
                <SettingRow label="Expiry Warnings" description="Warn when batches are close to expiry">
                    <Toggle on={settings.enable_expiry_warnings} onToggle={() => set('enable_expiry_warnings', !settings.enable_expiry_warnings)} label="Expiry Warnings" />
                </SettingRow>
            </Card>

            {/* Thresholds */}
            <Card>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-5">
                    <Calendar size={15} className="text-indigo-500" /> Thresholds
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expiry Warning Window (days)</label>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            className={inputCls}
                            title="Expiry warning window in days"
                            placeholder="30"
                            value={settings.expiry_warning_days}
                            onChange={e => set('expiry_warning_days', parseInt(e.target.value) || 30)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Low Stock Default Threshold</label>
                        <input
                            type="number"
                            min={1}
                            className={inputCls}
                            title="Low stock threshold"
                            placeholder="10"
                            value={settings.low_stock_threshold}
                            onChange={e => set('low_stock_threshold', parseInt(e.target.value) || 10)}
                        />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <Button variant="primary" icon={<Save size={15} />} onClick={handleSave} loading={saving}>
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
