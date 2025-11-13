import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Gauge,
    Table,
    FileBox,
    LayoutList,
    NotebookPen,
    ChartArea,
    ChartPie,
    User,
    File,
    UtensilsCrossed,
    Receipt,
    Wallet,
    Package,
    TrendingUp,
    Settings
} from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();

    const menuCategories = [
        {
            title: 'Quản lý kho',
            icon: Package,
            color: 'bg-blue-500',
            items: [
                // {
                //     title: 'Cài đặt quy cách',
                //     icon: Settings,
                //     path: '/quycach',
                //     color: 'bg-blue-400'
                // },
                {
                    title: 'Cài đặt giá bán',
                    icon: Settings,
                    path: '/giaban',
                    color: 'bg-blue-400'
                },
                {
                    title: 'Quản lý hàng hóa',
                    icon: FileBox,
                    path: '/dmhh',
                    color: 'bg-blue-400'
                },
                {
                    title: 'Quản lý xuất nhập kho',
                    icon: Table,
                    path: '/xuatnhapkho',
                    color: 'bg-blue-500'
                },
                {
                    title: 'Báo cáo kho',
                    icon: ChartArea,
                    path: '/tonkho',
                    color: 'bg-blue-600'
                },
                {
                    title: 'Mã kiện',
                    icon: ChartArea,
                    path: '/makien',
                    color: 'bg-blue-600'
                }
            ]
        },
        {
            title: 'Quản lý năng suất',
            icon: TrendingUp,
            color: 'bg-green-500',
            items: [
                {
                    title: 'Công đoạn - Đơn giá',
                    icon: LayoutList,
                    path: '/congdoan_dongia',
                    color: 'bg-green-400'
                },
                {
                    title: 'Phân bố nhân sự',
                    icon: User,
                    path: '/phanbonhansu',
                    color: 'bg-green-500'
                },
                {
                    title: 'Nhập bao bì',
                    icon: NotebookPen,
                    path: '/nhapbaobi',
                    color: 'bg-green-600'
                },
                {
                    title: 'Tổng hợp năng suất',
                    icon: Receipt,
                    path: '/report',
                    color: 'bg-green-700'
                }
            ]
        },
        {
            title: 'Chức năng khác',
            icon: Settings,
            color: 'bg-gray-500',
            items: [
                // {
                //     title: 'Tổng quan',
                //     icon: Gauge,
                //     path: '/dashboard',
                //     color: 'bg-indigo-500'
                // },
                // {
                //     title: 'Báo cáo sản xuất',
                //     icon: ChartPie,
                //     path: '/baocaoreport',
                //     color: 'bg-purple-500'
                // },
                {
                    title: 'Quản lý người dùng',
                    icon: User,
                    path: '/users',
                    color: 'bg-red-500'
                },
                {
                    title: 'Quản lý khách hàng',
                    icon: User,
                    path: '/dskh',
                    color: 'bg-blue-400'
                },
                {
                    title: 'Hợp đồng nguyên tắc',
                    icon: File,
                    path: '/hopdongnguyentac',
                    color: 'bg-blue-400'
                },
                {
                    title: 'Hướng dẫn sử dụng',
                    icon: File,
                    path: '/huongdansudung',
                    color: 'bg-blue-400'
                }
            ]
        }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className=" mx-auto">
                {/* Menu Categories */}
                {menuCategories.map((category, categoryIndex) => {
                    const CategoryIcon = category.icon;
                    return (
                        <div key={categoryIndex} className="mb-8">
                            {/* Category Header */}
                            <div className="flex items-center mb-4">
                                <div className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center mr-3`}>
                                    <CategoryIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">
                                    {category.title}
                                </h2>
                            </div>

                            {/* Category Items Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                {category.items.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => navigate(item.path)}
                                            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer transform hover:-translate-y-1 group"
                                        >
                                            <div className="p-4 text-center">
                                                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-200`}>
                                                    <Icon className="h-5 w-5 text-white" />
                                                </div>
                                                <h3 className="text-sm font-medium text-gray-800 leading-tight">
                                                    {item.title}
                                                </h3>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Quick Stats */}
                {/* <div className="mt-8 bg-white rounded-lg shadow-sm border p-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Thống kê nhanh
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <Wallet className="h-6 w-6 text-blue-500 mr-3" />
                                <div>
                                    <p className="text-xs text-blue-600">Tổng tồn kho</p>
                                    <p className="text-lg font-bold text-blue-800">54.6M</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <Receipt className="h-6 w-6 text-green-500 mr-3" />
                                <div>
                                    <p className="text-xs text-green-600">Giao dịch hôm nay</p>
                                    <p className="text-lg font-bold text-green-800">0</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-orange-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <UtensilsCrossed className="h-6 w-6 text-orange-500 mr-3" />
                                <div>
                                    <p className="text-xs text-orange-600">Nguyên vật liệu</p>
                                    <p className="text-lg font-bold text-orange-800">8</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50 p-3 rounded-lg">
                            <div className="flex items-center">
                                <ChartArea className="h-6 w-6 text-red-500 mr-3" />
                                <div>
                                    <p className="text-xs text-red-600">Cảnh báo kho</p>
                                    <p className="text-lg font-bold text-red-800">0</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div> */}
            </div>
        </div>
    );
};

export default Home;