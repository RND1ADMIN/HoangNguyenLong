import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash, Search, Filter, X, Users, Info, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Phone, Mail, Building, CreditCard, User, Briefcase, Calendar, FileText, Loader, History, Package, TrendingUp, TrendingDown, DollarSign, Eye, ChevronDown, ChevronUp, Truck, ShoppingCart } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import authUtils from '../utils/authUtils';

const DSKHManagement = () => {
    // State Management
    const [customers, setCustomers] = useState([]);
    const [currentCustomer, setCurrentCustomer] = useState({
        'MA_KH': '',
        'TEN_KHACHHANG': '',
        'TEN_VIET_TAT': '',
        'MST': '',
        'DIACHI': '',
        'SO_DT': '',
        'NGAY_THANHLAP': '',
        'NGUOI_LIENHE': '',
        'NGUOI_DAIDIEN': '',
        'CHUC_VU': '',
        'SO_TAIKHOAN': '',
        'NGANHANG': '',
        'PHAN_LOAI': 'KH' // Mặc định là Khách hàng
    });
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [originalMaKH, setOriginalMaKH] = useState('');
    const [isLoadingMST, setIsLoadingMST] = useState(false);

    // Filter by PHAN_LOAI
    const [filterPhanLoai, setFilterPhanLoai] = useState('ALL'); // ALL, KH, NCC

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // History Modal states
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyCustomer, setHistoryCustomer] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [expandedPhieu, setExpandedPhieu] = useState(null);

    // Format currency
    const formatCurrency = (value) => {
        if (!value) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch (error) {
            return dateString;
        }
    };

    // Format date for input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            return '';
        }
    };

    // Generate MA_KH automatically
    const generateMaKH = (phanLoai, tenVietTat) => {
        if (!tenVietTat) return '';

        const prefix = phanLoai === 'NCC' ? 'NCC' : 'KH';
        const cleanTenVietTat = tenVietTat.toUpperCase().trim();

        console.log('🔍 Generating MA_KH for:', prefix, 'with TEN_VIET_TAT:', cleanTenVietTat);
        console.log('📊 Total customers in state:', customers.length);

        // Lọc TẤT CẢ các mã cùng PHAN_LOAI (KH hoặc NCC)
        const matchingCustomers = customers.filter(c => {
            const maKH = c['MA_KH'];
            if (!maKH) return false;
            // Chỉ cần bắt đầu bằng KH- hoặc NCC-
            return maKH.startsWith(prefix + '-');
        });

        console.log('📋 Total matching customers with prefix', prefix + ':', matchingCustomers.length);
        console.log('📋 Matching MA_KH:', matchingCustomers.map(c => c['MA_KH']));

        // Lấy TẤT CẢ các số (không quan tâm tên viết tắt)
        const existingNumbers = matchingCustomers
            .map(c => {
                const maKH = c['MA_KH'];
                // Format: KH-XXX-0001 hoặc NCC-YYY-0001
                const parts = maKH.split('-');
                if (parts.length !== 3) {
                    console.log('  ⚠️ Invalid format:', maKH);
                    return 0;
                }

                const numPart = parts[2]; // Lấy phần số cuối
                if (!/^\d+$/.test(numPart)) {
                    console.log('  ⚠️ Non-numeric part:', numPart, 'in', maKH);
                    return 0;
                }

                const num = parseInt(numPart, 10);
                console.log('  📌 Extracted number:', num, 'from', maKH);
                return num;
            })
            .filter(num => num > 0);

        console.log('🔢 Valid existing numbers:', existingNumbers);

        // Tính số tiếp theo - LẤY SỐ LỚN NHẤT + 1
        let nextNum = 1;
        if (existingNumbers.length > 0) {
            const maxNum = Math.max(...existingNumbers);
            nextNum = maxNum + 1;
            console.log('  ➡️ Max number found:', maxNum);
            console.log('  ➡️ Next number will be:', nextNum);
        } else {
            console.log('  ➡️ No existing numbers, starting from:', nextNum);
        }

        // Format: KH-D-0001, KH-DD-0002, NCC-A-0001
        const formattedNum = String(nextNum).padStart(4, '0');
        const newMaKH = `${prefix}-${cleanTenVietTat}-${formattedNum}`;

        console.log('✅ Generated MA_KH:', newMaKH);

        return newMaKH;
    };

    // Fetch company info by MST
    const fetchCompanyInfoByMST = async (mst) => {
        if (!mst || mst.length < 10) {
            return null;
        }

        setIsLoadingMST(true);

        try {
            const response = await fetch(`https://api.vietqr.io/v2/business/${mst}`);

            if (response.ok) {
                const data = await response.json();

                if (data.code === '00' && data.data) {
                    const companyData = data.data;

                    const generateAcronym = (name) => {
                        if (!name) return '';

                        const excludeWords = ['công', 'ty', 'tnhh', 'cổ', 'phần', 'trách', 'nhiệm', 'hữu', 'hạn', 'một', 'thành', 'viên'];

                        const words = name
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/[^a-z0-9\s]/g, '')
                            .split(' ')
                            .filter(word => word && !excludeWords.includes(word));

                        return words.map(word => word[0]).join('').toUpperCase();
                    };

                    return {
                        'TEN_KHACHHANG': companyData.name || '',
                        'TEN_VIET_TAT': companyData.shortName || generateAcronym(companyData.name),
                        'DIACHI': companyData.address || '',
                        'NGUOI_DAIDIEN': companyData.representative || '',
                        'NGAY_THANHLAP': companyData.establishDate ? formatDateForInput(companyData.establishDate) : ''
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error fetching company info:', error);
            return null;
        } finally {
            setIsLoadingMST(false);
        }
    };

    // Handle MST input change with debounce
    const handleMSTChange = async (value) => {
        handleInputChange('MST', value);

        if (value.length >= 10 && value.length <= 14) {
            toast.info('Đang tra cứu thông tin doanh nghiệp...', { autoClose: 1000 });

            const companyInfo = await fetchCompanyInfoByMST(value);

            if (companyInfo) {
                setCurrentCustomer(prev => ({
                    ...prev,
                    'MST': value,
                    'TEN_KHACHHANG': prev['TEN_KHACHHANG'] || companyInfo['TEN_KHACHHANG'],
                    'TEN_VIET_TAT': prev['TEN_VIET_TAT'] || companyInfo['TEN_VIET_TAT'],
                    'DIACHI': prev['DIACHI'] || companyInfo['DIACHI'],
                    'NGUOI_DAIDIEN': prev['NGUOI_DAIDIEN'] || companyInfo['NGUOI_DAIDIEN'],
                    'NGAY_THANHLAP': prev['NGAY_THANHLAP'] || companyInfo['NGAY_THANHLAP']
                }));

                toast.success('Đã tìm thấy thông tin doanh nghiệp!');
            } else {
                toast.warning('Không tìm thấy thông tin doanh nghiệp với MST này');
            }
        }
    };

    // Handle PHAN_LOAI change
    const handlePhanLoaiChange = (phanLoai) => {
        setCurrentCustomer(prev => {
            const newCustomer = {
                ...prev,
                'PHAN_LOAI': phanLoai
            };

            // Auto generate MA_KH if not in edit mode AND có tên viết tắt
            if (!isEditMode && prev['TEN_VIET_TAT']) {
                const newMaKH = generateMaKH(phanLoai, prev['TEN_VIET_TAT']);
                newCustomer['MA_KH'] = newMaKH;
                console.log('🔄 Generated MA_KH after PHAN_LOAI change:', newMaKH);
            }

            return newCustomer;
        });
    };

    // Handle TEN_VIET_TAT change
    const handleTenVietTatChange = (value) => {
        const upperValue = value.toUpperCase().trim();

        setCurrentCustomer(prev => {
            const newCustomer = {
                ...prev,
                'TEN_VIET_TAT': upperValue
            };

            // Auto generate MA_KH if not in edit mode
            if (!isEditMode && upperValue) {
                const newMaKH = generateMaKH(prev['PHAN_LOAI'], upperValue);
                newCustomer['MA_KH'] = newMaKH;
                console.log('✅ Auto-generated MA_KH:', newMaKH);
            } else if (!upperValue) {
                newCustomer['MA_KH'] = '';
                console.log('⚠️ Cleared MA_KH because TEN_VIET_TAT is empty');
            }

            return newCustomer;
        });
    };

    // Fetch data
    // Fetch data
    const fetchDSKH = async () => {
        try {
            setIsLoading(true);
            const response = await authUtils.apiRequestKHO('DSKH', 'Find', {});

            console.log('📥 Fetched DSKH data:', response);
            console.log('📊 Total customers loaded:', response?.length || 0);

            if (response && response.length > 0) {
                // Sắp xếp theo MA_KH để dễ debug
                const sortedData = response.sort((a, b) => {
                    const maA = a['MA_KH'] || '';
                    const maB = b['MA_KH'] || '';
                    return maA.localeCompare(maB);
                });

                console.log('📋 All MA_KH codes:', sortedData.map(c => c['MA_KH']));
                setCustomers(sortedData);
            } else {
                setCustomers([]);
            }
        } catch (error) {
            console.error('❌ Error fetching DSKH list:', error);
            toast.error('Lỗi khi tải danh sách khách hàng');
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchDSKH();
    }, []);

    // Debug: Log customers state changes
    useEffect(() => {
        console.log('🔄 Customers state updated:', customers.length);
        if (customers.length > 0) {
            console.log('📋 Current MA_KH list:', customers.map(c => c['MA_KH']).filter(Boolean));
        }
    }, [customers]);


    // Fetch customer history
    const fetchCustomerHistory = async (customerName) => {
        try {
            setIsLoadingHistory(true);

            console.log('🔍 Đang tìm lịch sử cho khách hàng:', customerName);

            const phieuResponse = await authUtils.apiRequestKHO('XUATNHAPKHO', 'Find', {});

            const customerPhieu = phieuResponse.filter(p =>
                p['NCC_KHACHHANG'] === customerName
            );

            console.log('👤 Phiếu của khách hàng:', customerPhieu);

            if (customerPhieu.length === 0) {
                setHistoryData([]);
                setIsLoadingHistory(false);
                return;
            }

            console.log('📦 Đang fetch tất cả chi tiết...');
            const allChiTiet = await authUtils.apiRequestKHO('XUATNHAPKHO_CHITIET', 'Find', {});

            console.log('✅ Tổng số chi tiết:', allChiTiet?.length);

            const phieuWithDetails = customerPhieu.map(phieu => {
                const soPhieu = phieu['SOPHIEU'];

                const chiTietOfPhieu = allChiTiet.filter(ct => ct['SOPHIEU'] === soPhieu);

                console.log(`📋 Phiếu ${soPhieu}: ${chiTietOfPhieu.length} chi tiết`);

                const soKien = chiTietOfPhieu.length;
                const tongKL = chiTietOfPhieu.reduce((sum, ct) => {
                    return sum + parseFloat(ct['SO_KHOI'] || 0);
                }, 0);
                const tongTien = parseFloat(phieu['TONGTIEN'] || 0);

                return {
                    ...phieu,
                    chiTiet: chiTietOfPhieu,
                    soKien: soKien,
                    tongKL: tongKL,
                    tongTien: tongTien
                };
            });

            console.log('✅ Kết quả cuối cùng:', phieuWithDetails);

            phieuWithDetails.sort((a, b) =>
                new Date(b['NGAYNHAP_XUAT']) - new Date(a['NGAYNHAP_XUAT'])
            );

            setHistoryData(phieuWithDetails);

            const nhapStats = phieuWithDetails.filter(p => p['NGHIEP_VU'] === 'NHAP');
            const xuatStats = phieuWithDetails.filter(p => p['NGHIEP_VU'] === 'XUAT');

            const tongNhap = nhapStats.reduce((sum, p) => sum + p.tongKL, 0);
            const tongXuat = xuatStats.reduce((sum, p) => sum + p.tongKL, 0);
            const tongDoanhThu = xuatStats.reduce((sum, p) => sum + p.tongTien, 0);

            console.log('📊 Thống kê:', {
                soPhieuNhap: nhapStats.length,
                soPhieuXuat: xuatStats.length,
                tongNhap: tongNhap.toFixed(4) + ' m³',
                tongXuat: tongXuat.toFixed(4) + ' m³',
                ton: (tongNhap - tongXuat).toFixed(4) + ' m³',
                doanhThu: tongDoanhThu.toLocaleString('vi-VN') + ' ₫'
            });

        } catch (error) {
            console.error('❌ Error fetching customer history:', error);
            toast.error('Lỗi khi tải lịch sử giao dịch');
            setHistoryData([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Open history modal
    const handleOpenHistoryModal = async (customer) => {
        setHistoryCustomer(customer);
        setShowHistoryModal(true);
        setExpandedPhieu(null);
        await fetchCustomerHistory(customer['TEN_KHACHHANG']);
    };

    // Close history modal
    const handleCloseHistoryModal = () => {
        setShowHistoryModal(false);
        setHistoryCustomer(null);
        setHistoryData([]);
        setExpandedPhieu(null);
    };

    // Toggle phiếu expansion
    const togglePhieuExpansion = (sophieu) => {
        setExpandedPhieu(expandedPhieu === sophieu ? null : sophieu);
    };

    // Calculate statistics from history
    const calculateStatistics = () => {
        const nhapPhieu = historyData.filter(p => p['NGHIEP_VU'] === 'NHAP');
        const xuatPhieu = historyData.filter(p => p['NGHIEP_VU'] === 'XUAT');

        const tongNhapKien = nhapPhieu.reduce((sum, p) => sum + p.soKien, 0);
        const tongNhapKL = nhapPhieu.reduce((sum, p) => sum + p.tongKL, 0);

        const tongXuatKien = xuatPhieu.reduce((sum, p) => sum + p.soKien, 0);
        const tongXuatKL = xuatPhieu.reduce((sum, p) => sum + p.tongKL, 0);

        const tongDoanhThu = xuatPhieu.reduce((sum, p) => sum + p.tongTien, 0);

        return {
            nhap: {
                soPhieu: nhapPhieu.length,
                soKien: tongNhapKien,
                khoiLuong: tongNhapKL
            },
            xuat: {
                soPhieu: xuatPhieu.length,
                soKien: tongXuatKien,
                khoiLuong: tongXuatKL
            },
            ton: {
                soKien: tongNhapKien - tongXuatKien,
                khoiLuong: tongNhapKL - tongXuatKL
            },
            doanhThu: tongDoanhThu
        };
    };

    // Modal handlers
    const handleOpenModal = (customer = null) => {
        if (customer) {
            // Edit mode
            setIsEditMode(true);
            setOriginalMaKH(customer['MA_KH']);
            setCurrentCustomer({
                'MA_KH': customer['MA_KH'] || '',
                'TEN_KHACHHANG': customer['TEN_KHACHHANG'] || '',
                'TEN_VIET_TAT': customer['TEN_VIET_TAT'] || '',
                'MST': customer['MST'] || '',
                'DIACHI': customer['DIACHI'] || '',
                'SO_DT': customer['SO_DT'] || '',
                'NGAY_THANHLAP': customer['NGAY_THANHLAP'] || '',
                'NGUOI_LIENHE': customer['NGUOI_LIENHE'] || '',
                'NGUOI_DAIDIEN': customer['NGUOI_DAIDIEN'] || '',
                'CHUC_VU': customer['CHUC_VU'] || '',
                'SO_TAIKHOAN': customer['SO_TAIKHOAN'] || '',
                'NGANHANG': customer['NGANHANG'] || '',
                'PHAN_LOAI': customer['PHAN_LOAI'] || 'KH'
            });
        } else {
            // Add mode
            console.log('➕ Opening Add Modal');
            console.log('📊 Current customers count:', customers.length);

            setIsEditMode(false);
            setOriginalMaKH('');
            setCurrentCustomer({
                'MA_KH': '',
                'TEN_KHACHHANG': '',
                'TEN_VIET_TAT': '',
                'MST': '',
                'DIACHI': '',
                'SO_DT': '',
                'NGAY_THANHLAP': '',
                'NGUOI_LIENHE': '',
                'NGUOI_DAIDIEN': '',
                'CHUC_VU': '',
                'SO_TAIKHOAN': '',
                'NGANHANG': '',
                'PHAN_LOAI': 'KH'
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setIsEditMode(false);
        setOriginalMaKH('');
        setCurrentCustomer({
            'MA_KH': '',
            'TEN_KHACHHANG': '',
            'TEN_VIET_TAT': '',
            'MST': '',
            'DIACHI': '',
            'SO_DT': '',
            'NGAY_THANHLAP': '',
            'NGUOI_LIENHE': '',
            'NGUOI_DAIDIEN': '',
            'CHUC_VU': '',
            'SO_TAIKHOAN': '',
            'NGANHANG': '',
            'PHAN_LOAI': 'KH'
        });
    };

    // Form handlers
    const handleInputChange = (field, value) => {
        setCurrentCustomer(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateCustomer = (customer) => {
        const errors = [];

        if (!customer['MA_KH']) {
            errors.push('Mã khách hàng không được để trống');
        }

        if (!customer['TEN_KHACHHANG']) {
            errors.push('Tên khách hàng không được để trống');
        }

        if (!customer['TEN_VIET_TAT']) {
            errors.push('Tên viết tắt không được để trống');
        }

        if (!customer['PHAN_LOAI']) {
            errors.push('Phân loại không được để trống');
        }

        return errors;
    };

    // Save customer
    const handleSaveCustomer = async () => {
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const errors = validateCustomer(currentCustomer);
            if (errors.length > 0) {
                toast.error(errors.join('\n'));
                setIsSubmitting(false);
                return;
            }

            const customerToSave = { ...currentCustomer };

            if (isEditMode) {
                if (originalMaKH !== customerToSave['MA_KH']) {
                    const existingCustomer = customers.find(
                        c => c['MA_KH'] === customerToSave['MA_KH']
                    );

                    if (existingCustomer) {
                        toast.error('Mã khách hàng mới này đã tồn tại!');
                        setIsSubmitting(false);
                        return;
                    }

                    await authUtils.apiRequestKHO('DSKH', 'Delete', {
                        "Rows": [{ "MA_KH": originalMaKH }]
                    });

                    await authUtils.apiRequestKHO('DSKH', 'Add', {
                        "Rows": [customerToSave]
                    });
                    toast.success('Cập nhật khách hàng thành công!');
                } else {
                    await authUtils.apiRequestKHO('DSKH', 'Edit', {
                        "Rows": [customerToSave]
                    });
                    toast.success('Cập nhật khách hàng thành công!');
                }
            } else {
                const existingCustomer = customers.find(
                    c => c['MA_KH'] === customerToSave['MA_KH']
                );

                if (existingCustomer) {
                    toast.error('Mã khách hàng này đã tồn tại!');
                    setIsSubmitting(false);
                    return;
                }

                await authUtils.apiRequestKHO('DSKH', 'Add', {
                    "Rows": [customerToSave]
                });
                toast.success('Thêm khách hàng mới thành công!');
            }

            await fetchDSKH();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving DSKH:', error);
            toast.error('Có lỗi xảy ra: ' + (error.message || 'Không thể lưu khách hàng'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete handlers
    const handleOpenDeleteConfirmation = (customer) => {
        setCustomerToDelete(customer);
        setShowDeleteConfirmation(true);
    };

    const handleCloseDeleteConfirmation = () => {
        setShowDeleteConfirmation(false);
        setCustomerToDelete(null);
    };

    const handleDeleteCustomer = async () => {
        if (!customerToDelete) return;

        try {
            await authUtils.apiRequestKHO('DSKH', 'Delete', {
                "Rows": [{ "MA_KH": customerToDelete['MA_KH'] }]
            });
            toast.success('Xóa khách hàng thành công!');
            await fetchDSKH();
            handleCloseDeleteConfirmation();
        } catch (error) {
            console.error('Error deleting DSKH:', error);
            toast.error('Có lỗi xảy ra khi xóa khách hàng');
        }
    };

    // Sorting
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortedCustomers = useCallback(() => {
        const sortableCustomers = [...customers];
        if (sortConfig.key) {
            sortableCustomers.sort((a, b) => {
                const keyA = a[sortConfig.key] || '';
                const keyB = b[sortConfig.key] || '';

                if (keyA < keyB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (keyA > keyB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableCustomers;
    }, [customers, sortConfig]);

    // Filtering
    const filteredCustomers = getSortedCustomers().filter(customer => {
        const searchLower = search.toLowerCase();
        const matchSearch = (
            customer['MA_KH']?.toLowerCase().includes(searchLower) ||
            customer['TEN_KHACHHANG']?.toLowerCase().includes(searchLower) ||
            customer['TEN_VIET_TAT']?.toLowerCase().includes(searchLower) ||
            customer['MST']?.toLowerCase().includes(searchLower) ||
            customer['DIACHI']?.toLowerCase().includes(searchLower) ||
            customer['SO_DT']?.includes(search) ||
            customer['NGUOI_LIENHE']?.toLowerCase().includes(searchLower) ||
            customer['NGUOI_DAIDIEN']?.toLowerCase().includes(searchLower)
        );

        const matchPhanLoai = filterPhanLoai === 'ALL' || customer['PHAN_LOAI'] === filterPhanLoai;

        return matchSearch && matchPhanLoai;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage, filterPhanLoai]);

    // Pagination handlers
    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToPrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToPage = (page) => setCurrentPage(page);

    // Get page numbers to display
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;

        if (totalPages <= maxPagesToShow) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    // Get sort direction icon
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <span className="text-gray-400 ml-1">⇅</span>;
        }
        return sortConfig.direction === 'ascending' ?
            <span className="text-blue-600 ml-1">↑</span> :
            <span className="text-blue-600 ml-1">↓</span>;
    };

    // Refresh data
    const handleRefresh = async () => {
        toast.info('Đang tải lại dữ liệu...');
        await fetchDSKH();
        toast.success('Đã tải lại dữ liệu thành công!');
    };

    // Get badge for PHAN_LOAI
    const getPhanLoaiBadge = (phanLoai) => {
        if (phanLoai === 'NCC') {
            return (
                <span className="px-2 py-1 bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 rounded text-xs font-semibold flex items-center gap-1 w-fit">
                    <Truck className="w-3 h-3" />
                    NCC
                </span>
            );
        } else {
            return (
                <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded text-xs font-semibold flex items-center gap-1 w-fit">
                    <ShoppingCart className="w-3 h-3" />
                    KH
                </span>
            );
        }
    };

    // Calculate statistics by PHAN_LOAI
    const calculatePhanLoaiStats = () => {
        const nccCount = customers.filter(c => c['PHAN_LOAI'] === 'NCC').length;
        const khCount = customers.filter(c => c['PHAN_LOAI'] === 'KH').length;
        return { nccCount, khCount };
    };

    const { nccCount, khCount } = calculatePhanLoaiStats();

    return (
        <div className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            <div className="mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-4 md:p-5 mb-4 border border-gray-100">
                    {/* Header Section */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Danh Sách Khách Hàng & NCC</h1>
                                <p className="text-xs md:text-sm text-gray-500 mt-0.5">Quản lý thông tin khách hàng và nhà cung cấp</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleRefresh}
                                className="px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2 transition-all shadow-sm hover:shadow text-sm"
                                title="Tải lại dữ liệu"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm hover:shadow text-sm ${showFilters
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? "Ẩn tìm kiếm" : "Tìm kiếm"}
                            </button>
                            <button
                                onClick={() => handleOpenModal()}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm mới
                            </button>
                        </div>
                    </div>

                    {/* Search Section */}
                    {showFilters && (
                        <div className="mb-4 animate-fadeIn space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo mã KH, tên, tên viết tắt, MST, địa chỉ, SĐT..."
                                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {/* Filter by PHAN_LOAI */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-700">Lọc theo:</span>
                                <button
                                    onClick={() => setFilterPhanLoai('ALL')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterPhanLoai === 'ALL'
                                        ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Tất cả ({customers.length})
                                </button>
                                <button
                                    onClick={() => setFilterPhanLoai('KH')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${filterPhanLoai === 'KH'
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                        }`}
                                >
                                    <ShoppingCart className="w-3 h-3" />
                                    Khách hàng ({khCount})
                                </button>
                                <button
                                    onClick={() => setFilterPhanLoai('NCC')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${filterPhanLoai === 'NCC'
                                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-md'
                                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        }`}
                                >
                                    <Truck className="w-3 h-3" />
                                    Nhà cung cấp ({nccCount})
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Statistics cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-blue-700 mb-1">Tổng số</h3>
                                    <p className="text-2xl font-bold text-blue-900">{customers.length}</p>
                                </div>
                                <div className="p-2 bg-blue-200 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-cyan-700 mb-1">Khách hàng</h3>
                                    <p className="text-2xl font-bold text-cyan-900">{khCount}</p>
                                </div>
                                <div className="p-2 bg-cyan-200 rounded-lg">
                                    <ShoppingCart className="w-5 h-5 text-cyan-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-orange-700 mb-1">Nhà cung cấp</h3>
                                    <p className="text-2xl font-bold text-orange-900">{nccCount}</p>
                                </div>
                                <div className="p-2 bg-orange-200 rounded-lg">
                                    <Truck className="w-5 h-5 text-orange-700" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xs font-medium text-green-700 mb-1">Có MST</h3>
                                    <p className="text-2xl font-bold text-green-900">
                                        {customers.filter(c => c['MST']).length}
                                    </p>
                                </div>
                                <div className="p-2 bg-green-200 rounded-lg">
                                    <Building className="w-5 h-5 text-green-700" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items per page selector */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 font-medium">Hiển thị:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-xs text-gray-600">
                            <span className="font-semibold text-gray-800">{indexOfFirstItem + 1}</span> - <span className="font-semibold text-gray-800">{Math.min(indexOfLastItem, filteredCustomers.length)}</span> / <span className="font-semibold text-gray-800">{filteredCustomers.length}</span>
                        </div>
                    </div>

                    {/* Table Section - Desktop */}
                    <div className="hidden lg:block overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('PHAN_LOAI')}>
                                            <div className="flex items-center gap-1">Phân loại {getSortIcon('PHAN_LOAI')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('MA_KH')}>
                                            <div className="flex items-center gap-1">Mã {getSortIcon('MA_KH')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TEN_KHACHHANG')}>
                                            <div className="flex items-center gap-1">Tên {getSortIcon('TEN_KHACHHANG')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('TEN_VIET_TAT')}>
                                            <div className="flex items-center gap-1">Tên viết tắt {getSortIcon('TEN_VIET_TAT')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => requestSort('MST')}>
                                            <div className="flex items-center gap-1">MST {getSortIcon('MST')}</div>
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Địa chỉ</th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SĐT</th>
                                        <th scope="col" className="px-3 py-2 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((customer, index) => (
                                            <tr key={customer['MA_KH']} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    {getPhanLoaiBadge(customer['PHAN_LOAI'])}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap">
                                                    <span className="px-2 py-1 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                                                        {customer['MA_KH']}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                                                    {customer['TEN_KHACHHANG']}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['TEN_VIET_TAT'] ? (
                                                        <span className="px-2 py-1 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 rounded text-xs font-semibold">
                                                            {customer['TEN_VIET_TAT']}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['MST'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                                                    {customer['DIACHI'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                                                    {customer['SO_DT'] || '—'}
                                                </td>
                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-center">
                                                    <div className="flex justify-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenHistoryModal(customer)}
                                                            className="text-purple-600 hover:text-purple-900 p-1.5 rounded-lg hover:bg-purple-100 transition-all transform hover:scale-110"
                                                            title="Xem lịch sử"
                                                        >
                                                            <History className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenModal(customer)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all transform hover:scale-110"
                                                            title="Sửa"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenDeleteConfirmation(customer)}
                                                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 transition-all transform hover:scale-110"
                                                            title="Xóa"
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Users className="w-16 h-16 text-gray-300 mb-4" />
                                                    <p className="text-lg font-medium">Không tìm thấy dữ liệu nào</p>
                                                    <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Card View - Mobile */}
                    <div className="lg:hidden space-y-3">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="text-center">
                                    <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        ) : currentItems.length > 0 ? (
                            currentItems.map((customer) => (
                                <div key={customer['MA_KH']} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {getPhanLoaiBadge(customer['PHAN_LOAI'])}
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 rounded text-xs font-semibold">
                                                    {customer['MA_KH']}
                                                </span>
                                                {customer['TEN_VIET_TAT'] && (
                                                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 rounded text-xs font-semibold">
                                                        {customer['TEN_VIET_TAT']}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-semibold text-gray-900 text-sm">{customer['TEN_KHACHHANG']}</h3>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleOpenHistoryModal(customer)}
                                                className="text-purple-600 hover:text-purple-900 p-1.5 rounded-lg hover:bg-purple-100 transition-all"
                                            >
                                                <History className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenModal(customer)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1.5 rounded-lg hover:bg-indigo-100 transition-all"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleOpenDeleteConfirmation(customer)}
                                                className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-100 transition-all"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-xs text-gray-600">
                                        {customer['MST'] && (
                                            <div className="flex items-center gap-2">
                                                <Building className="w-3.5 h-3.5 text-gray-400" />
                                                <span>MST: {customer['MST']}</span>
                                            </div>
                                        )}
                                        {customer['SO_DT'] && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{customer['SO_DT']}</span>
                                            </div>
                                        )}
                                        {customer['DIACHI'] && (
                                            <div className="flex items-start gap-2">
                                                <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="flex-1">{customer['DIACHI']}</span>
                                            </div>
                                        )}
                                        {customer['NGUOI_LIENHE'] && (
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span>Liên hệ: {customer['NGUOI_LIENHE']}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-gray-500 py-12">
                                <Users className="w-16 h-16 text-gray-300 mb-4" />
                                <p className="text-base font-medium">Không tìm thấy dữ liệu nào</p>
                                <p className="text-sm mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredCustomers.length > 0 && (
                        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-xs text-gray-600">
                                Trang <span className="font-semibold text-gray-800">{currentPage}</span> / <span className="font-semibold text-gray-800">{totalPages}</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button onClick={goToFirstPage} disabled={currentPage === 1} className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>

                                <button onClick={goToPrevPage} disabled={currentPage === 1} className={`p-1.5 rounded-lg border transition-all ${currentPage === 1 ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="hidden sm:flex items-center gap-1">
                                    {getPageNumbers().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-500 text-xs">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`min-w-[32px] px-2 py-1 rounded-lg border font-medium transition-all text-xs ${currentPage === page
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                </div>

                                <button onClick={goToNextPage} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    <ChevronRight className="w-4 h-4" />
                                </button>

                                <button onClick={goToLastPage} disabled={currentPage === totalPages} className={`p-1.5 rounded-lg border transition-all ${currentPage === totalPages ? 'border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* History Modal - GIỮ NGUYÊN CODE CŨ */}
            {showHistoryModal && historyCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-fadeIn">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
                            <div>
                                <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <div className="p-2 bg-purple-500 rounded-lg">
                                        <History className="w-5 h-5 text-white" />
                                    </div>
                                    Lịch sử giao dịch
                                </h2>
                                <p className="text-sm text-gray-600 mt-1 ml-11">
                                    {historyCustomer['TEN_KHACHHANG']}
                                    {historyCustomer['TEN_VIET_TAT'] && (
                                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">
                                            {historyCustomer['TEN_VIET_TAT']}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button onClick={handleCloseHistoryModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="text-center">
                                        <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                                        <p className="text-gray-600">Đang tải lịch sử giao dịch...</p>
                                    </div>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-gray-500 py-20">
                                    <Package className="w-16 h-16 text-gray-300 mb-4" />
                                    <p className="text-lg font-medium">Chưa có giao dịch nào</p>
                                    <p className="text-sm mt-1">Khách hàng này chưa có lịch sử nhập xuất</p>
                                </div>
                            ) : (
                                <>
                                    {/* Statistics Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                        {/* Nhập kho - Chỉ hiển thị cho NCC */}
                                        {historyCustomer['PHAN_LOAI'] === 'NCC' && (
                                            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1.5 bg-green-200 rounded-lg">
                                                        <TrendingUp className="w-4 h-4 text-green-700" />
                                                    </div>
                                                    <h3 className="text-xs font-semibold text-green-700">NHẬP KHO</h3>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-green-600">
                                                        <span className="font-bold text-lg text-green-900">{calculateStatistics().nhap.soPhieu}</span> phiếu
                                                    </p>
                                                    <p className="text-xs text-green-600">
                                                        <span className="font-semibold">{calculateStatistics().nhap.soKien}</span> kiện
                                                    </p>
                                                    <p className="text-xs text-green-600">
                                                        <span className="font-semibold">{calculateStatistics().nhap.khoiLuong.toFixed(4)}</span> m³
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Xuất kho - Chỉ hiển thị cho KH */}
                                        {historyCustomer['PHAN_LOAI'] === 'KH' && (
                                            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-3 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-1.5 bg-red-200 rounded-lg">
                                                        <TrendingDown className="w-4 h-4 text-red-700" />
                                                    </div>
                                                    <h3 className="text-xs font-semibold text-red-700">XUẤT KHO</h3>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-red-600">
                                                        <span className="font-bold text-lg text-red-900">{calculateStatistics().xuat.soPhieu}</span> phiếu
                                                    </p>
                                                    <p className="text-xs text-red-600">
                                                        <span className="font-semibold">{calculateStatistics().xuat.soKien}</span> kiện
                                                    </p>
                                                    <p className="text-xs text-red-600">
                                                        <span className="font-semibold">{calculateStatistics().xuat.khoiLuong.toFixed(4)}</span> m³
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Doanh thu/Tổng giá trị - Hiển thị cho cả KH và NCC */}
                                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="p-1.5 bg-yellow-200 rounded-lg">
                                                    <DollarSign className="w-4 h-4 text-yellow-700" />
                                                </div>
                                                <h3 className="text-xs font-semibold text-yellow-700">
                                                    {historyCustomer['PHAN_LOAI'] === 'NCC' ? 'TỔNG GIÁ TRỊ' : 'DOANH THU'}
                                                </h3>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-yellow-900">
                                                    {formatCurrency(calculateStatistics().doanhThu)}
                                                </p>
                                                <p className="text-xs text-yellow-600">
                                                    {historyCustomer['PHAN_LOAI'] === 'NCC' ? 'Tổng giá trị nhập kho' : 'Tổng giá trị xuất kho'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Phiếu List */}
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            Danh sách phiếu ({historyData.length})
                                        </h3>

                                        {historyData.map((phieu) => (
                                            <div key={phieu['SOPHIEU']} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                {/* Phiếu Header */}
                                                <div
                                                    className={`p-3 cursor-pointer ${phieu['NGHIEP_VU'] === 'NHAP'
                                                        ? 'bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-150'
                                                        : 'bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-150'
                                                        }`}
                                                    onClick={() => togglePhieuExpansion(phieu['SOPHIEU'])}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className={`px-2 py-1 rounded text-xs font-bold ${phieu['NGHIEP_VU'] === 'NHAP'
                                                                    ? 'bg-green-600 text-white'
                                                                    : 'bg-red-600 text-white'
                                                                    }`}>
                                                                    {phieu['NGHIEP_VU'] === 'NHAP' ? '📥 NHẬP' : '📤 XUẤT'}
                                                                </span>
                                                                <span className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-700 border border-gray-300">
                                                                    {phieu['SOPHIEU']}
                                                                </span>
                                                                <span className="text-xs text-gray-600">
                                                                    📅 {formatDate(phieu['NGAYNHAP_XUAT'])}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                                                                {phieu['NGHIEP_VU'] === 'NHAP' ? (
                                                                    <span className="flex items-center gap-1">
                                                                        <Building className="w-3 h-3" />
                                                                        Nhập: {phieu['KHONHAP']}
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1">
                                                                        <Building className="w-3 h-3" />
                                                                        Xuất: {phieu['KHOXUAT']}
                                                                    </span>
                                                                )}
                                                                {phieu['NGUOIPHUTRACH'] && (
                                                                    <span className="flex items-center gap-1">
                                                                        <User className="w-3 h-3" />
                                                                        {phieu['NGUOIPHUTRACH']}
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    <Package className="w-3 h-3" />
                                                                    {phieu.soKien} kiện
                                                                </span>
                                                                <span className="flex items-center gap-1 font-semibold">
                                                                    📦 {phieu.tongKL.toFixed(4)} m³
                                                                </span>
                                                                {phieu['NGHIEP_VU'] === 'XUAT' && phieu.tongTien > 0 && (
                                                                    <span className="flex items-center gap-1 font-semibold text-yellow-700">
                                                                        💰 {formatCurrency(phieu.tongTien)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {phieu['DIENGIAI'] && (
                                                                <div className="mt-1 text-xs text-gray-500 italic">
                                                                    📝 {phieu['DIENGIAI']}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            {expandedPhieu === phieu['SOPHIEU'] ? (
                                                                <ChevronUp className="w-5 h-5 text-gray-500" />
                                                            ) : (
                                                                <ChevronDown className="w-5 h-5 text-gray-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Chi tiết phiếu (Expandable) */}
                                                {expandedPhieu === phieu['SOPHIEU'] && (
                                                    <div className="p-3 bg-white border-t border-gray-200">
                                                        {phieu.chiTiet && phieu.chiTiet.length > 0 ? (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                                        <tr>
                                                                            <th className="px-2 py-2 text-left font-semibold text-gray-700">STT</th>
                                                                            <th className="px-2 py-2 text-left font-semibold text-gray-700">Mã kiện</th>
                                                                            <th className="px-2 py-2 text-left font-semibold text-gray-700">Nhóm hàng</th>
                                                                            <th className="px-2 py-2 text-center font-semibold text-gray-700">Kích thước (D×R×D)</th>
                                                                            <th className="px-2 py-2 text-center font-semibold text-gray-700">Thành</th>
                                                                            <th className="px-2 py-2 text-right font-semibold text-gray-700">Số khối (m³)</th>
                                                                            <th className="px-2 py-2 text-center font-semibold text-gray-700">Tiêu chuẩn</th>
                                                                            {phieu['NGHIEP_VU'] === 'XUAT' && (
                                                                                <>
                                                                                    <th className="px-2 py-2 text-right font-semibold text-gray-700">Đơn giá</th>
                                                                                    <th className="px-2 py-2 text-right font-semibold text-gray-700">Thành tiền</th>
                                                                                </>
                                                                            )}
                                                                            {phieu['NGHIEP_VU'] === 'NHAP' && (
                                                                                <th className="px-2 py-2 text-left font-semibold text-gray-700">Đổi hàng kho</th>
                                                                            )}
                                                                            <th className="px-2 py-2 text-left font-semibold text-gray-700">Ghi chú</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {phieu.chiTiet.map((ct, index) => (
                                                                            <tr key={index} className="hover:bg-gray-50">
                                                                                <td className="px-2 py-2 text-gray-600">{index + 1}</td>
                                                                                <td className="px-2 py-2 font-medium text-blue-700">{ct['MA_KIEN']}</td>
                                                                                <td className="px-2 py-2 text-gray-700">{ct['NHOM_HANG']}</td>
                                                                                <td className="px-2 py-2 text-center text-gray-600">
                                                                                    {ct['DAY']}×{ct['RONG']}×{ct['DAI']}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-gray-600">
                                                                                    {ct['THANH'] || '—'}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-right font-semibold text-gray-900">
                                                                                    {parseFloat(ct['SO_KHOI'] || 0).toFixed(4)}
                                                                                </td>
                                                                                <td className="px-2 py-2 text-center text-gray-600">
                                                                                    {ct['TIEU_CHUAN'] || '—'}
                                                                                </td>
                                                                                {phieu['NGHIEP_VU'] === 'XUAT' && (
                                                                                    <>
                                                                                        <td className="px-2 py-2 text-right text-gray-700">
                                                                                            {formatCurrency(ct['DONGIA'])}
                                                                                        </td>
                                                                                        <td className="px-2 py-2 text-right font-semibold text-yellow-700">
                                                                                            {formatCurrency(ct['THANHTIEN'])}
                                                                                        </td>
                                                                                    </>
                                                                                )}
                                                                                {phieu['NGHIEP_VU'] === 'NHAP' && (
                                                                                    <td className="px-2 py-2 text-gray-600">
                                                                                        {ct['DOI_HANG_KHO'] || '—'}
                                                                                    </td>
                                                                                )}
                                                                                <td className="px-2 py-2 text-gray-600">
                                                                                    {ct['GHICHU'] || '—'}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                        {/* Tổng cộng */}
                                                                        <tr className="bg-gray-100 font-bold">
                                                                            <td colSpan={phieu['NGHIEP_VU'] === 'XUAT' ? "5" : "5"} className="px-2 py-2 text-right text-gray-900">
                                                                                TỔNG CỘNG:
                                                                            </td>
                                                                            <td className="px-2 py-2 text-right text-gray-900">
                                                                                {phieu.tongKL.toFixed(4)}
                                                                            </td>
                                                                            {phieu['NGHIEP_VU'] === 'XUAT' && (
                                                                                <>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2 text-right text-yellow-700">
                                                                                        {formatCurrency(phieu.tongTien)}
                                                                                    </td>
                                                                                </>
                                                                            )}
                                                                            {phieu['NGHIEP_VU'] === 'NHAP' && (
                                                                                <>
                                                                                    <td className="px-2 py-2"></td>
                                                                                    <td className="px-2 py-2"></td>
                                                                                </>
                                                                            )}
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 text-center py-4">
                                                                Không có chi tiết
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={handleCloseHistoryModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all shadow-sm flex items-center gap-2 text-sm"
                            >
                                <X className="h-4 w-4" />
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full p-4 md:p-6 animate-fadeIn max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                {isEditMode ? 'Cập nhật thông tin' : 'Thêm mới'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Phân loại - Radio buttons */}
                            <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-indigo-500" />
                                    Phân loại <span className="text-red-500">*</span>
                                </h3>
                                <div className="flex gap-4">
                                    {/* Radio button Khách hàng */}
                                    <label className={`flex-1 cursor-pointer ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="radio"
                                            name="phanLoai"
                                            value="KH"
                                            checked={currentCustomer['PHAN_LOAI'] === 'KH'}
                                            onChange={(e) => handlePhanLoaiChange(e.target.value)}
                                            disabled={isEditMode}
                                            className="sr-only"
                                        />
                                        <div className={`border-2 rounded-lg p-4 transition-all ${currentCustomer['PHAN_LOAI'] === 'KH'
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-300 bg-white hover:border-blue-300'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-lg ${currentCustomer['PHAN_LOAI'] === 'KH'
                                                    ? 'bg-blue-500'
                                                    : 'bg-gray-300'
                                                    }`}>
                                                    <ShoppingCart className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-800 text-base">Khách hàng</h4>
                                                    <p className="text-xs text-gray-600 mt-1">Mã tự động: KH-[Tên viết tắt]-001</p>
                                                </div>
                                                {currentCustomer['PHAN_LOAI'] === 'KH' && (
                                                    <div className="flex-shrink-0">
                                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </label>

                                    {/* Radio button Nhà cung cấp */}
                                    <label className={`flex-1 cursor-pointer ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="radio"
                                            name="phanLoai"
                                            value="NCC"
                                            checked={currentCustomer['PHAN_LOAI'] === 'NCC'}
                                            onChange={(e) => handlePhanLoaiChange(e.target.value)}
                                            disabled={isEditMode}
                                            className="sr-only"
                                        />
                                        <div className={`border-2 rounded-lg p-4 transition-all ${currentCustomer['PHAN_LOAI'] === 'NCC'
                                            ? 'border-orange-500 bg-orange-50 shadow-md'
                                            : 'border-gray-300 bg-white hover:border-orange-300'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-lg ${currentCustomer['PHAN_LOAI'] === 'NCC'
                                                    ? 'bg-orange-500'
                                                    : 'bg-gray-300'
                                                    }`}>
                                                    <Truck className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-gray-800 text-base">Nhà cung cấp</h4>
                                                    <p className="text-xs text-gray-600 mt-1">Mã tự động: NCC-[Tên viết tắt]-001</p>
                                                </div>
                                                {currentCustomer['PHAN_LOAI'] === 'NCC' && (
                                                    <div className="flex-shrink-0">
                                                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                </div>
                                {isEditMode && (
                                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Không thể thay đổi phân loại khi chỉnh sửa
                                    </p>
                                )}
                            </div>

                            {/* Thông tin cơ bản */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    Thông tin cơ bản
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Tên viết tắt <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['TEN_VIET_TAT']}
                                            onChange={(e) => handleTenVietTatChange(e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm uppercase"
                                            placeholder="VD: ABC, XYZ"
                                            disabled={isEditMode}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">💡 Nhập viết tắt để tự động tạo mã</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Mã {currentCustomer['PHAN_LOAI'] === 'NCC' ? 'NCC' : 'KH'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['MA_KH']}
                                            onChange={(e) => handleInputChange('MA_KH', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm bg-gray-50"
                                            placeholder="Tự động tạo"
                                            disabled={isEditMode}
                                            readOnly={!isEditMode}
                                        />
                                        <p className="text-xs text-green-600 mt-1">✓ Mã được tạo tự động</p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Tên {currentCustomer['PHAN_LOAI'] === 'NCC' ? 'nhà cung cấp' : 'khách hàng'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['TEN_KHACHHANG']}
                                            onChange={(e) => handleInputChange('TEN_KHACHHANG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập tên đầy đủ"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                                            Mã số thuế
                                            <span className="text-xs text-blue-600 font-normal italic">(Tự động tra cứu)</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={currentCustomer['MST']}
                                                onChange={(e) => handleMSTChange(e.target.value)}
                                                className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm pr-10"
                                                placeholder="Nhập MST để tra cứu"
                                                maxLength="14"
                                            />
                                            {isLoadingMST && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                    <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">💡 Nhập MST (10-14 số) để tự động điền thông tin</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['SO_DT']}
                                            onChange={(e) => handleInputChange('SO_DT', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập SĐT"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ngày thành lập
                                        </label>
                                        <input
                                            type="date"
                                            value={currentCustomer['NGAY_THANHLAP']}
                                            onChange={(e) => handleInputChange('NGAY_THANHLAP', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Địa chỉ
                                        </label>
                                        <textarea
                                            value={currentCustomer['DIACHI']}
                                            onChange={(e) => handleInputChange('DIACHI', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập địa chỉ"
                                            rows="2"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin liên hệ */}
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4 text-purple-500" />
                                    Thông tin liên hệ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Người liên hệ
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGUOI_LIENHE']}
                                            onChange={(e) => handleInputChange('NGUOI_LIENHE', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập người liên hệ"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Người đại diện
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGUOI_DAIDIEN']}
                                            onChange={(e) => handleInputChange('NGUOI_DAIDIEN', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập người đại diện"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Chức vụ
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['CHUC_VU']}
                                            onChange={(e) => handleInputChange('CHUC_VU', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập chức vụ"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Thông tin ngân hàng */}
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-green-500" />
                                    Thông tin ngân hàng
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Số tài khoản
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['SO_TAIKHOAN']}
                                            onChange={(e) => handleInputChange('SO_TAIKHOAN', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập số TK"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                            Ngân hàng
                                        </label>
                                        <input
                                            type="text"
                                            value={currentCustomer['NGANHANG']}
                                            onChange={(e) => handleInputChange('NGANHANG', e.target.value)}
                                            className="p-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                                            placeholder="Nhập tên ngân hàng"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer with buttons */}
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm flex items-center gap-2 text-sm"
                                disabled={isSubmitting}
                            >
                                <X className="h-4 w-4" />
                                Hủy
                            </button>
                            <button
                                onClick={handleSaveCustomer}
                                disabled={isSubmitting}
                                className={`px-5 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg ${isSubmitting
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5'
                                    } flex items-center gap-2 transition-all shadow-md font-medium text-sm`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Lưu
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && customerToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <Trash className="w-4 h-4 text-red-600" />
                                </div>
                                Xác nhận xóa
                            </h2>
                            <button onClick={handleCloseDeleteConfirmation} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700 mb-2 font-medium text-sm">
                                    Bạn có chắc chắn muốn xóa {customerToDelete['PHAN_LOAI'] === 'NCC' ? 'nhà cung cấp' : 'khách hàng'} này?
                                </p>
                                <div className="bg-white rounded-lg p-3 mt-2 space-y-2 shadow-sm">
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[80px]">Phân loại:</span>
                                        {getPhanLoaiBadge(customerToDelete['PHAN_LOAI'])}
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[80px]">Mã:</span>
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">
                                            {customerToDelete['MA_KH']}
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-700 flex items-center gap-2">
                                        <span className="font-semibold min-w-[80px]">Tên:</span>
                                        <span>{customerToDelete['TEN_KHACHHANG']}</span>
                                    </p>
                                    {customerToDelete['TEN_VIET_TAT'] && (
                                        <p className="text-xs text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[80px]">Tên viết tắt:</span>
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                                                {customerToDelete['TEN_VIET_TAT']}
                                            </span>
                                        </p>
                                    )}
                                    {customerToDelete['MST'] && (
                                        <p className="text-xs text-gray-700 flex items-center gap-2">
                                            <span className="font-semibold min-w-[80px]">MST:</span>
                                            <span>{customerToDelete['MST']}</span>
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-red-600 mt-3 flex items-center gap-2 font-medium">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Hành động này không thể hoàn tác.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                                <button
                                    onClick={handleCloseDeleteConfirmation}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm text-sm"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleDeleteCustomer}
                                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 flex items-center gap-2 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
                                >
                                    <Trash className="h-4 w-4" />
                                    Xóa
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

            {/* Add CSS for animations */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }

                /* Custom scrollbar */
                .overflow-y-auto::-webkit-scrollbar {
                    width: 6px;
                }

                .overflow-y-auto::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }

                .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }

                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }

                /* Hide default radio button */
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }
            `}</style>
        </div>
    );
};

export default DSKHManagement;

