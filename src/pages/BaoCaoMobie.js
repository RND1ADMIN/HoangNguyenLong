import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, ArrowLeft, Download, Upload, Calendar, ChevronDown, ChevronUp, Edit, Trash, Check, X } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

// Date formatting utilities
const formatDateToString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
};

const MobileReportManagement = () => {
    // State Management - core data
    const [reports, setReports] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [congDoanList, setCongDoanList] = useState([
        "Cắt thô", "Bào, lựa phôi", "Finger ghép dọc 1", "Finger ghép dọc 2",
        "Bào tinh ghép ngang", "Trám trít", "Chà nhám - kiểm hàng", "Nhập kho thành phẩm"
    ]);

    // State - UI controls
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        congDoan: '',
        trangThai: '',
        startDate: null,
        endDate: null
    });
    const [expandedDates, setExpandedDates] = useState({});
    const [isDetailView, setIsDetailView] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState([]);
    // State for add/edit form
    const [showAddForm, setShowAddForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentReport, setCurrentReport] = useState({
        ID: '',
        'NGÀY': new Date(),
        'CÔNG ĐOẠN': '',
        'KHỐI LƯỢNG': '',
        'NHÂN SỰ THAM GIA': '',
        'GHI CHÚ': '',
        'NGƯỜI NHẬP': '',
        'TRẠNG THÁI': 'Chờ duyệt',
        'NGƯỜI DUYỆT': ''
    });
    useEffect(() => {
        if (currentReport['NHÂN SỰ THAM GIA']) {
            const staffArray = currentReport['NHÂN SỰ THAM GIA'].split(',').map(item => item.trim());
            setSelectedStaff(staffArray);
        } else {
            setSelectedStaff([]);
        }
    }, [currentReport['NHÂN SỰ THAM GIA']]);
    // Fetch data
  
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const reportData = await authUtils.apiRequest('BC', 'Find', {});
                setReports(reportData);

                const staffData = await authUtils.apiRequest('DSNV', 'Find', {});
                setStaffList(staffData.map(staff => ({
                    value: staff['Họ và Tên'],
                    label: staff['Họ và Tên']
                })));

                // Fetch congDoanList if API exists
            } catch (error) {
                console.error('Error fetching data:', error);
                toast.error('Lỗi khi tải dữ liệu');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter reports
    const filteredReports = useMemo(() => {
        return reports.filter(report => {
            // Search filter
            const matchesSearch =
                !search ||
                report['CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
                report.ID?.toLowerCase().includes(search.toLowerCase());

            // Công đoạn filter
            const matchesCongDoan = !filters.congDoan || report['CÔNG ĐOẠN'] === filters.congDoan;

            // Trạng thái filter
            const matchesTrangThai = !filters.trangThai || report['TRẠNG THÁI'] === filters.trangThai;

            // Date range filter
            let dateMatches = true;
            if (filters.startDate || filters.endDate) {
                const reportDate = new Date(report['NGÀY']);
                reportDate.setHours(0, 0, 0, 0);

                if (filters.startDate && filters.endDate) {
                    const start = new Date(filters.startDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    dateMatches = reportDate >= start && reportDate <= end;
                } else if (filters.startDate) {
                    const start = new Date(filters.startDate);
                    start.setHours(0, 0, 0, 0);
                    dateMatches = reportDate >= start;
                } else if (filters.endDate) {
                    const end = new Date(filters.endDate);
                    end.setHours(23, 59, 59, 999);
                    dateMatches = reportDate <= end;
                }
            }

            return matchesSearch && matchesCongDoan && matchesTrangThai && dateMatches;
        });
    }, [reports, search, filters]);

    // Group reports by date
    const reportsByDate = useMemo(() => {
        const groupedReports = {};

        filteredReports.forEach(report => {
            const dateKey = report['NGÀY'].split('T')[0];
            if (!groupedReports[dateKey]) {
                groupedReports[dateKey] = [];
            }
            groupedReports[dateKey].push(report);
        });

        // Sort dates in descending order (newest first)
        return Object.keys(groupedReports)
            .sort((a, b) => new Date(b) - new Date(a))
            .reduce((acc, date) => {
                acc[date] = groupedReports[date];
                return acc;
            }, {});
    }, [filteredReports]);

    // Toggle date expansion
    const toggleDateExpansion = (date) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    // View report details
    const viewReportDetails = (report) => {
        setSelectedReport(report);
        setIsDetailView(true);
    };

    // Handle filter date changes
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

    // Reset filters
    const resetFilters = () => {
        setFilters({
            congDoan: '',
            trangThai: '',
            startDate: null,
            endDate: null
        });
        setSearch('');
    };

    // Status badge colors
    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'Đã duyệt':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'Từ chối':
                return 'bg-red-100 text-red-800 border border-red-200';
            case 'Chờ duyệt':
            default:
                return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        }
    };

    // Calculate total production quantity for a date
    const calculateDailyTotal = (reports) => {
        return reports.reduce((total, report) => {
            const quantityStr = report['KHỐI LƯỢNG'].toString().replace(/[^\d.-]/g, '');
            const quantity = parseFloat(quantityStr) || 0;
            return total + quantity;
        }, 0);
    };

    // Production stage badge colors
    const getStageBadgeColor = (stage) => {
        const stageColors = {
            "Cắt thô": "bg-blue-50 text-blue-700 border-blue-200",
            "Bào, lựa phôi": "bg-purple-50 text-purple-700 border-purple-200",
            "Finger ghép dọc 1": "bg-indigo-50 text-indigo-700 border-indigo-200",
            "Finger ghép dọc 2": "bg-cyan-50 text-cyan-700 border-cyan-200",
            "Bào tinh ghép ngang": "bg-teal-50 text-teal-700 border-teal-200",
            "Trám trít": "bg-amber-50 text-amber-700 border-amber-200",
            "Chà nhám - kiểm hàng": "bg-lime-50 text-lime-700 border-lime-200",
            "Nhập kho thành phẩm": "bg-emerald-50 text-emerald-700 border-emerald-200"
        };

        return stageColors[stage] || "bg-gray-50 text-gray-700 border-gray-200";
    };

    // Return to reports list
    const backToList = () => {
        setIsDetailView(false);
        setSelectedReport(null);
    };

    // Delete report confirmation
    const confirmDelete = (reportId) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
            handleDelete(reportId);
        }
    };

    // Delete report
    const handleDelete = async (reportId) => {
        try {
            await authUtils.apiRequest('BC', 'Delete', {
                "Rows": [{ "ID": reportId }]
            });

            // Update state to remove the deleted report
            setReports(prev => prev.filter(report => report.ID !== reportId));

            if (isDetailView && selectedReport?.ID === reportId) {
                backToList();
            }

            toast.success('Đã xóa báo cáo thành công');
        } catch (error) {
            console.error('Error deleting report:', error);
            toast.error('Lỗi khi xóa báo cáo');
        }
    };

    // Approve report
    const handleApprove = async (reportId, approve) => {
        try {
            const reportToUpdate = reports.find(report => report.ID === reportId);
            if (!reportToUpdate) return;

            const currentUser = authUtils.getUserData();
            const approverName = currentUser?.['Họ và Tên'] || '';

            const updatedReport = {
                ...reportToUpdate,
                'TRẠNG THÁI': approve ? 'Đã duyệt' : 'Từ chối',
                'NGƯỜI DUYỆT': approverName
            };

            await authUtils.apiRequest('BC', 'Edit', {
                "Rows": [updatedReport]
            });

            // Update state
            setReports(prev => prev.map(report =>
                report.ID === reportId ? updatedReport : report
            ));

            if (isDetailView && selectedReport?.ID === reportId) {
                setSelectedReport(updatedReport);
            }

            toast.success(`Báo cáo đã được ${approve ? 'duyệt' : 'từ chối'}`);
        } catch (error) {
            console.error('Error approving report:', error);
            toast.error('Lỗi khi xử lý báo cáo');
        }
    };

    // Open add new report form
    const openAddForm = () => {
        // Get current user for new report
        const currentUser = authUtils.getUserData();

        setCurrentReport({
            ID: '',
            'NGÀY': new Date(),
            'CÔNG ĐOẠN': '',
            'KHỐI LƯỢNG': '',
            'NHÂN SỰ THAM GIA': '',
            'GHI CHÚ': '',
            'NGƯỜI NHẬP': currentUser?.['Họ và Tên'] || '',
            'TRẠNG THÁI': 'Chờ duyệt',
            'NGƯỜI DUYỆT': ''
        });

        setShowAddForm(true);
    };

    // Edit existing report
    const editReport = (report) => {
        setCurrentReport({
            ...report,
            'NGÀY': new Date(report['NGÀY'])
        });

        setShowAddForm(true);
    };

    // Handle form input changes
    const handleInputChange = (field, value) => {
        setCurrentReport(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Save report (create new or update existing)
    const saveReport = async () => {
        // Basic validation
        if (!currentReport['CÔNG ĐOẠN'] || !currentReport['KHỐI LƯỢNG']) {
            toast.error('Vui lòng nhập đầy đủ thông tin bắt buộc');
            return;
        }

        setIsSubmitting(true);

        try {
            // Format data for API
            const reportData = {
                ...currentReport,
                'NGÀY': formatDateToString(currentReport['NGÀY'])
            };

            if (currentReport.ID) {
                // Update existing report
                await authUtils.apiRequest('BC', 'Edit', {
                    "Rows": [reportData]
                });

                // Update state
                setReports(prev => prev.map(report =>
                    report.ID === currentReport.ID ? reportData : report
                ));

                toast.success('Cập nhật báo cáo thành công');
            } else {
                // Create new report
                // Generate new ID
                const existingReports = await authUtils.apiRequest('BC', 'Find', {});
                const maxID = existingReports.reduce((max, report) => {
                    const id = parseInt(report.ID.replace('BC', '')) || 0;
                    return id > max ? id : max;
                }, 0);

                const newID = maxID + 1;
                const newReportID = `BC${newID.toString().padStart(3, '0')}`;

                reportData.ID = newReportID;

                await authUtils.apiRequest('BC', 'Add', {
                    "Rows": [reportData]
                });

                // Update state
                setReports(prev => [...prev, reportData]);

                toast.success('Thêm báo cáo mới thành công');
            }

            // Close form
            setShowAddForm(false);
        } catch (error) {
            console.error('Error saving report:', error);
            toast.error('Lỗi khi lưu báo cáo');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-16">
            {/* Top app bar */}
            <div className="sticky top-0 z-10 bg-indigo-600 text-white shadow-md">
                <div className="px-4 py-3 flex items-center">
                    {isDetailView || showAddForm ? (
                        <button
                            onClick={() => {
                                if (showAddForm) {
                                    setShowAddForm(false);
                                } else {
                                    backToList();
                                }
                            }}
                            className="mr-2 p-1 rounded-full hover:bg-indigo-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    ) : null}
                    <h1 className="text-lg font-semibold flex-1">
                        {showAddForm
                            ? (currentReport.ID ? 'Sửa báo cáo' : 'Thêm báo cáo mới')
                            : isDetailView ? 'Chi tiết báo cáo' : 'Báo cáo sản xuất'}
                    </h1>
                    {!isDetailView && !showAddForm && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="p-2 rounded-full hover:bg-indigo-500"
                        >
                            <Filter size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="p-4">
                {/* Add/Edit Form */}
                {showAddForm && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="text-lg font-bold">
                                {currentReport.ID ? 'Cập nhật báo cáo' : 'Thêm báo cáo mới'}
                            </h2>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày báo cáo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <input
                                        type="date"
                                        value={formatDateToString(currentReport['NGÀY'])}
                                        onChange={(e) => handleInputChange('NGÀY', new Date(e.target.value))}
                                        className="pl-10 p-2.5 border border-gray-300 rounded-lg w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn <span className="text-red-500">*</span></label>
                                <select
                                    value={currentReport['CÔNG ĐOẠN']}
                                    onChange={(e) => handleInputChange('CÔNG ĐOẠN', e.target.value)}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full"
                                    required
                                >
                                    <option value="">Chọn công đoạn</option>
                                    {congDoanList.map((congDoan, index) => (
                                        <option key={index} value={congDoan}>{congDoan}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Khối lượng <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Nhập khối lượng (VD: 50 khối)"
                                    value={currentReport['KHỐI LƯỢNG']}
                                    onChange={(e) => handleInputChange('KHỐI LƯỢNG', e.target.value)}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân sự tham gia</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowStaffDropdown(!showStaffDropdown)}
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-left flex justify-between items-center"
                                    >
                                        <span className="truncate">
                                            {selectedStaff.length > 0
                                                ? `Đã chọn ${selectedStaff.length} nhân sự`
                                                : "Chọn nhân sự..."}
                                        </span>
                                        <ChevronDown size={16} className={`transition-transform ${showStaffDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {selectedStaff.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {selectedStaff.map((staff, idx) => (
                                                <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-md">
                                                    {staff}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {showStaffDropdown && (
                                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            <div className="sticky top-0 bg-white border-b p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Tìm kiếm nhân sự..."
                                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => {
                                                        // Filter staff list logic here if needed
                                                    }}
                                                />
                                            </div>

                                            <div className="p-2">
                                                {staffList.map((staff, idx) => (
                                                    <div key={idx} className="flex items-center p-2 hover:bg-gray-50 rounded">
                                                        <input
                                                            type="checkbox"
                                                            id={`staff-${idx}`}
                                                            checked={selectedStaff.includes(staff.value)}
                                                            onChange={() => {
                                                                if (selectedStaff.includes(staff.value)) {
                                                                    const newStaff = selectedStaff.filter(item => item !== staff.value);
                                                                    setSelectedStaff(newStaff);
                                                                    handleInputChange('NHÂN SỰ THAM GIA', newStaff.join(', '));
                                                                } else {
                                                                    const newStaff = [...selectedStaff, staff.value];
                                                                    setSelectedStaff(newStaff);
                                                                    handleInputChange('NHÂN SỰ THAM GIA', newStaff.join(', '));
                                                                }
                                                            }}
                                                            className="mr-2"
                                                        />
                                                        <label htmlFor={`staff-${idx}`} className="flex-1 cursor-pointer">
                                                            {staff.label}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="sticky bottom-0 bg-white border-t p-2 flex justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedStaff([]);
                                                        handleInputChange('NHÂN SỰ THAM GIA', '');
                                                    }}
                                                    className="text-sm text-red-600"
                                                >
                                                    Xóa tất cả
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowStaffDropdown(false)}
                                                    className="text-sm text-indigo-600 font-medium"
                                                >
                                                    Xong
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <textarea
                                    placeholder="Nhập ghi chú (nếu có)"
                                    value={currentReport['GHI CHÚ']}
                                    onChange={(e) => handleInputChange('GHI CHÚ', e.target.value)}
                                    rows={3}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Người nhập</label>
                                <input
                                    type="text"
                                    placeholder="Nhập tên người nhập báo cáo"
                                    value={currentReport['NGƯỜI NHẬP']}
                                    onChange={(e) => handleInputChange('NGƯỜI NHẬP', e.target.value)}
                                    className="p-2.5 border border-gray-300 rounded-lg w-full"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={saveReport}
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white rounded-lg flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                        Đang lưu...
                                    </>
                                ) : (
                                    'Lưu báo cáo'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Detail view */}
                {isDetailView && selectedReport && !showAddForm ? (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-fadeIn">
                        {/* Header with status */}
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <span className="text-xs text-gray-500">Mã báo cáo</span>
                                <h2 className="text-lg font-bold">{selectedReport.ID}</h2>
                            </div>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedReport['TRẠNG THÁI'])}`}>
                                {selectedReport['TRẠNG THÁI']}
                            </span>
                        </div>

                        {/* Report details */}
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between">
                                <div>
                                    <span className="text-xs text-gray-500">Ngày báo cáo</span>
                                    <p className="font-medium">{formatDateForDisplay(selectedReport['NGÀY'])}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500">Người nhập</span>
                                    <p className="font-medium">{selectedReport['NGƯỜI NHẬP']}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-gray-500">Công đoạn</span>
                                <div className={`mt-1 inline-block px-2.5 py-1 rounded-md text-sm font-medium ${getStageBadgeColor(selectedReport['CÔNG ĐOẠN'])}`}>
                                    {selectedReport['CÔNG ĐOẠN']}
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-gray-500">Khối lượng</span>
                                <p className="text-xl font-bold text-indigo-700">{selectedReport['KHỐI LƯỢNG']}</p>
                            </div>

                            <div>
                                <span className="text-xs text-gray-500">Nhân sự tham gia</span>
                                <p className="font-medium">{selectedReport['NHÂN SỰ THAM GIA']}</p>
                            </div>

                            {selectedReport['GHI CHÚ'] && (
                                <div>
                                    <span className="text-xs text-gray-500">Ghi chú</span>
                                    <p className="p-3 bg-gray-50 rounded-lg text-gray-700 mt-1">{selectedReport['GHI CHÚ']}</p>
                                </div>
                            )}

                            {selectedReport['NGƯỜI DUYỆT'] && (
                                <div>
                                    <span className="text-xs text-gray-500">Người duyệt</span>
                                    <p className="font-medium">{selectedReport['NGƯỜI DUYỆT']}</p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="p-4 border-t border-gray-100 flex justify-between">
                            {selectedReport['TRẠNG THÁI'] === 'Chờ duyệt' ? (
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={() => handleApprove(selectedReport.ID, false)}
                                        className="flex-1 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg flex justify-center items-center gap-1.5"
                                    >
                                        <X size={16} />
                                        Từ chối
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedReport.ID, true)}
                                        className="flex-1 py-2.5 bg-green-600 text-white rounded-lg flex justify-center items-center gap-1.5"
                                    >
                                        <Check size={16} />
                                        Duyệt
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={() => confirmDelete(selectedReport.ID)}
                                        className="flex-1 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg flex justify-center items-center gap-1.5"
                                    >
                                        <Trash size={16} />
                                        Xóa
                                    </button>
                                    <button
                                        onClick={() => {
                                            editReport(selectedReport);
                                            setIsDetailView(false);
                                        }}
                                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg flex justify-center items-center gap-1.5"
                                    >
                                        <Edit size={16} />
                                        Chỉnh sửa
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}

                {/* Reports list view */}
                {!isDetailView && !showAddForm && (
                    <>
                        {/* Search and filters */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm công đoạn, mã báo cáo..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Filters panel */}
                        {showFilters && (
                            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-100 animate-slideDown">
                                <h3 className="font-medium mb-3">Bộ lọc</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn</label>
                                        <select
                                            value={filters.congDoan}
                                            onChange={(e) => setFilters({ ...filters, congDoan: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Tất cả công đoạn</option>
                                            {congDoanList.map((type, index) => (
                                                <option key={index} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                        <select
                                            value={filters.trangThai}
                                            onChange={(e) => setFilters({ ...filters, trangThai: e.target.value })}
                                            className="w-full p-2.5 border border-gray-300 rounded-lg"
                                        >
                                            <option value="">Tất cả trạng thái</option>
                                            <option value="Chờ duyệt">Chờ duyệt</option>
                                            <option value="Đã duyệt">Đã duyệt</option>
                                            <option value="Từ chối">Từ chối</option>
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
                                                value={filters.startDate ? formatDateToString(filters.startDate) : ''}
                                                onChange={(e) => handleFilterDateChange('startDate', e.target.value)}
                                                className="pl-10 p-2.5 border rounded-lg w-full"
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
                                                value={filters.endDate ? formatDateToString(filters.endDate) : ''}
                                                onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                                                className="pl-10 p-2.5 border rounded-lg w-full"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={resetFilters}
                                        className="w-full py-2.5 mt-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Loading state */}
                        {isLoading && (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                            </div>
                        )}

                        {/* Reports grouped by date */}
                        {!isLoading && Object.keys(reportsByDate).length === 0 && (
                            <div className="bg-white rounded-lg shadow p-6 text-center">
                                <p className="text-gray-500">Không tìm thấy báo cáo nào phù hợp</p>
                            </div>
                        )}

                        {!isLoading && Object.entries(reportsByDate).map(([date, dateReports]) => (
                            <div
                                key={date}
                                className="mb-4 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100"
                            >
                                {/* Date header with toggle and total */}
                                <div
                                    className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer"
                                    onClick={() => toggleDateExpansion(date)}
                                >
                                    <div>
                                        <span className="text-xs text-gray-500">Ngày</span>
                                        <h2 className="text-lg font-bold">{formatDateForDisplay(date)}</h2>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="text-right mr-3">
                                            <span className="text-xs text-gray-500">Tổng khối lượng</span>
                                            <p className="font-bold text-indigo-700">{calculateDailyTotal(dateReports).toFixed(2)} khối</p>
                                        </div>
                                        {expandedDates[date] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded reports list */}
                                {expandedDates[date] && (
                                    <div className="divide-y divide-gray-100 animate-fadeIn">
                                        {dateReports.map(report => (
                                            <div
                                                key={report.ID}
                                                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => viewReportDetails(report)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className={`px-2 py-1 rounded-md text-xs font-medium ${getStageBadgeColor(report['CÔNG ĐOẠN'])}`}>
                                                        {report['CÔNG ĐOẠN']}
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(report['TRẠNG THÁI'])}`}>
                                                        {report['TRẠNG THÁI']}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm text-gray-500">{report.ID}</p>
                                                        <p className="text-lg font-bold">{report['KHỐI LƯỢNG']}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-500">Người nhập</p>
                                                        <p className="text-sm font-medium">{report['NGƯỜI NHẬP']}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Floating action button */}
            {!isDetailView && !showAddForm && (
                <div className="fixed bottom-5 right-5">
                    <button
                        onClick={openAddForm}
                        className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:bg-indigo-800 transition-colors"
                        aria-label="Thêm báo cáo mới"
                    >
                        <Plus size={24} />
                    </button>
                </div>
            )}

            {/* Toast notifications */}
            <ToastContainer
                position="top-center"
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

            {/* Add necessary CSS for animations */}
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
        </div>
    );
};

export default MobileReportManagement;