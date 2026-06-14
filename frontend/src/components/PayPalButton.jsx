import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Loader2, AlertCircle } from "lucide-react";
import api from "../config/api";

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

/**
 * Nút thanh toán PayPal tái sử dụng (PayPal Smart Buttons).
 *
 * Luồng:
 *  1. createOrder -> gọi backend /api/paypal/create-order, trả PayPal orderId.
 *  2. Người dùng duyệt trong popup PayPal.
 *  3. onApprove -> gọi backend /api/paypal/capture-order/{id} để thu tiền.
 *  4. Capture thành công -> gọi prop onSuccess(captureInfo) để FE lưu Order + Payment.
 *
 * Props:
 *  - amountVnd  : tổng tiền (VND). Backend tự quy đổi sang USD.
 *  - disabled   : khóa nút khi đơn hàng chưa hợp lệ (chưa chọn địa chỉ, đang tính phí ship...).
 *  - onSuccess  : (captureInfo) => void  — captureInfo gồm { transactionId, raw }.
 *  - onError    : (error) => void.
 */
export default function PayPalButton({ amountVnd, disabled = false, onSuccess, onError }) {
  const [processing, setProcessing] = useState(false);

  // Thiếu cấu hình -> báo rõ ràng thay vì render nút lỗi.
  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Chưa cấu hình VITE_PAYPAL_CLIENT_ID trong file .env của frontend.</span>
      </div>
    );
  }

  // Bước 1: tạo order ở backend, trả về PayPal orderId cho SDK.
  const createOrder = async () => {
    const { data } = await api.post("/api/paypal/create-order", {
      amount: amountVnd,
    });
    if (!data?.id) throw new Error("Không tạo được PayPal order");
    return data.id;
  };

  // Bước 3: capture sau khi user duyệt.
  const onApprove = async (data) => {
    setProcessing(true);
    try {
      const { data: result } = await api.post(
        `/api/paypal/capture-order/${data.orderID}`
      );
      if (result?.success) {
        await onSuccess?.({
          transactionId: result.transactionId || data.orderID,
          raw: result,
        });
      } else {
        onError?.(new Error(result?.message || "Capture PayPal thất bại"));
      }
    } catch (err) {
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="relative">
      {processing && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-lg">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">Đang xử lý giao dịch...</span>
        </div>
      )}

      <div className={disabled ? "opacity-50 pointer-events-none" : ""}>
        <PayPalScriptProvider
          options={{
            clientId: PAYPAL_CLIENT_ID,
            currency: "USD",
            intent: "capture",
          }}
        >
          <PayPalButtons
            style={{ layout: "vertical", shape: "pill", color: "gold", label: "paypal" }}
            disabled={disabled || processing}
            // Buộc render lại khi số tiền / trạng thái disabled thay đổi.
            forceReRender={[amountVnd, disabled]}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={(err) => onError?.(err)}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
}
