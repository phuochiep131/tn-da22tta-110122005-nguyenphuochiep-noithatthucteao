package com.example.backend.service;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Tích hợp PayPal Orders v2 REST API.
 * Mô hình 2 bước chuẩn của PayPal Smart Buttons:
 *  1. createOrder  -> tạo order trên PayPal, trả về orderId để FE mở popup duyệt.
 *  2. captureOrder -> sau khi user duyệt, thu tiền (capture) và trả mã giao dịch.
 */
public interface PayPalService {

    /**
     * Tạo PayPal order.
     * @param amountVnd tổng tiền đơn hàng (VND) — sẽ được quy đổi sang currency của PayPal.
     * @return map gồm {@code id} (PayPal order id) và {@code status}.
     */
    Map<String, Object> createOrder(BigDecimal amountVnd);

    /**
     * Capture (thu tiền) một PayPal order đã được người dùng duyệt.
     * @param paypalOrderId order id nhận từ bước createOrder.
     * @return map gồm {@code success}, {@code status} và {@code transactionId}.
     */
    Map<String, Object> captureOrder(String paypalOrderId);
}
