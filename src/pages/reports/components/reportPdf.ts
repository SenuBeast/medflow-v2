import { format } from 'date-fns';
import type { ReportFilters } from '../../../lib/types';

type PdfCell = string | number | boolean | null | undefined;

interface ReportSummaryMetric {
    label: string;
    value: string;
}

export interface ReportPdfOptions {
    filename: string;
    title: string;
    subtitle?: string;
    headers: string[];
    rows: PdfCell[][];
    companyName: string;
    companyInitials: string;
    generatedBy?: string | null;
    filters?: ReportFilters;
    summary?: ReportSummaryMetric[];
    note?: string;
    accentColor?: [number, number, number];
    orientation?: 'portrait' | 'landscape';
}

function normalizeCell(cell: PdfCell) {
    if (cell === null || cell === undefined || cell === '') return '-';
    if (typeof cell === 'boolean') return cell ? 'Yes' : 'No';
    return String(cell);
}

function buildFilterSummary(filters?: ReportFilters) {
    if (!filters) return ['No filters applied'];

    const parts: string[] = [];

    if (filters.dateFrom || filters.dateTo) {
        parts.push(`Date range: ${filters.dateFrom ?? 'Any'} to ${filters.dateTo ?? 'Any'}`);
    }
    if (filters.search) parts.push(`Search: ${filters.search}`);
    if (filters.category) parts.push(`Category: ${filters.category}`);
    if (filters.controlledOnly) parts.push('Controlled items only');
    if (filters.expiryWindow) {
        parts.push(
            filters.expiryWindow === 'expired'
                ? 'Expiry window: Expired only'
                : `Expiry window: Next ${filters.expiryWindow} days`
        );
    }

    return parts.length > 0 ? parts : ['No filters applied'];
}

