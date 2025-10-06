import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Trash, Search, ChevronLeft, ChevronRight, Filter, Download, Check, Upload, X, Calendar, AlertCircle, List, Package, Eye, Users, ChevronDown, ChevronUp, Clock, CheckCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';
import PhanBoBaoBi from './PhanBoBaoBi';

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

// Format currency
const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '0 VNĐ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
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
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange, totalItems }) => (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        {/* Phần chọn số dòng hiển thị */}
        <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Hiển thị:</label>
            <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
                <option value={10}>10 dòng</option>
                <option value={25}>25 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
            </select>
            <span className="text-sm text-gray-600">
                (Tổng: {totalItems} bản ghi)
            </span>
        </div>

        {/* Phần nút phân trang */}
        <div className="flex justify-center items-center space-x-2">
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
    </div>
);

const NhapBaoBiManagement = () => {
    // State Management - core data
    const [packagingData, setPackagingData] = useState([]);
    const [detailReports, setDetailReports] = useState([]);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grouped'

    // State - UI controls
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [expandedDetailGroups, setExpandedDetailGroups] = useState(new Set());
    const [expandedGroupDetailGroups, setExpandedGroupDetailGroups] = useState(new Set()); // For grouped view

    // Add sorting state
    const [sortConfig, setSortConfig] = useState({
        key: null,
        direction: 'asc'
    });

    const [filters, setFilters] = useState({
        searchFilter: '',  // Gộp soXe và khachHang
        startDate: null,
        endDate: null,
        allocationStatus: ''
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

    const [showPhanBoModal, setShowPhanBoModal] = useState(false);
    const [selectedRecordForPhanBo, setSelectedRecordForPhanBo] = useState(null);

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

    // Function toggle mở rộng chi tiết cho list view
    const toggleDetailExpansion = (recordId) => {
        const newExpanded = new Set(expandedDetailGroups);
        if (newExpanded.has(recordId)) {
            newExpanded.delete(recordId);
        } else {
            newExpanded.add(recordId);
        }
        setExpandedDetailGroups(newExpanded);
    };

    // Function toggle mở rộng chi tiết cho grouped view
    const toggleGroupDetailExpansion = (recordId) => {
        const newExpanded = new Set(expandedGroupDetailGroups);
        if (newExpanded.has(recordId)) {
            newExpanded.delete(recordId);
        } else {
            newExpanded.add(recordId);
        }
        setExpandedGroupDetailGroups(newExpanded);
    };

    // Add sorting function
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Function tính toán trạng thái phân bổ
    const getDistributionStatus = (record) => {
        const relatedReports = detailReports.filter(report => report.ID_NHAPBAOBI === record.ID);

        // Lấy giá trị đã phân bổ từ record gốc (đã được cập nhật từ PhanBoBaoBi)
        const allocatedAnh = parseFloat(record['ĐÃ PHÂN BỔ (ANH)'] || 0);
        const allocatedEm = parseFloat(record['ĐÃ PHÂN BỔ (EM)'] || 0);

        const availableAnh = parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0);
        const availableEm = parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0);

        const remainingAnh = availableAnh - allocatedAnh;
        const remainingEm = availableEm - allocatedEm;

        // Tính bãi từ record gốc hoặc tính toán nếu chưa có
        const baiAnh = record['BÃI (ANH)'] ? parseFloat(record['BÃI (ANH)']) : Math.max(0, remainingAnh);
        const baiEm = record['BÃI (EM)'] ? parseFloat(record['BÃI (EM)']) : Math.max(0, remainingEm);

        return {
            totalReports: relatedReports.length,
            allocatedAnh: allocatedAnh,
            allocatedEm: allocatedEm,
            remainingAnh: Math.max(0, remainingAnh),
            remainingEm: Math.max(0, remainingEm),
            baiAnh: baiAnh,
            baiEm: baiEm,
            isFullyAllocated: remainingAnh <= 0.01 && remainingEm <= 0.01 && (availableAnh > 0 || availableEm > 0),
            hasAllocation: relatedReports.length > 0,
            relatedReports: relatedReports.sort((a, b) => new Date(b['NGÀY']) - new Date(a['NGÀY'])) // Mới nhất lên đầu
        };
    };

    // Component hiển thị status badge
    // Component hiển thị status badge đơn giản theo TỔ
    const AllocationStatusBadge = ({ record }) => {
        const status = getDistributionStatus(record);

        if (!status.hasAllocation) {
            return (
                <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Chưa phân bổ
                    </span>
                </div>
            );
        }

        // Nhóm và tính tổng khối lượng theo TỔ
        const groupedByTo = status.relatedReports.reduce((acc, report) => {
            const to = report['TỔ'] || 'Khác';
            if (!acc[to]) {
                acc[to] = 0;
            }
            acc[to] += parseFloat(report['KHỐI LƯỢNG'] || 0);
            return acc;
        }, {});

        // Format: "CD1: 11.25T, CD2: 30.55T"
        const toSummary = Object.entries(groupedByTo)
            .map(([to, total]) => `${to}: ${formatNumber(total)}T`)
            .join(', ');

        if (status.isFullyAllocated) {
            return (
                <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Đã phân bổ hết
                    </span>
                    <div className="text-xs text-indigo-700 font-medium">
                        {toSummary}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Phân bổ một phần
                </span>
                <div className="text-xs text-indigo-700 font-medium">
                    {toSummary}
                </div>
            </div>
        );
    };

    // Component hiển thị chi tiết phân bổ - Nhóm theo TỔ
    const DetailReportsSection = ({ record, isInGroupView = false }) => {
        const status = getDistributionStatus(record);
        const expandedSet = isInGroupView ? expandedGroupDetailGroups : expandedDetailGroups;
        const toggleFunction = isInGroupView ? toggleGroupDetailExpansion : toggleDetailExpansion;

        if (!status.hasAllocation) return null;

        // Nhóm báo cáo theo TỔ
        const groupedByTo = status.relatedReports.reduce((acc, report) => {
            const to = report['TỔ'] || 'Chưa phân tổ';
            if (!acc[to]) {
                acc[to] = [];
            }
            acc[to].push(report);
            return acc;
        }, {});

        return (
            <>
                {/* Button to toggle detail reports */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFunction(record.ID);
                    }}
                    className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                    title={expandedSet.has(record.ID) ? 'Ẩn chi tiết' : 'Xem chi tiết phân bổ'}
                >
                    {expandedSet.has(record.ID) ?
                        <ChevronUp className="h-4 w-4" /> :
                        <ChevronDown className="h-4 w-4" />
                    }
                </button>

                {/* Detail Reports Content */}
                {expandedSet.has(record.ID) && (
                    <tr>
                        <td colSpan="15" className="px-4 py-0">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 p-4 my-2 rounded-r-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                                        <Package className="w-5 h-5" />
                                        Chi tiết phân bổ ({status.totalReports} báo cáo - {Object.keys(groupedByTo).length} tổ)
                                    </h4>
                                    <div className="text-sm text-blue-600">
                                        Tổng giá trị: <span className="font-bold">{formatCurrency(status.relatedReports.reduce((sum, r) => sum + parseFloat(r['THÀNH TIỀN'] || 0), 0))}</span>
                                    </div>
                                </div>

                                {/* Hiển thị theo từng TỔ */}
                                <div className="space-y-4">
                                    {Object.entries(groupedByTo).map(([to, reports]) => {
                                        const totalAmount = reports.reduce((sum, r) => sum + parseFloat(r['THÀNH TIỀN'] || 0), 0);
                                        const totalQuantity = reports.reduce((sum, r) => sum + parseFloat(r['KHỐI LƯỢNG'] || 0), 0);

                                        return (
                                            <div key={to} className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                                                {/* Header của mỗi TỔ */}
                                                <div className="bg-gradient-to-r from-indigo-100 to-blue-100 px-4 py-3 border-b border-blue-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-bold">
                                                                {to}
                                                            </span>
                                                            <span className="text-sm text-gray-700">
                                                                {reports.length} báo cáo
                                                            </span>
                                                            <span className="text-sm text-gray-700">
                                                                Tổng KL: <span className="font-semibold text-purple-600">{formatNumber(totalQuantity)} Tấn</span>
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-bold text-green-700">
                                                            {formatCurrency(totalAmount)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bảng chi tiết của TỔ */}
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-blue-200">
                                                        <thead className="bg-blue-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Ngày BC</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Tên hàng</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Công đoạn</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Khối lượng</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Nhân sự</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Đơn giá</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Thành tiền</th>
                                                                <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Người nhập</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-blue-100">
                                                            {reports.map((report, index) => (
                                                                <tr key={report.IDBC} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'} hover:bg-blue-50 transition-colors`}>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                                        <div className="flex items-center gap-1">
                                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                                            {new Date(report['NGÀY']).toLocaleDateString('vi-VN')}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{report['TÊN HÀNG']}</td>
                                                                    <td className="px-3 py-2 text-sm text-gray-700 max-w-xs">
                                                                        <div className="truncate" title={report['CÔNG ĐOẠN']}>
                                                                            {report['CÔNG ĐOẠN']}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-purple-600">
                                                                        {formatNumber(report['KHỐI LƯỢNG'])}
                                                                        <span className="text-gray-500 text-xs ml-1">{report['ĐƠN VỊ TÍNH']}</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-sm text-gray-700 max-w-xs">
                                                                        <div className="truncate" title={report['SỐ LƯỢNG NHÂN SỰ']}>
                                                                            {report['SỐ LƯỢNG NHÂN SỰ']}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                                                                        {formatCurrency(report['ĐƠN GIÁ'])}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-green-700">
                                                                        {formatCurrency(report['THÀNH TIỀN'])}
                                                                    </td>
                                                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{report['NGƯỜI NHẬP']}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
            </>
        );
    };

    // Thêm component StatisticCards vào đầu file, sau các import
    const StatisticCards = ({ data }) => {
        const stats = useMemo(() => {
            return {
                totalRecords: data.length,
                totalBaoBiAnh: data.reduce((sum, record) => sum + parseFloat(record['BAO BÌ ANH (TẤN)'] || 0), 0),
                totalBaoBiEm: data.reduce((sum, record) => sum + parseFloat(record['BAO BÌ EM (TẤN)'] || 0), 0),
                totalThucNhanAnh: data.reduce((sum, record) => sum + parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0), 0),
                totalThucNhanEm: data.reduce((sum, record) => sum + parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0), 0),
                totalDaPhanBoAnh: data.reduce((sum, record) => sum + parseFloat(record['ĐÃ PHÂN BỔ (ANH)'] || 0), 0),
                totalDaPhanBoEm: data.reduce((sum, record) => sum + parseFloat(record['ĐÃ PHÂN BỔ (EM)'] || 0), 0),
                totalBaiAnh: data.reduce((sum, record) => sum + parseFloat(record['BÃI (ANH)'] || 0), 0),
                totalBaiEm: data.reduce((sum, record) => sum + parseFloat(record['BÃI (EM)'] || 0), 0)
            };
        }, [data]);

        const cardData = [
            {
                title: "Tổng số xe",
                value: stats.totalRecords,
                icon: <Package className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-purple-500 to-purple-600",
                textColor: "text-white"
            },
            {
                title: "Tổng nhập BB anh",
                value: `${formatNumber(stats.totalBaoBiAnh)} T`,
                icon: <Package className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-blue-500 to-blue-600",
                textColor: "text-white"
            },
            {
                title: "Tổng nhập BB em",
                value: `${formatNumber(stats.totalBaoBiEm)} T`,
                icon: <Package className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-purple-500 to-purple-600",
                textColor: "text-white"
            },
            {
                title: "Thực nhận BB anh",
                value: `${formatNumber(stats.totalThucNhanAnh)} T`,
                icon: <Check className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-green-500 to-green-600",
                textColor: "text-white"
            },
            {
                title: "Thực nhận em",
                value: `${formatNumber(stats.totalThucNhanEm)} T`,
                icon: <Check className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-teal-500 to-teal-600",
                textColor: "text-white"
            },
            {
                title: "Đã phân bổ BB anh",
                value: `${formatNumber(stats.totalDaPhanBoAnh)} T`,
                icon: <Users className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-indigo-500 to-indigo-600",
                textColor: "text-white"
            },
            {
                title: "Đã phân bổ BB em",
                value: `${formatNumber(stats.totalDaPhanBoEm)} T`,
                icon: <Users className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-violet-500 to-violet-600",
                textColor: "text-white"
            },
            {
                title: "Bãi BB anh",
                value: `${formatNumber(stats.totalBaiAnh)} T`,
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-yellow-500 to-yellow-600",
                textColor: "text-white"
            },
            {
                title: "Bãi BB em",
                value: `${formatNumber(stats.totalBaiEm)} T`,
                icon: <AlertCircle className="w-5 h-5" />,
                bgColor: "bg-gradient-to-r from-orange-500 to-orange-600",
                textColor: "text-white"
            }
        ];

        return (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 mb-6">
                {cardData.map((card, index) => (
                    <div key={index} className={`${card.bgColor} rounded-xl shadow-lg p-3 text-center transform hover:scale-105 transition-all duration-200`}>
                        <div className="flex flex-col items-center">
                            <div className={`${card.textColor} opacity-80 mb-1`}>
                                {card.icon}
                            </div>
                            <h3 className={`${card.textColor} text-xs font-medium mb-1 text-center leading-tight`}>
                                {card.title}
                            </h3>
                            <p className={`${card.textColor} text-sm lg:text-base font-bold`}>
                                {card.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Thêm nút phân bổ vào action buttons
    const handlePhanBo = (record, event) => {
        event.stopPropagation();
        event.preventDefault();
        setSelectedRecordForPhanBo(record);
        setShowPhanBoModal(true);
    };

    const handleFilterDateChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value || null  // Dùng null thay vì ''
        }));
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
        fetchDetailReports();
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

    const fetchDetailReports = async () => {
        try {
            const response = await authUtils.apiRequest('BC2', 'Find', {});
            setDetailReports(response);
        } catch (error) {
            console.error('Error fetching detail reports:', error);
            toast.error('Lỗi khi tải dữ liệu chi tiết phân bổ');
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
                'NGÀY THÁNG': formatDateForInput(record['NGÀY THÁNG']),
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

    // Thêm handler cho việc thay đổi số dòng
    const handleItemsPerPageChange = (newItemsPerPage) => {
        setItemsPerPage(newItemsPerPage);
        setCurrentPage(1); // Reset về trang 1 khi thay đổi số dòng
    };

    // Form handlers
    const handleInputChange = useCallback((field, value) => {
        setCurrentRecord(prev => {
            const updatedRecord = {
                ...prev,
                [field]: field === 'NGÀY THÁNG' ? value : value // luôn lưu chuỗi yyyy-mm-dd
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
                'NGÀY THÁNG': formatDateForInput(currentRecord['NGÀY THÁNG'])
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
            await fetchDetailReports(); // Refresh detail reports
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
        event.stopPropagation();
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
                            'NGÀY THÁNG': convertedDate,
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

    // Filtering and pagination logic with sorting
    const filteredData = useMemo(() => {
        let filtered = packagingData.filter(record => {
            const matchesSearch =
                record['SỐ XE']?.toLowerCase().includes(search.toLowerCase()) ||
                record['KHÁCH HÀNG']?.toLowerCase().includes(search.toLowerCase()) ||
                record.ID?.toLowerCase().includes(search.toLowerCase());

            // Gộp filter cho Số xe và Khách hàng
            const matchesSearchFilter = !filters.searchFilter ||
                record['SỐ XE']?.toLowerCase().includes(filters.searchFilter.toLowerCase()) ||
                record['KHÁCH HÀNG']?.toLowerCase().includes(filters.searchFilter.toLowerCase());

            // Allocation status filter
            let matchesAllocationStatus = true;
            if (filters.allocationStatus) {
                const status = getDistributionStatus(record);
                if (filters.allocationStatus === 'allocated' && !status.isFullyAllocated) {
                    matchesAllocationStatus = false;
                }
                if (filters.allocationStatus === 'partial' && (status.isFullyAllocated || !status.hasAllocation)) {
                    matchesAllocationStatus = false;
                }
                if (filters.allocationStatus === 'unallocated' && status.hasAllocation) {
                    matchesAllocationStatus = false;
                }
            }

            // Date filtering
            let dateMatches = true;
            if (filters.startDate || filters.endDate) {
                const recordDateStr = formatDateForInput(record['NGÀY THÁNG']);
                if (!recordDateStr) {
                    dateMatches = false;
                } else {
                    const recordDate = new Date(recordDateStr);
                    recordDate.setHours(0, 0, 0, 0);

                    if (filters.startDate && filters.endDate) {
                        const startDate = new Date(filters.startDate);
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = new Date(filters.endDate);
                        endDate.setHours(23, 59, 59, 999);

                        dateMatches = recordDate >= startDate && recordDate <= endDate;
                    } else if (filters.startDate) {
                        const startDate = new Date(filters.startDate);
                        startDate.setHours(0, 0, 0, 0);
                        dateMatches = recordDate >= startDate;
                    } else if (filters.endDate) {
                        const endDate = new Date(filters.endDate);
                        endDate.setHours(23, 59, 59, 999);
                        dateMatches = recordDate <= endDate;
                    }
                }
            }

            return matchesSearch && matchesSearchFilter && dateMatches && matchesAllocationStatus;
        });

        // Apply sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Special handling for date column
                if (sortConfig.key === 'NGÀY THÁNG') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                }

                // Special handling for numeric columns
                if (sortConfig.key.includes('(TẤN)') || sortConfig.key.includes('PHÂN BỔ') || sortConfig.key.includes('BÃI')) {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        } else {
            // Default sort by _RowNumber descending (newest first)
            filtered.sort((a, b) => {
                const rowA = parseInt(a._RowNumber) || 0;
                const rowB = parseInt(b._RowNumber) || 0;
                return rowB - rowA;
            });
        }

        return filtered;
    }, [packagingData, detailReports, search, filters, sortConfig]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const currentItems = useMemo(() => {
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        return filteredData.slice(indexOfFirstItem, indexOfLastItem);
    }, [filteredData, currentPage, itemsPerPage]);

    // Grouped records for date view with sorting
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
                totalThucNhanEm: groups[date].reduce((sum, r) => sum + parseFloat(r['THỰC NHẬN EM (TẤN)'] || 0), 0),
                totalDaPhanBoAnh: groups[date].reduce((sum, r) => sum + parseFloat(r['ĐÃ PHÂN BỔ (ANH)'] || 0), 0),
                totalDaPhanBoEm: groups[date].reduce((sum, r) => sum + parseFloat(r['ĐÃ PHÂN BỔ (EM)'] || 0), 0),
                totalBaiAnh: groups[date].reduce((sum, r) => sum + parseFloat(r['BÃI (ANH)'] || 0), 0),
                totalBaiEm: groups[date].reduce((sum, r) => sum + parseFloat(r['BÃI (EM)'] || 0), 0)
            }));
    }, [filteredData, viewMode]);

    // Component để hiển thị icon sắp xếp
    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) {
            return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="w-4 h-4 text-indigo-600" />
            : <ArrowDown className="w-4 h-4 text-indigo-600" />;
    };

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
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tìm kiếm Số xe / Khách hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={filters.searchFilter}
                                        onChange={(e) => setFilters({ ...filters, searchFilter: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập số xe hoặc khách hàng"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái phân bổ</label>
                                    <select
                                        value={filters.allocationStatus}
                                        onChange={(e) => setFilters({ ...filters, allocationStatus: e.target.value })}
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Tất cả trạng thái</option>
                                        <option value="allocated">Đã phân bổ hết</option>
                                        <option value="partial">Phân bổ một phần</option>
                                        <option value="unallocated">Chưa phân bổ</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <input
                                            type="date"
                                            value={filters.startDate || ''}
                                            onChange={(e) => handleFilterDateChange('startDate', e.target.value)}
                                            className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Từ ngày"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <input
                                            type="date"
                                            value={filters.endDate || ''}
                                            onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                                            className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Đến ngày"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-end">
                                    <button
                                        onClick={() => setFilters({
                                            searchFilter: '',
                                            startDate: null,
                                            endDate: null,
                                            allocationStatus: ''
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

                    {/* Statistics Cards */}
                    <StatisticCards data={filteredData} />

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
                                                <th
                                                    scope="col"
                                                    className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left cursor-pointer hover:bg-gray-100 select-none"
                                                    onClick={() => handleSort('NGÀY THÁNG')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Ngày tháng
                                                        <SortIcon column="NGÀY THÁNG" />
                                                    </div>
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Số xe</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khách hàng</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Trạng thái</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Nhập BB anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận BB anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đã phân bổ BB anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bãi BB anh</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Nhập BB em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận BB em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đã phân bổ BB em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bãi BB em</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Chi tiết</th>
                                                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentItems.length > 0 ? (
                                                currentItems.map((record) => {
                                                    const status = getDistributionStatus(record);
                                                    return (
                                                        <React.Fragment key={record.ID}>
                                                            <tr
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
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <AllocationStatusBadge record={record} />
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-blue-600">
                                                                    {record['BAO BÌ ANH (TẤN)'] ? formatNumber(record['BAO BÌ ANH (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-green-600">
                                                                    {record['THỰC NHẬN ANH (TẤN)'] ? formatNumber(record['THỰC NHẬN ANH (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-indigo-600">
                                                                    {record['ĐÃ PHÂN BỔ (ANH)'] ? formatNumber(record['ĐÃ PHÂN BỔ (ANH)']) : '0.00'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-yellow-600">
                                                                    {record['BÃI (ANH)'] ? formatNumber(record['BÃI (ANH)']) :
                                                                        formatNumber(Math.max(0, parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0) - parseFloat(record['ĐÃ PHÂN BỔ (ANH)'] || 0)).toFixed(2))}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-purple-600">
                                                                    {record['BAO BÌ EM (TẤN)'] ? formatNumber(record['BAO BÌ EM (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-teal-600">
                                                                    {record['THỰC NHẬN EM (TẤN)'] ? formatNumber(record['THỰC NHẬN EM (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-indigo-600">
                                                                    {record['ĐÃ PHÂN BỔ (EM)'] ? formatNumber(record['ĐÃ PHÂN BỔ (EM)']) : '0.00'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-yellow-600">
                                                                    {record['BÃI (EM)'] ? formatNumber(record['BÃI (EM)']) :
                                                                        formatNumber(Math.max(0, parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0) - parseFloat(record['ĐÃ PHÂN BỔ (EM)'] || 0)).toFixed(2))}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                                    {status.hasAllocation && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleDetailExpansion(record.ID);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                                                                            title={expandedDetailGroups.has(record.ID) ? 'Ẩn chi tiết' : 'Xem chi tiết phân bổ'}
                                                                        >
                                                                            {expandedDetailGroups.has(record.ID) ?
                                                                                <ChevronUp className="h-4 w-4" /> :
                                                                                <ChevronDown className="h-4 w-4" />
                                                                            }
                                                                        </button>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex justify-end space-x-1">
                                                                        <button
                                                                            onClick={(e) => handlePhanBo(record, e)}
                                                                            className="text-green-600 hover:text-green-900 p-1.5 rounded-full hover:bg-green-50"
                                                                            title="Phân bổ"
                                                                        >
                                                                            <Users className="h-4 w-4" />
                                                                        </button>
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

                                                            {/* Detail Reports Row - Expanded */}
                                                            {expandedDetailGroups.has(record.ID) && status.hasAllocation && (
                                                                <DetailReportsSection record={record} isInGroupView={false} />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="15" className="px-4 py-6 text-center text-sm text-gray-500">
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
                                                            Nhập BB anh: {formatNumber(group.totalBaoBiAnh.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-200 text-green-900">
                                                            Thực nhận BB anh: {formatNumber(group.totalThucNhanAnh.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                                            Đã phân bổ BB anh: {formatNumber(group.totalDaPhanBoAnh.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                                            Bãi BB anh: {formatNumber(group.totalBaiAnh.toFixed(2))} tấn
                                                        </span>
                                                    </>
                                                )}
                                                {group.totalBaoBiEm > 0 && (
                                                    <>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                                            Nhập BB em: {formatNumber(group.totalBaoBiEm.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900">
                                                            Thực nhận BB em: {formatNumber(group.totalThucNhanEm.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                                                            Đã phân bổ BB em: {formatNumber(group.totalDaPhanBoEm.toFixed(2))} tấn
                                                        </span>
                                                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                                                            Bãi BB em: {formatNumber(group.totalBaiEm.toFixed(2))} tấn
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
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Trạng thái</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Nhập BB anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận BB anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đã phân bổ BB anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bãi BB anh</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Nhập BB em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thực nhận BB em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đã phân bổ BB em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Bãi BB em</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Chi tiết</th>
                                                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {group.records.map(record => {
                                                    const status = getDistributionStatus(record);
                                                    return (
                                                        <React.Fragment key={record.ID}>
                                                            <tr
                                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                                onClick={() => handleViewDetail(record)}
                                                            >
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{record['SỐ XE']}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{record['KHÁCH HÀNG']}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <AllocationStatusBadge record={record} />
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-blue-600">
                                                                    {record['BAO BÌ ANH (TẤN)'] ? formatNumber(record['BAO BÌ ANH (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-green-600">
                                                                    {record['THỰC NHẬN ANH (TẤN)'] ? formatNumber(record['THỰC NHẬN ANH (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-indigo-600">
                                                                    {record['ĐÃ PHÂN BỔ (ANH)'] ? formatNumber(record['ĐÃ PHÂN BỔ (ANH)']) : '0.00'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-yellow-600">
                                                                    {record['BÃI (ANH)'] ? formatNumber(record['BÃI (ANH)']) :
                                                                        formatNumber(Math.max(0, parseFloat(record['THỰC NHẬN ANH (TẤN)'] || 0) - parseFloat(record['ĐÃ PHÂN BỔ (ANH)'] || 0)).toFixed(2))}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-purple-600">
                                                                    {record['BAO BÌ EM (TẤN)'] ? formatNumber(record['BAO BÌ EM (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-teal-600">
                                                                    {record['THỰC NHẬN EM (TẤN)'] ? formatNumber(record['THỰC NHẬN EM (TẤN)']) : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-indigo-600">
                                                                    {record['ĐÃ PHÂN BỔ (EM)'] ? formatNumber(record['ĐÃ PHÂN BỔ (EM)']) : '0.00'}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium text-yellow-600">
                                                                    {record['BÃI (EM)'] ? formatNumber(record['BÃI (EM)']) :
                                                                        formatNumber(Math.max(0, parseFloat(record['THỰC NHẬN EM (TẤN)'] || 0) - parseFloat(record['ĐÃ PHÂN BỔ (EM)'] || 0)).toFixed(2))}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                                                                    {status.hasAllocation && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleGroupDetailExpansion(record.ID);
                                                                            }}
                                                                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                                                                            title={expandedGroupDetailGroups.has(record.ID) ? 'Ẩn chi tiết' : 'Xem chi tiết phân bổ'}
                                                                        >
                                                                            {expandedGroupDetailGroups.has(record.ID) ?
                                                                                <ChevronUp className="h-4 w-4" /> :
                                                                                <ChevronDown className="h-4 w-4" />
                                                                            }
                                                                        </button>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                                    <div className="flex justify-end space-x-1">
                                                                        <button
                                                                            onClick={(e) => handlePhanBo(record, e)}
                                                                            className="text-green-600 hover:text-green-900 p-1.5 rounded-full hover:bg-green-50"
                                                                            title="Phân bổ"
                                                                        >
                                                                            <Users className="h-4 w-4" />
                                                                        </button>
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

                                                            {/* Detail Reports Row for Grouped View */}
                                                            {expandedGroupDetailGroups.has(record.ID) && status.hasAllocation && (
                                                                <DetailReportsSection record={record} isInGroupView={true} />
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
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
                            itemsPerPage={itemsPerPage}
                            onItemsPerPageChange={handleItemsPerPageChange}
                            totalItems={filteredData.length}
                        />
                    )}
                </div>
            </div>

            {/* Detail View Modal - Updated with Chi tiết phân bổ */}
            {showDetailModal && selectedRecord && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full h-full p-6 overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Eye className="h-5 w-5 text-indigo-600" />
                                Chi tiết thông tin nhập bao bì
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

                            {/* Status */}
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium text-blue-800 mb-2">Trạng thái phân bổ</h3>
                                    <AllocationStatusBadge record={selectedRecord} />
                                </div>
                            </div>

                            {/* Bao bì Anh Information */}
                            <div className="border border-blue-200 rounded-lg p-5 bg-blue-50">
                                <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Thông tin Bao bì Anh
                                </h3>

                                {selectedRecord['BAO BÌ ANH (TẤN)'] && parseFloat(selectedRecord['BAO BÌ ANH (TẤN)']) > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Đã phân bổ</label>
                                            <div className="text-lg font-bold text-indigo-600">
                                                {selectedRecord['ĐÃ PHÂN BỔ (ANH)'] ? formatNumber(selectedRecord['ĐÃ PHÂN BỔ (ANH)']) : '0.00'} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Còn lại (Bãi)</label>
                                            <div className="text-lg font-bold text-yellow-600">
                                                {selectedRecord['BÃI (ANH)'] ? formatNumber(selectedRecord['BÃI (ANH)']) :
                                                    formatNumber((parseFloat(selectedRecord['THỰC NHẬN ANH (TẤN)'] || 0) -
                                                        parseFloat(selectedRecord['ĐÃ PHÂN BỔ (ANH)'] || 0)).toFixed(2))} tấn
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
                            <div className="border border-purple-200 rounded-lg p-5 bg-purple-50">
                                <h3 className="text-lg font-medium text-purple-800 mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Thông tin Bao bì Em
                                </h3>

                                {selectedRecord['BAO BÌ EM (TẤN)'] && parseFloat(selectedRecord['BAO BÌ EM (TẤN)']) > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Đã phân bổ</label>
                                            <div className="text-lg font-bold text-indigo-600">
                                                {selectedRecord['ĐÃ PHÂN BỔ (EM)'] ? formatNumber(selectedRecord['ĐÃ PHÂN BỔ (EM)']) : '0.00'} tấn
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg shadow-sm">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Còn lại (Bãi)</label>
                                            <div className="text-lg font-bold text-yellow-600">
                                                {selectedRecord['BÃI (EM)'] ? formatNumber(selectedRecord['BÃI (EM)']) :
                                                    formatNumber((parseFloat(selectedRecord['THỰC NHẬN EM (TẤN)'] || 0) -
                                                        parseFloat(selectedRecord['ĐÃ PHÂN BỔ (EM)'] || 0)).toFixed(2))} tấn
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

                            {/* Chi tiết phân bổ trong modal */}
                            {(() => {
                                const status = getDistributionStatus(selectedRecord);
                                return status.hasAllocation && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-medium text-blue-800 flex items-center gap-2">
                                                <Package className="w-5 h-5" />
                                                Chi tiết phân bổ ({status.totalReports} báo cáo)
                                            </h3>
                                            <div className="text-sm text-blue-600">
                                                Tổng giá trị: <span className="font-bold">{formatCurrency(status.relatedReports.reduce((sum, r) => sum + parseFloat(r['THÀNH TIỀN'] || 0), 0))}</span>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-blue-200">
                                                <thead className="bg-blue-100">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Ngày BC</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Tên hàng</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Tổ</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Công đoạn</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Khối lượng</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Nhân sự</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Đơn giá</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Thành tiền</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-blue-700 uppercase">Người nhập</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-blue-100">
                                                    {status.relatedReports.map((report, index) => (
                                                        <tr key={report.IDBC} className={`${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'} hover:bg-blue-50 transition-colors`}>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                                    {new Date(report['NGÀY']).toLocaleDateString('vi-VN')}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{report['TÊN HÀNG']}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                                                    {report['TỔ']}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2 text-sm text-gray-700 max-w-xs">
                                                                <div className="truncate" title={report['CÔNG ĐOẠN']}>
                                                                    {report['CÔNG ĐOẠN']}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-purple-600">
                                                                {formatNumber(report['KHỐI LƯỢNG'])}
                                                                <span className="text-gray-500 text-xs ml-1">{report['ĐƠN VỊ TÍNH']}</span>
                                                            </td>
                                                            <td className="px-3 py-2 text-sm text-gray-700 max-w-xs">
                                                                <div className="truncate" title={report['SỐ LƯỢNG NHÂN SỰ']}>
                                                                    {report['SỐ LƯỢNG NHÂN SỰ']}
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600 font-medium">
                                                                {formatCurrency(report['ĐƠN GIÁ'])}
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-green-700">
                                                                {formatCurrency(report['THÀNH TIỀN'])}
                                                            </td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{report['NGƯỜI NHẬP']}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Action buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        handleCloseDetail();
                                        setSelectedRecordForPhanBo(selectedRecord);
                                        setShowPhanBoModal(true);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Users className="w-4 h-4" />
                                    Phân bổ
                                </button>
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

            {showPhanBoModal && selectedRecordForPhanBo && (
                <PhanBoBaoBi
                    record={selectedRecordForPhanBo}
                    onClose={() => {
                        setShowPhanBoModal(false);
                        setSelectedRecordForPhanBo(null);
                    }}
                    onSuccess={async () => {
                        await fetchPackagingData();
                        await fetchDetailReports();
                        toast.success('Phân bổ thành công!');
                    }}
                />
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

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">{confirmTitle}</h2>
                            <button
                                onClick={handleCloseConfirmModal}
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
                                    onClick={handleCloseConfirmModal}
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
                                                handleCloseConfirmModal();
                                            }
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