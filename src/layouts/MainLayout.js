import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    UtensilsCrossed,
    Table,
    Receipt,
    User,
    FileBox,
    Gauge, ChartArea,
    LayoutList,
    Wallet,
    ChevronLeft,
    ChartPie,
    NotebookPen,
    LogOut,
    Menu as MenuIcon,
    X,
    Package,
    TrendingUp,
    Settings,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import authUtils from '../utils/authUtils';

const isMobileDevice = () => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const MainLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize sidebar state based on screen size - open by default on desktop, closed on mobile
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobileDevice());
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(isMobileDevice());
    const [isCollapsed, setIsCollapsed] = useState(false); // Thêm state cho collapsed
    
    // State để quản lý việc mở/đóng các nhóm menu - MẶC ĐỊNH TẤT CẢ ĐÓNG
    const [expandedGroups, setExpandedGroups] = useState({
        warehouse: false,
        productivity: false,
        other: false
    });

    // State để lưu các nút chức năng đặc biệt từ trang con
    const [pageActions, setPageActions] = useState([]);

    const userData = authUtils.getUserData();

    // Add resize listener
    useEffect(() => {
        const handleResize = () => {
            const mobile = isMobileDevice();
            setIsMobile(mobile);

            // Automatically close sidebar on mobile when resizing
            if (mobile && isSidebarOpen) {
                setIsSidebarOpen(false);
                setIsCollapsed(false);
            } else if (!mobile && !isSidebarOpen) {
                setIsSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isSidebarOpen]);

    // Tự động mở nhóm chứa trang hiện tại (chỉ khi không collapsed)
    useEffect(() => {
        if (!isCollapsed) {
            const currentPath = location.pathname;
            
            // Tìm nhóm chứa trang hiện tại và mở nó
            menuGroups.forEach(group => {
                const hasActivePage = group.items.some(item => item.path === currentPath);
                if (hasActivePage) {
                    setExpandedGroups(prev => ({
                        ...prev,
                        [group.id]: true
                    }));
                }
            });
        }
    }, [location.pathname, isCollapsed]);

    // Tạo phương thức để các trang con có thể đăng ký nút
    useEffect(() => {
        window.registerPageActions = (actions) => {
            setPageActions(actions);
        };

        window.clearPageActions = () => {
            setPageActions([]);
        };

        return () => {
            delete window.registerPageActions;
            delete window.clearPageActions;
        };
    }, []);

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isProfileMenuOpen && !event.target.closest('.profile-menu-container')) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileMenuOpen]);

    // Nhóm menu items theo categories
    const menuGroups = [
        {
            id: 'home',
            title: 'Trang chủ',
            icon: LayoutDashboard,
            color: 'text-gray-600',
            items: [
                { text: 'Trang chủ', icon: LayoutDashboard, path: '/home' }
            ],
            alwaysExpanded: true
        },
        {
            id: 'warehouse',
            title: 'Quản lý kho',
            icon: Package,
            color: 'text-blue-600',
            items: [
                { text: 'Quản lý hàng hóa', icon: FileBox, path: '/dmhh' },
                { text: 'Quản lý xuất nhập kho', icon: Table, path: '/xuatnhapkho' },
                { text: 'Báo cáo kho', icon: ChartArea, path: '/tonkho' }
            ]
        },
        {
            id: 'productivity',
            title: 'Quản lý năng suất',
            icon: TrendingUp,
            color: 'text-green-600',
            items: [
                { text: 'Công đoạn - Đơn giá', icon: LayoutList, path: '/congdoan_dongia' },
                { text: 'Phân bố nhân sự', icon: LayoutList, path: '/phanbonhansu' },
                { text: 'Nhập bao bì', icon: NotebookPen, path: '/nhapbaobi' },
                { text: 'Tổng hợp năng suất', icon: NotebookPen, path: '/report' }
            ]
        },
        {
            id: 'other',
            title: 'Chức năng khác',
            icon: Settings,
            color: 'text-gray-600',
            items: [
                { text: 'Tổng quan', icon: Gauge, path: '/dashboard' },
                { text: 'Báo cáo sản xuất', icon: ChartPie, path: '/baocaoreport' },
                { text: 'Quản lý người dùng', icon: User, path: '/users' }
            ]
        }
    ];

    const handleLogout = () => {
        authUtils.logout();
        navigate('/');
    };

    const toggleSidebar = () => {
        if (isMobile) {
            setIsSidebarOpen(!isSidebarOpen);
        } else {
            // Desktop: toggle collapsed state
            if (isSidebarOpen) {
                setIsCollapsed(!isCollapsed);
            } else {
                setIsSidebarOpen(true);
                setIsCollapsed(false);
            }
        }
    };

    const toggleGroup = (groupId) => {
        if (!isCollapsed) {
            setExpandedGroups(prev => ({
                ...prev,
                [groupId]: !prev[groupId]
            }));
        }
    };

    const userInitial = userData?.username?.[0]?.toUpperCase() || '?';
    const sidebarWidth = isCollapsed ? '4rem' : '18rem';

    const Sidebar = () => (
        <div className="flex flex-col h-full bg-white">
            {/* Logo & Brand */}
            <div className={`flex items-center px-4 py-4 border-b ${isCollapsed ? 'justify-center px-2' : 'gap-2'}`}>
                <img src="/logo1.png" alt="Logo" className={`h-8 ${isCollapsed ? 'mx-auto' : ''}`} />
                {!isCollapsed && (
                    <h1 className="text-xl font-semibold text-gray-800">
                        Hoàng Nguyên Long
                    </h1>
                )}
            </div>

            {/* User Info */}
            <div className={`px-1 py-4 border-b ${isCollapsed ? 'px-2' : ''}`}>
                <div
                    className={`flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg ${isCollapsed ? 'justify-center space-x-0' : ''}`}
                    onClick={() => {
                        navigate('/profile');
                        isMobile && setIsSidebarOpen(false);
                    }}
                    title={isCollapsed ? (userData?.['Họ và Tên'] || userData?.username) : ''}
                >
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {userInitial}
                    </div>
                    {!isCollapsed && (
                        <div>
                            <p className="font-medium text-gray-800">
                                {userData?.['Họ và Tên'] || userData?.username}
                            </p>
                            <p className="text-sm text-gray-500">
                                {userData?.['Chức vụ'] || 'Nhân viên'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {menuGroups.map((group) => {
                    const GroupIcon = group.icon;
                    const isExpanded = expandedGroups[group.id];
                    
                    return (
                        <div key={group.id} className="mb-1">
                            {/* Group Header */}
                            {!group.alwaysExpanded && !isCollapsed ? (
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <GroupIcon className={`h-5 w-5 ${group.color}`} />
                                        <span>{group.title}</span>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400 transition-transform" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400 transition-transform" />
                                    )}
                                </button>
                            ) : null}

                            {/* Group Items */}
                            {((isExpanded || group.alwaysExpanded) && !isCollapsed) || isCollapsed ? (
                                <div className={`space-y-1 ${!group.alwaysExpanded && !isCollapsed ? 'ml-6 mt-1' : ''} transition-all duration-200`}>
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <button
                                                key={item.text}
                                                onClick={() => {
                                                    navigate(item.path);
                                                    isMobile && setIsSidebarOpen(false);
                                                }}
                                                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'space-x-3 px-3'} py-2 rounded-lg transition-colors text-sm ${
                                                    isActive 
                                                        ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-500' 
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                                title={isCollapsed ? item.text : ''}
                                            >
                                                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-500' : 'text-gray-500'}`} />
                                                {!isCollapsed && (
                                                    <span className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                                                        {item.text}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                    );
                })}

                {/* Logout Button */}
                <div className="border-t pt-2 mt-4">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center ${isCollapsed ? 'justify-center px-3' : 'space-x-3 px-3'} py-2 rounded-lg transition-colors text-sm text-gray-600 hover:bg-gray-50`}
                        title={isCollapsed ? 'Đăng xuất' : ''}
                    >
                        <LogOut className="h-4 w-4 text-gray-500" />
                        {!isCollapsed && (
                            <span className="font-medium text-gray-700">Đăng xuất</span>
                        )}
                    </button>
                </div>
            </nav>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile Sidebar Backdrop */}
            {isSidebarOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-gray-800/50 z-40"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full transform transition-all duration-200 ease-in-out z-50 
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-lg`}
                style={{ width: isMobile ? '18rem' : sidebarWidth }}
            >
                <Sidebar />
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-200 ${isSidebarOpen ? (isMobile ? 'lg:pl-72' : `lg:pl-${isCollapsed ? '16' : '72'}`) : 'pl-0'}`}
                 style={{ paddingLeft: isSidebarOpen && !isMobile ? sidebarWidth : 0 }}>
                {/* Header */}
                <header className={`fixed top-0 right-0 left-0 z-20 transition-all duration-200`}
                        style={{ left: isSidebarOpen && !isMobile ? sidebarWidth : 0 }}>
                    <div className="h-16 bg-white border-b px-4 flex items-center justify-between shadow-sm">
                        {/* Sidebar Toggle */}
                        <div className="flex items-center space-x-2">
                            <button
                                className="text-gray-500 hover:text-gray-700"
                                onClick={toggleSidebar}
                                aria-label={isSidebarOpen ? (isCollapsed ? "Mở rộng menu" : "Thu gọn menu") : "Mở menu"}
                            >
                                {isSidebarOpen ? <ChevronLeft className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                            </button>

                            {/* Page title based on current route */}
                            <h2 className="text-lg font-medium hidden md:block">
                                {(() => {
                                    for (const group of menuGroups) {
                                        const foundItem = group.items.find(item => item.path === location.pathname);
                                        if (foundItem) return foundItem.text;
                                    }
                                    return 'Trang chủ';
                                })()}
                            </h2>
                        </div>

                        {/* Các nút tùy chỉnh từ trang con */}
                        <div className="flex-1 flex justify-center">
                            <div className="flex items-center space-x-2 overflow-x-auto max-w-[90%] px-4">
                                {pageActions.map((action, index) => (
                                    action.component ? (
                                        <div key={index} className="flex-shrink-0">
                                            {action.component}
                                        </div>
                                    ) : (
                                        <button
                                            key={index}
                                            onClick={action.onClick}
                                            className={`${action.className || 'px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'} flex items-center space-x-1 flex-shrink-0`}
                                            title={action.title || action.text}
                                            disabled={action.disabled}
                                        >
                                            {action.icon && action.icon}
                                            <span className={isMobile && action.text ? 'hidden sx:inline' : ''}>
                                                {action.text}
                                            </span>
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="relative profile-menu-container">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-2"
                                aria-label="Menu người dùng"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                                    {userInitial}
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                                    <button
                                        onClick={() => {
                                            navigate('/profile');
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                    >
                                        <User className="h-4 w-4" />
                                        <span>Thông tin cá nhân</span>
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className={`pt-16 transition-all duration-200`}>
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;