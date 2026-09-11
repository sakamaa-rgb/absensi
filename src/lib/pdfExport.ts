// PDF Export Module using jsPDF & autoTable
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord } from '../types/database';

export interface ReportSummaryStats {
  periode: string;
  tanggal: string;
  sesi: string;
  totalSiswa: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpha: number;
  belumAbsen: number;
}

export function exportAttendanceToPDF(
  records: AttendanceRecord[],
  stats: ReportSummaryStats,
  title = 'LAPORAN ABSENSI SISWA'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header styling
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // School & App Title
  doc.setTextColor(59, 130, 246); // blue-500
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PPLG 3 SMART ATTENDANCE SYSTEM', 14, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('KELAS XI PPLG 3 • SMKN 1 CIOMAS BOGOR', 14, 27);

  // Decorative blue line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(14, 34, 196, 34);

  // Summary Information Grid
  let startY = 46;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Kehadiran:', 14, startY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode/Tanggal : ${stats.tanggal || stats.periode}`, 14, startY + 6);
  doc.text(`Sesi Absensi    : ${stats.sesi}`, 14, startY + 11);
  doc.text(`Total Siswa     : ${stats.totalSiswa} Siswa`, 14, startY + 16);

  // Stats boxes
  const boxWidth = 28;
  const boxHeight = 15;
  const startBoxX = 14;
  const boxY = startY + 22;

  const statItems = [
    { label: 'Hadir', val: stats.hadir, color: [16, 185, 129] },       // green
    { label: 'Terlambat', val: stats.terlambat, color: [245, 158, 11] },// amber
    { label: 'Izin', val: stats.izin, color: [59, 130, 246] },         // blue
    { label: 'Sakit', val: stats.sakit, color: [168, 85, 247] },       // purple
    { label: 'Alpha', val: stats.alpha, color: [239, 68, 68] },        // red
    { label: 'Belum', val: stats.belumAbsen, color: [100, 116, 139] },  // slate
  ];

  statItems.forEach((item, index) => {
    const x = startBoxX + index * (boxWidth + 2.5);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.label, x + 3, boxY + 5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(String(item.val), x + 3, boxY + 11);
  });

  // Table rows
  const tableData = records.map((rec, i) => [
    i + 1,
    rec.student?.nomor_absen ?? '-',
    rec.student?.nis ?? '-',
    rec.student?.nama ?? '-',
    rec.waktu ? rec.waktu.substring(0, 5) : '-',
    rec.status,
    rec.distance ? `${Math.round(rec.distance)}m` : '0m',
    rec.device_token ? '✓' : '-',
    rec.keterangan || '-',
  ]);

  autoTable(doc, {
    startY: boxY + boxHeight + 8,
    head: [['No', 'Abs', 'NIS', 'Nama Siswa', 'Jam', 'Status', 'Jarak', 'Dev', 'Ket']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 22 },
      3: { cellWidth: 55 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = data.cell.raw;
        if (val === 'HADIR') data.cell.styles.textColor = [16, 185, 129];
        else if (val === 'TERLAMBAT') data.cell.styles.textColor = [245, 158, 11];
        else if (val === 'IZIN') data.cell.styles.textColor = [59, 130, 246];
        else if (val === 'SAKIT') data.cell.styles.textColor = [168, 85, 247];
        else if (val === 'ALPHA') data.cell.styles.textColor = [239, 68, 68];
      }
    },
  });

  // Footer Signature section
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  const pageHeight = doc.internal.pageSize.height;
  const signatureY = finalY + 15 > pageHeight - 35 ? pageHeight - 35 : finalY + 15;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  doc.text(`Ciomas, ${todayStr}`, 145, signatureY);
  doc.text('Mengetahui,', 145, signatureY + 5);
  doc.text('Admin / Wali Kelas XI PPLG 3', 145, signatureY + 10);

  doc.setFont('helvetica', 'bold');
  doc.text('( _________________________ )', 145, signatureY + 28);
  doc.setFontSize(8);
  doc.text('NIP. ........................................', 145, signatureY + 33);

  const safeFilename = `Laporan_Absensi_XI_PPLG_3_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(safeFilename);
}

/**
 * Generates an official single student attendance pass / slip
 */
export function exportSingleAttendanceSlipPDF(record: AttendanceRecord) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [120, 160], // Receipt / Pass size
  });

  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 120, 28, 'F');

  doc.setTextColor(59, 130, 246);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BUKTI DIGITAL KEHADIRAN RESMI', 10, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('XI PPLG 3 • SMKN 1 CIOMAS', 10, 17);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('PPLG 3 SMART ATTENDANCE SYSTEM', 10, 23);

  // Status Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(10, 34, 100, 16, 2, 2, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`STATUS: ${record.status}`, 16, 44);

  // Details
  let curY = 58;
  const addRow = (label: string, value: string) => {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 10, curY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 48, curY);
    curY += 7;
  };

  addRow('Nama Siswa', record.student?.nama || '-');
  addRow('Nomor Absen', String(record.student?.nomor_absen || '-'));
  addRow('NIS / NISN', `${record.student?.nis || '-'} / ${record.student?.nisn || '-'}`);
  addRow('Kelas', record.student?.kelas || 'XI PPLG 3');
  addRow('Tanggal', record.tanggal);
  addRow('Waktu Absen', `${record.waktu} WIB`);
  addRow('Sesi', record.session?.nama_sesi || 'Absensi Pagi');
  addRow('Jarak Lokasi', record.distance ? `${Math.round(record.distance)} meter (Valid)` : 'Tervalidasi');
  addRow('Status Device', record.device_token ? 'Verified Mobile' : 'Verified');
  addRow('Verifikasi Wajah', record.face_verified ? 'Verified' : 'N/A');
  addRow('Attendance ID', record.attendance_code);

  // Footer Note
  doc.setDrawColor(226, 232, 240);
  doc.line(10, curY + 2, 110, curY + 2);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Validitas bukti ini dapat dicek di menu Verifikasi Absensi.', 10, curY + 7);
  doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 10, curY + 11);

  doc.save(`Bukti_Absen_${record.attendance_code}.pdf`);
}
