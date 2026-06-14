package com.example.backend.DTO;

import lombok.Data;

import java.math.BigDecimal;

/**
 * Payload tạo đơn thanh toán PayPal.
 * {@code amount} là tổng tiền đơn hàng tính bằng VND (sẽ được backend quy đổi sang USD).
 */
@Data
public class PayPalRequest {
    private BigDecimal amount;
}
