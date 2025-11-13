import React, { useState } from 'react';
import { ArrowLeft, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HuongDanSuDung = () => {
    const navigate = useNavigate();
    const [scale, setScale] = useState(1);
    const pdfUrl = '/HDSDHNL.pdf'; // PDF sẽ được đặt trong thư mục public

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.2, 2));
    };

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.2, 0.5));
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = 'Huong_dan_su_dung.pdf';
        link.click();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-gray-200/50 shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200/50 hover:shadow-md transition-all duration-300 text-gray-600 hover:text-gray-800"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">
                                    Hướng Dẫn Sử Dụng
                                </h1>
                                <p className="text-sm text-gray-600">
                                    Tài liệu hướng dẫn sử dụng hệ thống
                                </p>
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200/50 hover:shadow-md transition-all duration-300 text-gray-600 hover:text-gray-800"
                                title="Thu nhỏ"
                            >
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            
                            <div className="px-3 py-2 bg-white/80 border border-gray-200/50 rounded-xl text-sm font-semibold text-gray-700">
                                {Math.round(scale * 100)}%
                            </div>

                            <button
                                onClick={handleZoomIn}
                                className="p-2 rounded-xl bg-white/80 hover:bg-white border border-gray-200/50 hover:shadow-md transition-all duration-300 text-gray-600 hover:text-gray-800"
                                title="Phóng to"
                            >
                                <ZoomIn className="h-4 w-4" />
                            </button>

                            <button
                                onClick={handleDownload}
                                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                            >
                                <Download className="h-4 w-4" />
                                <span className="text-sm font-semibold">Tải xuống</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PDF Viewer */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl overflow-hidden">
                    <div className="p-4 bg-gray-50/50">
                        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
                                <iframe
                                    src={pdfUrl}
                                    className="w-full border-0"
                                    style={{ height: '800px' }}
                                    title="Hướng dẫn sử dụng"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alternative: Nếu muốn sử dụng embed */}
                {/* <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl p-6">
                    <embed
                        src={pdfUrl}
                        type="application/pdf"
                        width="100%"
                        height="800px"
                        className="rounded-xl"
                    />
                </div> */}
            </div>
        </div>
    );
};

export default HuongDanSuDung;