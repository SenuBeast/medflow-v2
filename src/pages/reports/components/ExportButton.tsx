import { Download } from 'lucide-react';
import { PermissionGuard } from '../../../components/auth/Guards';
import { Button } from '../../../components/ui/Button';
import { PERMISSIONS } from '../../../lib/constants';

interface ExportButtonProps {
    label?: string;
    filename: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    disabled?: boolean;
}

export function ExportButton({ label = 'Export CSV', filename, headers, rows, disabled }: ExportButtonProps) {
    const handleExport = () => {
        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <Button
                variant="secondary"
                icon={<Download size={14} />}
                onClick={handleExport}
                disabled={disabled || rows.length === 0}
            >
                {label}
            </Button>
        </PermissionGuard>
    );
}
