import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { PermissionGuard } from '../../../components/auth/Guards';
import { Button } from '../../../components/ui/Button';
import { PERMISSIONS } from '../../../lib/constants';
import { useAuthStore } from '../../../store/authStore';
import { useCompanyBranding } from '../../../hooks/useCompanyBranding';
import { generateReportPdf, type ReportPdfOptions } from './reportPdf';

interface ExportButtonProps {
    label?: string;
    filename: string;
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    disabled?: boolean;
    pdf?: Omit<ReportPdfOptions, 'filename' | 'headers' | 'rows' | 'companyName' | 'companyInitials' | 'generatedBy'>;
}

export function ExportButton({ label = 'CSV', filename, headers, rows, disabled, pdf }: ExportButtonProps) {
    const user = useAuthStore((state) => state.user);
    const { data: branding } = useCompanyBranding();
    const [isPdfExporting, setIsPdfExporting] = useState(false);

    const exportDisabled = disabled || rows.length === 0;

    const handleCsvExport = () => {
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

    const handlePdfExport = async () => {
        if (!pdf || exportDisabled) return;

        try {
            setIsPdfExporting(true);
            await generateReportPdf({
                ...pdf,
                filename,
                headers,
                rows,
                companyName: branding?.companyName ?? 'MedFlow',
                companyInitials: branding?.companyInitials ?? 'MF',
                generatedBy: user?.full_name ?? user?.email ?? null,
            });
        } finally {
            setIsPdfExporting(false);
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <div className="flex items-center gap-2">
                <Button
                    variant="secondary"
                    icon={<Download size={14} />}
                    onClick={handleCsvExport}
                    disabled={exportDisabled}
                >
                    {label}
                </Button>
                {pdf && (
                    <Button
                        variant="outline"
                        icon={<FileText size={14} />}
                        onClick={handlePdfExport}
                        disabled={exportDisabled}
                        loading={isPdfExporting}
                    >
                        PDF
                    </Button>
                )}
            </div>
        </PermissionGuard>
    );
}
