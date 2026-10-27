'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Plus,
  ArrowRight,
  Lock,
  Unlock,
  GripHorizontal,
  RotateCcw,
} from 'lucide-react';
import { Employee, EmployeeFormData, HRStats, RankItem } from '@/types/employee';
import { calculate5YearProjections } from '@/lib/rankProjection';

const INITIAL_FORM: EmployeeFormData = {
  department: '',
  name: '',
  employment_type: '정직원',
  hire_date: '',
  position_years: '',
  phone: '',
  email: '',
  status: '재직',
  notes: '',
};

export default function HRManagementPage() {
  // Mode State (User Mode vs Admin Mode)
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [ranks, setRanks] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<HRStats | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('전체');
  const [selectedType, setSelectedType] = useState<string>('전체');
  const [selectedStatus, setSelectedStatus] = useState<string>('전체');
  const [sortBy, setSortBy] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<string>('20');
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Options
  const [departments, setDepartments] = useState<string[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);

  // Selection (Admin Only)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_FORM);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [customRankInput, setCustomRankInput] = useState<boolean>(false);

  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);

  // Rank Management Modal
  const [isRankModalOpen, setIsRankModalOpen] = useState<boolean>(false);
  const [editingRank, setEditingRank] = useState<RankItem | null>(null);
  const [isAddRankOpen, setIsAddRankOpen] = useState<boolean>(false);
  const [newRankData, setNewRankData] = useState<{
    rank_name: string;
    category: string;
    step_order: number;
    next_rank: string;
  }>({
    rank_name: '',
    category: '사원',
    step_order: 1,
    next_rank: '',
  });

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Base Year State for 5-Year Projections (매년 5년 기준)
  const [baseYear, setBaseYear] = useState<number>(2026);
  const [isBaseYearModalOpen, setIsBaseYearModalOpen] = useState<boolean>(false);
  const [tempBaseYear, setTempBaseYear] = useState<number>(2026);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [isConfirmingSave, setIsConfirmingSave] = useState<boolean>(false);

  // Fetch Base Year from DB Settings on Load
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.base_year) {
        setBaseYear(data.base_year);
        setTempBaseYear(data.base_year);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Base Year Modal Dragging Position
  const [modalPos, setModalPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, select, a')) return;

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: modalPos.x,
      startY: modalPos.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      setModalPos({
        x: dragStartRef.current.startX + deltaX,
        y: dragStartRef.current.startY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleApplyBaseYear = (yearToApply: number) => {
    setBaseYear(yearToApply);
    setIsBaseYearModalOpen(false);
    showToast(`[화면 적용] ${yearToApply}년 기준으로 5개년 예상 직급이 화면에 반영되었습니다.`);
  };

  // Confirm and Save to DB (확정 버튼)
  const handleSaveToDB = async (targetYear: number) => {
    setIsConfirmingSave(true);
    try {
      const res = await fetch('/api/settings/confirm-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetYear }),
      });
      const data = await res.json();
      if (data.success) {
        setBaseYear(targetYear);
        setTempBaseYear(targetYear);
        setIsConfirmDialogOpen(false);
        setIsBaseYearModalOpen(false);
        showToast(
          `[DB 확정 완료] ${targetYear}년 기준으로 사원 직급 및 5개년 체계가 DB에 성공적으로 저장되었습니다.`
        );
        // Refresh employees and stats from DB
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.error || 'DB 저장에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error('Error confirming year in DB:', err);
      showToast('DB 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsConfirmingSave(false);
    }
  };

  // Computed Counts for KPI Cards (정직원 200명 + 정규직 1명 = 201명)
  const regularCount = useMemo(() => {
    if (!stats?.employmentTypeDistribution) return 0;
    return stats.employmentTypeDistribution
      .filter((d) => d.employment_type === '정직원' || d.employment_type === '정규직')
      .reduce((sum, d) => sum + Number(d.count), 0);
  }, [stats]);

  const nonRegularCount = useMemo(() => {
    if (!stats?.employmentTypeDistribution) return 0;
    return stats.employmentTypeDistribution
      .filter((d) => d.employment_type !== '정직원' && d.employment_type !== '정규직')
      .reduce((sum, d) => sum + Number(d.count), 0);
  }, [stats]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Ranks
  const fetchRanks = async () => {
    try {
      const res = await fetch('/api/ranks');
      const data = await res.json();
      if (data.success) {
        setRanks(data.data);
      }
    } catch (err) {
      console.error('Error fetching ranks:', err);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/stats?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch Employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        department: selectedDept,
        employment_type: selectedType,
        status: selectedStatus,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit,
        _t: Date.now().toString(),
      });

      const res = await fetch(`/api/employees?${params.toString()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();

      if (data.success) {
        setEmployees(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.total);
        if (data.departments?.length) setDepartments(data.departments);
        if (data.employmentTypes?.length) setEmploymentTypes(data.employmentTypes);
        if (data.stats) {
          setStats((prev) => ({
            ...prev,
            ...data.stats,
          }));
        }
      } else {
        showToast(data.error || '사원 목록 조회 실패', 'error');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('서버 통신 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDept, selectedType, selectedStatus, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchStats();
    fetchRanks();
  }, []);

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(employees.map((emp) => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setCustomRankInput(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setIsEditMode(true);
    setEditingId(emp.id);
    setFormData({
      department: emp.department || '',
      name: emp.name || '',
      employment_type: emp.employment_type || '정직원',
      hire_date: emp.hire_date || '',
      position_years: emp.position_years || '',
      phone: emp.phone || '',
      email: emp.email || '',
      status: emp.status || '재직',
      notes: emp.notes || '',
    });
    setCustomRankInput(false);
    setIsFormModalOpen(true);
  };

  // Submit Form (Create / Update)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.department.trim()) {
      showToast('근무부서를 입력해주세요.', 'error');
      return;
    }
    if (!formData.name.trim()) {
      showToast('사원 성명을 입력해주세요.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const url = isEditMode ? `/api/employees/${editingId}` : '/api/employees';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          isEditMode ? '사원 정보가 수정되었습니다.' : '새 사원이 성공적으로 등록되었습니다.'
        );
        setIsFormModalOpen(false);
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.error || '저장에 실패했습니다.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('오류가 발생했습니다.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Single
  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/employees/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`[${deleteTarget.name}] 사원 정보가 삭제되었습니다.`);
        setDeleteTarget(null);
        setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.error || '삭제 실패', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch('/api/employees/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${selectedIds.length}명의 사원 정보가 삭제되었습니다.`);
        setSelectedIds([]);
        setIsBatchDeleteModalOpen(false);
        fetchEmployees();
        fetchStats();
      } else {
        showToast(data.error || '일괄 삭제 실패', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('일괄 삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // Rank Save / Update
  const handleSaveRank = async (rank: RankItem) => {
    try {
      const res = await fetch(`/api/ranks/${rank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rank),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`'${rank.rank_name}' 직급 정보가 수정되었습니다.`);
        setEditingRank(null);
        fetchRanks();
      } else {
        showToast(data.error || '수정 실패', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  // Add New Rank
  const handleAddRank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRankData.rank_name.trim()) {
      showToast('직급명을 입력해주세요.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/ranks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRankData),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`'${newRankData.rank_name}' 직급이 추가되었습니다.`);
        setIsAddRankOpen(false);
        setNewRankData({ rank_name: '', category: '사원', step_order: ranks.length + 1, next_rank: '' });
        fetchRanks();
      } else {
        showToast(data.error || '추가 실패', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('오류가 발생했습니다.', 'error');
    }
  };

  // Delete Rank
  const handleDeleteRank = async (id: number, name: string) => {
    if (!confirm(`'${name}' 직급을 정말 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/ranks/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`'${name}' 직급이 삭제되었습니다.`);
        fetchRanks();
      } else {
        showToast(data.error || '삭제 실패', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  // Handle Sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Export to Excel (Admin Only)
  const handleExport = () => {
    const params = new URLSearchParams({
      search,
      department: selectedDept,
      employment_type: selectedType,
      status: selectedStatus,
      baseYear: String(baseYear),
    });
    window.open(`/api/export?${params.toString()}`, '_blank');
  };

  // Helper for employment type badge style
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case '정직원':
      case '정규직':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case '계약직':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper for status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case '재직':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '휴직':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case '퇴사':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Calculate tenure (years of service)
  const calculateTenure = (hireDate: string | null) => {
    if (!hireDate) return '-';
    const start = new Date(hireDate);
    if (isNaN(start.getTime())) return '-';
    const now = new Date();
    const diffYears = now.getFullYear() - start.getFullYear();
    const diffMonths = now.getMonth() - start.getMonth();
    let totalMonths = diffYears * 12 + diffMonths;
    if (totalMonths < 0) totalMonths = 0;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0 && m === 0) return '신규 입사';
    if (y === 0) return `${m}개월`;
    return m > 0 ? `${y}년 ${m}개월` : `${y}년`;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl bg-white border border-slate-200 animate-in fade-in slide-in-from-top-3">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-800">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-amber-600 to-rose-600 shadow-rose-500/20'
                    : 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
                }`}
              >
                {isAdmin ? <ShieldAlert className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                    인사정보시스템
                  </h1>
                  {isAdmin ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold border border-rose-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      관리자 모드
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      사용자 화면 (조회 전용)
                    </span>
                  )}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium border border-slate-200 hidden sm:flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span>{baseYear}년 기준 ({baseYear + 1}~{baseYear + 5}년 예상)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions & Mode Toggle */}
            <div className="flex items-center gap-2.5">
              {/* Admin Actions (Visible ONLY in Admin Mode) */}
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setTempBaseYear(baseYear);
                      setIsBaseYearModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                    title="매년 5개년 기준 연도를 설정하여 향후 5개년 예상 직급 데이터를 갱신합니다"
                  >
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>매년 5년 기준</span>
                    <span className="px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded font-bold text-[11px]">
                      {baseYear}년
                    </span>
                  </button>

                  <button
                    onClick={() => setIsRankModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-2xs"
                    title="직급 목록 및 승진 체계를 수정/추가합니다"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>직급 체계 관리</span>
                  </button>

                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-2xs"
                    title={`${baseYear}년 기준 5개년 예상 직급이 포함된 엑셀 파일을 다운로드합니다`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>엑셀 다운로드</span>
                  </button>

                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/25"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>신규 사원 등록</span>
                  </button>
                </>
              )}

              {/* Mode Switch Toggle Button */}
              <button
                onClick={() => {
                  const nextMode = !isAdmin;
                  setIsAdmin(nextMode);
                  showToast(
                    nextMode
                      ? '관리자 모드로 전환되었습니다. (수정/등록/엑셀 기능 활성화)'
                      : '사용자 조회 모드로 전환되었습니다. (조회 전용)'
                  );
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all ${
                  isAdmin
                    ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {isAdmin ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                    <span>사용자 모드로 변경</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>관리자 메뉴 열기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[96rem] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI / Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
            <p className="text-xs font-medium text-slate-500">총 임직원 수</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {!search.trim() && selectedDept === '전체' && selectedType === '전체' && selectedStatus === '전체'
                ? (totalCount || stats?.totalEmployees || 0)
                : (stats?.totalEmployees ?? totalCount)}
              <span className="text-sm font-normal text-slate-500 ml-1">명</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
            <p className="text-xs font-medium text-slate-500">정직원 / 정규직</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {regularCount}
              <span className="text-sm font-normal text-slate-500 ml-1">명</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
            <p className="text-xs font-medium text-slate-500">계약직 및 기타</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {nonRegularCount}
              <span className="text-sm font-normal text-slate-500 ml-1">명</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all">
            <p className="text-xs font-medium text-slate-500">총 운영 부서</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalDepartments ?? departments.length}
              <span className="text-sm font-normal text-slate-500 ml-1">개 부서</span>
            </p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section id="employee-list-section" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="사원명, 부서명, 직급/연차 검색... (Enter 입력 시 조회)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchEmployees();
                    fetchStats();
                    showToast('사원 정보를 조회했습니다.');
                  }
                }}
                className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Select Dropdowns & Search Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Department */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="hidden sm:inline font-medium">부서:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="전체">전체 부서 ({departments.length})</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="hidden sm:inline font-medium">구분:</span>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="전체">전체 구분</option>
                  <option value="정직원">정직원</option>
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="hidden sm:inline font-medium">상태:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="전체">전체 상태</option>
                  <option value="재직">재직</option>
                  <option value="휴직">휴직</option>
                  <option value="퇴사">퇴사</option>
                </select>
              </div>

              {/* Limit */}
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="10">10개씩</option>
                <option value="20">20개씩</option>
                <option value="50">50개씩</option>
                <option value="100">100개씩</option>
                <option value="all">전체 보기</option>
              </select>

              {/* Explicit 조회 Button */}
              <button
                onClick={() => {
                  setPage(1);
                  fetchEmployees();
                  fetchStats();
                  showToast('사원 정보를 조회했습니다.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                title="설정된 조건으로 인사정보를 조회합니다"
              >
                <Search className="w-3.5 h-3.5" />
                <span>조회</span>
              </button>

              {/* Reset & Refresh Button */}
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDept('전체');
                  setSelectedType('전체');
                  setSelectedStatus('전체');
                  setPage(1);
                  fetchEmployees();
                  fetchStats();
                  fetchRanks();
                  showToast('검색 조건을 초기화하고 전체 데이터를 조회했습니다.');
                }}
                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="검색 조건 초기화 및 새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Selection action bar if any selected (ADMIN ONLY) */}
          {isAdmin && selectedIds.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-medium">
                <CheckCircle2 className="w-4 h-4 text-rose-600" />
                <span>
                  총 <strong>{selectedIds.length}</strong>명의 사원이 선택되었습니다.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-medium"
                >
                  선택 해제
                </button>
                <button
                  onClick={() => setIsBatchDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>선택 삭제 ({selectedIds.length}명)</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Table & Total Count Container */}
        <div className="space-y-2">
          {/* Total Count Header (그림2 파란색 표시 위치) */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs sm:text-sm text-slate-700 font-semibold flex items-center gap-1.5">
              <span>총 인원수:</span>
              <span className="text-blue-600 font-bold">{totalCount}명</span>
            </div>
          </div>

          {/* Employee Table */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-xs font-semibold text-slate-600 tracking-wider">
                <tr>
                  {/* Checkbox (Admin Only) */}
                  {isAdmin && (
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          employees.length > 0 &&
                          employees.every((emp) => selectedIds.includes(emp.id))
                        }
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('id')}
                    className="py-3.5 px-3 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>No.</span>
                      {sortBy === 'id' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('department')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>근무부서</span>
                      {sortBy === 'department' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>사원</span>
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('employment_type')}
                    className="py-3.5 px-3 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>사원구분</span>
                      {sortBy === 'employment_type' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('hire_date')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>입사일</span>
                      {sortBy === 'hire_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('position_years')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{String(baseYear).slice(-2)}년 연차(기준)</span>
                      {sortBy === 'position_years' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-3">근속기간</th>
                  <th
                    onClick={() => handleSort('status')}
                    className="py-3.5 px-3 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>상태</span>
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>

                  {/* 5-Year Projection Columns (Right next to 상태 column) */}
                  <th className="py-3.5 px-3 text-center">{baseYear + 1}년 예상</th>
                  <th className="py-3.5 px-3 text-center">{baseYear + 2}년 예상</th>
                  <th className="py-3.5 px-3 text-center">{baseYear + 3}년 예상</th>
                  <th className="py-3.5 px-3 text-center">{baseYear + 4}년 예상</th>
                  <th className="py-3.5 px-3 text-center">{baseYear + 5}년 예상</th>

                  {/* Admin Management Column (ONLY visible in Admin Mode) */}
                  {isAdmin && <th className="py-3.5 px-4 text-center w-28 bg-amber-50/40 text-amber-900">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 16 : 14} className="py-16 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>데이터를 불러오는 중입니다...</span>
                      </div>
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 16 : 14} className="py-16 text-center">
                      <div className="max-w-xs mx-auto text-slate-400 space-y-2">
                        <Users className="w-10 h-10 mx-auto text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">
                          조회된 사원 정보가 없습니다.
                        </p>
                        <p className="text-xs text-slate-400">
                          검색어나 필터 조건을 변경해보세요.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const isSelected = selectedIds.includes(emp.id);
                    const proj = calculate5YearProjections(emp.position_years, ranks, baseYear);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        {/* Checkbox (Admin Only) */}
                        {isAdmin && (
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(emp.id)}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                        )}
                        <td className="py-3 px-3 text-xs font-mono text-slate-500">
                          {emp.id}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {emp.department}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setDetailEmployee(emp)}
                            className="font-bold text-slate-900 hover:text-blue-600 text-left transition-colors cursor-pointer"
                          >
                            {emp.name}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {emp.employment_type || '정직원'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {emp.hire_date || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {proj.baseRank || emp.position_years || '-'}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 font-medium">
                          {calculateTenure(emp.hire_date)}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {emp.status || '재직'}
                        </td>

                        {/* 5-Year Projections (baseYear + 1 ~ baseYear + 5) - Clean text only */}
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-medium">
                          {proj.y1}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-medium">
                          {proj.y2}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-medium">
                          {proj.y3}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-medium">
                          {proj.y4}
                        </td>
                        <td className="py-3 px-3 text-center text-xs text-slate-700 font-medium">
                          {proj.y5}
                        </td>

                        {/* Admin Action Column (ONLY in Admin Mode) */}
                        {isAdmin && (
                          <td className="py-3 px-4 text-center bg-amber-50/20">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setDetailEmployee(emp)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors"
                                title="상세 보기"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                                title="사원 정보 수정"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget({ id: emp.id, name: emp.name })}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (그림1 녹색 표시 위치로 중앙 정렬 및 1~10 숫자 버튼) */}
          <div className="px-4 py-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-center text-xs text-slate-600">
            {limit !== 'all' && totalPages > 1 && (() => {
              const PAGE_GROUP_SIZE = 10;
              const currentGroup = Math.ceil(page / PAGE_GROUP_SIZE);
              const startPage = (currentGroup - 1) * PAGE_GROUP_SIZE + 1;
              const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);
              const pageNumbers: number[] = [];
              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
              }

              return (
                <div className="flex items-center gap-1 select-none">
                  {/* First Page Button */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="첫 페이지"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Page Button */}
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="이전 페이지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ... */}
                  <div className="flex items-center gap-1 mx-1">
                    {pageNumbers.map((pNum) => {
                      const isActive = pNum === page;
                      return (
                        <button
                          key={pNum}
                          onClick={() => setPage(pNum)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 font-bold border border-blue-600'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-medium shadow-2xs'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page Button */}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="다음 페이지"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Last Page Button */}
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                    title="마지막 페이지"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}
          </div>
        </section>
      </div>
      </main>

      {/* ===================== MODALS ===================== */}

      {/* 1. Create / Edit Employee Modal (Admin Only) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  {isEditMode ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isEditMode ? '사원 정보 수정' : '신규 사원 등록'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEditMode
                      ? '기존 사원 정보를 수정하고 데이터베이스에 저장합니다.'
                      : '새로운 임직원 정보를 입력하여 시스템에 등록합니다.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    근무부서 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="dept-list"
                    required
                    placeholder="예: 경영기획실, 품질관리팀"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <datalist id="dept-list">
                    {departments.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    사원 성명 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">사원구분</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="정직원">정직원</option>
                    <option value="정규직">정규직</option>
                    <option value="계약직">계약직</option>
                    <option value="인턴">인턴</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">재직상태</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="재직">재직</option>
                    <option value="휴직">휴직</option>
                    <option value="퇴사">퇴사</option>
                  </select>
                </div>

                {/* Hire Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">입사일</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Position / Years (직급 리스트 드롭다운) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    26년 연차 및 직급
                  </label>
                  <select
                    value={formData.position_years}
                    onChange={(e) => setFormData({ ...formData, position_years: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="">-- 직급 선택 (선택 안 함) --</option>
                    {/* 현재 값이 직급 목록에 없는 경우에도 안전하게 표시 */}
                    {formData.position_years &&
                      !ranks.some((r) => r.rank_name === formData.position_years) && (
                        <option value={formData.position_years}>
                          {formData.position_years}
                        </option>
                      )}
                    {ranks.map((r) => (
                      <option key={r.id} value={r.rank_name}>
                        {r.rank_name} {r.category ? `(${r.category})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">연락처</label>
                  <input
                    type="text"
                    placeholder="예: 010-1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    placeholder="예: user@dspharm.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">비고 / 메모</label>
                <textarea
                  rows={3}
                  placeholder="특이사항, 담당 업무, 학력 및 경력 메모..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Modal Actions (수정완료/등록하기가 왼쪽, 취소가 오른쪽) */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-500/25"
                >
                  {formSubmitting ? '저장 중...' : isEditMode ? '수정 완료' : '등록하기'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Rank Management Modal (Admin Only) */}
      {isRankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">직급 체계 및 승진 체계 설정</h3>
                  <p className="text-xs text-slate-500">
                    직급 단계 및 차기 승급 연계 규칙을 조회하고 수정할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddRankOpen(!isAddRankOpen)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>새 직급 추가</span>
                </button>
                <button
                  onClick={() => setIsRankModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Add Rank Form (Collapsible) */}
            {isAddRankOpen && (
              <form
                onSubmit={handleAddRank}
                className="px-6 py-3.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center gap-2.5 text-xs"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-indigo-900">순서:</span>
                  <input
                    type="number"
                    value={newRankData.step_order}
                    onChange={(e) =>
                      setNewRankData({ ...newRankData, step_order: parseInt(e.target.value, 10) || 1 })
                    }
                    className="w-16 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800"
                    required
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-indigo-900">직급명:</span>
                  <input
                    type="text"
                    placeholder="예: 수석8년"
                    value={newRankData.rank_name}
                    onChange={(e) => setNewRankData({ ...newRankData, rank_name: e.target.value })}
                    className="w-28 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800"
                    required
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-indigo-900">분류:</span>
                  <input
                    type="text"
                    placeholder="예: 수석"
                    value={newRankData.category}
                    onChange={(e) => setNewRankData({ ...newRankData, category: e.target.value })}
                    className="w-20 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-indigo-900">차기 승급 직급:</span>
                  <input
                    type="text"
                    placeholder="예: 이사보"
                    value={newRankData.next_rank}
                    onChange={(e) => setNewRankData({ ...newRankData, next_rank: e.target.value })}
                    className="w-28 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 ml-auto"
                >
                  등록
                </button>
              </form>
            )}

            {/* Rank List Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">순서</th>
                    <th className="py-2.5 px-4">직급 및 연차</th>
                    <th className="py-2.5 px-3">대분류</th>
                    <th className="py-2.5 px-4">차기년도 자동 승급 직급</th>
                    <th className="py-2.5 px-3 text-center w-24">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {ranks.map((r) => {
                    const isEditing = editingRank?.id === r.id;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingRank.step_order}
                              onChange={(e) =>
                                setEditingRank({
                                  ...editingRank,
                                  step_order: parseInt(e.target.value, 10) || 1,
                                })
                              }
                              className="w-12 px-1.5 py-1 border border-blue-400 rounded text-center"
                            />
                          ) : (
                            r.step_order
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingRank.rank_name}
                              onChange={(e) =>
                                setEditingRank({ ...editingRank, rank_name: e.target.value })
                              }
                              className="px-2 py-1 border border-blue-400 rounded w-28"
                            />
                          ) : (
                            r.rank_name
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingRank.category || ''}
                              onChange={(e) =>
                                setEditingRank({ ...editingRank, category: e.target.value })
                              }
                              className="px-2 py-1 border border-blue-400 rounded w-20"
                            />
                          ) : (
                            r.category || '-'
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingRank.next_rank || ''}
                              onChange={(e) =>
                                setEditingRank({ ...editingRank, next_rank: e.target.value })
                              }
                              placeholder="다음 승급 직급"
                              className="px-2 py-1 border border-blue-400 rounded w-32"
                            />
                          ) : (
                            <div className="flex items-center gap-1 text-slate-700">
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-blue-700">
                                {r.next_rank || '(유지)'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveRank(editingRank)}
                                className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-2xs"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setEditingRank(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-2xs"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingRank({ ...r })}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="수정"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRank(r.id, r.rank_name)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 flex-shrink-0">
              <span>총 {ranks.length}개 직급 등록됨</span>
              <button
                onClick={() => setIsRankModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-1. Base Year Setting Modal (Admin Only - 매년 5년 기준, 드래그 이동 지원) */}
      {isBaseYearModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDragging) {
              setIsBaseYearModalOpen(false);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 animate-in fade-in"
        >
          <div
            style={{
              transform: `translate3d(${modalPos.x}px, ${modalPos.y}px, 0)`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col cursor-default"
          >
            {/* Draggable Header */}
            <div
              onMouseDown={handleHeaderMouseDown}
              onDoubleClick={() => setModalPos({ x: 0, y: 0 })}
              className={`px-6 py-4 bg-amber-50/80 border-b border-amber-200/70 flex items-center justify-between flex-shrink-0 select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              title="헤더를 마우스로 잡고 드래그하여 위치를 자유롭게 이동할 수 있습니다 (더블클릭 시 중앙 복귀)"
            >
              <div className="flex items-center gap-2.5 pointer-events-none">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">매년 5년 기준 연도 설정</h3>
                    <span className="text-[11px] text-amber-800/80 font-medium hidden sm:inline-flex items-center gap-1 bg-amber-100/70 px-2 py-0.5 rounded">
                      <GripHorizontal className="w-3.5 h-3.5" />
                      위치 이동 가능
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    기준 연도에 맞춰 향후 5개년 예상 승진 직급을 동적으로 갱신합니다.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {(modalPos.x !== 0 || modalPos.y !== 0) && (
                  <button
                    type="button"
                    onClick={() => setModalPos({ x: 0, y: 0 })}
                    className="inline-flex items-center gap-1 text-2xs text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-2 py-1 rounded-md transition-colors cursor-pointer"
                    title="모달 위치를 화면 중앙으로 초기화합니다"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>위치 초기화</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsBaseYearModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Info Guide */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold mb-1 flex items-center gap-1.5 text-blue-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  DB 데이터 원본 보존 및 동적 갱신 안내
                </p>
                사원 DB의 원본 데이터를 직접 수정하지 않고, 설정하신 기준 연도에 따라 
                <span className="font-bold underline decoration-blue-400 ml-1">
                  기준 연차 및 향후 5개년 예상 직급
                </span>이 화면과 엑셀 다운로드에 즉시 동적으로 계산되어 갱신됩니다.
              </div>

              {/* Year Stepper / Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  기준 연도 선택
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTempBaseYear((prev) => Math.max(2020, prev - 1))}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    -1년 (이전)
                  </button>
                  <div className="flex-1 flex items-center justify-center py-2 px-4 bg-slate-50 border border-slate-300 rounded-lg text-lg font-bold text-slate-900">
                    <span>{tempBaseYear}년 기준</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTempBaseYear((prev) => Math.min(2050, prev + 1))}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-2xs cursor-pointer"
                  >
                    +1년 (다음해)
                  </button>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <span className="text-2xs font-semibold text-slate-500 block mb-1.5">
                  빠른 연도 선택
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {[2026, 2027, 2028, 2029, 2030].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTempBaseYear(yr)}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                        tempBaseYear === yr
                          ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {yr}년
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">기준 연차 컬럼:</span>
                  <span className="font-bold text-slate-800">
                    {String(tempBaseYear).slice(-2)}년 연차(기준)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">5개년 예상 승진 기간:</span>
                  <span className="font-bold text-blue-700">
                    {tempBaseYear + 1}년 ~ {tempBaseYear + 5}년
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((offset) => (
                    <div
                      key={offset}
                      className="flex-1 text-center py-1 bg-white rounded border border-slate-200 text-2xs font-semibold text-slate-700"
                    >
                      {tempBaseYear + offset}년
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTempBaseYear(2026)}
                className="text-xs text-slate-500 hover:text-slate-800 underline decoration-slate-300 cursor-pointer"
              >
                기본값(2026년)으로 초기화
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBaseYearModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyBaseYear(tempBaseYear)}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                  title="DB에는 저장하지 않고 현재 화면에서만 임시로 미리봅니다"
                >
                  화면만 적용
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm cursor-pointer"
                  title={`${tempBaseYear}년 기준 연도와 직급을 데이터베이스에 영구 확정 저장합니다`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>확정</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2-2. DB Save Confirmation Dialog */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {tempBaseYear}년 기준 직급 DB 확정 저장
                </h3>
                <p className="text-xs text-slate-500">
                  데이터베이스에 영구 저장되어 모든 사용자 화면에 반영됩니다.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-2.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-600">확정 기준 연도:</span>
                <span className="text-amber-800 text-sm font-bold bg-amber-200/70 px-2 py-0.5 rounded">
                  {tempBaseYear}년
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">대상 임직원:</span>
                <span className="font-semibold text-slate-800">전체 사원 ({totalCount}명)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">새 5개년 예상 승진 기간:</span>
                <span className="font-bold text-blue-700">
                  {tempBaseYear + 1}년 ~ {tempBaseYear + 5}년
                </span>
              </div>
              <p className="text-2xs text-amber-800/80 pt-2 border-t border-amber-200/70 leading-relaxed">
                ※ 모든 사원의 현재 직급이 <span className="font-bold underline">{tempBaseYear}년 승진 직급</span>으로 DB에 업데이트되며, 기존 연도별 이력은 히스토리 테이블에 안전하게 자동 백업됩니다.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isConfirmingSave}
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isConfirmingSave}
                onClick={() => handleSaveToDB(tempBaseYear)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isConfirmingSave ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>DB 저장 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>확정 및 DB 저장</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Employee Detail Modal */}
      {detailEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <button
                onClick={() => setDetailEmployee(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl font-bold shadow-inner">
                  {detailEmployee.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{detailEmployee.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        detailEmployee.status === '재직'
                          ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {detailEmployee.status || '재직'}
                    </span>
                  </div>
                  <p className="text-blue-100 text-xs mt-1">
                    {detailEmployee.department} · {detailEmployee.position_years || '직급 미지정'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">사원번호</span>
                  <span className="font-semibold text-slate-800">{detailEmployee.id}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">고용형태</span>
                  <span className="font-semibold text-slate-800">
                    {detailEmployee.employment_type || '정직원'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">입사일</span>
                  <span className="font-semibold text-slate-800">
                    {detailEmployee.hire_date || '미등록'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 block mb-1">근속기간</span>
                  <span className="font-semibold text-blue-600">
                    {calculateTenure(detailEmployee.hire_date)}
                  </span>
                </div>

                {/* 5-Year Projections Preview in Detail Modal */}
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60 col-span-2">
                  <span className="text-blue-900 font-bold block mb-2">
                    향후 5개년 예상 승진 직급 ({baseYear + 1}년 ~ {baseYear + 5}년)
                  </span>
                  {(() => {
                    const p = calculate5YearProjections(detailEmployee.position_years, ranks, baseYear);
                    return (
                      <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-white border border-blue-100">
                          <span className="text-2xs text-slate-400 block">{baseYear + 1}년</span>
                          <span className="font-bold text-slate-800">{p.y1}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white border border-blue-100">
                          <span className="text-2xs text-slate-400 block">{baseYear + 2}년</span>
                          <span className="font-bold text-slate-800">{p.y2}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white border border-blue-100">
                          <span className="text-2xs text-slate-400 block">{baseYear + 3}년</span>
                          <span className="font-bold text-slate-800">{p.y3}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white border border-blue-100">
                          <span className="text-2xs text-slate-400 block">{baseYear + 4}년</span>
                          <span className="font-bold text-slate-800">{p.y4}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-white border border-blue-100">
                          <span className="text-2xs text-slate-400 block">{baseYear + 5}년</span>
                          <span className="font-bold text-slate-800">{p.y5}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 col-span-2">
                  <span className="text-slate-400 block mb-1">연락처</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {detailEmployee.phone || '연락처 미등록'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 col-span-2">
                  <span className="text-slate-400 block mb-1">이메일</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {detailEmployee.email || '이메일 미등록'}
                  </span>
                </div>
                {detailEmployee.notes && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 col-span-2">
                    <span className="text-slate-400 block mb-1">비고</span>
                    <p className="text-slate-700 whitespace-pre-wrap">{detailEmployee.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                {isAdmin ? (
                  <button
                    onClick={() => {
                      setDetailEmployee(null);
                      handleOpenEdit(detailEmployee);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>정보 수정</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setDetailEmployee(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Delete Single Confirm Modal (Admin Only) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">사원 정보 삭제</h3>
              <p className="text-xs text-slate-500">
                정말로 <strong className="text-slate-800">[{deleteTarget.name}]</strong> 사원의 정보를
                삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleDeleteSingle}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-500/25"
              >
                삭제하기
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Batch Delete Confirm Modal (Admin Only) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">선택 사원 일괄 삭제</h3>
              <p className="text-xs text-slate-500">
                선택하신 <strong className="text-rose-600">{selectedIds.length}명</strong>의 사원
                정보를 일괄 삭제하시겠습니까? 데이터베이스에서 영구 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleBatchDelete}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-500/25"
              >
                일괄 삭제
              </button>
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
