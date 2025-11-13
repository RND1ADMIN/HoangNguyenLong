import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    TrendingUp,
    Settings,
    DollarSign,
    BarChart3,
    ClipboardList,
    Users,
    FileText,
    BookOpen,
    PackageCheck,
    Boxes,
    Receipt,
    NotebookPen,
    ChartPie,
    User,
    ShoppingCart,
    Handshake
} from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();

    const menuCategories = [
        {
            title: 'QUẢN LÝ KHO',
            icon: Package,
            gradient: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            items: [
                {
                    title: 'Cài đặt giá bán',
                    icon: DollarSign,
                    path: '/giaban',
                    gradient: 'from-blue-400 to-blue-500'
                },
                {
                    title: 'Quản lý hàng hóa',
                    icon: Boxes,
                    path: '/dmhh',
                    gradient: 'from-cyan-400 to-cyan-500'
                },
                {
                    title: 'Quản lý xuất nhập kho',
                    icon: ClipboardList,
                    path: '/xuatnhapkho',
                    gradient: 'from-blue-500 to-blue-600'
                },
                {
                    title: 'Báo cáo kho',
                    icon: BarChart3,
                    path: '/tonkho',
                    gradient: 'from-indigo-500 to-indigo-600'
                },
                {
                    title: 'Mã kiện',
                    icon: PackageCheck,
                    path: '/makien',
                    gradient: 'from-sky-500 to-sky-600'
                }
            ]
        },
        {
            title: 'QUẢN LÝ NĂNG SUẤT',
            icon: TrendingUp,
            gradient: 'from-green-500 to-emerald-600',
            bgColor: 'bg-green-50',
            borderColor: 'border-green-200',
            items: [
                {
                    title: 'Công đoạn - Đơn giá',
                    icon: Receipt,
                    path: '/congdoan_dongia',
                    gradient: 'from-green-400 to-green-500'
                },
                {
                    title: 'Phân bố nhân sự',
                    icon: Users,
                    path: '/phanbonhansu',
                    gradient: 'from-emerald-400 to-emerald-500'
                },
                {
                    title: 'Nhập bao bì',
                    icon: NotebookPen,
                    path: '/nhapbaobi',
                    gradient: 'from-teal-500 to-teal-600'
                },
                {
                    title: 'Báo cáo sản lượng',
                    icon: ChartPie,
                    path: '/report',
                    gradient: 'from-teal-500 to-teal-600'
                },
                {
                    title: 'Tổng hợp năng suất',
                    icon: ChartPie,
                    path: '/tonghop',
                    gradient: 'from-green-600 to-green-700'
                }
            ]
        },
        {
            title: 'QUẢN LÝ BÁN HÀNG',
            icon: ShoppingCart,
            gradient: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50',
            borderColor: 'border-orange-200',
            items: [
                {
                    title: 'Quản lý khách hàng',
                    icon: Users,
                    path: '/dskh',
                    gradient: 'from-orange-400 to-orange-500'
                },
                {
                    title: 'Hợp đồng nguyên tắc',
                    icon: Handshake,
                    path: '/hopdongnguyentac',
                    gradient: 'from-amber-500 to-amber-600'
                },
                {
                    title: 'Báo cáo bán hàng',
                    icon: BarChart3,
                    path: '/baocaobanhang',
                    gradient: 'from-orange-600 to-orange-700'
                }
            ]
        },
        {
            title: 'CHỨC NĂNG KHÁC',
            icon: Settings,
            gradient: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-200',
            items: [
                {
                    title: 'Quản lý người dùng',
                    icon: User,
                    path: '/users',
                    gradient: 'from-purple-500 to-purple-600'
                },
                {
                    title: 'Hướng dẫn sử dụng',
                    icon: BookOpen,
                    path: '/huongdansudung',
                    gradient: 'from-pink-500 to-pink-600'
                }
            ]
        }
    ];

    return (
        <div className="p-3 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 min-h-screen">
            <div className="mx-auto px-6 py-4 max-w-7xl">

                {/* Menu Categories */}
                {menuCategories.map((category, categoryIndex) => {
                    const CategoryIcon = category.icon;
                    return (
                        <div key={categoryIndex} className="mb-4">
                            {/* Category Header */}
                            <div className={`${category.bgColor} border ${category.borderColor} rounded-lg p-2.5 mb-2.5 shadow-sm`}>
                                <div className="flex items-center">
                                    <div className={`w-9 h-9 bg-gradient-to-br ${category.gradient} rounded-lg flex items-center justify-center mr-2.5 shadow-sm transform hover:scale-110 transition-transform duration-300`}>
                                        <CategoryIcon className="h-5 w-5 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-800">
                                            {category.title}
                                        </h2>
                                        <p className="text-xs text-gray-600">
                                            {category.items.length} chức năng
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Category Items Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 px-1">
                                {category.items.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => navigate(item.path)}
                                            className="group relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100 overflow-hidden"
                                        >
                                            {/* Gradient Background Effect */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                                            <div className="relative p-2.5">
                                                {/* Icon Container */}
                                                <div className="flex justify-center mb-1.5">
                                                    <div className={`w-10 h-10 bg-gradient-to-br ${item.gradient} rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                                                        <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                                                    </div>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-center text-xs font-semibold text-gray-800 leading-tight min-h-[28px] flex items-center justify-center px-1">
                                                    {item.title}
                                                </h3>

                                                {/* Hover Arrow Indicator */}
                                                <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Home;