export async function generateReportPdf(options: ReportPdfOptions) {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
    ]);

    const autoTable = autoTableModule.default;
    const accent = options.accentColor ?? [37, 99, 235];
    const secondary = [22, 163, 74] as const;
    const orientation = options.orientation ?? (options.headers.length > 6 ? 'landscape' : 'portrait');
    const generatedAt = new Date();
    const filterSummary = buildFilterSummary(options.filters);
    const pageDate = format(generatedAt, 'MMM d, yyyy');
    const pageTimestamp = format(generatedAt, 'MMM d, yyyy HH:mm');

    const doc = new jsPDF({
        orientation,
        unit: 'pt',
        format: 'a4',
        compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - (margin * 2);
    let cursorY = margin;

    const drawBox = (x: number, y: number, width: number, height: number, fill: [number, number, number]) => {
        doc.setFillColor(fill[0], fill[1], fill[2]);
        doc.roundedRect(x, y, width, height, 14, 14, 'F');
    };

    const writeMutedText = (text: string | string[], x: number, y: number, maxWidth?: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const output = Array.isArray(text) ? text : doc.splitTextToSize(text, maxWidth ?? contentWidth);
        doc.text(output, x, y);
    };

    const writeHeading = (text: string, x: number, y: number, size = 11) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(15, 23, 42);
        doc.text(text, x, y);
    };

    const headerHeight = 124;
    const rightPanelWidth = 210;
    const leftBlockX = margin + 28;
    const logoBoxX = leftBlockX;
    const logoBoxY = cursorY + 22;
    const logoBoxSize = 56;
    const textStartX = logoBoxX + logoBoxSize + 18;
    const textBlockWidth = contentWidth - rightPanelWidth - 86 - logoBoxSize;
    const infoPanelX = pageWidth - margin - rightPanelWidth - 24;
    const infoPanelY = cursorY + 18;
    const infoPanelHeight = headerHeight - 36;

    drawBox(margin, cursorY, contentWidth, headerHeight, accent);
    drawBox(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, [255, 255, 255]);
    drawBox(infoPanelX, infoPanelY, rightPanelWidth, infoPanelHeight, [244, 247, 255]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(options.companyInitials, logoBoxX + (logoBoxSize / 2), logoBoxY + 37, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OFFICIAL COMPANY REPORT', textStartX, cursorY + 30);
    doc.setFontSize(15);
    doc.text(doc.splitTextToSize(options.companyName, textBlockWidth), textStartX, cursorY + 48);
    doc.setFontSize(22);
    doc.text(doc.splitTextToSize(options.title, textBlockWidth), textStartX, cursorY + 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
        doc.splitTextToSize(
            options.subtitle ?? 'Prepared for internal company reporting and compliance review.',
            textBlockWidth
        ),
        textStartX,
        cursorY + 96
    );

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Document Control', infoPanelX + 16, infoPanelY + 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const controlLines = [
        `Company: ${options.companyName}`,
        `Generated: ${pageTimestamp}`,
        `Prepared by: ${options.generatedBy?.trim() || 'MedFlow'}`,
        'Classification: Confidential',
    ];
    let controlY = infoPanelY + 40;
    controlLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, rightPanelWidth - 32);
        doc.text(wrapped, infoPanelX + 16, controlY);
        controlY += wrapped.length * 12 + 6;
    });

    doc.setFillColor(secondary[0], secondary[1], secondary[2]);
    doc.roundedRect(infoPanelX + 16, infoPanelY + infoPanelHeight - 14, 72, 4, 2, 2, 'F');

    cursorY += headerHeight + 18;

    const metaGap = 12;
    const metaWidth = (contentWidth - metaGap) / 2;
    const lineHeight = 16;
    const scopeDetailLines = [
        `Rows exported: ${options.rows.length}`,
        ...filterSummary,
    ].flatMap((line) => doc.splitTextToSize(line, metaWidth - 32) as string[]);
    const controlDetailLines = [
        `Prepared for ${options.companyName}`,
        `Business date: ${pageDate}`,
        'Confidential internal use',
        'Approved for operational reporting',
    ].flatMap((line) => doc.splitTextToSize(line, metaWidth - 32) as string[]);
    const metaHeight = Math.max(
        60 + (scopeDetailLines.length * lineHeight),
        60 + (controlDetailLines.length * lineHeight)
    );

    drawBox(margin, cursorY, metaWidth, metaHeight, [248, 250, 252]);
    drawBox(margin + metaWidth + metaGap, cursorY, metaWidth, metaHeight, [248, 250, 252]);

    writeHeading('Report Scope', margin + 16, cursorY + 22);
    writeMutedText(scopeDetailLines, margin + 16, cursorY + 42, metaWidth - 32);

    writeHeading('Document Record', margin + metaWidth + metaGap + 16, cursorY + 22);
    writeMutedText(controlDetailLines, margin + metaWidth + metaGap + 16, cursorY + 42, metaWidth - 32);

    cursorY += metaHeight + 14;

    if (options.note) {
        const noteLines = doc.splitTextToSize(options.note, contentWidth - 44) as string[];
        const noteHeight = 34 + (noteLines.length * 12);
        drawBox(margin, cursorY, contentWidth, noteHeight, [239, 246, 255]);
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(1.25);
        doc.line(margin + 16, cursorY + 12, margin + 16, cursorY + noteHeight - 12);
        writeHeading('Report Note', margin + 28, cursorY + 20, 10);
        writeMutedText(noteLines, margin + 28, cursorY + 36, contentWidth - 44);
        cursorY += noteHeight + 14;
    }

    if (options.summary && options.summary.length > 0) {
        const columns = Math.min(4, options.summary.length);
        const cardGap = 10;
        const cardWidth = (contentWidth - (cardGap * (columns - 1))) / columns;
        const cardHeight = 54;

        options.summary.slice(0, 4).forEach((metric, index) => {
            const x = margin + (index * (cardWidth + cardGap));
            drawBox(x, cursorY, cardWidth, cardHeight, [250, 250, 250]);
            doc.setFillColor(accent[0], accent[1], accent[2]);
            doc.roundedRect(x + 12, cursorY + 12, 4, cardHeight - 24, 2, 2, 'F');
            writeMutedText(metric.label, x + 24, cursorY + 22, cardWidth - 36);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text(metric.value, x + 24, cursorY + 42, { maxWidth: cardWidth - 36 });
        });

        cursorY += cardHeight + 16;
    }

    autoTable(doc, {
        startY: cursorY,
        head: [options.headers],
        body: options.rows.map((row) => row.map(normalizeCell)),
        margin: { left: margin, right: margin, bottom: 44 },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 6,
            textColor: [15, 23, 42],
            lineColor: [226, 232, 240],
            lineWidth: 0.5,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: accent,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
        },
        bodyStyles: {
            fillColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        didDrawPage: (data) => {
            const footerY = pageHeight - 22;
            doc.setDrawColor(226, 232, 240);
            doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`${options.companyName} | MedFlow Report Suite`, margin, footerY);
            doc.text(`Page ${data.pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
        },
    });

    doc.save(`${options.filename}-${format(generatedAt, 'yyyy-MM-dd')}.pdf`);
}
