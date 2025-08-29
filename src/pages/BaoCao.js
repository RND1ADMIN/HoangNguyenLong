import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash, Search, ChevronLeft, ChevronRight, Filter, Download, Upload, X, Calendar, AlertCircle, List, ChevronDown, ChevronUp, Package } from 'lucide-react';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';
import Select from 'react-select';

// Date formatting utilities
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseVNDate = (dateString) => {
  if (!dateString) return null;
  if (dateString.includes('/')) {
    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatCurrency = (amount) => {
  if (!amount || isNaN(amount)) return '0 VNĐ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
};

const formatNumber = (number) => {
  if (!number || isNaN(number)) return '0';
  return new Intl.NumberFormat('vi-VN').format(number);
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="flex justify-center items-center space-x-2 mt-6">
    <button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`}
    >
      <ChevronLeft className="h-5 w-5" />
    </button>
    <div className="flex space-x-1">
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }
        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 flex items-center justify-center rounded-md ${currentPage === pageNum
              ? 'bg-indigo-600 text-white'
              : 'text-gray-700 hover:bg-indigo-50'
              }`}
          >
            {pageNum}
          </button>
        );
      })}
    </div>
    <button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`}
    >
      <ChevronRight className="h-5 w-5" />
    </button>
    <span className="text-sm text-gray-600 ml-2">
      Trang {currentPage} / {totalPages || 1}
    </span>
  </div>
);

const ReportManagement = () => {
  // State Management - core data
  const [reports, setReports] = useState([]);
  const [nhapBaoBiData, setNhapBaoBiData] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [teamWorkStages, setTeamWorkStages] = useState([]); // TO_PBNS data
  const [teams, setTeams] = useState([]);
  const [viewMode, setViewMode] = useState('grouped');
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // State - UI controls
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    to: '',
    congDoan: '',
    khachHang: '',
    startDate: null,
    endDate: null
  });

  // State - modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  // State - confirm modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmTitle, setConfirmTitle] = useState("");
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // State - view history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);

  // Default empty report - removed status fields
  const emptyReport = {
    IDBC: '',
    'NGÀY': new Date(),
    'ID_NHAPBAOBI': '',
    'TÊN HÀNG': '',
    'TỔ': '',
    'CÔNG ĐOẠN': '',
    'ĐƠN VỊ TÍNH': '',
    'PP TÍNH NĂNG SUẤT': '',
    'KHỐI LƯỢNG': '',
    'NHÂN SỰ THAM GIA': [],
    'SỐ DÂY': '',
    'GHI CHÚ': '',
    'NGƯỜI NHẬP': '',
    'ĐƠN GIÁ': '',
    'THÀNH TIỀN': '',
    'LỊCH SỬ': ''
  };

  const [currentReport, setCurrentReport] = useState(emptyReport);

  // Helper functions
  const getCurrentTimestamp = () => {
    return new Date().toLocaleString('vi-VN');
  };

  const getCurrentUserName = () => {
    const currentUser = authUtils.getUserData();
    return currentUser?.['Họ và Tên'] || 'Người dùng';
  };

  const addHistoryEntry = (report, action) => {
    const timestamp = getCurrentTimestamp();
    const username = getCurrentUserName();
    const entry = `[${timestamp}] ${username} - ${action}`;
    const currentHistory = report['LỊCH SỬ'] || '';
    return currentHistory ? `${currentHistory}\n${entry}` : entry;
  };

  const calculateThanhTien = (khoiLuong, donGia) => {
    const kl = parseFloat(khoiLuong) || 0;
    const dg = parseFloat(donGia) || 0;
    return (kl * dg).toString();
  };

  // Get active team work stages from TO_PBNS
  const getActiveTeamWorkStages = () => {
    const today = new Date();
    return teamWorkStages.filter(stage => {
      const startDate = new Date(stage['HIỆU LỰC TỪ']);
      const endDate = new Date(stage['HIỆU LỰC ĐẾN']);
      return today >= startDate && today <= endDate;
    });
  };

  // Get work stages for selected team
  const getWorkStagesForTeam = (teamName) => {
    const activeStages = getActiveTeamWorkStages();
    return activeStages.filter(stage => stage['TỔ'] === teamName);
  };

  // Handle team selection
  const handleTeamChange = (teamName) => {
    setCurrentReport(prev => ({
      ...prev,
      'TỔ': teamName,
      'CÔNG ĐOẠN': '',
      'ĐƠN VỊ TÍNH': '',
      'PP TÍNH NĂNG SUẤT': '',
      'NHÂN SỰ THAM GIA': [],
      'ĐƠN GIÁ': '',
      'THÀNH TIỀN': ''
    }));
  };

  // Handle work stage selection
  const handleWorkStageChange = (workStage) => {
    const selectedTeam = currentReport['TỔ'];
    const stageData = getWorkStagesForTeam(selectedTeam).find(
      stage => stage['TÊN CÔNG ĐOẠN'] === workStage
    );

    if (stageData) {
      const staffArray = stageData['NHÂN SỰ']
        ? stageData['NHÂN SỰ'].split(',').map(name => ({
          value: name.trim(),
          label: name.trim()
        }))
        : [];

      setCurrentReport(prev => ({
        ...prev,
        'CÔNG ĐOẠN': workStage,
        'ĐƠN VỊ TÍNH': stageData['ĐƠN VỊ TÍNH'] || '',
        'PP TÍNH NĂNG SUẤT': stageData['PP TÍNH NĂNG SUẤT'] || '',
        'NHÂN SỰ THAM GIA': staffArray,
        'ĐƠN GIÁ': stageData['ĐƠN GIÁ NĂNG SUẤT'] || '',
        'THÀNH TIỀN': calculateThanhTien(prev['KHỐI LƯỢNG'], stageData['ĐƠN GIÁ NĂNG SUẤT'])
      }));
    }
  };

  const handleFilterDateChange = (field, value) => {
    if (value) {
      const date = new Date(value);
      setFilters(prev => ({
        ...prev,
        [field]: date
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Data fetching
  useEffect(() => {
    fetchReports();
    fetchNhapBaoBiData();
    fetchStaffList();
    fetchTeamWorkStages();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await authUtils.apiRequest('BC2', 'Find', {});
      setReports(response);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Lỗi khi tải danh sách báo cáo');
    }
  };

  const fetchNhapBaoBiData = async () => {
    try {
      const response = await authUtils.apiRequest('NHAPBAOBI', 'Find', {});
      setNhapBaoBiData(response);
    } catch (error) {
      console.error('Error fetching NHAPBAOBI data:', error);
      toast.error('Lỗi khi tải dữ liệu nhập bao bì');
    }
  };

  const fetchStaffList = async () => {
    try {
      const response = await authUtils.apiRequest('DSNV', 'Find', {});
      const staffOptions = response.map(staff => ({
        value: staff['Họ và Tên'],
        label: staff['Họ và Tên']
      }));
      setStaffList(staffOptions);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      toast.error('Lỗi khi tải danh sách nhân viên');
    }
  };

  const fetchTeamWorkStages = async () => {
    try {
      const response = await authUtils.apiRequest('TO_PBNS', 'Find', {});
      setTeamWorkStages(response);

      const today = new Date();
      const activeStages = response.filter(stage => {
        const startDate = new Date(stage['HIỆU LỰC TỪ']);
        const endDate = new Date(stage['HIỆU LỰC ĐẾN']);
        return today >= startDate && today <= endDate;
      });

      const uniqueTeams = [...new Set(activeStages.map(stage => stage['TỔ']))];
      setTeams(uniqueTeams);
    } catch (error) {
      console.error('Error fetching team work stages:', error);
      toast.error('Lỗi khi tải danh sách tổ công đoạn');
    }
  };

  // View history
  const handleViewHistory = (report) => {
    if (!report['LỊCH SỬ']) {
      toast.info('Chưa có lịch sử cho báo cáo này');
      return;
    }
    const historyEntries = report['LỊCH SỬ'].split('\n').filter(entry => entry.trim() !== '');
    setSelectedHistory(historyEntries);
    setShowHistoryModal(true);
  };

  // Toggle group expansion
  const toggleGroupExpansion = (batchId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedGroups(newExpanded);
  };

  // Report modal functions
  const handleOpen = useCallback((report = null) => {
    if (report) {
      const staffArray = report['NHÂN SỰ THAM GIA']
        ? report['NHÂN SỰ THAM GIA'].split(',').map(name => ({
          value: name.trim(),
          label: name.trim()
        }))
        : [];

      setCurrentReport({
        IDBC: report.IDBC || '',
        'NGÀY': report['NGÀY'] ? new Date(report['NGÀY']) : new Date(),
        'ID_NHAPBAOBI': report['ID_NHAPBAOBI'] || '',
        'TÊN HÀNG': report['TÊN HÀNG'] || '',
        'TỔ': report['TỔ'] || '',
        'CÔNG ĐOẠN': report['CÔNG ĐOẠN'] || '',
        'ĐƠN VỊ TÍNH': report['ĐƠN VỊ TÍNH'] || '',
        'PP TÍNH NĂNG SUẤT': report['PP TÍNH NĂNG SUẤT'] || '',
        'KHỐI LƯỢNG': report['KHỐI LƯỢNG'] || '',
        'NHÂN SỰ THAM GIA': staffArray,
        'SỐ DÂY': report['SỐ DÂY'] || '',
        'GHI CHÚ': report['GHI CHÚ'] || '',
        'NGƯỜI NHẬP': report['NGƯỜI NHẬP'] || '',
        'ĐƠN GIÁ': report['ĐƠN GIÁ'] || '',
        'THÀNH TIỀN': report['THÀNH TIỀN'] || '',
        'LỊCH SỬ': report['LỊCH SỬ'] || ''
      });
    } else {
      const currentUser = authUtils.getUserData();
      setCurrentReport({
        ...emptyReport,
        'NGƯỜI NHẬP': currentUser?.['Họ và Tên'] || ''
      });
    }
    setOpen(true);
  }, [emptyReport]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCurrentReport(emptyReport);
  }, [emptyReport]);

  // Form handlers
  const handleInputChange = useCallback((field, value) => {
    setCurrentReport(prev => {
      const updatedReport = {
        ...prev,
        [field]: value
      };

      if (field === 'KHỐI LƯỢNG') {
        updatedReport['THÀNH TIỀN'] = calculateThanhTien(value, prev['ĐƠN GIÁ']);
      }

      return updatedReport;
    });
  }, []);

  const handleDateChange = useCallback((date) => {
    setCurrentReport(prev => ({
      ...prev,
      'NGÀY': date
    }));
  }, []);

  const handleStaffChange = useCallback((selectedOptions) => {
    setCurrentReport(prev => ({
      ...prev,
      'NHÂN SỰ THAM GIA': selectedOptions || []
    }));
  }, []);

  // Report validation - removed status validation
  const validateReport = useCallback((report) => {
    const errors = [];
    if (!report['ID_NHAPBAOBI']) errors.push('ID Nhập bao bì không được để trống');
    if (!report['TỔ']) errors.push('TỔ không được để trống');
    if (!report['CÔNG ĐOẠN']) errors.push('CÔNG ĐOẠN không được để trống');
    if (!report['KHỐI LƯỢNG']) errors.push('KHỐI LƯỢNG không được để trống');
    if (!report['NGÀY']) errors.push('NGÀY không được để trống');
    if (!report['NGƯỜI NHẬP']) errors.push('NGƯỜI NHẬP không được để trống');
    return errors;
  }, []);

  // Save report - simplified without status logic
  const handleSave = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const errors = validateReport(currentReport);
      if (errors.length > 0) {
        toast.error(errors.join('\n'));
        return;
      }

      const staffString = currentReport['NHÂN SỰ THAM GIA']
        .map(staff => staff.value)
        .join(', ');

      let reportData = {
        ...currentReport,
        'NGÀY': currentReport['NGÀY'].toISOString().split('T')[0],
        'NHÂN SỰ THAM GIA': staffString
      };

      if (reportData.IDBC) {
        reportData['LỊCH SỬ'] = addHistoryEntry(reportData, 'Cập nhật báo cáo');
        await authUtils.apiRequest('BC2', 'Edit', {
          "Rows": [reportData]
        });
        toast.success('Cập nhật báo cáo thành công!');
      } else {
        const existingReports = await authUtils.apiRequest('BC2', 'Find', {});
        const maxID = existingReports.reduce((max, report) => {
          const id = parseInt(report.IDBC.replace('BC', '')) || 0;
          return id > max ? id : max;
        }, 0);

        const newID = maxID + 1;
        const newReportID = `BC${newID.toString().padStart(3, '0')}`;
        reportData.IDBC = newReportID;
        reportData['LỊCH SỬ'] = addHistoryEntry(reportData, 'Tạo báo cáo mới');

        await authUtils.apiRequest('BC2', 'Add', {
          "Rows": [reportData]
        });
        toast.success('Thêm báo cáo thành công!');
      }

      await fetchReports();
      handleClose();
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu báo cáo'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete report
  const handleDelete = (IDBC) => {
    setConfirmTitle("Xóa báo cáo");
    setConfirmMessage("Bạn có chắc chắn muốn xóa báo cáo này?");
    setConfirmAction(async () => {
      try {
        await authUtils.apiRequest('BC2', 'Delete', {
          "Rows": [{ "IDBC": IDBC }]
        });
        toast.success('Xóa báo cáo thành công!');
        await fetchReports();
      } catch (error) {
        console.error('Error deleting report:', error);
        toast.error('Có lỗi xảy ra khi xóa báo cáo');
      }
    });
    setShowConfirmModal(true);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedReports.length === 0) {
      toast.warning('Vui lòng chọn báo cáo để xóa');
      return;
    }

    setConfirmTitle("Xóa nhiều báo cáo");
    setConfirmMessage(`Bạn có chắc chắn muốn xóa ${selectedReports.length} báo cáo đã chọn?`);
    setConfirmAction(async () => {
      try {
        await Promise.all(
          selectedReports.map(id =>
            authUtils.apiRequest('BC2', 'Delete', {
              "Rows": [{ "IDBC": id }]
            })
          )
        );
        toast.success('Xóa báo cáo thành công!');
        setSelectedReports([]);
        await fetchReports();
      } catch (error) {
        toast.error('Có lỗi xảy ra khi xóa báo cáo');
      }
    });
    setShowConfirmModal(true);
  };

  const handleExportSelected = () => {
    if (selectedReports.length === 0) {
      toast.warning('Vui lòng chọn báo cáo để xuất file');
      return;
    }

    const selectedItems = reports.filter(r => selectedReports.includes(r.IDBC));
    const excelData = selectedItems.map(item => ({
      IDBC: item.IDBC,
      'NGÀY': item['NGÀY'],
      'ID_NHAPBAOBI': item['ID_NHAPBAOBI'],
      'TÊN HÀNG': item['TÊN HÀNG'],
      'TỔ': item['TỔ'],
      'CÔNG ĐOẠN': item['CÔNG ĐOẠN'],
      'ĐƠN VỊ TÍNH': item['ĐƠN VỊ TÍNH'],
      'PP TÍNH NĂNG SUẤT': item['PP TÍNH NĂNG SUẤT'],
      'KHỐI LƯỢNG': item['KHỐI LƯỢNG'],
      'NHÂN SỰ THAM GIA': item['NHÂN SỰ THAM GIA'],
      'SỐ DÂY': item['SỐ DÂY'],
      'GHI CHÚ': item['GHI CHÚ'],
      'NGƯỜI NHẬP': item['NGƯỜI NHẬP'],
      'ĐƠN GIÁ': item['ĐƠN GIÁ'],
      'THÀNH TIỀN': item['THÀNH TIỀN']
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo chi tiết');
    XLSX.writeFile(wb, `bao-cao-chi-tiet-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Import functions
  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension)) {
      toast.error('Vui lòng chọn file Excel (.xlsx, .xls) hoặc CSV');
      return;
    }

    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const binaryData = evt.target.result;
        const workbook = XLSX.read(binaryData, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error('File không có dữ liệu hoặc không đúng định dạng');
          setImportFile(null);
          return;
        }

        const headers = jsonData[0];
        const requiredColumns = ['NGÀY', 'ID_NHAPBAOBI', 'TỔ', 'CÔNG ĐOẠN', 'KHỐI LƯỢNG', 'NGƯỜI NHẬP'];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          toast.error(`File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
          setImportFile(null);
          return;
        }

        const previewData = jsonData.slice(1, 6).map(row => {
          const rowData = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index] || '';
          });
          return rowData;
        });

        setImportPreview(previewData);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        toast.error('Không thể đọc file. Vui lòng kiểm tra định dạng file.');
        setImportFile(null);
      }
    };

    reader.onerror = () => {
      toast.error('Không thể đọc file');
      setImportFile(null);
    };

    reader.readAsBinaryString(file);
  };

  const handleImportData = async () => {
    if (!importFile) return;

    setIsImporting(true);
    toast.info('Đang xử lý dữ liệu...', { autoClose: false, toastId: 'importing' });

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const binaryData = evt.target.result;
          const workbook = XLSX.read(binaryData, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const existingReports = await authUtils.apiRequest('BC2', 'Find', {});
          const maxID = existingReports.reduce((max, report) => {
            const id = parseInt(report.IDBC.replace('BC', '')) || 0;
            return id > max ? id : max;
          }, 0);

          let newIdCounter = maxID + 1;

          const invalidRows = [];
          const validatedData = [];

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];

            if (!row['ID_NHAPBAOBI'] || !row['TỔ'] || !row['CÔNG ĐOẠN'] || !row['KHỐI LƯỢNG'] || !row['NGÀY']) {
              invalidRows.push(i + 2);
              continue;
            }

            const activeStages = getActiveTeamWorkStages();
            const matchingStage = activeStages.find(
              stage => stage['TỔ'] === row['TỔ'] && stage['TÊN CÔNG ĐOẠN'] === row['CÔNG ĐOẠN']
            );

            const donGia = matchingStage ? matchingStage['ĐƠN GIÁ NĂNG SUẤT'] : '';
            const nhanSu = matchingStage ? matchingStage['NHÂN SỰ'] : '';
            const donViTinh = matchingStage ? matchingStage['ĐƠN VỊ TÍNH'] : '';
            const ppTinhNangSuat = matchingStage ? matchingStage['PP TÍNH NĂNG SUẤT'] : '';

            const importEntry = `[${getCurrentTimestamp()}] ${getCurrentUserName()} - Nhập từ file Excel`;

            const report = {
              IDBC: row.IDBC || `BC${newIdCounter.toString().padStart(3, '0')}`,
              'NGÀY': row['NGÀY'],
              'ID_NHAPBAOBI': row['ID_NHAPBAOBI'],
              'TÊN HÀNG': row['TÊN HÀNG'] || '',
              'TỔ': row['TỔ'],
              'CÔNG ĐOẠN': row['CÔNG ĐOẠN'],
              'ĐƠN VỊ TÍNH': donViTinh,
              'PP TÍNH NĂNG SUẤT': ppTinhNangSuat,
              'KHỐI LƯỢNG': row['KHỐI LƯỢNG'],
              'NHÂN SỰ THAM GIA': row['NHÂN SỰ THAM GIA'] || nhanSu,
              'SỐ DÂY': row['SỐ DÂY'] || '',
              'GHI CHÚ': row['GHI CHÚ'] || '',
              'NGƯỜI NHẬP': row['NGƯỜI NHẬP'] || getCurrentUserName(),
              'ĐƠN GIÁ': donGia,
              'THÀNH TIỀN': calculateThanhTien(row['KHỐI LƯỢNG'], donGia),
              'LỊCH SỬ': importEntry
            };

            validatedData.push(report);
            newIdCounter++;
          }

          if (invalidRows.length > 0) {
            toast.warning(`Có ${invalidRows.length} dòng dữ liệu không hợp lệ: ${invalidRows.join(', ')}`);
          }

          if (validatedData.length === 0) {
            toast.error('Không có dữ liệu hợp lệ để nhập');
            return;
          }

          const batchSize = 25;
          let successCount = 0;

          for (let i = 0; i < validatedData.length; i += batchSize) {
            const batch = validatedData.slice(i, i + batchSize);
            try {
              await authUtils.apiRequest('BC2', 'Add', { "Rows": batch });
              successCount += batch.length;
            } catch (error) {
              console.error('Error importing batch:', error);
            }
          }

          toast.success(`Đã nhập thành công ${successCount} báo cáo`);
          await fetchReports();
          setShowImportModal(false);
          setImportFile(null);
          setImportPreview([]);
        } catch (error) {
          console.error('Error processing import:', error);
          toast.error('Có lỗi xảy ra khi xử lý dữ liệu');
        } finally {
          toast.dismiss('importing');
          setIsImporting(false);
        }
      };

      reader.onerror = () => {
        toast.dismiss('importing');
        toast.error('Không thể đọc file');
        setIsImporting(false);
      };

      reader.readAsBinaryString(importFile);
    } catch (error) {
      toast.dismiss('importing');
      toast.error('Có lỗi xảy ra');
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      ['NGÀY', 'ID_NHAPBAOBI', 'TÊN HÀNG', 'TỔ', 'CÔNG ĐOẠN', 'KHỐI LƯỢNG', 'SỐ DÂY', 'NHÂN SỰ THAM GIA', 'GHI CHÚ', 'NGƯỜI NHẬP'],
      ['2025-03-22', 'UVVU7XLQ', 'Bao bì anh', 'CD1', 'Bao bì anh - Cưa', '50', '10', 'Nguyễn Văn A, Trần Văn B', 'Hoàn thành đúng tiến độ', 'Lê Văn C'],
      ['2025-03-22', 'UVVU7XLQ', 'Bao bì em', 'CD2', 'Bao bì em - Cắt lưa', '30', '8', 'Phạm Văn D, Ngô Văn E', 'Cần bổ sung nhân lực', 'Lê Văn C']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'mau_nhap_bao_cao_chi_tiet.xlsx');
  };

  // Group reports by ID_NHAPBAOBI with NHAPBAOBI info
  const groupedReportsByBatch = useMemo(() => {
    const groups = {};

    reports.forEach(report => {
      const batchId = report['ID_NHAPBAOBI'];
      if (!groups[batchId]) {
        const nhapBaoBiInfo = nhapBaoBiData.find(item => item.ID === batchId) || {};

        groups[batchId] = {
          batchInfo: nhapBaoBiInfo,
          reports: [],
          totalAmount: 0,
          totalReports: 0
        };
      }
      groups[batchId].reports.push(report);
      groups[batchId].totalReports++;

      const amount = parseFloat(report['THÀNH TIỀN']) || 0;
      groups[batchId].totalAmount += amount;
    });

    return groups;
  }, [reports, nhapBaoBiData]);

  // Apply filters to grouped data
  const filteredGroupedReports = useMemo(() => {
    const filtered = Object.entries(groupedReportsByBatch).filter(([batchId, group]) => {
      const searchMatch = !search ||
        batchId.toLowerCase().includes(search.toLowerCase()) ||
        group.batchInfo['KHÁCH HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
        group.batchInfo['SỐ XE']?.toLowerCase().includes(search.toLowerCase()) ||
        group.reports.some(report =>
          report['TỔ']?.toLowerCase().includes(search.toLowerCase()) ||
          report['CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
          report.IDBC?.toLowerCase().includes(search.toLowerCase()) ||
          report['TÊN HÀNG']?.toLowerCase().includes(search.toLowerCase())
        );

      const customerMatch = !filters.khachHang ||
        group.batchInfo['KHÁCH HÀNG']?.includes(filters.khachHang);

      const teamMatch = !filters.to ||
        group.reports.some(report => report['TỔ'] === filters.to);

      const stageMatch = !filters.congDoan ||
        group.reports.some(report => report['CÔNG ĐOẠN'] === filters.congDoan);

      let dateMatches = true;
      if (filters.startDate || filters.endDate) {
        const batchDate = parseVNDate(group.batchInfo['NGÀY THÁNG']);
        const startDate = filters.startDate ? new Date(filters.startDate.setHours(0, 0, 0, 0)) : null;
        const endDate = filters.endDate ? new Date(filters.endDate.setHours(0, 0, 0, 0)) : null;

        if (startDate && endDate) {
          dateMatches = batchDate >= startDate && batchDate <= endDate;
        } else if (startDate) {
          dateMatches = batchDate >= startDate;
        } else if (endDate) {
          dateMatches = batchDate <= endDate;
        }
      }

      return searchMatch && customerMatch && teamMatch && stageMatch && dateMatches;
    });

    return filtered;
  }, [groupedReportsByBatch, search, filters]);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Tổng hợp năng suất</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
              </button>

              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Nhập Excel
              </button>

              {selectedReports.length > 0 && (
                <>
                  <button
                    onClick={handleExportSelected}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Xuất file ({selectedReports.length})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Trash className="w-4 h-4" />
                    Xóa ({selectedReports.length})
                  </button>
                </>
              )}

              <button
                onClick={() => handleOpen()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Thêm báo cáo
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                {viewMode === 'list' ? (
                  <>
                    <Package className="w-4 h-4" />
                    Nhóm theo lô
                  </>
                ) : (
                  <>
                    <List className="w-4 h-4" />
                    Danh sách
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                  <select
                    value={filters.khachHang}
                    onChange={(e) => setFilters({ ...filters, khachHang: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tất cả khách hàng</option>
                    {Array.from(new Set(nhapBaoBiData.map(item => item['KHÁCH HÀNG']))).filter(Boolean).map(customer => (
                      <option key={customer} value={customer}>{customer}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổ</label>
                  <select
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tất cả tổ</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn</label>
                  <select
                    value={filters.congDoan}
                    onChange={(e) => setFilters({ ...filters, congDoan: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tất cả công đoạn</option>
                    {Array.from(new Set(reports.map(r => r['CÔNG ĐOẠN']))).filter(Boolean).map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Từ</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="date"
                      value={filters.startDate ? formatDateForInput(filters.startDate) : ''}
                      onChange={(e) => handleFilterDateChange('startDate', e.target.value)}
                      className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Từ ngày"
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đến</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="date"
                      value={filters.endDate ? formatDateForInput(filters.endDate) : ''}
                      onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                      className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Đến ngày"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      to: '',
                      congDoan: '',
                      khachHang: '',
                      startDate: null,
                      endDate: null
                    })}
                    className="w-full px-4 py-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search Section */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo khách hàng, tổ, công đoạn, tên hàng..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Main Content */}
          {viewMode === 'grouped' ? (
            <div className="space-y-6">
              {filteredGroupedReports.length > 0 ? (
                filteredGroupedReports.map(([batchId, group]) => (
                  <div key={batchId} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    {/* Improved Batch Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-gray-200">
                      <div className="px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => toggleGroupExpansion(batchId)}
                              className="flex items-center gap-3 text-xl font-bold text-gray-800 hover:text-indigo-600 transition-colors"
                            >
                              {expandedGroups.has(batchId) ?
                                <ChevronUp className="w-6 h-6 text-blue-600" /> :
                                <ChevronDown className="w-6 h-6 text-blue-600" />
                              }
                              <Package className="w-6 h-6 text-blue-600" />
                              <span className="text-blue-800">{group.batchInfo['NGÀY THÁNG'] ?
                                new Date(group.batchInfo['NGÀY THÁNG']).toLocaleDateString('vi-VN') : 'N/A'} • Xe: {group.batchInfo['SỐ XE'] || 'N/A'}</span>
                            </button>
                            <div className="hidden md:flex items-center gap-4">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {group.totalReports} báo cáo
                              </span>
                              <span className="text-sm text-gray-600">
                                Tổng giá trị: <span className="font-bold text-green-600">{formatCurrency(group.totalAmount)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-800">{group.batchInfo['KHÁCH HÀNG'] || 'N/A'}</div>
                            {/* <div className="text-sm text-gray-500">
                              {group.batchInfo['NGÀY THÁNG'] ?
                                new Date(group.batchInfo['NGÀY THÁNG']).toLocaleDateString('vi-VN') : 'N/A'} • Xe: {group.batchInfo['SỐ XE'] || 'N/A'}
                            </div> */}
                          </div>
                        </div>

                        {/* Batch Details - Compact Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm bg-white p-2 rounded-lg border border-gray-100">
                          <div className="text-center border-r border-gray-200 pr-4">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Nhập BB anh</div>
                            <div className="text-lg font-bold text-blue-600">{formatNumber(group.batchInfo['BAO BÌ ANH (TẤN)']) || '0'}T</div>
                          </div>
                          <div className="text-center border-r border-gray-200 pr-4">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Thực nhận BB anh</div>
                            <div className="text-lg font-bold text-green-600">{formatNumber(group.batchInfo['THỰC NHẬN ANH (TẤN)']) || '0'}T</div>
                          </div>
                          <div className="text-center border-r border-gray-200 pr-4">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Đã phân bổ BB anh</div>
                            <div className="text-lg font-bold text-purple-600">{formatNumber(group.batchInfo['ĐÃ PHÂN BỔ (ANH)']) || '0'}T</div>
                          </div>
                          <div className="text-center border-r border-gray-200 pr-4">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Nhập BB em</div>
                            <div className="text-lg font-bold text-blue-600">{formatNumber(group.batchInfo['BAO BÌ EM (TẤN)']) || '0'}T</div>
                          </div>
                          <div className="text-center border-r border-gray-200 pr-4">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Nhập BB em</div>
                            <div className="text-lg font-bold text-green-600">{formatNumber(group.batchInfo['THỰC NHẬN EM (TẤN)']) || '0'}T</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-500 mb-1 font-medium">Đã phân bổ BB em</div>
                            <div className="text-lg font-bold text-purple-600">{formatNumber(group.batchInfo['ĐÃ PHÂN BỔ (EM)']) || '0'}T</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {expandedGroups.has(batchId) && (
                      <div className="bg-gray-50">
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="p-4 text-left">
                                  <input
                                    type="checkbox"
                                    checked={group.reports.every(r => selectedReports.includes(r.IDBC))}
                                    onChange={(e) => {
                                      const reportIds = group.reports.map(r => r.IDBC);
                                      if (e.target.checked) {
                                        setSelectedReports(prev => [...new Set([...prev, ...reportIds])]);
                                      } else {
                                        setSelectedReports(prev => prev.filter(id => !reportIds.includes(id)));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Tên hàng</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Tổ</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Công đoạn</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Khối lượng</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Số dây</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Nhân sự</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Đơn giá</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Thành tiền</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-left">Người nhập</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-600 uppercase tracking-wider text-right">Thao tác</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {group.reports.map(report => (
                                <tr key={report.IDBC} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-4 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={selectedReports.includes(report.IDBC)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedReports([...selectedReports, report.IDBC]);
                                        } else {
                                          setSelectedReports(selectedReports.filter(id => id !== report.IDBC));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['TÊN HÀNG']}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                      {report['TỔ']}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['CÔNG ĐOẠN']}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatNumber(report['KHỐI LƯỢNG'])} <span className="text-gray-500 text-xs">{report['ĐƠN VỊ TÍNH']}</span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['SỐ DÂY']}</td>
                                  <td className="px-4 py-3 text-sm text-gray-700">
                                    <div className="max-w-xs truncate" title={report['NHÂN SỰ THAM GIA']}>
                                      {report['NHÂN SỰ THAM GIA']}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatNumber(report['ĐƠN GIÁ'])}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                                    {formatCurrency(report['THÀNH TIỀN'])}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['NGƯỜI NHẬP']}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end space-x-1">
                                      <button
                                        onClick={() => handleOpen(report)}
                                        className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                        title="Sửa báo cáo"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(report.IDBC)}
                                        className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                        title="Xóa báo cáo"
                                      >
                                        <Trash className="h-4 w-4" />
                                      </button>
                                      {report['LỊCH SỬ'] && (
                                        <button
                                          onClick={() => handleViewHistory(report)}
                                          className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                                          title="Xem lịch sử"
                                        >
                                          <AlertCircle className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Không tìm thấy báo cáo nào phù hợp với tiêu chí tìm kiếm</p>
                </div>
              )}
            </div>
          ) : (
            // List View
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="p-4 text-left">
                          <input
                            type="checkbox"
                            checked={selectedReports.length === reports.length && reports.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReports(reports.map(r => r.IDBC));
                              } else {
                                setSelectedReports([]);
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Ngày</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khách hàng</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Tên hàng</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Tổ</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Công đoạn</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khối lượng</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Số dây</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đơn giá</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thành tiền</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Người nhập</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.values(groupedReportsByBatch).flatMap(group => group.reports)
                        .filter(report => {
                          const matchesSearch = !search ||
                            report.IDBC?.toLowerCase().includes(search.toLowerCase()) ||
                            report['ID_NHAPBAOBI']?.toLowerCase().includes(search.toLowerCase()) ||
                            report['TÊN HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
                            report['TỔ']?.toLowerCase().includes(search.toLowerCase()) ||
                            report['CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase());

                          const batchInfo = nhapBaoBiData.find(item => item.ID === report['ID_NHAPBAOBI']);
                          const matchesFilters = (!filters.to || report['TỔ'] === filters.to) &&
                            (!filters.congDoan || report['CÔNG ĐOẠN'] === filters.congDoan) &&
                            (!filters.khachHang || batchInfo?.['KHÁCH HÀNG']?.includes(filters.khachHang));

                          return matchesSearch && matchesFilters;
                        })
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map(report => {
                          const batchInfo = nhapBaoBiData.find(item => item.ID === report['ID_NHAPBAOBI']) || {};
                          return (
                            <tr key={report.IDBC} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedReports.includes(report.IDBC)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedReports([...selectedReports, report.IDBC]);
                                    } else {
                                      setSelectedReports(selectedReports.filter(id => id !== report.IDBC));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {batchInfo['NGÀY THÁNG'] ? new Date(batchInfo['NGÀY THÁNG']).toLocaleDateString('vi-VN') : 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{batchInfo['KHÁCH HÀNG'] || 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['TÊN HÀNG']}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                  {report['TỔ']}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['CÔNG ĐOẠN']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {formatNumber(report['KHỐI LƯỢNG'])} <span className="text-gray-500 text-xs">{report['ĐƠN VỊ TÍNH']}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['SỐ DÂY']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatNumber(report['ĐƠN GIÁ'])}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                                {formatCurrency(report['THÀNH TIỀN'])}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['NGƯỜI NHẬP']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-1">
                                  <button
                                    onClick={() => handleOpen(report)}
                                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                    title="Sửa báo cáo"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(report.IDBC)}
                                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                    title="Xóa báo cáo"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </button>
                                  {report['LỊCH SỬ'] && (
                                    <button
                                      onClick={() => handleViewHistory(report)}
                                      className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                                      title="Xem lịch sử"
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Pagination for list view */}
          {viewMode === 'list' && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(Object.values(groupedReportsByBatch).flatMap(g => g.reports).length / itemsPerPage)}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>

      {/* Add/Edit Report Modal */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
              <h2 className="text-xl font-bold text-gray-800">
                {currentReport.IDBC ? 'Cập nhật báo cáo chi tiết' : 'Thêm báo cáo chi tiết mới'}
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày báo cáo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Calendar className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                      type="date"
                      value={formatDateForInput(currentReport['NGÀY'])}
                      onChange={(e) => handleDateChange(new Date(e.target.value))}
                      className="pl-10 p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Nhập Bao Bì <span className="text-red-500">*</span></label>
                  <select
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['ID_NHAPBAOBI']}
                    onChange={(e) => handleInputChange('ID_NHAPBAOBI', e.target.value)}
                    required
                  >
                    <option value="">Chọn lô nhập bao bì</option>
                    {nhapBaoBiData.map((item) => (
                      <option key={item.ID} value={item.ID}>
                        {item.ID} - {item['KHÁCH HÀNG']} ({item['NGÀY THÁNG'] ? new Date(item['NGÀY THÁNG']).toLocaleDateString('vi-VN') : 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng</label>
                  <input
                    type="text"
                    placeholder="Nhập tên hàng"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['TÊN HÀNG']}
                    onChange={(e) => handleInputChange('TÊN HÀNG', e.target.value)}
                  />
                </div>
              </div>

              {/* Production Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tổ <span className="text-red-500">*</span></label>
                  <select
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['TỔ']}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    required
                  >
                    <option value="">Chọn tổ</option>
                    {teams.map((team, index) => (
                      <option key={index} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn <span className="text-red-500">*</span></label>
                  <select
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['CÔNG ĐOẠN']}
                    onChange={(e) => handleWorkStageChange(e.target.value)}
                    disabled={!currentReport['TỔ']}
                    required
                  >
                    <option value="">Chọn công đoạn</option>
                    {getWorkStagesForTeam(currentReport['TỔ']).map((stage, index) => (
                      <option key={index} value={stage['TÊN CÔNG ĐOẠN']}>
                        {stage['TÊN CÔNG ĐOẠN']} - {stage['MÃ CÔNG ĐOẠN']}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    value={currentReport['ĐƠN VỊ TÍNH']}
                    readOnly
                    placeholder="Chọn công đoạn để tự động điền"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PP tính năng suất</label>
                  <input
                    type="text"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    value={currentReport['PP TÍNH NĂNG SUẤT']}
                    readOnly
                    placeholder="Chọn công đoạn để tự động điền"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Nhập khối lượng"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['KHỐI LƯỢNG']}
                    onChange={(e) => handleInputChange('KHỐI LƯỢNG', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số dây</label>
                  <input
                    type="text"
                    placeholder="Nhập số dây"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['SỐ DÂY']}
                    onChange={(e) => handleInputChange('SỐ DÂY', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá</label>
                  <input
                    type="number"
                    step="0.01"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    value={currentReport['ĐƠN GIÁ']}
                    readOnly
                    placeholder="Chọn công đoạn để tự động điền"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành tiền</label>
                  <input
                    type="text"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-gray-100"
                    value={currentReport['THÀNH TIỀN'] ? formatCurrency(currentReport['THÀNH TIỀN']) : ''}
                    readOnly
                    placeholder="Tự động tính từ khối lượng x đơn giá"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân sự tham gia</label>
                  <Select
                    isMulti
                    options={staffList}
                    value={currentReport['NHÂN SỰ THAM GIA']}
                    onChange={handleStaffChange}
                    placeholder="Chọn nhân sự tham gia..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#d1d5db',
                        borderRadius: '0.5rem',
                        padding: '2px',
                        boxShadow: 'none',
                        '&:hover': {
                          borderColor: '#9ca3af',
                        }
                      })
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người nhập <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Nhập tên người nhập báo cáo"
                    className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                    value={currentReport['NGƯỜI NHẬP']}
                    onChange={(e) => handleInputChange('NGƯỜI NHẬP', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  placeholder="Nhập ghi chú (nếu có)"
                  rows={3}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  value={currentReport['GHI CHÚ']}
                  onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting}
                  className={`px-4 py-2 bg-indigo-600 text-white rounded-lg ${isSubmitting
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-indigo-700'
                    } flex items-center gap-2 transition-colors shadow-sm`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang lưu...
                    </>
                  ) : 'Lưu báo cáo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
              <h2 className="text-xl font-bold text-gray-800">Nhập báo cáo từ Excel</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5">
              <p className="text-sm text-gray-600 mb-3">
                Tải lên file Excel (.xlsx, .xls) hoặc CSV có chứa dữ liệu báo cáo.
                File cần có các cột: <span className="font-medium">NGÀY, ID_NHAPBAOBI, TỔ, CÔNG ĐOẠN, KHỐI LƯỢNG, NGƯỜI NHẬP</span>.
              </p>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleImportFileChange}
                  />
                  <Upload className="h-4 w-4" />
                  <span>Chọn file</span>
                </label>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 text-indigo-600 border border-indigo-300 bg-indigo-50 rounded-lg hover:bg-indigo-100 flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Tải mẫu nhập
                </button>
              </div>
              {importFile && (
                <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 flex items-center">
                  <div className="mr-2 flex-shrink-0">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 9L15 11L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18 4V5.4C18 5.96005 18 6.24008 17.891 6.45399C17.7951 6.64215 17.6422 6.79513 17.454 6.89104C17.2401 7 16.9601 7 16.4 7H7.6C7.03995 7 6.75992 7 6.54601 6.89104C6.35785 6.79513 6.20487 6.64215 6.10896 6.45399C6 6.24008 6 5.96005 6 5.4V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 14L4 16C4 17.8856 4 18.8284 4.58579 19.4142C5.17157 20 6.11438 20 8 20H16C17.8856 20 18.8284 20 19.4142 19.4142C20 18.8284 20 17.8856 20 16V10C20 8.11438 20 7.17157 19.4142 6.58579C18.8284 6 17.8856 6 16 6L8 6C6.11438 6 5.17157 6 4.58579 6.58579C4 7.17157 4 8.11438 4 10L4 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 12H16.002V12.002H16V12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Đã chọn: {importFile.name}</div>
                    <div className="text-xs text-indigo-600 mt-1">Kích thước: {(importFile.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
              )}
            </div>

            {importPreview.length > 0 && (
              <div className="mb-5">
                <h3 className="font-medium mb-2">Xem trước dữ liệu (5 dòng đầu tiên):</h3>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(importPreview[0]).map((header, index) => (
                          <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importPreview.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {Object.values(row).map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-sm text-gray-500 truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                disabled={isImporting}
              >
                Hủy
              </button>
              <button
                onClick={handleImportData}
                disabled={!importFile || isImporting}
                className={`px-4 py-2 bg-indigo-600 text-white rounded-lg ${(!importFile || isImporting)
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-indigo-700'
                  } flex items-center gap-2 transition-colors shadow-sm`}
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang nhập...
                  </>
                ) : 'Nhập dữ liệu'}
              </button>
            </div>
          </div>
        </div>
      )
      }

      {/* Confirmation Modal */}
      {
        showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-gray-800">{confirmTitle}</h2>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                  disabled={isConfirmLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <p className="text-gray-600">{confirmMessage}</p>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    disabled={isConfirmLoading}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={async () => {
                      if (confirmAction && typeof confirmAction === 'function') {
                        setIsConfirmLoading(true);
                        try {
                          await confirmAction();
                        } catch (error) {
                          console.error("Error executing confirmation action:", error);
                          toast.error("Có lỗi xảy ra khi thực hiện thao tác");
                        } finally {
                          setIsConfirmLoading(false);
                          setShowConfirmModal(false);
                        }
                      } else {
                        console.error("Confirmation action is not a function", confirmAction);
                        setShowConfirmModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2"
                    disabled={isConfirmLoading}
                  >
                    {isConfirmLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang xử lý...
                      </>
                    ) : (
                      'Xác nhận'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* History Modal */}
      {
        showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                <h2 className="text-xl font-bold text-gray-800">Lịch sử thay đổi</h2>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistory([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {selectedHistory.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedHistory.map((entry, index) => (
                        <li key={index} className={`p-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} rounded-md border border-gray-100`}>
                          {entry}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-center py-4">Không có dữ liệu lịch sử</p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowHistoryModal(false);
                      setSelectedHistory([]);
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default ReportManagement;