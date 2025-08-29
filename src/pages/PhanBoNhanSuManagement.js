import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Check, X, Filter, Users, UserPlus, UserMinus, ChevronDown, ChevronRight } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const PhanBoNhanSuManagement = () => {
    // State Management (giữ nguyên)
    const [phanBoNhanSus, setPhanBoNhanSus] = useState([]);
    const [congDoanDonGias, setCongDoanDonGias] = useState([]);
    const [danhSachNhanVien, setDanhSachNhanVien] = useState([]);
    const [currentPhanBoNhanSu, setCurrentPhanBoNhanSu] = useState({
        'ID TỔ CÔNG ĐOẠN': '',
        'NGÀY CÀI ĐẶT': '',
        'HIỆU LỰC TỪ': '',
        'HIỆU LỰC ĐẾN': '',
        'TỔ': '',
        'MÃ CÔNG ĐOẠN': '',
        'TÊN CÔNG ĐOẠN': '',
        'NHÓM': '',
        'ĐƠN VỊ TÍNH': '',
        'PP TÍNH NĂNG SUẤT': '',
        'ĐƠN GIÁ NĂNG SUẤT': '',
        'NHÂN SỰ': [],
        'SỐ LƯỢNG NHÂN SỰ': 0,
        'ĐƠN GIÁ PHỤ CẤP TN/THÁNG': ''
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [dateFilter, setDateFilter] = useState('');
    const [toFilter, setToFilter] = useState('');
    const [selectedNhanSu, setSelectedNhanSu] = useState([]);
    // Cập nhật state để quản lý expand/collapse cho cả nhóm và tổ
    const [expandedNhoms, setExpandedNhoms] = useState(new Set());
    const [expandedTos, setExpandedTos] = useState(new Set());
    // Thêm state để quản lý tìm kiếm nhân sự
    const [searchNhanSu, setSearchNhanSu] = useState('');

    // Fetch data functions (giữ nguyên)
    const fetchPhanBoNhanSus = async () => {
        try {
            const response = await authUtils.apiRequest('TO_PBNS', 'Find', {});
            const processedData = response.map(item => ({
                ...item,
                'NHÂN SỰ': typeof item['NHÂN SỰ'] === 'string' ?
                    item['NHÂN SỰ'].split(',').map(s => s.trim()).filter(s => s) :
                    item['NHÂN SỰ'] || []
            }));
            setPhanBoNhanSus(processedData);
        } catch (error) {
            console.error('Error fetching phan bo nhan su list:', error);
            toast.error('Lỗi khi tải danh sách phân bổ nhân sự');
        }
    };

    const fetchCongDoanDonGias = async () => {
        try {
            const response = await authUtils.apiRequest('CONGDOAN_DONGIA', 'Find', {});
            setCongDoanDonGias(response);
        } catch (error) {
            console.error('Error fetching cong doan don gia list:', error);
            toast.error('Lỗi khi tải danh sách công đoạn');
        }
    };

    const fetchDanhSachNhanVien = async () => {
        try {
            const response = await authUtils.apiRequest('DSNV', 'Find', {});
            setDanhSachNhanVien(response);
        } catch (error) {
            console.error('Error fetching danh sach nhan vien:', error);
            toast.error('Lỗi khi tải danh sách nhân viên');
        }
    };

    useEffect(() => {
        fetchPhanBoNhanSus();
        fetchCongDoanDonGias();
        fetchDanhSachNhanVien();
    }, []);

    // Tạo ID TỔ CÔNG ĐOẠN từ TỔ và MÃ CÔNG ĐOẠN
    const generateIdToCongDoan = (to, maCongDoan) => {
        return `${to} ${maCongDoan}`;
    };

    // Hàm toggle cho nhóm
    const toggleNhom = (nhomName) => {
        const newExpanded = new Set(expandedNhoms);
        if (newExpanded.has(nhomName)) {
            newExpanded.delete(nhomName);
        } else {
            newExpanded.add(nhomName);
        }
        setExpandedNhoms(newExpanded);
    };

    // Hàm toggle cho tổ
    const toggleTo = (nhomName, toName) => {
        const key = `${nhomName}-${toName}`;
        const newExpanded = new Set(expandedTos);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedTos(newExpanded);
    };

    // SẮPXẾP và LỌC DỮ LIỆU TRƯỚC - để có filteredItems
    const getSortedItems = useCallback(() => {
        const sortableItems = [...phanBoNhanSus];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const keyA = a[sortConfig.key];
                const keyB = b[sortConfig.key];

                if (sortConfig.key === 'SỐ LƯỢNG NHÂN SỰ' || sortConfig.key === 'ĐƠN GIÁ PHỤ CẤP TN/THÁNG') {
                    const numA = parseFloat(keyA) || 0;
                    const numB = parseFloat(keyB) || 0;
                    if (numA < numB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (numA > numB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                } else if (sortConfig.key.includes('NGÀY') || sortConfig.key.includes('HIỆU LỰC')) {
                    const dateA = new Date(keyA || '1900-01-01');
                    const dateB = new Date(keyB || '1900-01-01');
                    if (dateA < dateB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (dateA > dateB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                } else {
                    if (keyA < keyB) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (keyA > keyB) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                    return 0;
                }
            });
        }
        return sortableItems;
    }, [phanBoNhanSus, sortConfig]);

    // Lọc danh sách nhân viên theo từ khóa tìm kiếm
    const filteredNhanVien = danhSachNhanVien.filter(nv =>
        nv['Họ và Tên'].toLowerCase().includes(searchNhanSu.toLowerCase())
    );

    // Filtering - TẠO filteredItems TRƯỚC
    const filteredItems = getSortedItems().filter(item => {
        const matchesSearch = (
            item['TỔ']?.toLowerCase().includes(search.toLowerCase()) ||
            item['TÊN CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
            item['MÃ CÔNG ĐOẠN']?.toLowerCase().includes(search.toLowerCase()) ||
            item['NHÓM']?.toLowerCase().includes(search.toLowerCase()) ||
            (Array.isArray(item['NHÂN SỰ']) ? item['NHÂN SỰ'].join(', ') : item['NHÂN SỰ'] || '').toLowerCase().includes(search.toLowerCase())
        );

        const matchesDateFilter = !dateFilter ||
            item['NGÀY CÀI ĐẶT']?.includes(dateFilter) ||
            item['HIỆU LỰC TỪ']?.includes(dateFilter);

        const matchesToFilter = !toFilter ||
            item['TỔ']?.toLowerCase().includes(toFilter.toLowerCase());

        return matchesSearch && matchesDateFilter && matchesToFilter;
    });

    // SAU ĐÓ MỚI GROUP DỮ LIỆU - sử dụng filteredItems
    const groupDataByNhom = useCallback(() => {
        const grouped = {};

        filteredItems.forEach(item => {
            const nhom = item['NHÓM'] || 'Chưa phân nhóm';
            const to = item['TỔ'] || 'Chưa có tổ';

            // Tạo nhóm nếu chưa có
            if (!grouped[nhom]) {
                grouped[nhom] = {};
            }

            // Tạo tổ trong nhóm nếu chưa có
            if (!grouped[nhom][to]) {
                grouped[nhom][to] = [];
            }

            grouped[nhom][to].push(item);
        });

        // Sort groups và tổ alphabetically
        const sortedGroups = {};
        Object.keys(grouped).sort().forEach(nhomKey => {
            sortedGroups[nhomKey] = {};
            Object.keys(grouped[nhomKey]).sort().forEach(toKey => {
                // Sort items trong mỗi tổ theo tên công đoạn
                sortedGroups[nhomKey][toKey] = grouped[nhomKey][toKey].sort((a, b) =>
                    a['TÊN CÔNG ĐOẠN'].localeCompare(b['TÊN CÔNG ĐOẠN'])
                );
            });
        });

        return sortedGroups;
    }, [filteredItems]);

    // Get unique values for filters và grouped data
    const uniqueTos = [...new Set(phanBoNhanSus.map(item => item['TỔ']).filter(Boolean))];
    const groupedData = groupDataByNhom();

    // Tất cả các function khác giữ nguyên (modal handlers, form handlers, etc.)
    const handleOpenModal = (item = null) => {
        if (item) {
            setIsEditMode(true);
            setCurrentPhanBoNhanSu({
                'ID TỔ CÔNG ĐOẠN': item['ID TỔ CÔNG ĐOẠN'] || '',
                'NGÀY CÀI ĐẶT': item['NGÀY CÀI ĐẶT'] || '',
                'HIỆU LỰC TỪ': item['HIỆU LỰC TỪ'] || '',
                'HIỆU LỰC ĐẾN': item['HIỆU LỰC ĐẾN'] || '',
                'TỔ': item['TỔ'] || '',
                'MÃ CÔNG ĐOẠN': item['MÃ CÔNG ĐOẠN'] || '',
                'TÊN CÔNG ĐOẠN': item['TÊN CÔNG ĐOẠN'] || '',
                'NHÓM': item['NHÓM'] || '',
                'ĐƠN VỊ TÍNH': item['ĐƠN VỊ TÍNH'] || '',
                'PP TÍNH NĂNG SUẤT': item['PP TÍNH NĂNG SUẤT'] || '',
                'ĐƠN GIÁ NĂNG SUẤT': item['ĐƠN GIÁ NĂNG SUẤT'] || '',
                'NHÂN SỰ': item['NHÂN SỰ'] || [],
                'SỐ LƯỢNG NHÂN SỰ': item['SỐ LƯỢNG NHÂN SỰ'] || 0,
                'ĐƠN GIÁ PHỤ CẤP TN/THÁNG': item['ĐƠN GIÁ PHỤ CẤP TN/THÁNG'] || ''
            });
            setSelectedNhanSu(item['NHÂN SỰ'] || []);
        } else {
            setIsEditMode(false);
            const today = new Date().toISOString().split('T')[0];
            setCurrentPhanBoNhanSu({
                'ID TỔ CÔNG ĐOẠN': '',
                'NGÀY CÀI ĐẶT': today,
                'HIỆU LỰC TỪ': today,
                'HIỆU LỰC ĐẾN': '',
                'TỔ': '',
                'MÃ CÔNG ĐOẠN': '',
                'TÊN CÔNG ĐOẠN': '',
                'NHÓM': '',
                'ĐƠN VỊ TÍNH': '',
                'PP TÍNH NĂNG SUẤT': '',
                'ĐƠN GIÁ NĂNG SUẤT': '',
                'NHÂN SỰ': [],
                'SỐ LƯỢNG NHÂN SỰ': 0,
                'ĐƠN GIÁ PHỤ CẤP TN/THÁNG': ''
            });
            setSelectedNhanSu([]);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setSelectedNhanSu([]);
        setSearchNhanSu(''); // Thêm dòng này
        setCurrentPhanBoNhanSu({
            'ID TỔ CÔNG ĐOẠN': '',
            'NGÀY CÀI ĐẶT': '',
            'HIỆU LỰC TỪ': '',
            'HIỆU LỰC ĐẾN': '',
            'TỔ': '',
            'MÃ CÔNG ĐOẠN': '',
            'TÊN CÔNG ĐOẠN': '',
            'NHÓM': '',
            'ĐƠN VỊ TÍNH': '',
            'PP TÍNH NĂNG SUẤT': '',
            'ĐƠN GIÁ NĂNG SUẤT': '',
            'NHÂN SỰ': [],
            'SỐ LƯỢNG NHÂN SỰ': 0,
            'ĐƠN GIÁ PHỤ CẤP TN/THÁNG': ''
        });
    };

    // Format date cho input type="date" (yyyy-mm-dd)
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

    // Handle công đoạn selection - lấy cả NHÓM từ CONGDOAN_DONGIA
    const handleCongDoanChange = (tenCongDoan) => {
        const selectedCongDoan = congDoanDonGias.find(cd => cd['TÊN CÔNG ĐOẠN'] === tenCongDoan);
        const updatedData = {
            ...currentPhanBoNhanSu,
            'TÊN CÔNG ĐOẠN': tenCongDoan,
            'MÃ CÔNG ĐOẠN': selectedCongDoan ? selectedCongDoan['MÃ CÔNG ĐOẠN'] : '',
            'NHÓM': selectedCongDoan ? selectedCongDoan['NHÓM'] : '',
            'ĐƠN VỊ TÍNH': selectedCongDoan ? selectedCongDoan['ĐƠN VỊ TÍNH'] : '',
            'PP TÍNH NĂNG SUẤT': selectedCongDoan ? selectedCongDoan['PP TÍNH NĂNG SUẤT'] : '',
            'ĐƠN GIÁ NĂNG SUẤT': selectedCongDoan ? selectedCongDoan['ĐƠN GIÁ NĂNG SUẤT'] : ''
        };

        if (updatedData['TỔ'] && updatedData['MÃ CÔNG ĐOẠN']) {
            updatedData['ID TỔ CÔNG ĐOẠN'] = generateIdToCongDoan(updatedData['TỔ'], updatedData['MÃ CÔNG ĐOẠN']);
        }

        setCurrentPhanBoNhanSu(updatedData);
    };

    const handleToChange = (to) => {
        const updatedData = {
            ...currentPhanBoNhanSu,
            'TỔ': to
        };

        if (to && updatedData['MÃ CÔNG ĐOẠN']) {
            updatedData['ID TỔ CÔNG ĐOẠN'] = generateIdToCongDoan(to, updatedData['MÃ CÔNG ĐOẠN']);
        }

        setCurrentPhanBoNhanSu(updatedData);
    };

    // Các function khác giữ nguyên (handleNhanSuChange, addNhanSu, removeNhanSu, validation, save, delete handlers)
    const handleNhanSuChange = (nhanSuList) => {
        setSelectedNhanSu(nhanSuList);
        setCurrentPhanBoNhanSu(prev => ({
            ...prev,
            'NHÂN SỰ': nhanSuList,
            'SỐ LƯỢNG NHÂN SỰ': nhanSuList.length
        }));
    };

    const addNhanSu = (tenNhanVien) => {
        if (!selectedNhanSu.includes(tenNhanVien)) {
            const newList = [...selectedNhanSu, tenNhanVien];
            handleNhanSuChange(newList);
        }
    };

    const removeNhanSu = (tenNhanVien) => {
        const newList = selectedNhanSu.filter(ns => ns !== tenNhanVien);
        handleNhanSuChange(newList);
    };

    const handleInputChange = (field, value) => {
        setCurrentPhanBoNhanSu(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validatePhanBoNhanSu = (item) => {
        const errors = [];
        if (!item['NGÀY CÀI ĐẶT']) errors.push('Ngày cài đặt không được để trống');
        if (!item['HIỆU LỰC TỪ']) errors.push('Hiệu lực từ không được để trống');
        if (!item['TỔ']) errors.push('Tổ không được để trống');
        if (!item['TÊN CÔNG ĐOẠN']) errors.push('Tên công đoạn không được để trống');
        if (!item['NHÂN SỰ'] || item['NHÂN SỰ'].length === 0) errors.push('Phải chọn ít nhất một nhân sự');
        if (!item['ĐƠN GIÁ PHỤ CẤP TN/THÁNG']) errors.push('Đơn giá phụ cấp không được để trống');

        if (item['HIỆU LỰC ĐẾN'] && item['HIỆU LỰC TỪ']) {
            if (new Date(item['HIỆU LỰC ĐẾN']) < new Date(item['HIỆU LỰC TỪ'])) {
                errors.push('Hiệu lực đến phải sau hiệu lực từ');
            }
        }

        return errors;
    };

    const handleSave = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validatePhanBoNhanSu(currentPhanBoNhanSu);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            const dataToSave = {
                ...currentPhanBoNhanSu,
                'NHÂN SỰ': currentPhanBoNhanSu['NHÂN SỰ'].join(', ')
            };

            if (isEditMode) {
                await authUtils.apiRequest('TO_PBNS', 'Edit', {
                    "Rows": [dataToSave]
                });
                toast.success('Cập nhật phân bổ nhân sự thành công!');
            } else {
                await authUtils.apiRequest('TO_PBNS', 'Add', {
                    "Rows": [dataToSave]
                });
                toast.success('Thêm phân bổ nhân sự mới thành công!');
            }

            await fetchPhanBoNhanSus();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving phan bo nhan su:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu phân bổ nhân sự'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenDeleteConfirmation = (item) => {
        setItemToDelete(item);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setItemToDelete(null);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;

        try {
            await authUtils.apiRequest('TO_PBNS', 'Delete', {
                "Rows": [{
                    "ID TỔ CÔNG ĐOẠN": itemToDelete['ID TỔ CÔNG ĐOẠN']
                }]
            });
            toast.success('Xóa phân bổ nhân sự thành công!');
            await fetchPhanBoNhanSus();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting phan bo nhan su:', error);
            toast.error('Có lỗi xảy ra khi xóa phân bổ nhân sự');
        }
    };

    // PHẦN JSX GIỮ NGUYÊN HOÀN TOÀN
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
            {/* Phần JSX render giữ nguyên 100% như code gốc của bạn */}
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-gray-800">Quản lý Phân Bổ Nhân Sự</h1>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
                            </button>
                            <button
                                onClick={() => {
                                    setExpandedNhoms(new Set(Object.keys(groupedData)));
                                    // Mở tất cả tổ
                                    const allToKeys = [];
                                    Object.entries(groupedData).forEach(([nhom, tosData]) => {
                                        Object.keys(tosData).forEach(to => {
                                            allToKeys.push(`${nhom}-${to}`);
                                        });
                                    });
                                    setExpandedTos(new Set(allToKeys));
                                }}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Mở tất cả
                            </button>
                            <button
                                onClick={() => {
                                    setExpandedNhoms(new Set());
                                    setExpandedTos(new Set());
                                }}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Đóng tất cả
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm phân bổ
                            </button>
                        </div>
                    </div>

                    {/* Search and Filter Section */}
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo nhóm, tổ, công đoạn, nhân sự..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {showFilters && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo ngày</label>
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lọc theo tổ</label>
                                    <select
                                        value={toFilter}
                                        onChange={(e) => setToFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Tất cả tổ</option>
                                        {uniqueTos.map(to => (
                                            <option key={to} value={to}>{to}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={() => {
                                            setDateFilter('');
                                            setToFilter('');
                                            setSearch('');
                                        }}
                                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Xóa bộ lọc
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <h3 className="text-sm text-blue-700 mb-1">Tổng phân bổ</h3>
                            <p className="text-2xl font-bold text-blue-800">{phanBoNhanSus.length}</p>
                        </div>

                        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                            <h3 className="text-sm text-green-700 mb-1">Số nhóm</h3>
                            <p className="text-2xl font-bold text-green-800">{Object.keys(groupedData).length}</p>
                        </div>

                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                            <h3 className="text-sm text-purple-700 mb-1">Tổng nhân sự</h3>
                            <p className="text-2xl font-bold text-purple-800">
                                {phanBoNhanSus.reduce((sum, item) => sum + (parseInt(item['SỐ LƯỢNG NHÂN SỰ']) || 0), 0)}
                            </p>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                            <h3 className="text-sm text-yellow-700 mb-1">Phụ cấp TB</h3>
                            <p className="text-2xl font-bold text-yellow-800">
                                {phanBoNhanSus.length > 0
                                    ? (phanBoNhanSus.reduce((sum, item) => sum + (parseFloat(item['ĐƠN GIÁ PHỤ CẤP TN/THÁNG']) || 0), 0) / phanBoNhanSus.length).toLocaleString('vi-VN', { maximumFractionDigits: 0 })
                                    : 0}
                            </p>
                        </div>
                    </div>

                    {/* Grouped Table Section */}
                    <div className="overflow-x-auto">
                        {Object.keys(groupedData).length > 0 ? (
                            Object.entries(groupedData).map(([nhom, tosData]) => (
                                <div key={nhom} className="mb-6">
                                    {/* Nhóm Header */}
                                    <div
                                        className="bg-indigo-50 border border-indigo-200 rounded-t-lg p-4 cursor-pointer hover:bg-indigo-100 transition-colors"
                                        onClick={() => toggleNhom(nhom)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {expandedNhoms.has(nhom) ? (
                                                    <ChevronDown className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <ChevronRight className="w-5 h-5 text-indigo-600" />
                                                )}
                                                <h3 className="text-lg font-semibold text-indigo-800">
                                                    Nhóm: {nhom}
                                                </h3>
                                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                                                    {Object.keys(tosData).length} tổ
                                                </span>
                                            </div>
                                            <div className="text-sm text-indigo-600">
                                                Tổng nhân sự: {Object.values(tosData).flat().reduce((sum, item) => sum + (parseInt(item['SỐ LƯỢNG NHÂN SỰ']) || 0), 0)} người
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nhóm Content - hiển thị các tổ */}
                                    {expandedNhoms.has(nhom) && (
                                        <div className="border border-t-0 border-indigo-200 rounded-b-lg">
                                            {Object.entries(tosData).map(([to, items]) => (
                                                <div key={`${nhom}-${to}`} className="border-b border-gray-100 last:border-b-0">
                                                    {/* Tổ Header */}
                                                    <div
                                                        className="bg-blue-50 border-b border-blue-100 p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                                                        onClick={() => toggleTo(nhom, to)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                {expandedTos.has(`${nhom}-${to}`) ? (
                                                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-blue-600" />
                                                                )}
                                                                <h4 className="text-md font-semibold text-blue-800">
                                                                    Tổ: {to}
                                                                </h4>
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                                                                    {items.length} công đoạn
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-blue-600">
                                                                {items.reduce((sum, item) => sum + (parseInt(item['SỐ LƯỢNG NHÂN SỰ']) || 0), 0)} người
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Tổ Content - hiển thị bảng công đoạn */}
                                                    {expandedTos.has(`${nhom}-${to}`) && (
                                                        <table className="min-w-full divide-y divide-gray-200">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        Công đoạn
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        Nhân sự
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        SL
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        ĐƠN GIÁ NĂNG XUẤT
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        Phụ cấp
                                                                    </th>
                                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        Hiệu lực
                                                                    </th>
                                                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                                                        Thao tác
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {items.map((item, index) => (
                                                                    <tr key={`${item['ID TỔ CÔNG ĐOẠN']}-${index}`} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="px-4 py-4 text-sm text-gray-900">
                                                                            <div className="max-w-xs">
                                                                                <div className="font-medium">{item['TÊN CÔNG ĐOẠN']}</div>
                                                                                <div className="text-xs text-gray-500">{item['MÃ CÔNG ĐOẠN']}</div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 text-sm text-gray-700">
                                                                            <div className="max-w-xs">
                                                                                <div className="truncate" title={Array.isArray(item['NHÂN SỰ']) ? item['NHÂN SỰ'].join(', ') : item['NHÂN SỰ']}>
                                                                                    {Array.isArray(item['NHÂN SỰ']) ? item['NHÂN SỰ'].join(', ') : item['NHÂN SỰ']}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                                                <Users className="w-3 h-3 mr-1" />
                                                                                {item['SỐ LƯỢNG NHÂN SỰ']}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                                            {parseFloat(item['ĐƠN GIÁ NĂNG SUẤT']).toLocaleString('vi-VN')}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                                            {parseFloat(item['ĐƠN GIÁ PHỤ CẤP TN/THÁNG']).toLocaleString('vi-VN')}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                            <div>
                                                                                <div>{new Date(item['HIỆU LỰC TỪ']).toLocaleDateString('vi-VN')}</div>
                                                                                {item['HIỆU LỰC ĐẾN'] && new Date(item['HIỆU LỰC ĐẾN']).toLocaleDateString('vi-VN') !== '1970-01-01' ? (
                                                                                    <div className="text-xs text-gray-500">đến {new Date(item['HIỆU LỰC ĐẾN']).toLocaleDateString('vi-VN')}</div>
                                                                                ) : (
                                                                                    <div className="text-xs text-gray-500">—</div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                                                            <div className="flex justify-center space-x-2">
                                                                                <button
                                                                                    onClick={() => handleOpenModal(item)}
                                                                                    className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-full hover:bg-indigo-50"
                                                                                    title="Sửa phân bổ"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleOpenDeleteConfirmation(item)}
                                                                                    className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                                                                                    title="Xóa phân bổ"
                                                                                >
                                                                                    <Trash className="h-4 w-4" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white rounded-lg border">
                                <div className="text-gray-500 text-lg mb-2">Không tìm thấy dữ liệu</div>
                                <div className="text-sm text-gray-400">Không có phân bổ nhân sự nào phù hợp với tiêu chí tìm kiếm</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal - giữ nguyên toàn bộ modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditMode ? 'Cập nhật phân bổ nhân sự' : 'Thêm phân bổ nhân sự mới'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ngày cài đặt <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formatDateForInput(currentPhanBoNhanSu['NGÀY CÀI ĐẶT'])}
                                        onChange={(e) => handleInputChange('NGÀY CÀI ĐẶT', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hiệu lực từ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateForInput(currentPhanBoNhanSu['HIỆU LỰC TỪ'])}
                                            onChange={(e) => handleInputChange('HIỆU LỰC TỪ', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hiệu lực đến
                                        </label>
                                        <input
                                            type="date"
                                            value={formatDateForInput(currentPhanBoNhanSu['HIỆU LỰC ĐẾN'])}
                                            onChange={(e) => handleInputChange('HIỆU LỰC ĐẾN', e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tổ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={currentPhanBoNhanSu['TỔ']}
                                        onChange={(e) => handleToChange(e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập tên tổ"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tên công đoạn <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={currentPhanBoNhanSu['TÊN CÔNG ĐOẠN']}
                                        onChange={(e) => handleCongDoanChange(e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    >
                                        <option value="">Chọn công đoạn</option>
                                        {congDoanDonGias.map(cd => (
                                            <option key={cd['MÃ CÔNG ĐOẠN']} value={cd['TÊN CÔNG ĐOẠN']}>
                                                {cd['TÊN CÔNG ĐOẠN']}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ID Tổ Công Đoạn (tự tạo)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentPhanBoNhanSu['ID TỔ CÔNG ĐOẠN']}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nhóm (từ công đoạn)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentPhanBoNhanSu['NHÓM']}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                        readOnly
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mã công đoạn
                                        </label>
                                        <input
                                            type="text"
                                            value={currentPhanBoNhanSu['MÃ CÔNG ĐOẠN']}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                            readOnly
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đơn giá năng suất
                                        </label>
                                        <input
                                            type="text"
                                            value={currentPhanBoNhanSu['ĐƠN GIÁ NĂNG SUẤT'] ? parseFloat(currentPhanBoNhanSu['ĐƠN GIÁ NĂNG SUẤT']).toLocaleString('vi-VN') : ''}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Đơn vị tính
                                        </label>
                                        <input
                                            type="text"
                                            value={currentPhanBoNhanSu['ĐƠN VỊ TÍNH']}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                            readOnly
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            PP tính năng suất
                                        </label>
                                        <input
                                            type="text"
                                            value={currentPhanBoNhanSu['PP TÍNH NĂNG SUẤT']}
                                            className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100"
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Nhân sự selection */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Đơn giá phụ cấp TN/Tháng <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={currentPhanBoNhanSu['ĐƠN GIÁ PHỤ CẤP TN/THÁNG']}
                                        onChange={(e) => handleInputChange('ĐƠN GIÁ PHỤ CẤP TN/THÁNG', e.target.value)}
                                        className="p-2.5 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Nhập đơn giá phụ cấp"
                                        min="0"
                                        step="1000"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Số lượng nhân sự (tự động đếm)
                                    </label>
                                    <div className="p-2.5 border border-gray-300 rounded-lg w-full bg-gray-100 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-gray-500" />
                                        <span className="font-semibold text-lg">{currentPhanBoNhanSu['SỐ LƯỢNG NHÂN SỰ']}</span>
                                        <span className="text-gray-500">người</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Chọn nhân sự <span className="text-red-500">*</span>
                                    </label>

                                    {/* Search input */}
                                    <div className="relative mb-2">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm nhân viên..."
                                            value={searchNhanSu}
                                            onChange={(e) => setSearchNhanSu(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    {/* Scrollable list */}
                                    <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto">
                                        <div className="space-y-2">
                                            {filteredNhanVien.length > 0 ? (
                                                filteredNhanVien.map(nv => (
                                                    <div key={nv['Họ và Tên']} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                        <span className="text-sm">{nv['Họ và Tên']}</span>
                                                        {selectedNhanSu.includes(nv['Họ và Tên']) ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeNhanSu(nv['Họ và Tên'])}
                                                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                                                title="Xóa khỏi danh sách"
                                                            >
                                                                <UserMinus className="w-5 h-5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => addNhanSu(nv['Họ và Tên'])}
                                                                className="text-green-600 hover:text-green-800 p-1 rounded-full hover:bg-green-50"
                                                                title="Thêm vào danh sách"
                                                            >
                                                                <UserPlus className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-4 text-gray-500">
                                                    {searchNhanSu ? 'Không tìm thấy nhân viên nào' : 'Không có nhân viên'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick actions */}
                                    {searchNhanSu && filteredNhanVien.length > 0 && (
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    // Thêm tất cả nhân viên được tìm thấy
                                                    const newList = [...new Set([...selectedNhanSu, ...filteredNhanVien.map(nv => nv['Họ và Tên'])])];
                                                    handleNhanSuChange(newList);
                                                }}
                                                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                                            >
                                                Thêm tất cả ({filteredNhanVien.filter(nv => !selectedNhanSu.includes(nv['Họ và Tên'])).length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSearchNhanSu('')}
                                                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                                            >
                                                Xóa tìm kiếm
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Selected staff display */}
                                {selectedNhanSu.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nhân sự đã chọn ({selectedNhanSu.length})
                                        </label>
                                        <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto bg-blue-50">
                                            <div className="flex flex-wrap gap-2">
                                                {selectedNhanSu.map(ns => (
                                                    <span key={ns} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                        {ns}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeNhanSu(ns)}
                                                            className="text-blue-600 hover:text-blue-800"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                            <button
                                onClick={handleCloseModal}
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
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {isEditMode ? 'Cập nhật' : 'Thêm mới'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal - giữ nguyên */}
            {showDeleteConfirmation && itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-5">
                            <h2 className="text-xl font-bold text-gray-800">Xác nhận xóa</h2>
                            <button
                                onClick={handleCloseDeleteConfirmation}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                                <p className="text-red-700">
                                    Bạn có chắc chắn muốn xóa phân bổ nhân sự này?
                                </p>
                                <div className="mt-3 text-sm text-red-600">
                                    <p><strong>ID:</strong> {itemToDelete['ID TỔ CÔNG ĐOẠN']}</p>
                                    <p><strong>Nhóm:</strong> {itemToDelete['NHÓM']}</p>
                                    <p><strong>Tổ:</strong> {itemToDelete['TỔ']}</p>
                                    <p><strong>Công đoạn:</strong> {itemToDelete['TÊN CÔNG ĐOẠN']}</p>
                                    <p><strong>Số nhân sự:</strong> {itemToDelete['SỐ LƯỢNG NHÂN SỰ']} người</p>
                                    <p><strong>Phụ cấp:</strong> {parseFloat(itemToDelete['ĐƠN GIÁ PHỤ CẤP TN/THÁNG']).toLocaleString('vi-VN')} VNĐ</p>
                                </div>
                                <p className="text-sm text-red-600 mt-2">
                                    Hành động này không thể hoàn tác.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleCloseDeleteConfirmation}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa phân bổ
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

export default PhanBoNhanSuManagement;