'use client';

export default function CareHistoryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800 p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Tính năng đang phát triển</h1>
        <p className="text-sm text-gray-500 mb-6">
          Module "Lịch sử chăm sóc" hiện đang trong giai đoạn xây dựng và sẽ sớm được ra mắt trong các bản cập nhật tiếp theo.
        </p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-blue-600 outline-none text-white font-medium rounded-xl hover:bg-blue-700 transition"
        >
          Quay lại trang trước
        </button>
      </div>
    </div>
  );
}
