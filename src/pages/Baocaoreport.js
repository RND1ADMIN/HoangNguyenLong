import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Filter, PieChart, BarChart, TrendingUp, Layers, UserCheck, Check, X } from 'lucide-react';
import authUtils from '../utils/authUtils';
import * as XLSX from 'xlsx';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

// Date formatting utilities
const formatDateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
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
// Parse date correctly for filtering, handling MM/dd/yyyy format
const parseDate = (dateString) => {
    if (!dateString) return null;
    
    // Handle different date string formats
    let date;
    if (dateString.includes('/')) {
      // MM/dd/yyyy format
      const [month, day, year] = dateString.split('/').map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(dateString);
    }
    
    // Normalize time portion
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  
  // Format date for display in MM/dd/yyyy format
  const formatDateForDisplay = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  };
const ProductionReportStats = () => {
  // State for data
  const [reports, setReports] = useState([]);
  const [congDoanData, setCongDoanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [reportView, setReportView] = useState('overview'); // overview, byStage, byStaff, byTime

  // State for filters
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)), // First day of current month
    endDate: new Date(),
    congDoan: '',
    trangThai: 'Đã duyệt' // Default to show only approved reports
  });
  
  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch reports and production stages
      const [reportsResponse, congDoanResponse] = await Promise.all([
        authUtils.apiRequest('BC', 'Find', {}),
        authUtils.apiRequest('CONGDOAN', 'Find', {})
      ]);
      
      setReports(reportsResponse);
      setCongDoanData(congDoanResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Lỗi khi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to reports
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
        const reportDate = parseDate(report['NGÀY']);
    
        // Filter by date range
        const startDate = filters.startDate ? new Date(filters.startDate.setHours(0, 0, 0, 0)) : null;
        const endDate = filters.endDate ? new Date(filters.endDate.setHours(23, 59, 59, 999)) : null;
        
        let dateMatches = true;
        if (startDate && endDate) {
          dateMatches = reportDate >= startDate && reportDate <= endDate;
        } else if (startDate) {
          dateMatches = reportDate >= startDate;
        } else if (endDate) {
          dateMatches = reportDate <= endDate;
        }
      // Filter by production stage
      const congDoanMatches = !filters.congDoan || report['CÔNG ĐOẠN'] === filters.congDoan;
      
      // Filter by approval status
      const statusMatches = !filters.trangThai || report['TRẠNG THÁI'] === filters.trangThai;
      
      return dateMatches && congDoanMatches && statusMatches;
    });
  }, [reports, filters]);

  // Calculate total production volume and value
  const summaryStats = useMemo(() => {
    if (filteredReports.length === 0) {
      return {
        totalReports: 0,
        totalVolume: 0,
        totalValue: 0,
        approvedReports: 0,
        pendingReports: 0,
        rejectedReports: 0
      };
    }

    const approved = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Đã duyệt');
    const pending = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Chờ duyệt');
    const rejected = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Từ chối');

    // Calculate total production volume (may need to normalize units)
    const totalVolume = approved.reduce((sum, report) => {
      const volume = parseFloat(report['KHỐI LƯỢNG']) || 0;
      return sum + volume;
    }, 0);

    // Calculate total value
    const totalValue = approved.reduce((sum, report) => {
      const value = parseFloat(report['THÀNH TIỀN']) || 0;
      return sum + value;
    }, 0);

    return {
      totalReports: filteredReports.length,
      totalVolume: totalVolume,
      totalValue: totalValue,
      approvedReports: approved.length,
      pendingReports: pending.length,
      rejectedReports: rejected.length
    };
  }, [filteredReports]);

  // Group data by production stage
  const stageData = useMemo(() => {
    const approved = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Đã duyệt');
    const stageGroups = {};
    
    // Initialize with all known stages
    congDoanData.forEach(cd => {
      stageGroups[cd['CÔNG ĐOẠN']] = {
        count: 0,
        volume: 0,
        value: 0
      };
    });
    
    // Populate data
    approved.forEach(report => {
      const stage = report['CÔNG ĐOẠN'];
      if (!stageGroups[stage]) {
        stageGroups[stage] = { count: 0, volume: 0, value: 0 };
      }
      
      stageGroups[stage].count += 1;
      stageGroups[stage].volume += parseFloat(report['KHỐI LƯỢNG']) || 0;
      stageGroups[stage].value += parseFloat(report['THÀNH TIỀN']) || 0;
    });
    
    return Object.entries(stageGroups).map(([stage, data]) => ({
      stage,
      ...data
    }));
  }, [filteredReports, congDoanData]);

  // Group data by staff
  const staffData = useMemo(() => {
    const approved = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Đã duyệt');
    const staffMap = {};
    
    approved.forEach(report => {
      const staffList = report['NHÂN SỰ THAM GIA']?.split(',').map(s => s.trim()) || [];
      
      staffList.forEach(staff => {
        if (!staff) return;
        
        if (!staffMap[staff]) {
          staffMap[staff] = {
            count: 0,
            volume: 0,
            value: 0,
            stages: new Set()
          };
        }
        
        // Since multiple staff can be on one report, we divide the volume and value
        const staffCount = staffList.length || 1;
        staffMap[staff].count += 1;
        staffMap[staff].volume += (parseFloat(report['KHỐI LƯỢNG']) || 0) / staffCount;
        staffMap[staff].value += (parseFloat(report['THÀNH TIỀN']) || 0) / staffCount;
        staffMap[staff].stages.add(report['CÔNG ĐOẠN']);
      });
    });
    
    return Object.entries(staffMap)
      .map(([name, data]) => ({
        name,
        ...data,
        stageCount: data.stages.size,
        stages: Array.from(data.stages)
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredReports]);

  // Group data by time periods (daily, weekly, monthly)
  const timeData = useMemo(() => {
    const approved = filteredReports.filter(r => r['TRẠNG THÁI'] === 'Đã duyệt');
    
    // Group by day
    const dailyData = {};
    
    approved.forEach(report => {
      const date = new Date(report['NGÀY']).toLocaleDateString('vi-VN');
      
      if (!dailyData[date]) {
        dailyData[date] = {
          count: 0,
          volume: 0,
          value: 0
        };
      }
      
      dailyData[date].count += 1;
      dailyData[date].volume += parseFloat(report['KHỐI LƯỢNG']) || 0;
      dailyData[date].value += parseFloat(report['THÀNH TIỀN']) || 0;
    });
    
    // Convert to sorted array
    const dailyArray = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        ...data
      }))
      .sort((a, b) => {
        return parseVNDate(a.date) - parseVNDate(b.date);
      });
      
    return {
      daily: dailyArray
    };
  }, [filteredReports]);

  // Prepare chart data for stages
  const stageChartData = useMemo(() => {
    const labels = stageData.map(item => item.stage);
    const volumeData = stageData.map(item => item.volume);
    const valueData = stageData.map(item => item.value);
    
    return {
      volume: {
        labels,
        datasets: [
          {
            label: 'Khối lượng sản xuất',
            data: volumeData,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      },
      value: {
        labels,
        datasets: [
          {
            label: 'Giá trị sản xuất',
            data: valueData,
            backgroundColor: 'rgba(255, 159, 64, 0.6)',
            borderColor: 'rgba(255, 159, 64, 1)',
            borderWidth: 1
          }
        ]
      }
    };
  }, [stageData]);

  // Prepare chart data for staff
  const staffChartData = useMemo(() => {
    // Limit to top 10 staff by value
    const topStaff = staffData.slice(0, 10);
    
    const labels = topStaff.map(item => item.name);
    const valueData = topStaff.map(item => item.value);
    
    const backgroundColors = [
      'rgba(255, 99, 132, 0.6)',
      'rgba(54, 162, 235, 0.6)',
      'rgba(255, 206, 86, 0.6)',
      'rgba(75, 192, 192, 0.6)',
      'rgba(153, 102, 255, 0.6)',
      'rgba(255, 159, 64, 0.6)',
      'rgba(199, 199, 199, 0.6)',
      'rgba(83, 102, 255, 0.6)',
      'rgba(40, 159, 64, 0.6)',
      'rgba(210, 99, 132, 0.6)'
    ];
    
    return {
      value: {
        labels,
        datasets: [
          {
            label: 'Giá trị sản xuất',
            data: valueData,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map(color => color.replace('0.6', '1')),
            borderWidth: 1
          }
        ]
      }
    };
  }, [staffData]);

  // Prepare chart data for time series
  const timeChartData = useMemo(() => {
    const labels = timeData.daily.map(item => item.date);
    const valueData = timeData.daily.map(item => item.value);
    const volumeData = timeData.daily.map(item => item.volume);
    
    return {
      timeSeries: {
        labels,
        datasets: [
          {
            label: 'Giá trị sản xuất',
            data: valueData,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            tension: 0.1,
            yAxisID: 'y'
          },
          {
            label: 'Khối lượng sản xuất',
            data: volumeData,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            tension: 0.1,
            yAxisID: 'y1'
          }
        ]
      }
    };
  }, [timeData]);

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Thống kê sản xuất',
        font: {
          size: 16
        }
      },
    },
  };

  const timeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Biến động sản xuất theo thời gian',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Giá trị'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Khối lượng'
        }
      },
    },
  };

  // Export data to Excel
  const handleExportExcel = () => {
    // Determine which data to export based on current view
    let dataToExport = [];
    let fileName = 'bao-cao-thong-ke-';
    
    if (reportView === 'byStage') {
      dataToExport = stageData.map(item => ({
        'Công đoạn': item.stage,
        'Số lượng báo cáo': item.count,
        'Khối lượng': item.volume,
        'Giá trị': item.value
      }));
      fileName += 'cong-doan';
    }
    else if (reportView === 'byStaff') {
      dataToExport = staffData.map(item => ({
        'Nhân viên': item.name,
        'Số lượng tham gia': item.count,
        'Khối lượng đóng góp': item.volume.toFixed(2),
        'Giá trị đóng góp': item.value.toFixed(2),
        'Số công đoạn tham gia': item.stageCount,
        'Công đoạn tham gia': item.stages.join(', ')
      }));
      fileName += 'nhan-vien';
    }
    else if (reportView === 'byTime') {
      dataToExport = timeData.daily.map(item => ({
        'Ngày': item.date,
        'Số lượng báo cáo': item.count,
        'Khối lượng': item.volume,
        'Giá trị': item.value
      }));
      fileName += 'thoi-gian';
    }
    else {
      // Overview - export all filtered reports
      dataToExport = filteredReports.map(item => ({
        'ID': item.ID,
        'Ngày': new Date(item['NGÀY']).toLocaleDateString('vi-VN'),
        'Công đoạn': item['CÔNG ĐOẠN'],
        'Khối lượng': item['KHỐI LƯỢNG'],
        'Đơn giá': item['ĐƠN GIÁ'],
        'Thành tiền': item['THÀNH TIỀN'],
        'Nhân sự tham gia': item['NHÂN SỰ THAM GIA'],
        'Trạng thái': item['TRẠNG THÁI'],
        'Người nhập': item['NGƯỜI NHẬP'],
        'Người duyệt': item['NGƯỜI DUYỆT'] || ''
      }));
      fileName += 'chi-tiet';
    }
    
    fileName += `-${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    // Create workbook and add worksheet
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, fileName);
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

  // Set default date range to current month
  const resetFilters = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    setFilters({
      startDate: firstDayOfMonth,
      endDate: now,
      congDoan: '',
      trangThai: 'Đã duyệt'
    });
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-100">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Thống kê Báo Cáo Sản Xuất</h1>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Ẩn bộ lọc" : "Bộ lọc"}
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Xuất báo cáo Excel
              </button>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Công đoạn</label>
                  <select
                    value={filters.congDoan}
                    onChange={(e) => setFilters({ ...filters, congDoan: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tất cả công đoạn</option>
                    {congDoanData.map(cd => (
                      <option key={cd['CÔNG ĐOẠN']} value={cd['CÔNG ĐOẠN']}>{cd['CÔNG ĐOẠN']}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={filters.trangThai}
                    onChange={(e) => setFilters({ ...filters, trangThai: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Tất cả trạng thái</option>
                    <option value="Chờ duyệt">Chờ duyệt</option>
                    <option value="Đã duyệt">Đã duyệt</option>
                    <option value="Từ chối">Từ chối</option>
                  </select>
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
                        value={filters.startDate ? formatDateToString(filters.startDate) : ''}
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
                        value={filters.endDate ? formatDateToString(filters.endDate) : ''}
                        onChange={(e) => handleFilterDateChange('endDate', e.target.value)}
                        className="pl-10 p-2 border rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Đến ngày"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Report Type Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
              <li className="mr-2">
                <button
                  onClick={() => setReportView('overview')}
                  className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                    reportView === 'overview'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className={`w-4 h-4 mr-2 ${reportView === 'overview' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  Tổng quan
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setReportView('byStage')}
                  className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                    reportView === 'byStage'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Layers className={`w-4 h-4 mr-2 ${reportView === 'byStage' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  Theo công đoạn
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setReportView('byStaff')}
                  className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                    reportView === 'byStaff'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <UserCheck className={`w-4 h-4 mr-2 ${reportView === 'byStaff' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  Theo nhân viên
                </button>
              </li>
              <li>
                <button
                  onClick={() => setReportView('byTime')}
                  className={`inline-flex items-center p-4 border-b-2 rounded-t-lg group ${
                    reportView === 'byTime'
                    ? 'text-indigo-600 border-indigo-600'
                    : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Calendar className={`w-4 h-4 mr-2 ${reportView === 'byTime' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  Theo thời gian
                </button>
              </li>
            </ul>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <span className="ml-2 text-gray-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tổng số báo cáo</p>
                      <h3 className="text-2xl font-bold text-gray-900">{summaryStats.totalReports}</h3>
                    </div>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BarChart className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm">
                    <div className="flex gap-1 mr-3">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-gray-600">Đã duyệt: {summaryStats.approvedReports}</span>
                    </div>
                    <div className="flex gap-1">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-gray-600">Từ chối: {summaryStats.rejectedReports}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tổng khối lượng</p>
                      <h3 className="text-2xl font-bold text-gray-900">{summaryStats.totalVolume.toFixed(2)}</h3>
                    </div>
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    </div>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-gray-600">Khối lượng sản xuất đã duyệt</span>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Tổng giá trị</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summaryStats.totalValue)}
                      </h3>
                    </div>
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PieChart className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-gray-600">Giá trị sản xuất đã duyệt</span>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Số công đoạn hoạt động</p>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {stageData.filter(s => s.count > 0).length}/{congDoanData.length}
                      </h3>
                    </div>
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Layers className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center text-sm">
                    <span className="text-gray-600">Công đoạn có báo cáo trong kỳ</span>
                  </div>
                </div>
              </div>

              {/* Overview View */}
              {reportView === 'overview' && (
                <div className="space-y-6">
                  {/* Charts row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Stage distribution chart */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Phân bố theo công đoạn</h3>
                      <div className="h-80">
                        <Pie 
                          data={{
                            labels: stageData.filter(s => s.count > 0).map(s => s.stage),
                            datasets: [{
                              data: stageData.filter(s => s.count > 0).map(s => s.value),
                              backgroundColor: [
                                'rgba(255, 99, 132, 0.6)',
                                'rgba(54, 162, 235, 0.6)',
                                'rgba(255, 206, 86, 0.6)',
                                'rgba(75, 192, 192, 0.6)',
                                'rgba(153, 102, 255, 0.6)',
                                'rgba(255, 159, 64, 0.6)',
                                'rgba(199, 199, 199, 0.6)',
                                'rgba(83, 102, 255, 0.6)',
                              ],
                              borderWidth: 1
                            }]
                          }}
                          options={chartOptions}
                        />
                      </div>
                    </div>

                    {/* Time trend chart */}
                    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Xu hướng sản xuất</h3>
                      <div className="h-80">
                        <Line 
                          data={timeChartData.timeSeries}
                          options={timeChartOptions}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Recent reports table */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Báo cáo gần đây</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">ID</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Ngày</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Công đoạn</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Khối lượng</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Đơn giá</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Thành tiền</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredReports.slice(0, 5).map((report) => (
                            <tr key={report.ID} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{report.ID}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
  {formatDateForDisplay(report['NGÀY'])}
</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['CÔNG ĐOẠN']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">{report['KHỐI LƯỢNG']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{report['ĐƠN GIÁ']}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                                {report['TRẠNG THÁI'] === 'Đã duyệt' ? report['THÀNH TIỀN'] : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  report['TRẠNG THÁI'] === 'Đã duyệt' 
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : report['TRẠNG THÁI'] === 'Từ chối'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  {report['TRẠNG THÁI']}
                                </span>
                              </td>
                            </tr>
                          ))}
                          
                          {filteredReports.length === 0 && (
                            <tr>
                              <td colSpan="7" className="px-4 py-6 text-center text-sm text-gray-500">
                                Không tìm thấy báo cáo nào phù hợp với tiêu chí tìm kiếm
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* By Stage View */}
              {reportView === 'byStage' && (
                <div className="space-y-6">
                  {/* Bar chart for stages */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Giá trị theo công đoạn</h3>
                    <div className="h-80">
                      <Bar 
                        data={stageChartData.value}
                        options={chartOptions}
                      />
                    </div>
                  </div>

                  {/* Detailed stage data table */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Chi tiết theo công đoạn</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Công đoạn</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Số báo cáo</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Khối lượng</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Giá trị</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">% Tổng giá trị</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stageData
                            .sort((a, b) => b.value - a.value)
                            .map((stage) => {
                              const percentOfTotal = summaryStats.totalValue > 0 
                                ? (stage.value / summaryStats.totalValue * 100).toFixed(2) 
                                : '0.00';
                              
                              return (
                                <tr key={stage.stage} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{stage.stage}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{stage.count}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{stage.volume.toFixed(2)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right font-medium">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stage.value)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                    <div className="flex items-center justify-end">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        parseFloat(percentOfTotal) > 30
                                          ? 'bg-green-100 text-green-800'
                                          : parseFloat(percentOfTotal) > 10
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {percentOfTotal}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          
                          {stageData.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                                Không tìm thấy dữ liệu phù hợp với tiêu chí tìm kiếm
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* By Staff View */}
              {reportView === 'byStaff' && (
                <div className="space-y-6">
                  {/* Chart for top staff */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Top 10 nhân viên có giá trị đóng góp cao nhất</h3>
                    <div className="h-80">
                      <Bar 
                        data={staffChartData.value}
                        options={chartOptions}
                      />
                    </div>
                  </div>

                  {/* Detailed staff data table */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Chi tiết theo nhân viên</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Nhân viên</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Số lượng tham gia</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Khối lượng đóng góp</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Giá trị đóng góp</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Công đoạn tham gia</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {staffData
                            .sort((a, b) => b.value - a.value)
                            .map((staff) => (
                              <tr key={staff.name} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{staff.name}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{staff.count}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{staff.volume.toFixed(2)}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right font-medium">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(staff.value)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <div className="flex flex-wrap gap-1">
                                    {staff.stages.map((stage, index) => (
                                      <span 
                                        key={index} 
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                      >
                                        {stage}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          
                          {staffData.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                                Không tìm thấy dữ liệu phù hợp với tiêu chí tìm kiếm
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* By Time View */}
              {reportView === 'byTime' && (
                <div className="space-y-6">
                  {/* Time series chart */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Biểu đồ sản xuất theo thời gian</h3>
                    <div className="h-80">
                      <Line 
                        data={timeChartData.timeSeries}
                        options={timeChartOptions}
                      />
                    </div>
                  </div>

                  {/* Detailed time data table */}
                  <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Chi tiết theo ngày</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Ngày</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Số báo cáo</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Khối lượng</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Giá trị</th>
                            <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">% Tổng giá trị</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {timeData.daily
                            .sort((a, b) => parseVNDate(b.date) - parseVNDate(a.date))
                            .map((day, index) => {
                              const percentOfTotal = summaryStats.totalValue > 0 
                                ? (day.value / summaryStats.totalValue * 100).toFixed(2) 
                                : '0.00';
                              
                              return (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{day.date}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{day.count}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">{day.volume.toFixed(2)}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right font-medium">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(day.value)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                    <div className="flex items-center justify-end">
                                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        parseFloat(percentOfTotal) > 15
                                          ? 'bg-green-100 text-green-800'
                                          : parseFloat(percentOfTotal) > 5
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-gray-100 text-gray-800'
                                      }`}>
                                        {percentOfTotal}%
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          
                          {timeData.daily.length === 0 && (
                            <tr>
                              <td colSpan="5" className="px-4 py-6 text-center text-sm text-gray-500">
                                Không tìm thấy dữ liệu phù hợp với tiêu chí tìm kiếm
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
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

export default ProductionReportStats;