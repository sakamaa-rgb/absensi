import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { dataStore } from '../../services/dataStore';
import type { Student } from '../../types/database';
import { 
  Search, 
  RotateCcw, 
  Plus, 
  Download, 
  Upload, 
  Smartphone, 
  Edit, 
  Trash2,
  X,
  UserCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';


export const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formNama, setFormNama] = useState('');
  const [formNis, setFormNis] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formAbsen, setFormAbsen] = useState<number>(1);
  const [formEmail, setFormEmail] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const refresh = () => setStudents(dataStore.getStudents());
    refresh();
    return dataStore.subscribe(refresh);
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleResetDevice = (student: Student) => {
    if (window.confirm(`Apakah Anda yakin ingin mereset device terdaftar untuk ${student.nama} (#${student.nomor_absen})? Siswa akan dapat mendaftarkan HP barunya saat scan berikutnya.`)) {
      dataStore.resetStudentDevice(student.id);
      showToast(`Device untuk ${student.nama} berhasil di-reset!`);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    dataStore.addStudent({
      nama: formNama,
      nis: formNis,
      nisn: formNisn,
      nomor_absen: Number(formAbsen),
      email: formEmail,
      kelas: 'XI PPLG 3',
      status: 'active',
    });
    setStudents(dataStore.getStudents());
    setShowAddModal(false);
    resetForm();
    showToast(`Siswa ${formNama} berhasil ditambahkan!`);
  };

  const handleEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    dataStore.updateStudent(selectedStudent.id, {
      nama: formNama,
      nis: formNis,
      nisn: formNisn,
      nomor_absen: Number(formAbsen),
      email: formEmail,
    });
    setStudents(dataStore.getStudents());
    setShowEditModal(false);
    resetForm();
    showToast(`Data siswa ${formNama} berhasil diperbarui!`);
  };

  const confirmDelete = () => {
    if (!studentToDelete) return;
    const targetId = studentToDelete.id;
    const targetNama = studentToDelete.nama;
    setStudentToDelete(null);
    setDeletingId(targetId);

    setTimeout(() => {
      dataStore.deleteStudent(targetId);
      setDeletingId(null);
      setStudents(dataStore.getStudents());
      showToast(`Data siswa ${targetNama} berhasil dihapus!`);
    }, 320);
  };

  const confirmDeleteAll = () => {
    setIsDeletingAll(true);
    setTimeout(() => {
      const count = dataStore.deleteAllStudents();
      setStudents([]);
      setShowDeleteAllModal(false);
      setIsDeletingAll(false);
      showToast(`Berhasil menghapus seluruh data siswa (${count} siswa)!`);
    }, 350);
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormNama(student.nama);
    setFormNis(student.nis);
    setFormNisn(student.nisn);
    setFormAbsen(student.nomor_absen);
    setFormEmail(student.email);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormNama('');
    setFormNis('');
    setFormNisn('');
    setFormAbsen(students.length + 1);
    setFormEmail('');
    setSelectedStudent(null);
  };

  // Export Students Data to Excel (ONLY ADMIN)
  const handleExportStudentsExcel = () => {
    const rows = students.map((s, idx) => ({
      'No': idx + 1,
      'Nomor Absen': s.nomor_absen,
      'Nama Siswa': s.nama,
      'NIS': s.nis,
      'NISN': s.nisn,
      'Email Akun Kelas': s.email,
      'Kelas': s.kelas,
      'Status Device': s.device_token ? 'Terdaftar' : 'Belum Terdaftar',
      'Face Biometrik': s.face_registered ? 'Terdaftar' : 'Belum',
      'Status Akun': s.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '45 Siswa XI PPLG 3');
    XLSX.writeFile(wb, `Data_Siswa_XI_PPLG_3_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Import Students from Excel / CSV (Robust detection of columns & formats)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          alert('File Excel tidak memiliki sheet yang valid.');
          return;
        }

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawRows.length === 0) {
          alert('File Excel/CSV kosong atau tidak berisi data.');
          return;
        }

        let importedCount = 0;
        const importedNames: string[] = [];
        const studentsToImport: Array<Omit<Student, 'id'>> = [];

        rawRows.forEach((rawRow) => {
          // Normalize row keys to lowercase alphanumeric
          const normalized: Record<string, any> = {};
          Object.keys(rawRow).forEach((k) => {
            const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            normalized[cleanKey] = rawRow[k];
          });

          // Match student name across popular variations
          let nama = String(
            normalized['namasiswa'] ||
            normalized['nama'] ||
            normalized['namalengkap'] ||
            normalized['name'] ||
            normalized['fullname'] ||
            normalized['pesertadidik'] ||
            normalized['namapesertadidik'] ||
            normalized['siswa'] ||
            ''
          ).trim();

          // Fallback: If no recognized header, find any string cell that resembles a name
          if (!nama) {
            for (const val of Object.values(rawRow)) {
              const strVal = String(val).trim();
              if (
                strVal &&
                isNaN(Number(strVal)) &&
                strVal.length > 2 &&
                !strVal.toLowerCase().includes('absen') &&
                !strVal.toLowerCase().includes('kelas')
              ) {
                nama = strVal;
                break;
              }
            }
          }

          // Filter out header echoes
          if (nama && nama.toLowerCase() !== 'nama' && nama.toLowerCase() !== 'nama siswa') {
            // Find absen
            const rawAbsen =
              normalized['nomorabsen'] ||
              normalized['noabsen'] ||
              normalized['absen'] ||
              normalized['no'] ||
              normalized['nomor'] ||
              normalized['abs'] ||
              '';
            const parsedAbsen = Number(rawAbsen);
            const fallbackAbsen = (students.length + importedCount + 1);
            const nomor_absen = !isNaN(parsedAbsen) && parsedAbsen > 0 ? parsedAbsen : fallbackAbsen;

            // Find NIS with fallback
            const rawNis = String(
              normalized['nis'] ||
              normalized['nomorinduk'] ||
              normalized['noinduk'] ||
              normalized['nik'] ||
              ''
            ).trim();
            const nis = rawNis || `2324100${String(nomor_absen).padStart(2, '0')}`;

            // Find NISN with fallback
            const rawNisn = String(
              normalized['nisn'] ||
              normalized['nis'] ||
              ''
            ).trim();
            const nisn = rawNisn || `008${String(nomor_absen).padStart(7, '0')}`;

            // Find Email with fallback
            const rawEmail = String(
              normalized['email'] ||
              normalized['emailakunkelas'] ||
              normalized['surel'] ||
              ''
            ).trim();
            const emailSlug = nama.toLowerCase().replace(/[^a-z0-9]/g, '.');
            const email = rawEmail || `${emailSlug}@smkn1ciomas.sch.id`;

            // Find Kelas with fallback
            const rawKelas = String(normalized['kelas'] || normalized['rombel'] || '').trim();
            const kelas = rawKelas || 'XI PPLG 3';

            studentsToImport.push({
              nama,
              nis,
              nisn,
              nomor_absen,
              email,
              kelas,
              status: 'active',
            });

            importedNames.push(nama);
            importedCount++;
          }
        });

        if (studentsToImport.length === 0) {
          alert('Tidak ada baris data siswa yang terdeteksi. Pastikan file Excel memiliki kolom Nama atau Nama Siswa.');
        } else {
          dataStore.importStudents(studentsToImport);
          setStudents(dataStore.getStudents());
          showToast(`Berhasil mengimpor ${studentsToImport.length} data siswa!`);
          const previewList = importedNames.slice(0, 8).join('\n- ');
          const extraCount = importedNames.length > 8 ? `\n... dan ${importedNames.length - 8} siswa lainnya` : '';
          alert(`Sukses mengimpor ${studentsToImport.length} siswa:\n- ${previewList}${extraCount}`);
        }
      } catch (err: any) {
        alert('Gagal membaca file Excel: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filtered = students.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis.includes(searchQuery) ||
    s.nisn.includes(searchQuery) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(s.nomor_absen).includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-white border border-emerald-200 shadow-xl flex items-center space-x-2.5 text-xs text-emerald-800 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
            Kelola Siswa XI PPLG 3
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manajemen data akun, NIS, NISN, edit data, dan reset device siswa
          </p>
        </div>

        {/* Admin Only Actions: Export, Import, Add */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="Import Siswa dari Excel / CSV"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import Excel/CSV</span>
          </button>

          <button
            onClick={handleExportStudentsExcel}
            className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
            title="Export Data Siswa ke Excel"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Data</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>

          {students.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center space-x-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200/90 shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="Hapus Seluruh Data Siswa"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-200/90 shadow-xs bg-white/95 flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari berdasarkan nama siswa, no absen, NIS, NISN, atau email..."
          className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        <span className="text-xs text-slate-500 font-mono shrink-0">
          {filtered.length} / {students.length} Siswa
        </span>
      </div>

      {/* Table */}
      <div className="glass-card rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden bg-white/95">
        <div className="overflow-x-auto scrollbar-transparent">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600">
                <th className="py-3 px-3 font-bold text-center w-12">No</th>
                <th className="py-3 px-3 font-bold text-center w-12">Abs</th>
                <th className="py-3 px-3 font-bold">Nama Siswa</th>
                <th className="py-3 px-3 font-bold font-mono">NIS</th>
                <th className="py-3 px-3 font-bold font-mono">NISN</th>
                <th className="py-3 px-3 font-bold">Email Akun Kelas</th>
                <th className="py-3 px-3 font-bold text-center">Device</th>
                <th className="py-3 px-3 font-bold text-center">Face</th>
                <th className="py-3 px-3 font-bold text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s, idx) => (
                <tr 
                  key={s.id} 
                  className={`transition-all duration-300 ease-in-out ${
                    deletingId === s.id 
                      ? 'opacity-0 -translate-x-12 scale-90 bg-rose-50' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 font-mono">
                    #{s.nomor_absen}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-slate-200 shrink-0">
                        {s.foto_url ? (
                          <img src={s.foto_url} alt={s.nama} className="w-full h-full object-cover" />
                        ) : (
                          s.nama.charAt(0)
                        )}
                      </div>
                      <span className="truncate">{s.nama}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {s.nis}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {s.nisn}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                    {s.email}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.device_token ? (
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                        <Smartphone className="w-3 h-3 mr-1" />
                        Terikat
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Belum ada
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.face_registered ? (
                      <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                        <UserCheck className="w-3 h-3 mr-1" />
                        OK
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit Data Siswa"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-600 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setStudentToDelete(s)}
                        title="Hapus Siswa"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-600 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleResetDevice(s)}
                        title="Reset Device Terikat (Admin)"
                        disabled={!s.device_token}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-amber-600 disabled:opacity-30 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal with Smooth Animation */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <Trash2 className="w-7 h-7 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Hapus Data Siswa?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus data <strong className="text-slate-900">#{studentToDelete.nomor_absen} {studentToDelete.nama}</strong>? Data siswa yang dihapus tidak dapat dipulihkan.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center space-x-2.5">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Students Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Hapus Seluruh Data Siswa?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tindakan ini akan menghapus semua <strong className="text-rose-600 font-bold">{students.length} data siswa</strong> dari sistem. Data yang dihapus tidak dapat dipulihkan!
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center space-x-2.5">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => setShowDeleteAllModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={confirmDeleteAll}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isDeletingAll ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                {showAddModal ? 'Tambah Siswa XI PPLG 3' : 'Edit Data Siswa'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={showAddModal ? handleAddStudent : handleEditStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Siswa</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Achmad Fauzi"
                  className="w-full glass-input rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Nomor Absen</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formAbsen}
                    onChange={(e) => setFormAbsen(Number(e.target.value))}
                    className="w-full glass-input rounded-xl p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">NIS Siswa</label>
                  <input
                    type="text"
                    required
                    value={formNis}
                    onChange={(e) => setFormNis(e.target.value)}
                    placeholder="232410001"
                    className="w-full glass-input rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  NISN (Digunakan sebagai Password Siswa)
                </label>
                <input
                  type="text"
                  required
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  placeholder="0109463601"
                  className="w-full glass-input rounded-xl p-2.5"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * Password tidak disimpan plaintext di database.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email Akun Kelas</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="nama.siswa@smkn1ciomas.sch.id"
                  className="w-full glass-input rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 transition-colors cursor-pointer"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
