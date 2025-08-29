import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash, Search, ChevronLeft, ChevronRight, Filter, Download, Check, Upload, X, Calendar, AlertCircle, List, Package, Eye } from 'lucide-react';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';

// Utility function to generate unique ID
const generateUniqueId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    // Add timestamp-based prefix (4 chars)
    const timeBase = Date.now().toString(36).toUpperCase().slice(-4);
    result += timeBase.padStart(4, chars.charAt(Math.floor(Math.random() * chars.length)));

    // Add random suffix (4 chars)
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
};

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

// Parse date for filtering
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

// Format number with 2 decimal places
const formatNumber = (number) => {
    if (!number || isNaN(number)) return '0.00';
    return parseFloat(number).toFixed(2);
};

// Calculate thực nhận = nhập bao bì - 3%
const calculateThucNhan = (nhapBaoBi) => {
    const nhap = parseFloat(nhapBaoBi) || 0;
    const truBaoBi = nhap * 0.03; // 3%
    const thucNhan = nhap - truBaoBi;
    return {
        truBaoBi: truBaoBi.toFixed(2),
        thucNhan: thucNhan.toFixed(2)
    };
};

// Improved pagination component
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

const NhapBaoBiManagement = () => {
    // State Management - core data
    const [packagingData, setPackagingData] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'

    // State - UI controls
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        soXe: '',
        khachHang: '',
        startDate: null,
        endDate: null
    });

    // State - modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importPreview, setImportPreview] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // State - detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // State - confirm modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState("");
    const [confirmTitle, setConfirmTitle] = useState("");
    const [isConfirmLoading, setIsConfirmLoading] = useState(false);

    // Default empty record
    const emptyRecord = {
        ID: '',
        'NGÀY THÁNG': new Date(),
        'SỐ XE': '',
        'KHÁCH HÀNG': '',
        'BAO BÌ ANH (TẤN)': '',
        'TRỪ BAO BÌ ANH (TẤN)': '',
        'THỰC NHẬN ANH (TẤN)': '',
        'BAO BÌ EM (TẤN)': '',
        'TRỪ BAO BÌ EM (TẤN)': '',
        'THỰC NHẬN EM (TẤN)': ''
    };

    const [currentRecord, setCurrentRecord] = useState(emptyRecord);

    // Helper functions
    const getCurrentTimestamp = () => {
        return new Date().toLocaleString('vi-VN');
    };

    const getCurrentUserName = () => {
        const currentUser = authUtils.getUserData();
        return currentUser?.['Họ và Tên'] || 'Người dùng';
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

    // Close confirm modal and reset states
    const handleCloseConfirmModal = () => {
        setShowConfirmModal(false);
        setConfirmAction(null);
        setConfirmMessage("");
        setConfirmTitle("");
        setIsConfirmLoading(false);
    };

    // Data fetching
    useEffect(() => {
        fetchPackagingData();
    }, []);

    const fetchPackagingData = async () => {
        try {
            const response = await authUtils.apiRequest('NHAPBAOBI', 'Find', {});
            setPackagingData(response);
        } catch (error) {
            console.error('Error fetching packaging data:', error);
            toast.error('Lỗi khi tải danh sách nhập bao bì');
        }
    };

    // Detail modal functions
    const handleViewDetail = (record) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    };

    const handleCloseDetail = () => {
        setShowDetailModal(false);
        setSelectedRecord(null);
    };

    // Modal functions
    const handleOpen = useCallback((record = null) => {
        if (record) {
            setCurrentRecord({
                ID: record.ID || '',
                'NGÀY THÁNG': record['NGÀY THÁNG'] ? new Date(record['NGÀY THÁNG']) : new Date(),
                'SỐ XE': record['SỐ XE'] || '',
                'KHÁCH HÀNG': record['KHÁCH HÀNG'] || '',
                'BAO BÌ ANH (TẤN)': record['BAO BÌ ANH (TẤN)'] || '',
                'TRỪ BAO BÌ ANH (TẤN)': record['TRỪ BAO BÌ ANH (TẤN)'] || '',
                'THỰC NHẬN ANH (TẤN)': record['THỰC NHẬN ANH (TẤN)'] || '',
                'BAO BÌ EM (TẤN)': record['BAO BÌ EM (TẤN)'] || '',
                'TRỪ BAO BÌ EM (TẤN)': record['TRỪ BAO BÌ EM (TẤN)'] || '',
                'THỰC NHẬN EM (TẤN)': record['THỰC NHẬN EM (TẤN)'] || ''
            });
        } else {
            setCurrentRecord(emptyRecord);
        }
        setOpen(true);
    }, [emptyRecord]);

    const handleClose = useCallback(() => {
        setOpen(false);
        setCurrentRecord(emptyRecord);
    }, [emptyRecord]);

    // Form handlers
    const handleInputChange = useCallback((field, value) => {
        setCurrentRecord(prev => {
            const updatedRecord = {
                ...prev,
                [field]: value
            };

            // Nếu thay đổi BAO BÌ ANH, tự động tính TRỪ BAO BÌ ANH và THỰC NHẬN ANH
            if (field === 'BAO BÌ ANH (TẤN)') {
                const calculated = calculateThucNhan(value);
                updatedRecord['TRỪ BAO BÌ ANH (TẤN)'] = calculated.truBaoBi;
                updatedRecord['THỰC NHẬN ANH (TẤN)'] = calculated.thucNhan;
            }

            // Nếu thay đổi BAO BÌ EM, tự động tính TRỪ BAO BÌ EM và THỰC NHẬN EM
            if (field === 'BAO BÌ EM (TẤN)') {
                const calculated = calculateThucNhan(value);
                updatedRecord['TRỪ BAO BÌ EM (TẤN)'] = calculated.truBaoBi;
                updatedRecord['THỰC NHẬN EM (TẤN)'] = calculated.thucNhan;
            }

            return updatedRecord;
        });
    }, []);

    const handleDateChange = useCallback((date) => {
        setCurrentRecord(prev => ({
            ...prev,
            'NGÀY THÁNG': date
        }));
    }, []);

    // Record validation
    const validateRecord = useCallback((record) => {
        const errors = [];
        if (!record['NGÀY THÁNG']) errors.push('NGÀY THÁNG không được để trống');
        if (!record['SỐ XE']) errors.push('SỐ XE không được để trống');
        if (!record['KHÁCH HÀNG']) errors.push('KHÁCH HÀNG không được để trống');

        // Kiểm tra ít nhất một trong hai loại bao bì phải có
        const hasBaoBiAnh = record['BAO BÌ ANH (TẤN)'] && parseFloat(record['BAO BÌ ANH (TẤN)']) > 0;
        const hasBaoBiEm = record['BAO BÌ EM (TẤN)'] && parseFloat(record['BAO BÌ EM (TẤN)']) > 0;

        if (!hasBaoBiAnh && !hasBaoBiEm) {
            errors.push('Phải nhập ít nhất một loại bao bì (Anh hoặc Em)');
        }

        return errors;
    }, []);

    // Save record
    const handleSave = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateRecord(currentRecord);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                return;
            }

            let recordData = {
                ...currentRecord,
                'NGÀY THÁNG': currentRecord['NGÀY THÁNG'].toISOString().split('T')[0]
            };

            if (recordData.ID) {
                // Edit existing record
                await authUtils.apiRequest('NHAPBAOBI', 'Edit', {
                    "Rows": [recordData]
                });
                toast.success('Cập nhật thông tin nhập bao bì thành công!');
            } else {
                // Create new record with unique ID
                recordData.ID = generateUniqueId();

                await authUtils.apiRequest('NHAPBAOBI', 'Add', {
                    "Rows": [recordData]
                });
                toast.success('Thêm thông tin nhập bao bì thành công!');
            }

            await fetchPackagingData();
            handleClose();
        } catch (error) {
            console.error('Error saving record:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu thông tin'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete record with proper event handling
    const handleDelete = (ID, event) => {
        event.stopPropagation(); // Ngăn event lan truyền
        event.preventDefault();

        setConfirmTitle("Xóa thông tin nhập bao bì");
        setConfirmMessage("Bạn có chắc chắn muốn xóa thông tin này?");
        setConfirmAction(() => async () => {
            try {
                await authUtils.apiRequest('NHAPBAOBI', 'Delete', {
                    "Rows": [{ "ID": ID }]
                });
                toast.success('Xóa thông tin thành công!');
                await fetchPackagingData();
            } catch (error) {
                console.error('Error deleting record:', error);
                toast.error('Có lỗi xảy ra khi xóa thông tin');
            }
        });
        setShowConfirmModal(true);
    };

    // Edit with proper event handling
    const handleEdit = (record, event) => {
        event.stopPropagation();
        event.preventDefault();
        handleOpen(record);
    };

    // Bulk actions
    const handleBulkDelete = () => {
        if (selectedRecords.length === 0) {
            toast.warning('Vui lòng chọn thông tin để xóa');
            return;
        }

        setConfirmTitle("Xóa nhiều thông tin");
        setConfirmMessage(`Bạn có chắc chắn muốn xóa ${selectedRecords.length} thông tin đã chọn?`);
        setConfirmAction(() => async () => {
            try {
                await Promise.all(
                    selectedRecords.map(id =>
                        authUtils.apiRequest('NHAPBAOBI', 'Delete', {
                            "Rows": [{ "ID": id }]
                        })
                    )
                );

                toast.success('Xóa thông tin thành công!');
                setSelectedRecords([]);
                await fetchPackagingData();
            } catch (error) {
                toast.error('Có lỗi xảy ra khi xóa thông tin');
            }
        });
        setShowConfirmModal(true);
    };

    const handleExportSelected = () => {
        if (selectedRecords.length === 0) {
            toast.warning('Vui lòng chọn thông tin để xuất file');
            return;
        }

        const selectedItems = packagingData.filter(r => selectedRecords.includes(r.ID));
        const excelData = selectedItems.map(item => ({
            ID: item.ID,
            'NGÀY THÁNG': item['NGÀY THÁNG'],
            'SỐ XE': item['SỐ XE'],
            'KHÁCH HÀNG': item['KHÁCH HÀNG'],
            'BAO BÌ ANH (TẤN)': item['BAO BÌ ANH (TẤN)'],
            'TRỪ BAO BÌ ANH (TẤN)': item['TRỪ BAO BÌ ANH (TẤN)'],
            'THỰC NHẬN ANH (TẤN)': item['THỰC NHẬN ANH (TẤN)'],
            'BAO BÌ EM (TẤN)': item['BAO BÌ EM (TẤN)'],
            'TRỪ BAO BÌ EM (TẤN)': item['TRỪ BAO BÌ EM (TẤN)'],
            'THỰC NHẬN EM (TẤN)': item['THỰC NHẬN EM (TẤN)']
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nhập Bao Bì');
        XLSX.writeFile(wb, `nhap-bao-bi-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
                const requiredColumns = ['NGÀY THÁNG', 'SỐ XE', 'KHÁCH HÀNG'];
                const missingColumns = requiredColumns.filter(col => !headers.includes(col));

                if (missingColumns.length > 0) {
                    toast.error(`File thiếu các cột bắt buộc: ${missingColumns.join(', ')}`);
                    setImportFile(null);
                    return;
                }

                // Kiểm tra có ít nhất một trong hai cột bao bì
                const hasBaoBiAnh = headers.includes('BAO BÌ ANH (TẤN)');
                const hasBaoBiEm = headers.includes('BAO BÌ EM (TẤN)');

                if (!hasBaoBiAnh && !hasBaoBiEm) {
                    toast.error('File phải có ít nhất một cột: BAO BÌ ANH (TẤN) hoặc BAO BÌ EM (TẤN)');
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

    // Thêm utility function để chuyển đổi định dạng ngày
    const convertDateFormat = (dateStr) => {
        if (!dateStr) return '';

        // Nếu đã là format YYYY-MM-DD thì trả về luôn
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Nếu là DD/MM/YYYY format
        if (typeof dateStr === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Nếu là Excel serial number (số)
        if (typeof dateStr === 'number') {
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateStr - 2) * 24 * 60 * 60 * 1000);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Thử parse như Date object
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
        } catch (error) {
            console.warn('Cannot parse date:', dateStr);
        }

        return '';
    };

    // Sửa lại function handleImportData
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

                    const invalidRows = [];
                    const validatedData = [];

                    for (let i = 0; i < jsonData.length; i++) {
                        const row = jsonData[i];

                        // Chuyển đổi định dạng ngày
                        const convertedDate = convertDateFormat(row['NGÀY THÁNG']);

                        // Kiểm tra các trường bắt buộc
                        if (!row['SỐ XE'] || !row['KHÁCH HÀNG'] || !convertedDate) {
                            invalidRows.push(i + 2);
                            continue;
                        }

                        // Kiểm tra có ít nhất một loại bao bì
                        const hasBaoBiAnh = row['BAO BÌ ANH (TẤN)'] && parseFloat(row['BAO BÌ ANH (TẤN)']) > 0;
                        const hasBaoBiEm = row['BAO BÌ EM (TẤN)'] && parseFloat(row['BAO BÌ EM (TẤN)']) > 0;

                        if (!hasBaoBiAnh && !hasBaoBiEm) {
                            invalidRows.push(i + 2);
                            continue;
                        }

                        // Tính toán cho bao bì anh
                        let calculatedAnh = { truBaoBi: '', thucNhan: '' };
                        if (hasBaoBiAnh) {
                            calculatedAnh = calculateThucNhan(row['BAO BÌ ANH (TẤN)']);
                        }

                        // Tính toán cho bao bì em
                        let calculatedEm = { truBaoBi: '', thucNhan: '' };
                        if (hasBaoBiEm) {
                            calculatedEm = calculateThucNhan(row['BAO BÌ EM (TẤN)']);
                        }

                        const record = {
                            ID: generateUniqueId(),
                            'NGÀY THÁNG': convertedDate, // Sử dụng date đã convert
                            'SỐ XE': row['SỐ XE'],
                            'KHÁCH HÀNG': row['KHÁCH HÀNG'],
                            'BAO BÌ ANH (TẤN)': row['BAO BÌ ANH (TẤN)'] || '',
                            'TRỪ BAO BÌ ANH (TẤN)': calculatedAnh.truBaoBi,
                            'THỰC NHẬN ANH (TẤN)': calculatedAnh.thucNhan,
                            'BAO BÌ EM (TẤN)': row['BAO BÌ EM (TẤN)'] || '',
                            'TRỪ BAO BÌ EM (TẤN)': calculatedEm.truBaoBi,
                            'THỰC NHẬN EM (TẤN)': calculatedEm.thucNhan
                        };

                        validatedData.push(record);
                    }

                    if (invalidRows.length > 0) {
                        toast.warning(`Có ${invalidRows.length} dòng dữ liệu không hợp lệ (dòng Excel ${invalidRows.join(', ')}). Kiểm tra định dạng ngày DD/MM/YYYY và các trường bắt buộc.`);
                    }

                    if (validatedData.length === 0) {
                        toast.error('Không có dữ liệu hợp lệ để nhập. Kiểm tra định dạng ngày phải là DD/MM/YYYY');
                        return;
                    }

                    const batchSize = 25;
                    let successCount = 0;

                    for (let i = 0; i < validatedData.length; i += batchSize) {
                        const batch = validatedData.slice(i, i + batchSize);
                        try {
                            await authUtils.apiRequest('NHAPBAOBI', 'Add', { "Rows": batch });
                            successCount += batch.length;
                        } catch (error) {
                            console.error('Error importing batch:', error);
                        }
                    }

                    toast.success(`Đã nhập thành công ${successCount} bản ghi`);
                    await fetchPackagingData();
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
            ['NGÀY THÁNG', 'SỐ XE', 'KHÁCH HÀNG', 'BAO BÌ ANH (TẤN)', 'BAO BÌ EM (TẤN)'],
            ['22/03/2025', '29A-12345', 'Công ty ABC', '10.5', ''],
            ['23/03/2025', '30B-67890', 'Công ty XYZ', '', '8.2'],
            ['24/03/2025', '31C-11111', 'Công ty DEF', '5.0', '3.0']
        ];

        const ws = XLSX.utils.aoa_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'mau_nhap_bao_bi.xlsx');
    };

    // Filtering and pagination logic
    const filteredData = useMemo(() => {
        return packagingData.filter(record => {
            const matchesSearch =
                record['SỐ XE']?.toLowerCase().includes(search.toLowerCase()) ||
                record['KHÁCH HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
                record.ID?.toLowerCase().includes(search.toLowerCase());

            const matchesSoXe = !filters.soXe || record['SỐ XE']?.includes(filters.soXe);
            const matchesKhachHang = !filters.khachHang || record['KHÁCH HÀNG']?.includes(filters.khachHang);

            // Date filtering
            let dateMatches = true;
            if (filters.startDate || filters.endDate) {
                const recordDate = parseVNDate(record['NGÀY THÁNG']);

                const startDate = filters.startDate ? new Date(filters.startDate.setHours(0, 0, 0, 0)) : null;
                const endDate = filters.endDate ? new Date(filters.endDate.setHours(0, 0, 0, 0)) : null;

                if (startDate && endDate) {
                    dateMatches = recordDate >= startDate && recordDate <= endDate;
                } else if (startDate) {
                    dateMatches = recordDate >= startDate;
                } else if (endDate) {
                    dateMatches = recordDate <= endDate;
                }
            }
            return matchesSearch && matchesSoXe && matchesKhachHang && dateMatches;
        });
    }, [packagingData, search, filters]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredData.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredData, currentPage, itemsPerPage]);

    // Grouped records for date view
    const groupedRecords = useMemo(() => {
        if (viewMode !== 'grouped') return null;
        const groups = {};
        filteredData.forEach(record => {
            const date = new Date(record['NGÀY THÁNG']).toLocaleDateString('vi-VN');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(record);
        });

        return Object.keys(groups)
            .sort((a, b) => {
                const dateA = parseVNDate(a);
                const dateB = parseVNDate(b);
                return dateB - dateA;
            })
            .map(date => ({
                date,
                records: groups[date],
                totalRecords: groups[date].length,
                totalBaoBiAnh: groups[date].reduce((sum, r) => sum + parseFloat(r['BAO BÌ ANH (TẤN)'] || 0), 0),
                totalThucNhanAnh: groups[date].reduce((sum, r) => sum + parseFloat(r['THỰC NHẬN ANH (TẤN)'] || 0), 0),
                totalBaoBiEm: groups[date].reduce((sum, r) => sum + parseFloat(r['BAO BÌ EM (TẤN)'] || 0), 0),
                totalThucNhanEm: groups[date].reduce((sum, r) => sum + parseFloat(r['THỰC NHẬN EM (TẤN)'] || 0), 0)
            }));
    }, [filteredData, viewMode]);

    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Package className="h-6 w-6 text-indigo-600" />
                            Quản lý Nhập Bao Bì
                        </h1>
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

                            {selectedRecords.length > 0 && (
                                <>
                                    <button
                                        onClick={handleExportSelected}
                                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Xuất file ({selectedRecords.length})
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2 transition-colors shadow-sm"
                                    >
                                        <Trash className="w-4 h-4" />
                                        Xóa ({selectedRecords.length})
                                    </button>
                                </>
                            )}

                            <button
                                onClick={() => handleOpen()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm thông tin
                            </button>

                            <button
                                onClick={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                {viewMode === 'list' ? (
                                    <>
                                        <Calendar className="w-4 h-4" />
                                        Nhóm theo ngày
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
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số xe</label>
                                    <input
                                        type="text"
                                        value={filters.soXe}
                                        onChange={(e) => setFilters({ ...filters, soXe: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Tìm theo số xe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                                    <input
                                        type="text"
                                        value={filters.khachHang}
                                        onChange={(e) => setFilters({ ...filters, khachHang: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Tìm theo khách hàng"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khoảng thời gian</label>
                                    <div className="grid grid-cols-2 gap-2">
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
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={() => setFilters({
                                            soXe: '',
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
                                placeholder="Tìm kiếm theo ID, số xe hoặc khách hàng..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table or Grouped View Section */}
                    {viewMode === 'list' ? (
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden border border-gray-200 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="p-4 text-left">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRecords.length === filteredData.length && filteredData.length > 0}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedRecords(filteredData.map(r => r.ID));
                                                                } else {
                                                                    setSelectedRecords([]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Ngày tháng</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Số xe</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khách hàng</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bao bì Anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Trừ Anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận Anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bao bì Em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Trừ Em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận Em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentItems.length > 0 ? (
                                                currentItems.map((record) => (
                                                    <tr
                                                        key={record.ID}
                                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                        onClick={() => handleViewDetail(record)}
                                                    >
                                                        <td className="p-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedRecords.includes(record.ID)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedRecords([...selectedRecords, record.ID]);
                                                                        } else {
                                                                            setSelectedRecords(selectedRecords.filter(id => id !== record.ID));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                            {new Date(record['NGÀY THÁNG']).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{record['SỐ XE']}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record['KHÁCH HÀNG']}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-blue-600">
                                                            {record['BAO BÌ ANH (TẤN)'] ? formatNumber(record['BAO BÌ ANH (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-red-600">
                                                            {record['TRỪ BAO BÌ ANH (TẤN)'] ? formatNumber(record['TRỪ BAO BÌ ANH (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-green-600">
                                                            {record['THỰC NHẬN ANH (TẤN)'] ? formatNumber(record['THỰC NHẬN ANH (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-purple-600">
                                                            {record['BAO BÌ EM (TẤN)'] ? formatNumber(record['BAO BÌ EM (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-orange-600">
                                                            {record['TRỪ BAO BÌ EM (TẤN)'] ? formatNumber(record['TRỪ BAO BÌ EM (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-teal-600">
                                                            {record['THỰC NHẬN EM (TẤN)'] ? formatNumber(record['THỰC NHẬN EM (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-end space-x-1">
                                                                <button
                                                                    onClick={(e) => handleEdit(record, e)}
                                                                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                                    title="Sửa thông tin"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDelete(record.ID, e)}
                                                                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                                    title="Xóa thông tin"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="12" className="px-4 py-6 text-center text-sm text-gray-500">
                                                        Không tìm thấy thông tin nào phù hợp với tiêu chí tìm kiếm
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {groupedRecords && groupedRecords.map(group => (
                                <div key={group.date} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800">
                                                Ngày: {group.date}
                                            </h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                    Tổng: {group.totalRecords} xe
                                                </span>
                                                {group.totalBaoBiAnh > 0 && (
                                                    <>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                                                            Anh: {formatNumber(group.totalBaoBiAnh.toFixed(3))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-200 text-green-900">
                                                            Nhận Anh: {formatNumber(group.totalThucNhanAnh.toFixed(3))} tấn
                                                        </span>
                                                    </>
                                                )}
                                                {group.totalBaoBiEm > 0 && (
                                                    <>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                                            Em: {formatNumber(group.totalBaoBiEm.toFixed(3))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900">
                                                            Nhận Em: {formatNumber(group.totalThucNhanEm.toFixed(3))} tấn
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <button
                                                onClick={() => {
                                                    const excelData = group.records.map(item => ({
                                                        ID: item.ID,
                                                        'NGÀY THÁNG': item['NGÀY THÁNG'],
                                                        'SỐ XE': item['SỐ XE'],
                                                        'KHÁCH HÀNG': item['KHÁCH HÀNG'],
                                                        'BAO BÌ ANH (TẤN)': item['BAO BÌ ANH (TẤN)'],
                                                        'TRỪ BAO BÌ ANH (TẤN)': item['TRỪ BAO BÌ ANH (TẤN)'],
                                                        'THỰC NHẬN ANH (TẤN)': item['THỰC NHẬN ANH (TẤN)'],
                                                        'BAO BÌ EM (TẤN)': item['BAO BÌ EM (TẤN)'],
                                                        'TRỪ BAO BÌ EM (TẤN)': item['TRỪ BAO BÌ EM (TẤN)'],
                                                        'THỰC NHẬN EM (TẤN)': item['THỰC NHẬN EM (TẤN)']
                                                    }));

                                                    const ws = XLSX.utils.json_to_sheet(excelData);
                                                    const wb = XLSX.utils.book_new();
                                                    XLSX.utils.book_append_sheet(wb, ws, 'Nhập Bao Bì');
                                                    XLSX.writeFile(wb, `nhap-bao-bi-${group.date.replace(/\//g, '-')}.xlsx`);
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-1.5 text-sm transition-colors shadow-sm"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Xuất file
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Số xe</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khách hàng</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bao bì Anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận Anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bao bì Em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận Em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.records.map(record => (
                                                    <tr
                                                        key={record.ID}
                                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                        onClick={() => handleViewDetail(record)}
                                                    >
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{record['SỐ XE']}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record['KHÁCH HÀNG']}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-blue-600">
                                                            {record['BAO BÌ ANH (TẤN)'] ? formatNumber(record['BAO BÌ ANH (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-green-600">
                                                            {record['THỰC NHẬN ANH (TẤN)'] ? formatNumber(record['THỰC NHẬN ANH (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-purple-600">
                                                            {record['BAO BÌ EM (TẤN)'] ? formatNumber(record['BAO BÌ EM (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-teal-600">
                                                            {record['THỰC NHẬN EM (TẤN)'] ? formatNumber(record['THỰC NHẬN EM (TẤN)']) : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                            <div className="flex justify-end space-x-1">
                                                                <button
                                                                    onClick={(e) => handleEdit(record, e)}
                                                                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                                    title="Sửa thông tin"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleDelete(record.ID, e)}
                                                                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                                    title="Xóa thông tin"
                                                                >
                                                                    <Trash className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}

                            {groupedRecords && groupedRecords.length === 0 && (
                                <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                                    <p className="text-gray-500">Không tìm thấy thông tin nào phù hợp với tiêu chí tìm kiếm</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {viewMode === 'list' && currentItems.length > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>

            {/* Detail View Modal */}
            {showDetailModal && selectedRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Eye className="h-5 w-5 text-indigo-600" />
                                Chi tiết thông tin nhập bao bì - ID: {selectedRecord.ID}
                            </h2>
                            <button
                                onClick={handleCloseDetail}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày tháng</label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-900">
                                            {new Date(selectedRecord['NGÀY THÁNG']).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Số xe</label>
                                    <span className="text-sm text-gray-900 font-medium">{selectedRecord['SỐ XE']}</span>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Khách hàng</label>
                                    <span className="text-sm text-gray-900">{selectedRecord['KHÁCH HÀNG']}</span>
                                </div>
                            </div>

                            {/* Bao bì Anh Information */}
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Thông tin Bao bì Anh
                                </h3>

                                {selectedRecord['BAO BÌ ANH (TẤN)'] && parseFloat(selectedRecord['BAO BÌ ANH (TẤN)']) > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nhập bao bì</label>
                                            <div className="text-lg font-bold text-blue-600">
                                                {formatNumber(selectedRecord['BAO BÌ ANH (TẤN)'])} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Trừ bao bì (3%)</label>
                                            <div className="text-lg font-bold text-red-600">
                                                -{formatNumber(selectedRecord['TRỪ BAO BÌ ANH (TẤN)'])} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Thực nhận</label>
                                            <div className="text-lg font-bold text-green-600">
                                                {formatNumber(selectedRecord['THỰC NHẬN ANH (TẤN)'])} tấn
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p>Không có dữ liệu bao bì Anh</p>
                                    </div>
                                )}
                            </div>

                            {/* Bao bì Em Information */}
                            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                <h3 className="text-lg font-medium text-purple-800 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Thông tin Bao bì Em
                                </h3>

                                {selectedRecord['BAO BÌ EM (TẤN)'] && parseFloat(selectedRecord['BAO BÌ EM (TẤN)']) > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nhập bao bì</label>
                                            <div className="text-lg font-bold text-purple-600">
                                                {formatNumber(selectedRecord['BAO BÌ EM (TẤN)'])} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Trừ bao bì (3%)</label>
                                            <div className="text-lg font-bold text-orange-600">
                                                -{formatNumber(selectedRecord['TRỪ BAO BÌ EM (TẤN)'])} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Thực nhận</label>
                                            <div className="text-lg font-bold text-teal-600">
                                                {formatNumber(selectedRecord['THỰC NHẬN EM (TẤN)'])} tấn
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p>Không có dữ liệu bao bì Em</p>
                                    </div>
                                )}
                            </div>

                            {/* Summary */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
                                <h3 className="text-lg font-medium text-indigo-800 mb-3">Tổng kết</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-lg">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tổng nhập bao bì</label>
                                        <div className="text-lg font-bold text-indigo-600">
                                            {formatNumber(
                                                (parseFloat(selectedRecord['BAO BÌ ANH (TẤN)'] || 0) +
                                                    parseFloat(selectedRecord['BAO BÌ EM (TẤN)'] || 0)).toFixed(3)
                                            )} tấn
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tổng thực nhận</label>
                                        <div className="text-lg font-bold text-green-600">
                                            {formatNumber(
                                                (parseFloat(selectedRecord['THỰC NHẬN ANH (TẤN)'] || 0) +
                                                    parseFloat(selectedRecord['THỰC NHẬN EM (TẤN)'] || 0)).toFixed(3)
                                            )} tấn
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        handleCloseDetail();
                                        handleOpen(selectedRecord);
                                    }}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Edit className="w-4 h-4" />
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={handleCloseDetail}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {currentRecord.ID ? 'Cập nhật thông tin nhập bao bì' : 'Thêm thông tin nhập bao bì'}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tháng</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <input
                                            type="date"
                                            value={formatDateForInput(currentRecord['NGÀY THÁNG'])}
                                            onChange={(e) => handleInputChange('NGÀY THÁNG', e.target.value)}
                                            className="pl-10 p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Số xe</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập số xe"
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        value={currentRecord['SỐ XE']}
                                        onChange={(e) => handleInputChange('SỐ XE', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên khách hàng"
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        value={currentRecord['KHÁCH HÀNG']}
                                        onChange={(e) => handleInputChange('KHÁCH HÀNG', e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Bao bì Anh Section */}
                            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                <h3 className="text-lg font-medium text-blue-800 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Bao bì Anh
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập bao bì (Tấn)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            placeholder="0.000"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
                                            value={currentRecord['BAO BÌ ANH (TẤN)']}
                                            onChange={(e) => handleInputChange('BAO BÌ ANH (TẤN)', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trừ bao bì (Tấn)</label>
                                        <input
                                            type="text"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            value={currentRecord['TRỪ BAO BÌ ANH (TẤN)']}
                                            readOnly
                                            placeholder="Tự động tính"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">3% của nhập bao bì</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Thực nhận (Tấn)</label>
                                        <input
                                            type="text"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                                            value={currentRecord['THỰC NHẬN ANH (TẤN)']}
                                            readOnly
                                            placeholder="Tự động tính"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Nhập - Trừ bao bì</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bao bì Em Section */}
                            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                <h3 className="text-lg font-medium text-purple-800 mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Bao bì Em
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập bao bì (Tấn)</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            placeholder="0.000"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500"
                                            value={currentRecord['BAO BÌ EM (TẤN)']}
                                            onChange={(e) => handleInputChange('BAO BÌ EM (TẤN)', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trừ bao bì (Tấn)</label>
                                        <input
                                            type="text"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500 bg-gray-100"
                                            value={currentRecord['TRỪ BAO BÌ EM (TẤN)']}
                                            readOnly
                                            placeholder="Tự động tính"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">3% của nhập bao bì</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Thực nhận (Tấn)</label>
                                        <input
                                            type="text"
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-purple-500 focus:border-purple-500 bg-gray-100"
                                            value={currentRecord['THỰC NHẬN EM (TẤN)']}
                                            readOnly
                                            placeholder="Tự động tính"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Nhập - Trừ bao bì</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-start">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                                    <div className="text-sm text-yellow-800">
                                        <p className="font-medium">Lưu ý:</p>
                                        <p>Cần nhập ít nhất một loại bao bì (Anh hoặc Em). Có thể nhập cả hai loại cho cùng một xe.</p>
                                    </div>
                                </div>
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
                                    ) : 'Lưu thông tin'}
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
                            <h2 className="text-xl font-bold text-gray-800">Nhập dữ liệu từ Excel</h2>
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
                                Tải lên file Excel (.xlsx, .xls) hoặc CSV có chứa dữ liệu nhập bao bì.
                                File cần có các cột: <span className="font-medium">NGÀY THÁNG, SỐ XE, KHÁCH HÀNG</span> và ít nhất một trong hai cột:
                                <span className="font-medium"> BAO BÌ ANH (TẤN), BAO BÌ EM (TẤN)</span>.
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
                                        <Package className="h-5 w-5" />
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
            )}

            {/* Import Excel Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">Nhập dữ liệu từ Excel</h2>
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
                                Tải lên file Excel (.xlsx, .xls) hoặc CSV có chứa dữ liệu nhập bao bì.
                                File cần có các cột: <span className="font-medium">NGÀY THÁNG, SỐ XE, KHÁCH HÀNG</span> và ít nhất một trong hai cột:
                                <span className="font-medium"> BAO BÌ ANH (TẤN), BAO BÌ EM (TẤN)</span>.
                            </p>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                                <div className="flex items-start">
                                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                                    <div className="text-sm text-yellow-800">
                                        <p className="font-medium">Lưu ý định dạng ngày:</p>
                                        <p>Nhập ngày theo định dạng DD/MM/YYYY (ví dụ: 22/03/2025, 01/01/2025)</p>
                                    </div>
                                </div>
                            </div>

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
                                        <Package className="h-5 w-5" />
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
            )}

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

export default NhapBaoBiManagement;